// Liga Pokémon e Liga Nightmare (regras em shared/liga.ts). A staff monta os times (Administração → Liga); o servidor
// guarda os times e o progresso de cada jogador na semana, entrega o próximo time e paga o prêmio no fim.
// O desafio é feito de uma vez (pedido do dono, 20/10/2026): o time de 6 é travado no começo, não é curado (só
// remédios entre as batalhas), as batalhas são calculadas AQUI (server/src/pvp.ts, 180 s por turno) e seguem em
// sequência sozinhas; sair do jogo não para nada. Perdeu = fim; largou = derrota.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import * as correio from './correio.ts';
import { avisar, avisarEvento } from './mundo.ts';
import { criarBatalhaPve, emBatalha } from './pvp.ts';
import { nomeDaEspecie, usarRemedioNaLiga } from './motorDoJogo.ts';
import { lerNome, lerPokemon } from './entregas.ts';
import { NIVEL_MINIMO, liberado } from '../../shared/trancas.ts';
import { nivelTreinador } from '../../shared/treinador.ts';
import { ETAPAS_LIGA, INTERVALO_LIGA_MS, NIVEL_MAXIMO_LIGA, TEMPO_TURNO_LIGA_MS, NOME_LIGA, POKEMON_POR_TIME_LIGA, PREMIO_LIGA, fimDaSemanaDaLiga, semanaDaLiga, type TipoLiga } from '../../shared/liga.ts';

interface TimeLiga { nome: string; pokemon: Record<string, unknown>[] }
type TimesLiga = Record<TipoLiga, Record<string, TimeLiga>>;
/** `pago` = as moedas do desafio já foram mandadas (uma carta só, no fim). */
interface Progresso {
  semana: number; etapa: number; estado: 'jogando' | 'perdeu' | 'venceu'; lutando: boolean; pago?: boolean;
  /** time travado no começo do desafio, com HP/status/PP de agora */
  time?: Record<string, unknown>[];
  /** quando a próxima batalha começa sozinha (depois de uma vitória) */
  proximaEm?: number | null;
}
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

/**
 * Fim do desafio (pedido do dono, 20/10/2026): UMA carta com tudo — `porVitoria` por treinador vencido e, se venceu
 * todos, o bônus e os Poké Dólares. Vale para derrota, vitória e desafio largado (que conta como derrota).
 */
function pagar(contaId: number, liga: TipoLiga, meu: Progresso): void {
  if (meu.pago) return;
  meu.pago = true;
  const premio = PREMIO_LIGA[liga];
  const total = ETAPAS_LIGA[liga].length;
  const venceuTudo = meu.estado === 'venceu';
  const moedas = meu.etapa * premio.porVitoria + (venceuTudo ? premio.bonus : 0);
  if (!moedas) return;
  const anexos = [correio.anexoItem(premio.moeda, premio.nomeMoeda, moedas)];
  if (venceuTudo) anexos.unshift(correio.anexoItem('silver', 'Poké Dólares', premio.silver));
  correio.enviar(contaId, NOME_LIGA[liga], venceuTudo
    ? `Parabéns! Você venceu a ${NOME_LIGA[liga]}: ${total * premio.porVitoria} pelas vitórias + ${premio.bonus} de bônus por vencer todos.`
    : `Seu desafio na ${NOME_LIGA[liga]} terminou: você venceu ${meu.etapa} de ${total} treinadores.`, anexos, 'liga');
}

/** Nome de treinador do save (aparece na batalha). */
const nomeDaConta = (conta: banco.Conta) => nomeDe(conta);

/**
 * Começa a batalha da etapa atual NO SERVIDOR (server/src/pvp.ts, `criarBatalhaPve`): o time do desafio entra como
 * está (sem curar) e o treinador da staff, curado. 180 s por turno; quem não escolhe a tempo perde.
 */
function comecarBatalha(conta: banco.Conta, liga: TipoLiga, meu: Progresso): void {
  const t = times();
  const etapa = ETAPAS_LIGA[liga][meu.etapa];
  const npc = t[liga][etapa.chave];
  const time = meu.time ?? [];
  criarBatalhaPve(conta,
    { nome: nomeDaConta(conta), time, nomes: time.map((p) => nomeDaEspecie(Number(p.especieId))) },
    { nome: nomeDaEtapa(t, liga, meu.etapa), time: npc.pokemon, nomes: npc.pokemon.map((p) => nomeDaEspecie(Number(p.especieId))) },
    { titulo: `${NOME_LIGA[liga]} (${meu.etapa + 1}/${ETAPAS_LIGA[liga].length})`, tempo: TEMPO_TURNO_LIGA_MS, aoFim: (venceu, final) => fimDaBatalha(conta.id, liga, venceu, final) });
  meu.lutando = true;
  meu.proximaEm = null;
}

/** Fim de uma batalha: guarda o time como terminou; perdeu = fim do desafio; venceu = a próxima começa sozinha logo. */
function fimDaBatalha(contaId: number, liga: TipoLiga, venceu: boolean, final: Record<string, unknown>[], agora = Date.now()): void {
  const p = progressos();
  const meu = p[contaId]?.[liga];
  if (!meu || meu.estado !== 'jogando') return;
  meu.lutando = false;
  meu.time = final;
  if (!venceu) {
    meu.estado = 'perdeu';
    pagar(contaId, liga, meu);
  } else if (++meu.etapa >= ETAPAS_LIGA[liga].length) {
    meu.estado = 'venceu';
    pagar(contaId, liga, meu);
    const conta = banco.contaPorId(contaId);
    if (conta) avisarEvento(`🏆 ${nomeDe(conta)} venceu a ${NOME_LIGA[liga]}!`);
  } else meu.proximaEm = agora + INTERVALO_LIGA_MS;
  banco.gravarEvento('liga-progresso', p);
  avisar(contaId, { t: 'liga' });
}

/**
 * A cada 5 s: começa sozinha a próxima batalha de quem venceu e passou o intervalo (o desafio é feito de uma vez;
 * fora do jogo, o turno corre do mesmo jeito) e encerra como derrota os desafios de semanas passadas.
 */
function rodarDesafios(agora = Date.now()): void {
  const p = progressos();
  let mudou = false;
  for (const [id, ligas] of Object.entries(p))
    for (const liga of ['normal', 'nightmare'] as const) {
      const meu = ligas[liga];
      if (!meu || meu.estado !== 'jogando') continue;
      if (meu.semana < semanaDaLiga(agora)) {
        // desafio largado: derrota
        meu.estado = 'perdeu';
        meu.lutando = false;
        pagar(Number(id), liga, meu);
        mudou = true;
        continue;
      }
      // o servidor reiniciou no meio de uma batalha: ela recomeça com o time como estava antes dela
      const conta = banco.contaPorId(Number(id));
      if (!conta) continue;
      const voltar = meu.lutando && !emBatalha(conta.id);
      const hora = !meu.lutando && meu.proximaEm !== null && meu.proximaEm !== undefined && agora >= meu.proximaEm;
      if ((voltar || hora) && !emBatalha(conta.id)) {
        try {
          comecarBatalha(conta, liga, meu);
          mudou = true;
        } catch {
          // tenta de novo no próximo passo
        }
      }
    }
  if (mudou) banco.gravarEvento('liga-progresso', p);
}
setInterval(rodarDesafios, 5000).unref();

/** O que o jogador vê: etapas (nomes), onde ele está, o time do desafio e quando a semana vira. Os times da staff não são revelados. */
export function estado(conta: banco.Conta, agora = Date.now()) {
  const t = times();
  const p = progressos();
  const ligas = (['normal', 'nightmare'] as const).map((liga) => {
    const meu = progressoDe(p, conta, liga, agora);
    return {
      liga, nome: NOME_LIGA[liga], pronta: prontas(t, liga),
      etapas: ETAPAS_LIGA[liga].map((_, i) => nomeDaEtapa(t, liga, i)),
      etapa: meu?.etapa ?? 0, estado: meu?.estado ?? null, premio: PREMIO_LIGA[liga],
      // desafio em andamento: o time travado (com HP/PP de agora), se está lutando e quando a próxima começa sozinha
      time: meu?.estado === 'jogando' ? (meu.time ?? []) : null, lutando: !!meu?.lutando, proximaEm: meu?.proximaEm ?? null,
    };
  });
  return { ligas, viraEm: fimDaSemanaDaLiga(agora), agora, tempoTurno: TEMPO_TURNO_LIGA_MS };
}

/**
 * Começa o desafio (trava o time de 6 do save guardado) ou a próxima batalha agora. O time travado não muda até
 * o fim: trocar o time do save ou curar no Centro Pokémon não mexe nele; só remédios usados entre as batalhas.
 */
export function entrar(conta: banco.Conta, dados: Record<string, unknown>, agora = Date.now()) {
  const liga = lerLiga(dados.liga);
  exigirNivel(conta);
  const t = times();
  if (!prontas(t, liga)) throw new ErroConta('Esta Liga ainda está sendo preparada pela staff.', 409);
  const p = progressos();
  let meu = progressoDe(p, conta, liga, agora);
  if (meu && meu.estado !== 'jogando') throw new ErroConta(meu.estado === 'venceu' ? 'Você já venceu esta Liga nesta semana.' : 'Você foi derrotado nesta semana. Tente de novo na semana que vem.', 409);
  if (meu?.lutando || emBatalha(conta.id)) throw new ErroConta('Você já está numa batalha.', 409);
  if (!meu) {
    const guardado = banco.lerSave(conta.id);
    const time = ((guardado ? (JSON.parse(guardado.dados) as { time?: unknown }).time : null) ?? []) as Record<string, unknown>[];
    const lutadores = Array.isArray(time) ? time.filter((x) => x && !x.ovo) : [];
    if (lutadores.length !== POKEMON_POR_TIME_LIGA) throw new ErroConta(`O desafio da Liga é com um time de ${POKEMON_POR_TIME_LIGA} Pokémon (sem ovos).`);
    if (!lutadores.some((x) => Number(x.hp) > 0)) throw new ErroConta('Seu time está todo desmaiado.');
    meu = { semana: semanaDaLiga(agora), etapa: 0, estado: 'jogando', lutando: false, time: structuredClone(lutadores), proximaEm: null };
    (p[conta.id] ??= {})[liga] = meu;
  }
  comecarBatalha(conta, liga, meu);
  banco.gravarEvento('liga-progresso', p);
  return estado(conta, agora);
}

/** Entre as batalhas: usa um remédio da bolsa (save guardado) num Pokémon do time do desafio. */
export function usarItem(conta: banco.Conta, dados: Record<string, unknown>, agora = Date.now()) {
  const liga = lerLiga(dados.liga);
  const item = typeof dados.item === 'string' ? dados.item : '';
  const posicao = Number(dados.posicao);
  const p = progressos();
  const meu = progressoDe(p, conta, liga, agora);
  if (!meu || meu.estado !== 'jogando' || !meu.time) throw new ErroConta('Você não está num desafio da Liga.', 409);
  if (meu.lutando) throw new ErroConta('Espere a batalha acabar.', 409);
  let mensagem: string | null = null;
  banco.mudarSaves([conta.id], ([save]) => {
    const itens = (save.itens ?? {}) as Record<string, number>;
    if (!((itens[item] ?? 0) > 0)) throw new ErroConta('Você não tem este item.');
    mensagem = usarRemedioNaLiga(item, meu.time!, posicao);
    if (!mensagem) throw new ErroConta('Não teve efeito.');
    itens[item]--;
    if (itens[item] <= 0) delete itens[item];
  });
  banco.gravarEvento('liga-progresso', p);
  const guardado = banco.lerSave(conta.id)!;
  return { ...estado(conta, agora), save: JSON.parse(guardado.dados), versao: guardado.versao, mensagem };
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
