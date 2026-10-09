// Trocas entre jogadores. O SERVIDOR é o juiz: confere no save guardado de cada um se a oferta existe e faz a
// troca nos dois saves de uma vez (tudo ou nada), para ninguém duplicar Pokémon, item ou moeda.
//
// Passo a passo: convite → aceito → cada um monta a sua oferta (Pokémon, itens, silver, gold) no seu tempo →
// cada um CONFIRMA → com os dois confirmados aparece TROCAR → os dois clicam em Trocar → troca feita.
// Depois de confirmar, a oferta fica travada: só dá para Trocar ou Cancelar (pedido do dono). Mudar a oferta
// (antes de confirmar) tira a confirmação e os "trocar" do outro lado (ninguém troca algo que não viu).
// As trocas abertas ficam só na memória do servidor (somem se ele reiniciar; os saves não mudam até o fim).
import { randomBytes } from 'node:crypto';
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';

/** Mesmo do jogo (client/src/estado.ts). */
const TAMANHO_MAXIMO_TIME = 6;
const NUMERO_BOXES = 20;
const TAMANHO_BOX = 30;
const MAX_POKEMONS_POR_OFERTA = 6;
const MAX_TIPOS_DE_ITEM = 20;
/** Convite sem resposta e troca parada somem sozinhos. */
const VALIDADE_CONVITE_MS = 2 * 60 * 1000;
const VALIDADE_TROCA_MS = 15 * 60 * 1000;
/** Troca terminada (feita ou cancelada) fica visível um pouco para o outro lado saber o que aconteceu. */
const MOSTRAR_FIM_MS = 60 * 1000;

export interface Oferta {
  pokemons: number[]; // uid dos Pokémon
  itens: Record<string, number>;
  silver: number;
  gold: number;
}
interface Lado {
  contaId: number;
  usuario: string;
  oferta: Oferta;
  confirmado: boolean;
  trocar: boolean;
  /** Pokémon da oferta como estavam na hora da troca (depois eles já mudaram de dono). */
  fotografia?: ReturnType<typeof resumoPokemon>[];
}
type Status = 'convite' | 'aberta' | 'feita' | 'cancelada';
interface Troca {
  id: string;
  status: Status;
  lados: [Lado, Lado]; // [quem convidou, convidado]
  motivo?: string;
  atualizadaEm: number;
}

const trocas = new Map<string, Troca>();
const ofertaVazia = (): Oferta => ({ pokemons: [], itens: {}, silver: 0, gold: 0 });

// ---- tipos mínimos do save (o resto do save não interessa aqui) ----
type PokemonSave = { uid?: number; especieId: number; nivel: number; shiny?: boolean; genero?: string; item?: string | null; inegociavel?: boolean; trancado?: boolean; box?: number; [k: string]: unknown };
type SaveMin = { time: PokemonSave[]; caixa: PokemonSave[]; itens: Record<string, number>; silver: number; gold: number; proximoIdPokemon?: number; capturados?: number[]; vistos?: number[]; aceitarTrocas?: boolean };

function saveDe(contaId: number): SaveMin {
  const s = banco.lerSave(contaId);
  if (!s) throw new ErroConta('Este jogador ainda não começou o jogo.');
  return JSON.parse(s.dados) as SaveMin;
}

const ativaDe = (contaId: number) =>
  [...trocas.values()].find((t) => (t.status === 'convite' || t.status === 'aberta') && t.lados.some((l) => l.contaId === contaId));

function limparVelhas(): void {
  const agora = Date.now();
  for (const t of trocas.values()) {
    if (t.status === 'convite' && agora - t.atualizadaEm > VALIDADE_CONVITE_MS) encerrar(t, 'cancelada', 'O convite expirou.');
    else if (t.status === 'aberta' && agora - t.atualizadaEm > VALIDADE_TROCA_MS) encerrar(t, 'cancelada', 'A troca ficou parada tempo demais.');
    else if ((t.status === 'feita' || t.status === 'cancelada') && agora - t.atualizadaEm > MOSTRAR_FIM_MS) trocas.delete(t.id);
  }
}
setInterval(limparVelhas, 10 * 1000).unref();

function encerrar(t: Troca, status: 'feita' | 'cancelada', motivo?: string): void {
  t.status = status;
  t.motivo = motivo;
  t.atualizadaEm = Date.now();
}

function trocaDoJogador(id: string, contaId: number): { troca: Troca; eu: Lado; outro: Lado } {
  const troca = trocas.get(id);
  if (!troca) throw new ErroConta('Troca não encontrada.', 404);
  const i = troca.lados.findIndex((l) => l.contaId === contaId);
  if (i < 0) throw new ErroConta('Troca não encontrada.', 404);
  return { troca, eu: troca.lados[i], outro: troca.lados[1 - i] };
}

// ---- conferência da oferta contra o save guardado no servidor ----
function conferirOferta(save: SaveMin, oferta: Oferta, quem: string): PokemonSave[] {
  const todos = [...save.time, ...save.caixa];
  const pokemons = oferta.pokemons.map((uid) => {
    const p = todos.find((x) => x.uid === uid);
    if (!p) throw new ErroConta(`${quem}: um Pokémon da oferta não está mais com o treinador.`, 409);
    if (p.inegociavel) throw new ErroConta(`${quem}: o inicial (NT) não pode ser trocado.`, 409);
    if (p.trancado) throw new ErroConta(`${quem}: Pokémon trancado não pode ser trocado (destranque no PC).`, 409);
    return p;
  });
  if (save.time.filter((p) => !oferta.pokemons.includes(p.uid ?? -1)).length < 1) throw new ErroConta(`${quem}: precisa ficar pelo menos 1 Pokémon no time.`, 409);
  for (const [item, qtd] of Object.entries(oferta.itens)) if ((save.itens[item] ?? 0) < qtd) throw new ErroConta(`${quem}: não tem itens suficientes.`, 409);
  if ((save.silver ?? 0) < oferta.silver) throw new ErroConta(`${quem}: silver insuficiente.`, 409);
  if ((save.gold ?? 0) < oferta.gold) throw new ErroConta(`${quem}: gold insuficiente.`, 409);
  return pokemons;
}

/** Limpa e valida o formato do que veio do jogo (números inteiros, sem repetidos, limites). */
function lerOferta(corpo: Record<string, unknown>): Oferta {
  const inteiro = (v: unknown) => (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null);
  const pokemons = Array.isArray(corpo.pokemons) ? corpo.pokemons.map(inteiro) : [];
  if (pokemons.some((u) => u === null) || new Set(pokemons).size !== pokemons.length) throw new ErroConta('Oferta inválida.');
  if (pokemons.length > MAX_POKEMONS_POR_OFERTA) throw new ErroConta(`No máximo ${MAX_POKEMONS_POR_OFERTA} Pokémon por troca.`);
  const itens: Record<string, number> = {};
  const brutos = corpo.itens && typeof corpo.itens === 'object' ? Object.entries(corpo.itens as Record<string, unknown>) : [];
  if (brutos.length > MAX_TIPOS_DE_ITEM) throw new ErroConta(`No máximo ${MAX_TIPOS_DE_ITEM} tipos de item por troca.`);
  for (const [id, q] of brutos) {
    const qtd = inteiro(q);
    if (!qtd || !/^[a-z0-9-]{1,60}$/.test(id)) throw new ErroConta('Oferta inválida.');
    itens[id] = qtd;
  }
  const silver = inteiro(corpo.silver ?? 0);
  const gold = inteiro(corpo.gold ?? 0);
  if (silver === null || gold === null) throw new ErroConta('Oferta inválida.');
  return { pokemons: pokemons as number[], itens, silver, gold };
}

// ---- o que cada lado vê ----
function resumoPokemon(p: PokemonSave) {
  return { uid: p.uid, especieId: p.especieId, nivel: p.nivel, shiny: !!p.shiny, genero: p.genero ?? 'N', item: p.item ?? null, ivsRevelados: !!p.ivsRevelados, ivsFaixa: !!p.ivsFaixa, ivs: p.ivsRevelados || p.ivsFaixa ? p.ivs : undefined };
}
function verLado(l: Lado) {
  let pokemons: ReturnType<typeof resumoPokemon>[] = l.fotografia ?? [];
  if (!l.fotografia) try {
    const save = saveDe(l.contaId);
    const todos = [...save.time, ...save.caixa];
    pokemons = l.oferta.pokemons.map((uid) => todos.find((p) => p.uid === uid)).filter((p): p is PokemonSave => !!p).map(resumoPokemon);
  } catch {
    // sem save: oferta vazia
  }
  return { usuario: l.usuario, confirmado: l.confirmado, trocar: l.trocar, oferta: { ...l.oferta, pokemons } };
}
export function verTroca(t: Troca, contaId: number) {
  const i = t.lados.findIndex((l) => l.contaId === contaId);
  return { id: t.id, status: t.status, motivo: t.motivo ?? null, souConvidado: i === 1, eu: verLado(t.lados[i]), outro: verLado(t.lados[1 - i]) };
}

// ---- ações ----
export function convidar(de: banco.Conta, usuario: unknown) {
  limparVelhas();
  if (typeof usuario !== 'string' || !usuario.trim()) throw new ErroConta('Diga com quem quer trocar.');
  const para = banco.contaPorUsuario(usuario.trim());
  if (!para) throw new ErroConta('Jogador não encontrado.', 404);
  if (para.id === de.id) throw new ErroConta('Você não pode trocar com você mesmo.');
  saveDe(de.id);
  if (saveDe(para.id).aceitarTrocas === false) throw new ErroConta(`${para.usuario} não está aceitando trocas.`, 403);
  if (ativaDe(de.id)) throw new ErroConta('Você já está numa troca.', 409);
  if (ativaDe(para.id)) throw new ErroConta(`${para.usuario} já está numa troca.`, 409);
  const lado = (c: banco.Conta): Lado => ({ contaId: c.id, usuario: c.usuario, oferta: ofertaVazia(), confirmado: false, trocar: false });
  const t: Troca = { id: randomBytes(9).toString('base64url'), status: 'convite', lados: [lado(de), lado(para)], atualizadaEm: Date.now() };
  trocas.set(t.id, t);
  return verTroca(t, de.id);
}

/** A troca aberta (ou o fim recente dela) e os convites recebidos. */
export function atual(conta: banco.Conta) {
  limparVelhas();
  const minhas = [...trocas.values()].filter((t) => t.lados.some((l) => l.contaId === conta.id));
  const ativa = minhas.find((t) => t.status === 'aberta' || (t.status === 'convite' && t.lados[0].contaId === conta.id));
  const convites = minhas.filter((t) => t.status === 'convite' && t.lados[1].contaId === conta.id).map((t) => ({ id: t.id, de: t.lados[0].usuario }));
  // terminou há pouco: mostra o resultado (feita/cancelada) uma vez para quem estava nela
  const fim = ativa ? undefined : minhas.filter((t) => t.status === 'feita' || t.status === 'cancelada').sort((a, b) => b.atualizadaEm - a.atualizadaEm)[0];
  const t = ativa ?? fim;
  return { troca: t ? verTroca(t, conta.id) : null, convites };
}

export function responderConvite(conta: banco.Conta, id: string, aceitar: boolean) {
  const { troca, eu } = trocaDoJogador(id, conta.id);
  if (troca.status !== 'convite' || troca.lados[1] !== eu) throw new ErroConta('Este convite não está mais valendo.', 409);
  if (!aceitar) encerrar(troca, 'cancelada', `${eu.usuario} recusou a troca.`);
  else {
    troca.status = 'aberta';
    troca.atualizadaEm = Date.now();
  }
  return verTroca(troca, conta.id);
}

export function mudarOferta(conta: banco.Conta, id: string, corpo: Record<string, unknown>) {
  const { troca, eu } = trocaDoJogador(id, conta.id);
  if (troca.status !== 'aberta') throw new ErroConta('A troca não está aberta.', 409);
  if (eu.confirmado) throw new ErroConta('Você já confirmou: agora só dá para trocar ou cancelar.', 409);
  const oferta = lerOferta(corpo);
  conferirOferta(saveDe(conta.id), oferta, 'Você');
  eu.oferta = oferta;
  // mudou algo: os dois precisam conferir e confirmar de novo
  for (const l of troca.lados) (l.confirmado = false), (l.trocar = false);
  troca.atualizadaEm = Date.now();
  return verTroca(troca, conta.id);
}

export function confirmar(conta: banco.Conta, id: string, confirmado: boolean) {
  const { troca, eu } = trocaDoJogador(id, conta.id);
  if (troca.status !== 'aberta') throw new ErroConta('A troca não está aberta.', 409);
  // confirmado não volta atrás: só trocar ou cancelar
  if (!confirmado) throw new ErroConta('Depois de confirmar, só dá para trocar ou cancelar.', 409);
  conferirOferta(saveDe(conta.id), eu.oferta, 'Você');
  eu.confirmado = true;
  troca.atualizadaEm = Date.now();
  return verTroca(troca, conta.id);
}

export function cancelar(conta: banco.Conta, id: string) {
  const { troca, eu } = trocaDoJogador(id, conta.id);
  if (troca.status === 'convite' || troca.status === 'aberta') encerrar(troca, 'cancelada', `${eu.usuario} cancelou a troca.`);
  return verTroca(troca, conta.id);
}

/** Clicar em Trocar. Quando os dois clicaram, a troca acontece nos dois saves de uma vez. */
export function trocar(conta: banco.Conta, id: string) {
  const { troca, eu } = trocaDoJogador(id, conta.id);
  if (troca.status !== 'aberta') throw new ErroConta('A troca não está aberta.', 409);
  if (!troca.lados.every((l) => l.confirmado)) throw new ErroConta('Os dois precisam confirmar antes de trocar.', 409);
  eu.trocar = true;
  troca.atualizadaEm = Date.now();
  if (troca.lados.every((l) => l.trocar)) executar(troca);
  return verTroca(troca, conta.id);
}

function executar(troca: Troca): void {
  const [a, b] = troca.lados;
  for (const l of troca.lados) l.fotografia = verLado(l).oferta.pokemons;
  try {
    banco.mudarSaves([a.contaId, b.contaId], ([sa, sb]) => {
      const saveA = sa as unknown as SaveMin;
      const saveB = sb as unknown as SaveMin;
      const pokesA = conferirOferta(saveA, a.oferta, a.usuario);
      const pokesB = conferirOferta(saveB, b.oferta, b.usuario);
      tirar(saveA, a.oferta, pokesA);
      tirar(saveB, b.oferta, pokesB);
      dar(saveA, b.oferta, pokesB);
      dar(saveB, a.oferta, pokesA);
    });
    encerrar(troca, 'feita');
  } catch (e) {
    // algo mudou desde a confirmação (gastou, soltou…): volta para os dois conferirem
    for (const l of troca.lados) (l.confirmado = false), (l.trocar = false), delete l.fotografia;
    troca.atualizadaEm = Date.now();
    throw e instanceof ErroConta ? e : new ErroConta('Não foi possível fazer a troca.', 500);
  }
}

function tirar(save: SaveMin, oferta: Oferta, pokemons: PokemonSave[]): void {
  save.time = save.time.filter((p) => !pokemons.includes(p));
  save.caixa = save.caixa.filter((p) => !pokemons.includes(p));
  for (const [item, qtd] of Object.entries(oferta.itens)) {
    save.itens[item] -= qtd;
    if (save.itens[item] <= 0) delete save.itens[item];
  }
  save.silver -= oferta.silver;
  save.gold -= oferta.gold;
}

function dar(save: SaveMin, oferta: Oferta, pokemons: PokemonSave[]): void {
  for (const original of pokemons) {
    // cópia: ID novo (do dono novo), sem cadeado e sem box antiga
    const p: PokemonSave = structuredClone(original);
    p.uid = save.proximoIdPokemon = Math.max(save.proximoIdPokemon ?? 1, ...[...save.time, ...save.caixa].map((x) => (x.uid ?? 0) + 1));
    save.proximoIdPokemon = p.uid + 1;
    delete p.trancado;
    delete p.box;
    if (save.time.length < TAMANHO_MAXIMO_TIME) save.time.push(p);
    else {
      const box = Array.from({ length: NUMERO_BOXES }, (_, i) => i).find((i) => save.caixa.filter((x) => (x.box ?? 0) === i).length < TAMANHO_BOX);
      if (box === undefined) throw new ErroConta('O PC de um dos jogadores está cheio.', 409);
      p.box = box;
      save.caixa.push(p);
    }
    for (const lista of ['capturados', 'vistos'] as const) {
      const l = (save[lista] ??= []);
      if (!l.includes(p.especieId)) l.push(p.especieId);
    }
  }
  for (const [item, qtd] of Object.entries(oferta.itens)) save.itens[item] = (save.itens[item] ?? 0) + qtd;
  save.silver = (save.silver ?? 0) + oferta.silver;
  save.gold = (save.gold ?? 0) + oferta.gold;
}
