// Liga Pokémon e Liga Nightmare (regras em shared/liga.ts). A staff monta os times (Administração → Liga); o servidor
// guarda os times e o progresso de cada jogador na semana, entrega o próximo time e paga o prêmio no fim.
// As batalhas ainda são calculadas no navegador (como Ninho e Boss): o servidor só confere a ordem e a semana.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisarEvento } from './mundo.ts';
import { lerNome, lerPokemon } from './entregas.ts';
import { NIVEL_MINIMO, liberado } from '../../shared/trancas.ts';
import { nivelTreinador } from '../../shared/treinador.ts';
import { ETAPAS_LIGA, NIVEL_MAXIMO_LIGA, NOME_LIGA, POKEMON_POR_TIME_LIGA, PREMIO_LIGA, fimDaSemanaDaLiga, semanaDaLiga, type TipoLiga } from '../../shared/liga.ts';

interface TimeLiga { nome: string; pokemon: Record<string, unknown>[] }
type TimesLiga = Record<TipoLiga, Record<string, TimeLiga>>;
interface Progresso { semana: number; etapa: number; estado: 'jogando' | 'perdeu' | 'venceu'; lutando: boolean }
type Progressos = Record<string, Partial<Record<TipoLiga, Progresso>>>;

const times = (): TimesLiga => banco.lerEvento<TimesLiga>('liga-times') ?? { normal: {}, nightmare: {} };
const progressos = (): Progressos => banco.lerEvento<Progressos>('liga-progresso') ?? {};
const lerLiga = (v: unknown): TipoLiga => {
  if (v === 'normal' || v === 'nightmare') return v;
  throw new ErroConta('Liga inválida.');
};
const prontas = (t: TimesLiga, liga: TipoLiga) => ETAPAS_LIGA[liga].every((e) => (t[liga][e.chave]?.pokemon.length ?? 0) > 0);
const nomeDaEtapa = (t: TimesLiga, liga: TipoLiga, i: number) => t[liga][ETAPAS_LIGA[liga][i].chave]?.nome || ETAPAS_LIGA[liga][i].padrao;

function nomeDe(conta: banco.Conta): string {
  try {
    const s = banco.lerSave(conta.id);
    const n = s ? (JSON.parse(s.dados) as { aparencia?: { nome?: unknown } }).aparencia?.nome : null;
    if (typeof n === 'string' && n.trim()) return n.trim().slice(0, 16);
  } catch {
    // fica o usuário
  }
  return conta.usuario;
}

function exigirNivel(conta: banco.Conta): void {
  const guardado = banco.lerSave(conta.id);
  if (!guardado) throw new ErroConta('Comece sua jornada antes de entrar na Liga.');
  const xp = (JSON.parse(guardado.dados) as Record<string, unknown>).xpTreinador;
  if (!liberado('liga', nivelTreinador(typeof xp === 'number' && xp > 0 ? xp : 0), !!conta.admin)) throw new ErroConta(`A Liga abre no nível ${NIVEL_MINIMO.liga} de treinador.`, 403);
}

/** Progresso desta semana (o da semana passada não vale mais). */
function progressoDe(p: Progressos, conta: banco.Conta, liga: TipoLiga, agora: number): Progresso | null {
  const atual = p[conta.id]?.[liga];
  return atual && atual.semana === semanaDaLiga(agora) ? atual : null;
}

/** O que o jogador vê: etapas (nomes), onde ele está e quando a semana vira. Os times não são revelados. */
export function estado(conta: banco.Conta, agora = Date.now()) {
  const t = times();
  const p = progressos();
  const ligas = (['normal', 'nightmare'] as const).map((liga) => {
    const meu = progressoDe(p, conta, liga, agora);
    return {
      liga, nome: NOME_LIGA[liga], pronta: prontas(t, liga),
      etapas: ETAPAS_LIGA[liga].map((_, i) => nomeDaEtapa(t, liga, i)),
      etapa: meu?.etapa ?? 0, estado: meu?.estado ?? null, premio: PREMIO_LIGA[liga],
    };
  });
  return { ligas, viraEm: fimDaSemanaDaLiga(agora) };
}

/**
 * Começa (ou continua) a Liga e devolve o próximo time. Sair no meio de uma batalha (fechou o jogo) conta como derrota,
 * senão daria para fugir de uma luta perdida e tentar de novo.
 */
export function entrar(conta: banco.Conta, dados: Record<string, unknown>, agora = Date.now()) {
  const liga = lerLiga(dados.liga);
  exigirNivel(conta);
  const t = times();
  if (!prontas(t, liga)) throw new ErroConta('Esta Liga ainda está sendo preparada pela staff.', 409);
  const p = progressos();
  let meu = progressoDe(p, conta, liga, agora);
  if (meu?.lutando) {
    meu.lutando = false;
    meu.estado = 'perdeu';
    banco.gravarEvento('liga-progresso', p);
    throw new ErroConta('Você saiu no meio da última batalha e foi eliminado. Tente de novo na semana que vem.', 409);
  }
  if (meu && meu.estado !== 'jogando') throw new ErroConta(meu.estado === 'venceu' ? 'Você já venceu esta Liga nesta semana.' : 'Você foi derrotado nesta semana. Tente de novo na semana que vem.', 409);
  if (!meu) {
    meu = { semana: semanaDaLiga(agora), etapa: 0, estado: 'jogando', lutando: false };
    (p[conta.id] ??= {})[liga] = meu;
  }
  meu.lutando = true;
  banco.gravarEvento('liga-progresso', p);
  const time = t[liga][ETAPAS_LIGA[liga][meu.etapa].chave];
  return { etapa: meu.etapa, total: ETAPAS_LIGA[liga].length, nome: nomeDaEtapa(t, liga, meu.etapa), equipe: time.pokemon };
}

/** Fim de uma batalha da Liga. Venceu a última = prêmio por entrega e aviso no letreiro. */
export function resultado(conta: banco.Conta, dados: Record<string, unknown>, agora = Date.now()) {
  const liga = lerLiga(dados.liga);
  const p = progressos();
  const meu = progressoDe(p, conta, liga, agora);
  if (!meu?.lutando) throw new ErroConta('Você não está numa batalha da Liga.', 409);
  meu.lutando = false;
  if (dados.venceu !== true) meu.estado = 'perdeu';
  else if (++meu.etapa >= ETAPAS_LIGA[liga].length) {
    meu.estado = 'venceu';
    const premio = PREMIO_LIGA[liga];
    banco.criarEntrega(conta.id, 'silver', `${NOME_LIGA[liga]}: Poké Dólares`, premio.silver, 'liga');
    banco.criarEntrega(conta.id, premio.moeda, `${NOME_LIGA[liga]}: ${premio.nomeMoeda}`, premio.quantidade, 'liga');
    avisarEvento(`🏆 ${nomeDe(conta)} venceu a ${NOME_LIGA[liga]}!`);
  }
  banco.gravarEvento('liga-progresso', p);
  return estado(conta, agora);
}

// ---- staff ----
const exigirStaff = (conta: banco.Conta) => {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
};

export function timesDaStaff(conta: banco.Conta) {
  exigirStaff(conta);
  return { times: times() };
}

/** Grava o time inteiro de uma etapa (nome do treinador + até 6 Pokémon). */
export function gravarTime(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const liga = lerLiga(dados.liga);
  const etapa = ETAPAS_LIGA[liga].find((e) => e.chave === dados.chave);
  if (!etapa) throw new ErroConta('Etapa inválida.');
  const lista = Array.isArray(dados.pokemon) ? dados.pokemon : [];
  if (lista.length > POKEMON_POR_TIME_LIGA) throw new ErroConta(`No máximo ${POKEMON_POR_TIME_LIGA} Pokémon por time.`);
  const t = times();
  t[liga][etapa.chave] = { nome: lerNome(dados.nome).slice(0, 30), pokemon: lista.map((x) => lerPokemon(x, NIVEL_MAXIMO_LIGA[liga]) as unknown as Record<string, unknown>) };
  banco.gravarEvento('liga-times', t);
  return { times: t };
}
