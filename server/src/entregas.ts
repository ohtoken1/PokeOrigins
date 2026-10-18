// Itens dados pela administração (Administração → Dar item): o pedido fica guardado como uma ENTREGA e entra no
// save quando o jogo do jogador vem buscar (na hora, se ele está online; no próximo login, se não está). Assim o
// save de quem está jogando não é trocado por baixo dele. Futuramente estas linhas também alimentam o Log.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisar } from './mundo.ts';
import { guardarPokemon, type PokemonSave, type SaveMin } from './trocas.ts';

/** Entregas que vão para um saldo do save, não para a bolsa (prêmios de eventos). */
const SALDOS: Record<string, string> = { silver: 'silver', gold: 'gold', fragmentos: 'fragmentos', 'pontos-guilda': 'pontosGuilda', 'league-coins': 'leagueCoins', 'league-coins-nightmare': 'leagueCoinsNightmare' };

/** Medalhas de torneio (entregues como item, vão para save.estatisticas). */
const MEDALHAS: Record<string, string> = { 'medalha-ouro': 'medalhasOuro', 'medalha-prata': 'medalhasPrata', 'medalha-bronze': 'medalhasBronze' };

/** Limites de um pedido. */
const QUANTIDADE_MAX = 9999;
const PENDENTES_MAX = 200;

export const lerNome = (v: unknown) => (typeof v === 'string' ? v.replace(/\p{Cc}|\p{Cf}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) : '');

/** A administração manda um item para um jogador. */
export function darItem(conta: banco.Conta, dados: Record<string, unknown>) {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
  const usuario = typeof dados.usuario === 'string' ? dados.usuario.trim() : '';
  const para = usuario ? banco.contaPorUsuario(usuario) : undefined;
  if (!para) throw new ErroConta('Jogador não encontrado.', 404);
  const item = typeof dados.item === 'string' ? dados.item : '';
  if (!/^[a-z0-9-]{1,60}$/.test(item)) throw new ErroConta('Item inválido.');
  const quantidade = dados.quantidade;
  if (typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MAX) throw new ErroConta(`A quantidade vai de 1 a ${QUANTIDADE_MAX}.`);
  if (banco.entregasDaConta(para.id).length >= PENDENTES_MAX) throw new ErroConta('Este jogador já tem entregas demais esperando.', 409);
  banco.criarEntrega(para.id, item, lerNome(dados.nome) || item, quantidade, conta.usuario);
  // quem está com o jogo aberto vem buscar agora
  avisar(para.id, { t: 'entrega' });
  return { usuario: para.usuario };
}

const ATRIBUTOS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const inteiro = (v: unknown, minimo: number, maximo: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= minimo && v <= maximo;
const texto = (v: unknown, formato: RegExp): v is string => typeof v === 'string' && formato.test(v);

/**
 * Confere o Pokémon montado em Administração → Dar Pokémon e devolve só os campos conhecidos. O servidor não tem
 * os dados das espécies (isso é do jogo): aqui só se garante o formato e os limites (IV 0–31, EV 252/510…).
 */
export function lerPokemon(v: unknown, nivelMaximo = 100): PokemonSave {
  const invalido = () => new ErroConta('Pokémon inválido.');
  if (!v || typeof v !== 'object') throw invalido();
  const p = v as Record<string, unknown>;
  const pontos = (bruto: unknown, maximo: number) => {
    if (!bruto || typeof bruto !== 'object') throw invalido();
    const o = bruto as Record<string, unknown>;
    if (!ATRIBUTOS.every((a) => inteiro(o[a], 0, maximo))) throw invalido();
    return Object.fromEntries(ATRIBUTOS.map((a) => [a, o[a] as number]));
  };
  const ivs = pontos(p.ivs, 31);
  const evs = pontos(p.evs, 252);
  if (Object.values(evs).reduce((s, n) => s + n, 0) > 510) throw new ErroConta('Os EVs somam no máximo 510.');
  const golpes = Array.isArray(p.golpes) ? p.golpes : [];
  if (golpes.length < 1 || golpes.length > 4) throw new ErroConta('O Pokémon precisa de 1 a 4 golpes.');
  const lidos = golpes.map((g) => {
    const o = (g ?? {}) as Record<string, unknown>;
    if (!texto(o.id, /^[a-z0-9]{1,30}$/) || !inteiro(o.pp, 0, 64)) throw invalido();
    return { id: o.id, pp: o.pp };
  });
  if (new Set(lidos.map((g) => g.id)).size !== lidos.length) throw new ErroConta('Golpe repetido.');
  if (!inteiro(p.especieId, 1, 99999) || !inteiro(p.nivel, 1, nivelMaximo) || !inteiro(p.exp, 0, 100_000_000) || !inteiro(p.hp, 1, 9999)) throw invalido();
  if (!texto(p.natureza, /^[A-Za-z]{3,12}$/) || !texto(p.habilidade, /^[A-Za-z0-9' .()-]{1,40}$/) || !texto(p.genero, /^[MFN]$/)) throw invalido();
  if (p.teraTipo !== undefined && !texto(p.teraTipo, /^[A-Za-z]{3,10}$/)) throw invalido();
  return {
    especieId: p.especieId, nivel: p.nivel, exp: p.exp, shiny: p.shiny === true, natureza: p.natureza, habilidade: p.habilidade, genero: p.genero,
    ivs, evs, golpes: lidos, hp: p.hp, status: null, amizade: 50,
    // já vem avaliado (quem recebe vê o tier) e não conta para as conquistas de "consiga um…", como prêmio de ticket
    ivsFaixa: true, origem: 'ticket',
    ...(p.teraTipo ? { teraTipo: p.teraTipo } : {}),
    ...(p.inegociavel === true ? { inegociavel: true } : {}),
  };
}

/** A administração manda um Pokémon montado para um jogador. */
export function darPokemon(conta: banco.Conta, dados: Record<string, unknown>) {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
  const usuario = typeof dados.usuario === 'string' ? dados.usuario.trim() : '';
  const para = usuario ? banco.contaPorUsuario(usuario) : undefined;
  if (!para) throw new ErroConta('Jogador não encontrado.', 404);
  if (!banco.lerSave(para.id)) throw new ErroConta('Este jogador ainda não começou o jogo.', 409);
  const pokemon = lerPokemon(dados.pokemon);
  if (banco.entregasPokemonDaConta(para.id).length >= PENDENTES_MAX) throw new ErroConta('Este jogador já tem entregas demais esperando.', 409);
  banco.criarEntregaPokemon(para.id, JSON.stringify(pokemon), lerNome(dados.nome) || 'Pokémon', conta.usuario);
  avisar(para.id, { t: 'entrega' });
  return { usuario: para.usuario };
}

/** Quantas entregas esperam por este jogador. */
export const pendentes = (conta: banco.Conta) => ({ pendentes: banco.entregasDaConta(conta.id).length + banco.entregasPokemonDaConta(conta.id).length });

/** O jogo veio buscar: põe os itens no save guardado e apaga as entregas (tudo numa mudança só). */
export function receber(conta: banco.Conta) {
  if (!banco.lerSave(conta.id)) return { entregas: [] };
  let entregues: { nome: string; quantidade: number }[] = [];
  banco.mudarSaves([conta.id], ([save]) => {
    const lista = banco.entregasDaConta(conta.id);
    const itens = (save.itens && typeof save.itens === 'object' ? save.itens : (save.itens = {})) as Record<string, unknown>;
    for (const e of lista) {
      // Poké Dólares e Origin Coins (prêmios de eventos): vão para o saldo, não para a bolsa
      // medalhas de torneio: contam no perfil e no ranking (save.estatisticas)
      const medalha = MEDALHAS[e.item];
      if (medalha) {
        const est = (save.estatisticas && typeof save.estatisticas === 'object' ? save.estatisticas : (save.estatisticas = {})) as Record<string, unknown>;
        const atual = est[medalha];
        est[medalha] = (typeof atual === 'number' && Number.isFinite(atual) ? atual : 0) + e.quantidade;
        banco.apagarEntrega(e.id);
        continue;
      }
      const saldo = SALDOS[e.item];
      if (saldo) {
        const atual = save[saldo];
        save[saldo] = (typeof atual === 'number' && Number.isFinite(atual) ? atual : 0) + e.quantidade;
        banco.apagarEntrega(e.id);
        continue;
      }
      const tem = typeof itens[e.item] === 'number' && Number.isFinite(itens[e.item]) ? Math.max(0, Math.floor(itens[e.item] as number)) : 0;
      itens[e.item] = tem + e.quantidade;
      banco.apagarEntrega(e.id);
    }
    entregues = lista.map((e) => ({ nome: e.nome, quantidade: e.quantidade }));
    // Pokémon: vão para o time se couber, senão para a primeira box com espaço (PC cheio = fica esperando)
    for (const e of banco.entregasPokemonDaConta(conta.id)) {
      guardarPokemon(save as unknown as SaveMin, JSON.parse(e.dados) as PokemonSave, false);
      banco.apagarEntregaPokemon(e.id);
      entregues.push({ nome: e.nome, quantidade: 1 });
    }
  });
  const guardado = banco.lerSave(conta.id)!;
  return { entregas: entregues, save: JSON.parse(guardado.dados), versao: guardado.versao };
}
