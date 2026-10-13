// Mercado negro: jogadores anunciam Pokémon, itens e gold, e outros compram (regras em shared/mercado.ts).
// O SERVIDOR é o juiz, como nas trocas:
// - anunciar TIRA a coisa do save guardado do vendedor e guarda na tabela `mercado` (ninguém usa nem vende duas
//   vezes o que está anunciado);
// - comprar cobra o comprador e entrega a coisa no save dele, tudo numa mudança só;
// - o pagamento NÃO entra direto no save do vendedor (ele pode estar jogando, e trocar o save por baixo dele
//   perderia o que ele fez): o anúncio fica "vendido" e o jogo do vendedor vem buscar, como nas entregas.
//   Anúncio vencido volta para o dono do mesmo jeito.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisar, avisarTodos } from './mundo.ts';
import { guardarPokemon, type PokemonSave, type SaveMin } from './trocas.ts';
import {
  ANUNCIOS_NA_LISTA, MAX_ANUNCIOS_POR_JOGADOR, PRECO_MAXIMO_MERCADO, QUANTIDADE_MAXIMA_MERCADO, VALIDADE_ANUNCIO_MS, valorDoVendedor,
  type AcertoMercado, type AnuncioMercado, type MoedaMercado, type PokemonAnunciado, type TipoAnuncio,
} from '../../shared/mercado.ts';
import { itemInegociavel } from '../../shared/naoTrocavel.ts';
import { contarSkinNaBolsa, ehSkin, quantidadeNegociavel } from '../../shared/skins.ts';
import { faixaDoIv, tierIv } from '../../shared/tierIv.ts';
import { liberado, NIVEL_MINIMO } from '../../shared/trancas.ts';
import { nivelTreinador } from '../../shared/treinador.ts';
import { nomeDaMoeda } from '../../shared/moedas.ts';

/** O que fica guardado em cada anúncio. */
type Guardado = { pokemon?: PokemonSave; item?: string; quantidade?: number };

const inteiro = (v: unknown, minimo: number, maximo: number): number | null => (typeof v === 'number' && Number.isSafeInteger(v) && v >= minimo && v <= maximo ? v : null);
const saldo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

function saveGuardado(conta: banco.Conta): Record<string, unknown> {
  const s = banco.lerSave(conta.id);
  if (!s) throw new ErroConta('Comece sua jornada antes de usar o mercado negro.');
  return JSON.parse(s.dados) as Record<string, unknown>;
}

/** Tranca de nível (shared/trancas.ts), conferida no save guardado. */
function exigirNivel(conta: banco.Conta): void {
  const xp = saveGuardado(conta).xpTreinador;
  if (!liberado('mercadoNegro', nivelTreinador(typeof xp === 'number' && xp > 0 ? xp : 0), !!conta.admin)) throw new ErroConta(`O mercado negro abre no nível ${NIVEL_MINIMO.mercadoNegro} de treinador.`, 403);
}

const vipAgora = (save: Record<string, unknown>) => typeof save.vipAte === 'number' && save.vipAte > Date.now();

/** O que o comprador vê do Pokémon: tier e IVs só se o vendedor avaliou; valor exato só para VIP. */
function verPokemon(p: PokemonSave, vip: boolean): PokemonAnunciado {
  const ivs = (p.ivs && typeof p.ivs === 'object' ? p.ivs : {}) as Record<string, number>;
  const avaliado = !!(p.ivsRevelados || p.ivsFaixa);
  const golpes = Array.isArray(p.golpes) ? (p.golpes as { id?: unknown }[]).map((g) => g?.id).filter((id): id is string => typeof id === 'string') : [];
  const visto: PokemonAnunciado = {
    especieId: p.especieId, nivel: p.nivel, shiny: !!p.shiny, genero: typeof p.genero === 'string' ? p.genero : 'N',
    natureza: typeof p.natureza === 'string' ? p.natureza : '', habilidade: typeof p.habilidade === 'string' ? p.habilidade : '',
    item: typeof p.item === 'string' ? p.item : null, golpes, avaliado,
  };
  if (!avaliado) return visto;
  visto.tier = tierIv({ ivs } as Parameters<typeof tierIv>[0]);
  if (vip || p.ivsRevelados) visto.ivs = ivs;
  else visto.faixas = Object.fromEntries(Object.entries(ivs).map(([a, v]) => [a, faixaDoIv(v)]));
  return visto;
}

function verAnuncio(l: banco.LinhaMercado, conta: banco.Conta, vip: boolean): AnuncioMercado {
  const g = JSON.parse(l.dados) as Guardado;
  return {
    id: l.id, tipo: l.tipo as TipoAnuncio, vendedor: l.vendedor_nome, meu: l.vendedor === conta.id, preco: l.preco, moeda: l.moeda as MoedaMercado, expiraEm: l.expira_em,
    ...(g.pokemon ? { pokemon: verPokemon(g.pokemon, vip || l.vendedor === conta.id) } : {}),
    ...(g.item ? { item: g.item } : {}),
    ...(g.quantidade ? { quantidade: g.quantidade } : {}),
  };
}

/** Linhas do vendedor que o jogo dele ainda tem de buscar: vendidas (pagamento) e vencidas (devolução). */
const aBuscar = (contaId: number, agora = Date.now()) => banco.anunciosDoVendedor(contaId).filter((l) => l.status === 'vendido' || l.expira_em <= agora);

/** A lista do mercado, os meus anúncios e quantos acertos me esperam. */
export function listar(conta: banco.Conta) {
  const agora = Date.now();
  const save = banco.lerSave(conta.id);
  const vip = save ? vipAgora(JSON.parse(save.dados) as Record<string, unknown>) : false;
  return {
    anuncios: banco.anunciosAtivosMercado(agora, ANUNCIOS_NA_LISTA).map((l) => verAnuncio(l, conta, vip)),
    meus: banco.anunciosDoVendedor(conta.id).filter((l) => l.status === 'ativo' && l.expira_em > agora).map((l) => verAnuncio(l, conta, vip)),
    pendentes: aBuscar(conta.id, agora).length,
    agora,
  };
}

export const pendentes = (conta: banco.Conta) => ({ pendentes: aBuscar(conta.id).length });

/** Devolve o save já mudado junto com a lista (o jogo troca o dele por este). */
function comSave(conta: banco.Conta) {
  const guardado = banco.lerSave(conta.id)!;
  return { ...listar(conta), save: JSON.parse(guardado.dados), versao: guardado.versao };
}

/** Põe o que estava guardado num anúncio dentro de um save. */
function entregar(save: SaveMin, tipo: string, g: Guardado, deOutroJogador: boolean): void {
  if (tipo === 'pokemon' && g.pokemon) guardarPokemon(save, g.pokemon, deOutroJogador);
  else if (tipo === 'item' && g.item && g.quantidade) {
    const itens = (save.itens && typeof save.itens === 'object' ? save.itens : (save.itens = {})) as Record<string, number>;
    itens[g.item] = saldo(itens[g.item]) + g.quantidade;
    // skin comprada (ou devolvida) chega na bolsa, como item
    contarSkinNaBolsa(save, g.item, g.quantidade);
  } else if (tipo === 'gold' && g.quantidade) save.gold = saldo(save.gold) + g.quantidade;
  else throw new ErroConta('Anúncio estragado.', 500);
}

/** Anuncia: `{ tipo: 'pokemon', uid }`, `{ tipo: 'item', item, quantidade }` ou `{ tipo: 'gold', quantidade }`, mais `preco` e `moeda`. */
export function anunciar(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirNivel(conta);
  const tipo = dados.tipo;
  if (tipo !== 'pokemon' && tipo !== 'item' && tipo !== 'gold') throw new ErroConta('Anúncio inválido.');
  const preco = inteiro(dados.preco, 1, PRECO_MAXIMO_MERCADO);
  if (preco === null) throw new ErroConta(`O preço vai de 1 a ${PRECO_MAXIMO_MERCADO.toLocaleString('pt-BR')}.`);
  // gold só se vende por silver (gold por gold não faz sentido)
  const moeda: MoedaMercado = tipo === 'gold' ? 'silver' : dados.moeda === 'gold' ? 'gold' : 'silver';
  if (tipo !== 'gold' && dados.moeda !== 'silver' && dados.moeda !== 'gold') throw new ErroConta('Escolha a moeda do preço.');
  if (banco.anunciosDoVendedor(conta.id).length >= MAX_ANUNCIOS_POR_JOGADOR) throw new ErroConta(`Você pode ter até ${MAX_ANUNCIOS_POR_JOGADOR} anúncios ao mesmo tempo (contando vendas e devoluções que ainda não chegaram).`, 409);

  banco.mudarSaves([conta.id], ([s]) => {
    const save = s as unknown as SaveMin;
    const guardado: Guardado = {};
    if (tipo === 'pokemon') {
      const uid = inteiro(dados.uid, 0, Number.MAX_SAFE_INTEGER);
      const p = uid === null ? undefined : [...save.time, ...save.caixa].find((x) => x.uid === uid);
      if (!p) throw new ErroConta('Este Pokémon não está mais com você.', 409);
      if (p.inegociavel) throw new ErroConta('Pokémon NT não pode ser vendido.', 409);
      if (p.fundido) throw new ErroConta('Separe a fusão antes de vender esse Pokémon.', 409);
      if (p.trancado) throw new ErroConta('Pokémon trancado não pode ser vendido (destranque no PC).', 409);
      if (save.time.filter((x) => x !== p).length < 1) throw new ErroConta('Precisa ficar pelo menos 1 Pokémon no time.', 409);
      save.time = save.time.filter((x) => x !== p);
      save.caixa = save.caixa.filter((x) => x !== p);
      guardado.pokemon = p;
    } else if (tipo === 'item') {
      const item = typeof dados.item === 'string' && /^[a-z0-9-]{1,60}$/.test(dados.item) ? dados.item : '';
      const quantidade = inteiro(dados.quantidade, 1, QUANTIDADE_MAXIMA_MERCADO);
      if (!item || quantidade === null) throw new ErroConta('Anúncio inválido.');
      if (itemInegociavel(item)) throw new ErroConta('Item NT não pode ser vendido.', 409);
      if (!save.itens || typeof save.itens !== 'object') throw new ErroConta('Você não tem essa quantidade do item.', 409);
      // skin só se vende da bolsa (o jogador leva para lá em Minhas skins)
      if (quantidadeNegociavel(save, item) < quantidade) throw new ErroConta(ehSkin(item) ? 'Leve a skin para a bolsa antes de vender (Minhas skins).' : 'Você não tem essa quantidade do item.', 409);
      save.itens[item] = saldo(save.itens[item]) - quantidade;
      if (save.itens[item] <= 0) delete save.itens[item];
      contarSkinNaBolsa(save, item, -quantidade);
      guardado.item = item;
      guardado.quantidade = quantidade;
    } else {
      const quantidade = inteiro(dados.quantidade, 1, PRECO_MAXIMO_MERCADO);
      if (quantidade === null) throw new ErroConta('Quantidade de Origin Coins inválida.');
      if (saldo(save.gold) < quantidade) throw new ErroConta('Você não tem esses Origin Coins.', 409);
      save.gold = saldo(save.gold) - quantidade;
      guardado.quantidade = quantidade;
    }
    banco.criarAnuncioMercado(conta.id, tipo, JSON.stringify(guardado), preco, moeda, Date.now() + VALIDADE_ANUNCIO_MS);
  });
  avisarTodos({ t: 'mercado' });
  return comSave(conta);
}

/** Compra um anúncio: cobra o comprador, entrega a coisa e deixa o pagamento esperando o vendedor. */
export function comprar(conta: banco.Conta, id: number) {
  exigirNivel(conta);
  let vendedor = 0;
  banco.mudarSaves([conta.id], ([s]) => {
    const l = banco.anuncioMercado(id);
    if (!l || l.status !== 'ativo' || l.expira_em <= Date.now()) throw new ErroConta('Este anúncio não está mais à venda.', 409);
    if (l.vendedor === conta.id) throw new ErroConta('Este anúncio é seu.');
    const save = s as unknown as SaveMin;
    const moeda = l.moeda === 'gold' ? 'gold' : 'silver';
    if (saldo(save[moeda]) < l.preco) throw new ErroConta(`Você não tem ${nomeDaMoeda(moeda)} suficientes.`, 409);
    save[moeda] = saldo(save[moeda]) - l.preco;
    entregar(save, l.tipo, JSON.parse(l.dados) as Guardado, true);
    if (!banco.venderAnuncioMercado(id)) throw new ErroConta('Este anúncio não está mais à venda.', 409);
    vendedor = l.vendedor;
  });
  // o jogo do vendedor vem buscar o pagamento; as listas abertas se atualizam
  avisar(vendedor, { t: 'mercado-acerto' });
  avisarTodos({ t: 'mercado' });
  return comSave(conta);
}

/** O vendedor tira o anúncio: a coisa volta para ele. */
export function cancelar(conta: banco.Conta, id: number) {
  banco.mudarSaves([conta.id], ([s]) => {
    const l = banco.anuncioMercado(id);
    if (!l || l.vendedor !== conta.id) throw new ErroConta('Anúncio não encontrado.', 404);
    if (l.status !== 'ativo') throw new ErroConta('Este anúncio já foi vendido.', 409);
    entregar(s as unknown as SaveMin, l.tipo, JSON.parse(l.dados) as Guardado, false);
    banco.apagarAnuncioMercado(id);
  });
  avisarTodos({ t: 'mercado' });
  return comSave(conta);
}

/** O jogo do vendedor veio buscar: paga as vendas (já sem a taxa) e devolve o que venceu, tudo numa mudança só. */
export function receber(conta: banco.Conta) {
  if (!banco.lerSave(conta.id)) return { acertos: [] as AcertoMercado[] };
  const acertos: AcertoMercado[] = [];
  banco.mudarSaves([conta.id], ([s]) => {
    const save = s as unknown as SaveMin;
    for (const l of aBuscar(conta.id)) {
      const g = JSON.parse(l.dados) as Guardado;
      const oQue = { tipo: l.tipo as TipoAnuncio, ...(g.pokemon ? { especieId: g.pokemon.especieId } : {}), ...(g.item ? { item: g.item } : {}), ...(g.quantidade ? { quantidade: g.quantidade } : {}) };
      if (l.status === 'vendido') {
        const moeda = l.moeda === 'gold' ? 'gold' : 'silver';
        const valor = valorDoVendedor(l.preco);
        save[moeda] = saldo(save[moeda]) + valor;
        acertos.push({ motivo: 'vendido', ...oQue, valor, moeda });
      } else {
        entregar(save, l.tipo, g, false);
        acertos.push({ motivo: 'venceu', ...oQue });
      }
      banco.apagarAnuncioMercado(l.id);
    }
  });
  if (!acertos.length) return { acertos };
  const guardado = banco.lerSave(conta.id)!;
  return { acertos, save: JSON.parse(guardado.dados), versao: guardado.versao };
}
