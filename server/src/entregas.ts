// Itens dados pela administração (Administração → Dar item): o pedido fica guardado como uma ENTREGA e entra no
// save quando o jogo do jogador vem buscar (na hora, se ele está online; no próximo login, se não está). Assim o
// save de quem está jogando não é trocado por baixo dele. Futuramente estas linhas também alimentam o Log.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { itemExiste } from './motorDoJogo.ts';
import * as correio from './correio.ts';
import { guardarPokemon, type PokemonSave, type SaveMin } from './trocas.ts';

/** Entregas que vão para um saldo do save, não para a bolsa (prêmios de eventos). */
/** Anexo "dias de VIP": a quantidade é o número de dias (no máximo `VIP_DIAS_MAX` por anexo). */
export const VIP_DIAS = 'vip-dias';
const VIP_DIAS_MAX = 3650;
const SALDOS: Record<string, string> = { silver: 'silver', gold: 'gold', fragmentos: 'fragmentos', 'pontos-guilda': 'pontosGuilda', 'league-coins': 'leagueCoins', 'league-coins-nightmare': 'leagueCoinsNightmare' };

/** Medalhas de torneio (entregues como item, vão para save.estatisticas). */
const MEDALHAS: Record<string, string> = { 'medalha-ouro': 'medalhasOuro', 'medalha-prata': 'medalhasPrata', 'medalha-bronze': 'medalhasBronze' };
/** O que a staff pode mandar: um item do jogo, um saldo (Poké Dólares, Origin Coins…), medalha ou dias de VIP. */
export const itemAceito = (id: string) => /^[a-z0-9-]{1,60}$/.test(id) && (itemExiste(id) || Object.hasOwn(SALDOS, id) || Object.hasOwn(MEDALHAS, id) || id === VIP_DIAS);

/** Limites de um pedido. */
const QUANTIDADE_MAX = 9999;

export const lerNome = (v: unknown) => (typeof v === 'string' ? v.replace(/\p{Cc}|\p{Cf}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) : '');

/** A administração manda um item para um jogador. */
export function darItem(conta: banco.Conta, dados: Record<string, unknown>) {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
  const usuario = typeof dados.usuario === 'string' ? dados.usuario.trim() : '';
  const para = usuario ? banco.contaPorUsuario(usuario) : undefined;
  if (!para) throw new ErroConta('Jogador não encontrado.', 404);
  const item = typeof dados.item === 'string' ? dados.item : '';
  if (!itemAceito(item)) throw new ErroConta('Este item não existe no jogo.');
  const quantidade = dados.quantidade;
  if (typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MAX) throw new ErroConta(`A quantidade vai de 1 a ${QUANTIDADE_MAX}.`);
  // chega pelo correio (o jogador resgata quando quiser)
  correio.enviar(para.id, 'Presente da staff', 'A administração mandou um presente para você.', [correio.anexoItem(item, lerNome(dados.nome) || item, quantidade)], 'staff');
  return { usuario: para.usuario };
}

const ATRIBUTOS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const inteiro = (v: unknown, minimo: number, maximo: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= minimo && v <= maximo;
const texto = (v: unknown, formato: RegExp): v is string => typeof v === 'string' && formato.test(v);

/**
 * Confere o Pokémon montado em Administração → Dar Pokémon e devolve só os campos conhecidos. O servidor não tem
 * os dados das espécies (isso é do jogo): aqui só se garante o formato e os limites (IV 0–31, EV 252/510…).
 */
/** `comItem` = aceita o item segurado (times de NPC montados pela staff). */
export function lerPokemon(v: unknown, nivelMaximo = 100, comItem = false): PokemonSave {
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
  const item = comItem && typeof p.item === 'string' && /^[a-z0-9-]{1,40}$/.test(p.item) ? p.item : null;
  return {
    especieId: p.especieId, nivel: p.nivel, exp: p.exp, shiny: p.shiny === true, natureza: p.natureza, habilidade: p.habilidade, genero: p.genero,
    ivs, evs, golpes: lidos, hp: p.hp, status: null, amizade: 50,
    // já vem avaliado (quem recebe vê o tier) e não conta para as conquistas de "consiga um…", como prêmio de ticket
    ivsFaixa: true, origem: 'ticket', obtido: 'presente',
    ...(p.teraTipo ? { teraTipo: p.teraTipo } : {}),
    ...(p.inegociavel === true ? { inegociavel: true } : {}),
    ...(item ? { item } : {}),
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
  correio.enviar(para.id, 'Presente da staff', 'A administração mandou um Pokémon para você.', [{ tipo: 'pokemon', nome: lerNome(dados.nome) || 'Pokémon', dados: pokemon }], 'staff');
  return { usuario: para.usuario };
}

/** Quantas entregas esperam por este jogador. */
export const pendentes = (conta: banco.Conta) => ({ pendentes: banco.entregasDaConta(conta.id).length + banco.entregasPokemonDaConta(conta.id).length });

/**
 * Põe um item no save: Poké Dólares, Origin Coins etc. vão para o saldo; medalhas de torneio para save.estatisticas
 * (perfil e ranking); o resto para a bolsa. Usado aqui e no correio (server/src/correio.ts).
 */
export function aplicarItem(save: Record<string, unknown>, item: string, quantidade: number): void {
  const somar = (dono: Record<string, unknown>, chave: string) => {
    const atual = dono[chave];
    dono[chave] = (typeof atual === 'number' && Number.isFinite(atual) ? Math.max(0, atual) : 0) + quantidade;
  };
  // dias de VIP (Correio da staff, pedido do dono para o Closed Beta): somam a partir do maior entre agora e o VIP atual
  if (item === VIP_DIAS) {
    const ate = typeof save.vipAte === 'number' && Number.isFinite(save.vipAte) ? save.vipAte : 0;
    save.vipAte = Math.max(ate, Date.now()) + Math.min(quantidade, VIP_DIAS_MAX) * 86_400_000;
    return;
  }
  const medalha = Object.hasOwn(MEDALHAS, item) ? MEDALHAS[item] : undefined;
  if (medalha) return somar((save.estatisticas && typeof save.estatisticas === 'object' ? save.estatisticas : (save.estatisticas = {})) as Record<string, unknown>, medalha);
  const saldo = Object.hasOwn(SALDOS, item) ? SALDOS[item] : undefined;
  if (saldo) return somar(save, saldo);
  const itens = (save.itens && typeof save.itens === 'object' ? save.itens : (save.itens = {})) as Record<string, unknown>;
  if (typeof itens[item] === 'number') itens[item] = Math.floor(itens[item] as number);
  somar(itens, item);
}

/**
 * Marca de conquista anotada pelo SERVIDOR (o jogo confere as conquistas pelas marcas do save; ver
 * client/src/conquistas.ts). Só use dentro de uma mudança do save guardado (mudarSaves).
 */
export function marcarConquistaNoSave(save: Record<string, unknown>, marca: string): void {
  const c = (save.conquistas && typeof save.conquistas === 'object' ? save.conquistas : (save.conquistas = { feitas: {}, marcas: {} })) as Record<string, unknown>;
  const marcas = (c.marcas && typeof c.marcas === 'object' ? c.marcas : (c.marcas = {})) as Record<string, number>;
  marcas[marca] = (Number.isSafeInteger(marcas[marca]) ? marcas[marca] : 0) + 1;
}

/** O jogo veio buscar: põe os itens no save guardado e apaga as entregas (tudo numa mudança só). */
export function receber(conta: banco.Conta) {
  if (!banco.lerSave(conta.id)) return { entregas: [] };
  let entregues: { nome: string; quantidade: number }[] = [];
  banco.mudarSaves([conta.id], ([save]) => {
    const lista = banco.entregasDaConta(conta.id);
    for (const e of lista) {
      aplicarItem(save, e.item, e.quantidade);
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
