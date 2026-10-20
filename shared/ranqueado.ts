// PvP ranqueado (regras do dono, 20/10/2026). Sem imports: o servidor lê este arquivo.
// Cinco elos: Poké Ball, Great Ball e Ultra Ball (3 divisões cada) e Beast Ball e Master Ball (pontos corridos).
// Master Ball = só 3 vagas: os 3 com mais pontos entre os que chegaram à Beast Ball (passou os pontos de um Master,
// toma o lugar dele). Cada conta tem 4 elos separados, um por tier dos Pokémon: Ubers, OU, UU e RU.
// Fila (queue) aberta só em 2 horários de 1 hora por dia; a batalha pode passar do horário, mas depois dele não se
// procura outra. A busca começa só na divisão do jogador e abre uma casa para cada lado a cada 30 s; quem vence
// alguém acima ganha mais (e quem perde para alguém acima perde menos), 2 pontos por divisão de distância.
// Só uma mecânica especial por partida (Mega, Z-Move ou Tera): usar uma segunda diferente = derrota.

export type FormatoRanqueado = 'Uber' | 'OU' | 'UU' | 'RU';
export const FORMATOS_RANQUEADO: FormatoRanqueado[] = ['Uber', 'OU', 'UU', 'RU'];
export const NOME_FORMATO: Record<FormatoRanqueado, string> = { Uber: 'Ubers', OU: 'OU', UU: 'UU', RU: 'RU' };

export type IdElo = 'pokebola' | 'greatball' | 'ultraball' | 'beastball' | 'masterball';
export const ELOS: { id: IdElo; nome: string; divisoes: boolean }[] = [
  { id: 'pokebola', nome: 'Poké Ball', divisoes: true },
  { id: 'greatball', nome: 'Great Ball', divisoes: true },
  { id: 'ultraball', nome: 'Ultra Ball', divisoes: true },
  { id: 'beastball', nome: 'Beast Ball', divisoes: false },
  { id: 'masterball', nome: 'Master Ball', divisoes: false },
];
/** Divisões dos três primeiros elos: III (a mais baixa) até I. */
export const DIVISOES = 3;
const ROMANOS = ['I', 'II', 'III'];
/** Pontos para subir uma divisão (provisório). */
export const PONTOS_POR_DIVISAO = 100;
/** A partir destes pontos o jogador está na Beast Ball (3 divisões × 3 elos × 100). */
export const PONTOS_BEAST = DIVISOES * 3 * PONTOS_POR_DIVISAO;
/** Vagas da Master Ball. */
export const VAGAS_MASTER = 3;
/** Pontos por vitória e por derrota contra alguém da mesma divisão (os pontos nunca ficam abaixo de zero). Empate não muda nada. */
export const PONTOS_VITORIA = 20;
export const PONTOS_DERROTA = 15;
/** Por divisão de distância: adversário acima = +2 na vitória e −2 na derrota; abaixo = o contrário. */
export const PONTOS_POR_DISTANCIA = 2;
/** A cada 30 s procurando, a busca abre uma divisão para cada lado. */
export const ABRIR_BUSCA_MS = 30_000;

/** Horários da fila (Brasília), 1 hora cada (provisório: o dono escolhe). */
export const JANELAS_RANQUEADO = [{ hora: 14, minuto: 0 }, { hora: 21, minuto: 0 }];
export const DURACAO_JANELA_MS = 60 * 60_000;

/** Mecânicas ligadas no ranqueado (provisório). */
export const MECANICAS_RANQUEADO = { mega: true, dynamax: false, z: true, tera: true };
/** Regras do time em cada formato: as do Torneio, sem limite de lendários (o limite é a própria tier). */
export const regrasDoFormato = (formato: FormatoRanqueado) => ({ tier: formato, lendarios: null, miticos: null, ub: null, mecanicas: MECANICAS_RANQUEADO });

export interface EloCalculado {
  elo: IdElo;
  /** 3 (III) a 1 (I); null na Beast e na Master */
  divisao: number | null;
  /** 0 = Poké Ball III … 8 = Ultra Ball I, 9 = Beast Ball, 10 = Master Ball (para a fila) */
  degrau: number;
  pontos: number;
  /** pontos dentro da divisão (0–99); na Beast e na Master, os pontos corridos acima de PONTOS_BEAST */
  naDivisao: number;
}

/** Elo pelos pontos. `master` = está entre os 3 primeiros da Beast Ball (quem decide é o ranking do formato). */
export function eloDe(pontos: number, master = false): EloCalculado {
  const p = Math.max(0, Math.floor(pontos));
  const topo = DIVISOES * 3;
  if (p >= PONTOS_BEAST) return { elo: master ? 'masterball' : 'beastball', divisao: null, degrau: master ? topo + 1 : topo, pontos: p, naDivisao: p - PONTOS_BEAST };
  const degrau = Math.floor(p / PONTOS_POR_DIVISAO);
  return { elo: ELOS[Math.floor(degrau / DIVISOES)].id, divisao: DIVISOES - (degrau % DIVISOES), degrau, pontos: p, naDivisao: p % PONTOS_POR_DIVISAO };
}

/** "Great Ball III", "Beast Ball", "Master Ball". */
export function nomeDoElo(e: Pick<EloCalculado, 'elo' | 'divisao'>): string {
  const nome = ELOS.find((x) => x.id === e.elo)!.nome;
  return e.divisao ? `${nome} ${ROMANOS[e.divisao - 1]}` : nome;
}

/** Quantas divisões para cada lado a busca já alcança depois de esperar `esperouMs`. */
export const alcanceDaBusca = (esperouMs: number) => Math.max(0, Math.floor(esperouMs / ABRIR_BUSCA_MS));

/** Nome da divisão de um degrau (para mostrar até onde a busca vai). */
export function nomeDoDegrau(degrau: number): string {
  const topo = DIVISOES * 3;
  if (degrau >= topo) return ELOS[degrau > topo ? 4 : 3].nome;
  return nomeDoElo({ elo: ELOS[Math.floor(degrau / DIVISOES)].id, divisao: DIVISOES - (degrau % DIVISOES) });
}

/**
 * Pontos de uma partida para quem está no degrau `meu` contra alguém no degrau `dele`: cada divisão que o adversário
 * está acima vale +2 na vitória e −2 na derrota (abaixo, o contrário). Sempre pelo menos 1 ponto.
 */
export function pontosDaPartida(meu: number, dele: number): { vitoria: number; derrota: number } {
  const d = dele - meu;
  return { vitoria: Math.max(1, PONTOS_VITORIA + PONTOS_POR_DISTANCIA * d), derrota: Math.max(1, PONTOS_DERROTA - PONTOS_POR_DISTANCIA * d) };
}

const BRASILIA_MS = -3 * 3600_000;
/** A fila está aberta agora? E quando fecha / quando abre a próxima. */
export function janelaRanqueado(agora: number): { aberta: boolean; fimEm: number | null; proximaEm: number } {
  const br = new Date(agora + BRASILIA_MS);
  const inicios: number[] = [];
  for (const dias of [-1, 0, 1])
    for (const j of JANELAS_RANQUEADO) inicios.push(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate() + dias, j.hora, j.minuto) - BRASILIA_MS);
  inicios.sort((a, b) => a - b);
  const atual = inicios.find((i) => i <= agora && agora < i + DURACAO_JANELA_MS);
  const proxima = inicios.find((i) => i > agora)!;
  return { aberta: atual !== undefined, fimEm: atual === undefined ? null : atual + DURACAO_JANELA_MS, proximaEm: proxima };
}

/** Elo que aparece ao lado do nome no mapa: o melhor dos 4 (maior divisão; empate = mais pontos), só de tier já jogada. */
export interface EloNoMapa { elo: IdElo; divisao: number | null; tier: FormatoRanqueado }
export function melhorElo(elos: Record<FormatoRanqueado, EloCalculado & { vitorias: number; derrotas: number }>): EloNoMapa | null {
  let melhor: (EloCalculado & { tier: FormatoRanqueado }) | null = null;
  for (const f of FORMATOS_RANQUEADO) {
    const e = elos[f];
    if (!e || e.vitorias + e.derrotas === 0) continue;
    if (!melhor || e.degrau > melhor.degrau || (e.degrau === melhor.degrau && e.pontos > melhor.pontos)) melhor = { ...e, tier: f };
  }
  return melhor && { elo: melhor.elo, divisao: melhor.divisao, tier: melhor.tier };
}
