// Lojas especiais (regras em shared/lojasEspeciais.ts): Loja do dia (aba do Pokémarket, Origin Coins) e Lojas da
// Liga (League Coins / League Coins Nightmare). O servidor sorteia a rotação, confere preço e saldo no save
// guardado e entrega na mesma mudança (o jogo faz salvarAgora antes e adota o save que volta).
import * as banco from './banco.ts';
import { contar } from './dashboard.ts';
import { ErroConta } from './contas.ts';
import { gerarPokemon, idsDaCategoria, itemAleatorio, nomeDaEspecie, nomeDoItem } from './motorDoJogo.ts';
import { guardarPokemon, type PokemonSave, type SaveMin } from './trocas.ts';
import {
  CHANCE_SHINY_INICIAL_GUILDA, IV_MINIMO_INICIAL_GUILDA, comprasDoMes, mesDaLoja, produtosDaGuilda, proximoMesDaLoja, type EstadoLojaGuilda,
} from '../../shared/lojaGuilda.ts';
import {
  LOJAS_DA_LIGA, PRODUTOS_PREMIUM, PRECO_FORMA_NA_NIGHTMARE, PRECO_Z_NA_LIGA, PRODUTOS_LIGA, diaDaLoja, itensDaLojaDaLiga, precoNoDia, proximaRotacao, rotacaoDoDia,
  type IdLojaLiga, type ProdutoLiga,
} from '../../shared/lojasEspeciais.ts';

const MAXIMO_POR_COMPRA = 99;
const megas = () => idsDaCategoria('megapedras');

/** Tudo o que uma Loja da Liga vende: produtos fixos + Mega Stones da tier dela + Z-Crystals (Liga) ou itens de forma (Nightmare). */
function catalogo(loja: IdLojaLiga): ProdutoLiga[] {
  const pedras = itensDaLojaDaLiga(loja).filter((i) => megas().includes(i.id)).map((i): ProdutoLiga => ({ id: i.id, loja, preco: i.preco }));
  const extras = loja === 'liga'
    ? idsDaCategoria('zcristais').map((id): ProdutoLiga => ({ id, loja, preco: PRECO_Z_NA_LIGA }))
    : idsDaCategoria('formas').map((id): ProdutoLiga => ({ id, loja, preco: PRECO_FORMA_NA_NIGHTMARE }));
  return [...PRODUTOS_LIGA.filter((p) => p.loja === loja), ...extras, ...pedras];
}

export function estado() {
  const agora = Date.now();
  const dia = diaDaLoja(agora);
  return {
    agora, dia, trocaEm: proximaRotacao(agora),
    doDia: rotacaoDoDia(dia, megas(), idsDaCategoria('zcristais')).map((id) => ({ id, preco: precoNoDia(id) })),
    premium: PRODUTOS_PREMIUM,
    liga: catalogo('liga'),
    nightmare: catalogo('nightmare'),
  };
}

const saldo = (v: unknown) => (typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? v : 0);

/** Comprar: `{ loja: 'dia' | 'liga' | 'nightmare', item, quantidade }` (`item` = id do produto). */
export function comprar(conta: banco.Conta, dados: Record<string, unknown>) {
  const loja = dados.loja;
  const id = typeof dados.item === 'string' ? dados.item : '';
  const quantidade = dados.quantidade ?? 1;
  if (!Number.isSafeInteger(quantidade) || (quantidade as number) < 1 || (quantidade as number) > MAXIMO_POR_COMPRA) throw new ErroConta('Quantidade inválida.');
  const qtd = quantidade as number;
  if (loja === 'premium') return comprarPremium(conta, id, qtd);
  let campo: 'gold' | 'leagueCoins' | 'leagueCoinsNightmare';
  let produto: ProdutoLiga;
  let nomeMoeda: string;
  if (loja === 'dia') {
    if (!estado().doDia.some((i) => i.id === id)) throw new ErroConta('Este item não está na Loja do dia de hoje.', 409);
    campo = 'gold';
    produto = { id, loja: 'liga', preco: precoNoDia(id) };
    nomeMoeda = 'Origin Coins';
  } else if (loja === 'liga' || loja === 'nightmare') {
    const p = catalogo(loja).find((x) => x.id === id);
    if (!p) throw new ErroConta('Esta loja não vende este item.', 409);
    produto = p;
    ({ moeda: campo, nomeMoeda } = LOJAS_DA_LIGA[loja]);
  } else throw new ErroConta('Loja inválida.');
  if (produto.titulo && qtd !== 1) throw new ErroConta('Quantidade inválida.');
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada antes de comprar.');
  const custo = produto.preco * qtd;
  const recebidos: string[] = [];
  banco.mudarSaves([conta.id], ([save]) => {
    if (saldo(save[campo]) < custo) throw new ErroConta(`Você não tem ${nomeMoeda} suficientes.`);
    const itens = (save.itens && typeof save.itens === 'object' ? save.itens : (save.itens = {})) as Record<string, number>;
    if (produto.titulo) {
      const ganhos = Array.isArray(save.titulosGanhos) ? (save.titulosGanhos as string[]) : (save.titulosGanhos = []) as string[];
      if (ganhos.includes(produto.titulo)) throw new ErroConta('Você já tem este título.', 409);
      ganhos.push(produto.titulo);
    } else if (produto.item === 'fragmentos') save.fragmentos = saldo(save.fragmentos) + qtd * (produto.quantidade ?? 1);
    else
      for (let i = 0; i < qtd * (produto.quantidade ?? 1); i++) {
        // Mint/Charm aleatório: sorteado aqui, um por unidade
        const item = produto.aleatorio ? itemAleatorio(produto.aleatorio) : (produto.item ?? produto.id);
        itens[item] = saldo(itens[item]) + 1;
        if (produto.aleatorio) recebidos.push(nomeDoItem(item));
      }
    save[campo] = saldo(save[campo]) - custo;
  });
  contar(`compra:${loja}:${produto.titulo ?? produto.item ?? produto.id}`, qtd);
  const guardado = banco.lerSave(conta.id)!;
  const nome = produto.nome ?? nomeDoItem(produto.item ?? produto.id);
  return {
    save: JSON.parse(guardado.dados), versao: guardado.versao,
    texto: `Comprou ${qtd}× ${nome} por ${custo.toLocaleString('pt-BR')} ${nomeMoeda}.${recebidos.length ? ` Saiu: ${recebidos.join(', ')}.` : ''}`,
  };
}

/** Aba Premium do Pokémarket: Passe Premium (item na bolsa) ou dias de VIP, pagos em Origin Coins. */
function comprarPremium(conta: banco.Conta, id: string, qtd: number) {
  const produto = PRODUTOS_PREMIUM.find((p) => p.id === id);
  if (!produto) throw new ErroConta('Esta loja não vende este item.', 409);
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada antes de comprar.');
  const custo = produto.preco * qtd;
  banco.mudarSaves([conta.id], ([save]) => {
    if (saldo(save.gold) < custo) throw new ErroConta('Você não tem Origin Coins suficientes.');
    if (produto.vipDias) save.vipAte = Math.max(saldo(save.vipAte), Date.now()) + produto.vipDias * qtd * 86_400_000;
    else {
      const itens = (save.itens && typeof save.itens === 'object' ? save.itens : (save.itens = {})) as Record<string, number>;
      itens[produto.item!] = saldo(itens[produto.item!]) + qtd;
    }
    save.gold = saldo(save.gold) - custo;
  });
  contar(`compra:premium:${produto.id}`, qtd);
  const guardado = banco.lerSave(conta.id)!;
  return { save: JSON.parse(guardado.dados), versao: guardado.versao, texto: `Comprou ${qtd > 1 ? `${qtd}× ` : ''}${produto.nome} por ${custo.toLocaleString('pt-BR')} Origin Coins.` };
}

// ---------- Loja da guilda (shared/lojaGuilda.ts) ----------
// A mesma para todos e troca todo mês; cada jogador compra na sua cópia, com limites por mês guardados no save
// (save.lojaGuilda) e pagos em Pontos de guilda (save.pontosGuilda). Só para quem está numa guilda.

export function estadoGuilda(conta: banco.Conta) {
  const agora = Date.now();
  const mes = mesDaLoja(agora);
  const guardado = banco.lerSave(conta.id);
  const save = guardado ? (JSON.parse(guardado.dados) as Record<string, unknown>) : {};
  return {
    agora, mes, trocaEm: proximoMesDaLoja(agora), temGuilda: !!banco.claDaConta(conta.id),
    produtos: produtosDaGuilda(mes), compras: comprasDoMes(save.lojaGuilda as EstadoLojaGuilda | undefined, mes),
  };
}

/** Comprar: `{ produto, quantidade }` (quantidade = quantas compras de uma vez, dentro do limite do mês). */
export function comprarGuilda(conta: banco.Conta, dados: Record<string, unknown>) {
  if (!banco.claDaConta(conta.id)) throw new ErroConta('A loja da guilda é só para quem está numa guilda.', 403);
  const mes = mesDaLoja(Date.now());
  const produto = produtosDaGuilda(mes).find((p) => p.id === dados.produto);
  if (!produto) throw new ErroConta('A loja da guilda deste mês não tem este produto.', 409);
  const qtd = dados.quantidade ?? 1;
  if (!Number.isSafeInteger(qtd) || (qtd as number) < 1 || (qtd as number) > produto.limite) throw new ErroConta('Quantidade inválida.');
  const vezes = qtd as number;
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada antes de comprar.');
  const custo = produto.preco * vezes;
  const recebidos: string[] = [];
  banco.mudarSaves([conta.id], ([save]) => {
    const compras = { ...comprasDoMes(save.lojaGuilda as EstadoLojaGuilda | undefined, mes) };
    const feitas = compras[produto.id] ?? 0;
    if (feitas + vezes > produto.limite) throw new ErroConta(`Limite deste mês: ${produto.limite} (você já comprou ${feitas}).`, 409);
    if (saldo(save.pontosGuilda) < custo) throw new ErroConta('Você não tem Pontos de guilda suficientes.');
    const itens = (save.itens && typeof save.itens === 'object' ? save.itens : (save.itens = {})) as Record<string, number>;
    for (let i = 0; i < vezes; i++) {
      if (produto.inicial) {
        const shiny = Math.random() < CHANCE_SHINY_INICIAL_GUILDA;
        const p = gerarPokemon(produto.inicial, 1, { shiny, ivMinimo: IV_MINIMO_INICIAL_GUILDA });
        p.origem = 'ticket';
        try {
          guardarPokemon(save as unknown as SaveMin, p as unknown as PokemonSave, false);
        } catch {
          throw new ErroConta('Seu PC está cheio.', 409);
        }
        if (shiny) recebidos.push(`${nomeDaEspecie(produto.inicial)} ✨ shiny`);
      } else
      if (produto.aleatorio === 'terashard') {
        // um tipo sorteado, e o pacote inteiro vem dele
        const shard = itemAleatorio('terashard');
        itens[shard] = saldo(itens[shard]) + produto.quantidade;
        recebidos.push(`${produto.quantidade}× ${nomeDoItem(shard)}`);
      } else
        for (let u = 0; u < produto.quantidade; u++) {
          const item = produto.aleatorio ? itemAleatorio(produto.aleatorio) : produto.item!;
          itens[item] = saldo(itens[item]) + 1;
          if (produto.aleatorio) recebidos.push(nomeDoItem(item));
        }
    }
    compras[produto.id] = feitas + vezes;
    save.lojaGuilda = { mes, compras } satisfies EstadoLojaGuilda;
    save.pontosGuilda = saldo(save.pontosGuilda) - custo;
  });
  contar(`compra:guilda:${produto.inicial ? `inicial-${produto.inicial}` : produto.id}`, vezes);
  const guardado = banco.lerSave(conta.id)!;
  const nome = produto.inicial ? nomeDaEspecie(produto.inicial) : produto.nome ?? `${produto.quantidade}× ${nomeDoItem(produto.item!)}`;
  return {
    save: JSON.parse(guardado.dados), versao: guardado.versao, ...estadoGuilda(conta),
    texto: `Comprou ${vezes > 1 ? `${vezes}× ` : ''}${nome} por ${custo} ${custo === 1 ? 'Ponto' : 'Pontos'} de guilda.${recebidos.length ? ` Saiu: ${recebidos.join(', ')}.` : ''}`,
  };
}

/** PUT /api/save: o navegador não mexe nos Pontos de guilda nem nas compras do mês (valem os guardados). */
export function proteger(save: Record<string, unknown>, antes: Record<string, unknown> | null): void {
  if (!antes) return;
  for (const campo of ['pontosGuilda', 'lojaGuilda']) {
    if (antes[campo] === undefined) delete save[campo];
    else save[campo] = antes[campo];
  }
}
