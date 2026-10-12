// Arte das skins de lendário (as dos tickets), desenhada por código em cima das camadas LPC do personagem do jogador.
// Sete são "pijama com capuz" (macacão da cor do Pokémon, barriga, capuz com o rosto dele); Zacian e Zamazenta são
// "traje" (roupa escura com ombreiras, capuz com orelhas e a espada / o escudo nas costas). Cada skin tem as cores
// normais e as do shiny; o shiny ganha também uma aura (folha à parte) que o mapa faz pulsar (jogo/brilhoSkin.ts).
// As coordenadas são pensadas no quadro de frente parado (64×64) e acompanham a cabeça em cada quadro da animação.

type Rampa = string[];
type Linhas = Record<number, [number, number]>;
type CorForma = (x: number, y: number, x0: number, x1: number) => string;
type Modo = 'par' | 'um' | 'lado';
const NOMES_CAMADAS = ['corpo', 'cabeca', 'olhos', 'camiseta', 'calca', 'tenis', 'cabelo', 'cabeloFundo'] as const;
type NomeCamada = (typeof NOMES_CAMADAS)[number];
/** Um quadro de uma camada: os pixels dele e de onde ele vem na folha (para copiar inteiro). */
interface Camada {
  d: ImageData;
  folha: HTMLCanvasElement | null;
  ox: number;
  oy: number;
}
type Camadas = Record<NomeCamada, Camada>;

interface Desenho {
  modelo?: 'traje' | 'roupa';
  /** roupa: camisa, mangas compridas (sem = manga curta), luvas (sem = mão à mostra), calça, sapato e sola */
  tecido?: Rampa;
  braco?: Rampa;
  luva?: [string, string];
  perna?: Rampa;
  sapato?: Rampa;
  sola?: Rampa;
  /** roupa: a calça só vai até esta linha (short); abaixo aparece a perna */
  curto?: number;
  /** roupa: com chapéu, o cabelo acima desta linha fica escondido */
  corte?: number;
  /** roupa: cabelo do personagem oficial no lugar do cabelo do jogador: [id do cabelo LPC, cor] */
  cabelo?: [string, string];
  /** roupa: a cabeça fica coberta (cabeça de abóbora): nenhum cabelo aparece */
  semCabelo?: boolean;
  /** roupa: touca (capuz com a janela do rosto) nesta cor, no lugar do cabelo */
  touca?: Rampa;
  /** roupa: detalhes por cima da roupa, antes do cabelo */
  enfeite?: (h: Pincel) => void;
  /** pijama: cor do macacão (4 tons, do escuro ao claro) */
  corpo?: Rampa;
  /** traje: roupa escura, cor do Pokémon (capuz, luvas, botas), peitoral [sombra, claro], pedra do cinto, ombreiras */
  base?: Rampa;
  cor?: Rampa;
  peito?: [string, string];
  gema?: string;
  ombro?: Rampa;
  queixo?: string;
  mao?: [string, string];
  pe?: [string, string];
  barra?: string;
  barriga?: (x: number, y: number, r2: number) => string | null;
  barrigaCostas?: (x: number, y: number, r2: number) => string | null;
  manga?: (x: number, y: number) => string | null;
  capuz?: (j: number, x: number, y: number) => string | null;
  /** desenhado antes do corpo (asas, cauda de lado, espada/escudo de frente) */
  atras?: (h: Pincel) => void;
  /** desenhado por cima de tudo (rosto do capuz, enfeites, o que fica nas costas quando ele está de costas) */
  depois?: (h: Pincel) => void;
}

const BRANCO = '#f4f6fa', SOMBRA = '#c9d3e6', PRETO = '#111', OURO = '#f2c230', OUROE = '#a8791a', OUROB = '#6a4a10';
const CREME = ['#b9a47a', '#e0d0a8', '#f4ead0', '#fffaf0'];

const tela = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingEnabled = false;
  return g;
};

/** Ferramentas de desenho de um quadro. `linha`: 0 costas, 1 esquerda, 2 frente, 3 direita. */
function preparar(L: Camadas, linha: number, coluna: number, colunas: number) {
  const tem = (l: Camada, x: number, y: number) => x >= 0 && y >= 0 && x < 64 && y < 64 && l.d.data[(y * 64 + x) * 4 + 3] > 40;
  // onde está a cabeça neste quadro (o corpo sobe e desce ao andar)
  let hx0 = 64, hx1 = -1, hy0 = 64;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (tem(L.cabeca, x, y)) { hx0 = Math.min(hx0, x); hx1 = Math.max(hx1, x); hy0 = Math.min(hy0, y); }
  if (hx1 < 0) return null;
  const cx = (hx0 + hx1) / 2, dx = Math.round(cx - 31.5), dy = hy0 - 15;
  const frente = linha === 2, costas = linha === 0, lado = linha === 1 ? -1 : linha === 3 ? 1 : 0;
  const g = tela(64, 64);
  const P = (x: number, y: number, cor: string) => { g.fillStyle = cor; g.fillRect(x, y, 1, 1); };
  const R = (x: number, y: number, w: number, a: number, cor: string) => { g.fillStyle = cor; g.fillRect(x + dx, y + dy, w, a); };
  const M = (x: number, y: number, w: number, a: number, cor: string) => { R(x, y, w, a, cor); R(64 - x - w, y, w, a, cor); };
  // de lado: desenhado para quem olha para a esquerda; espelha para a direita
  const S = (x: number, y: number, w: number, a: number, cor: string) => R(lado < 0 ? x : 64 - x - w, y, w, a, cor);
  /** Forma por linhas `{y: [x0, x1]}`; `modo`: 'par' (espelhada), 'um' (só ela) ou 'lado'. */
  const forma = (linhas: Linhas, cor: CorForma, modo: Modo = 'par') => {
    for (const [ys, [x0, x1]] of Object.entries(linhas)) for (let x = x0; x <= x1; x++) {
      const c = cor(x, +ys, x0, x1);
      if (modo === 'lado') S(x, +ys, 1, 1, c);
      else { R(x, +ys, 1, 1, c); if (modo === 'par') R(63 - x, +ys, 1, 1, c); }
    }
  };
  // batida das asas/nadadeiras: uma onda por volta do passo (só na folha de andar); a ponta sobe e desce 2 pixels, o meio 1
  const onda = colunas >= 9 && coluna ? Math.sin(((coluna - 1) / 8) * Math.PI * 2) : 0;
  /** Par de asas (frente e costas) que bate ao andar. Devolve o pincel `N(x, y, cor)` para os detalhes por cima. */
  const asa = (linhas: Linhas, cor: CorForma, contorno: string) => {
    const ponta = Math.min(...Object.values(linhas).map((v) => v[0]));
    const bate = (x: number) => Math.round(onda * (x <= ponta + 2 ? 2 : x <= ponta + 5 ? 1 : 0));
    const N = (x: number, y: number, c: string) => { R(x, y + bate(x), 1, 1, c); R(63 - x, y + bate(x), 1, 1, c); };
    // contorno primeiro (um pixel em volta de cada pedaço deslocado), depois o recheio: sem buracos entre os degraus
    for (const [ys, [x0, x1]] of Object.entries(linhas)) for (let x = x0; x <= x1; x++) { N(x, +ys - 1, contorno); N(x, +ys + 1, contorno); N(x - 1, +ys, contorno); }
    for (const [ys, [x0, x1]] of Object.entries(linhas)) for (let x = x0; x <= x1; x++) N(x, +ys, cor(x, +ys, x0, x1));
    return N;
  };
  /** Pinta a camada com uma rampa de cores, do escuro ao claro, pela luminosidade de cada pixel. */
  const pintar = (l: Camada, rampa: Rampa, filtro: (x: number, y: number) => boolean = () => true) => {
    let mn = 255, mx = 0;
    const lum = (i: number) => l.d.data[i] * 0.3 + l.d.data[i + 1] * 0.59 + l.d.data[i + 2] * 0.11;
    for (let i = 0; i < 64 * 64 * 4; i += 4) if (l.d.data[i + 3] > 40) { const v = lum(i); mn = Math.min(mn, v); mx = Math.max(mx, v); }
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (tem(l, x, y) && filtro(x, y)) {
      const t = (lum((y * 64 + x) * 4) - mn) / (mx - mn || 1);
      P(x, y, rampa[Math.min(rampa.length - 1, Math.floor(t * rampa.length))]);
    }
  };
  /** Copia os pixels da camada como estão (o cabelo do jogador, já na cor dele). */
  const copiar = (l: Camada, filtro: (x: number, y: number) => boolean) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (tem(l, x, y) && filtro(x, y)) { const i = (y * 64 + x) * 4; P(x, y, `rgb(${l.d.data[i]},${l.d.data[i + 1]},${l.d.data[i + 2]})`); }
  };
  const olhos = (cor: string, y = 16) => {
    if (frente) { M(23, y, 3, 3, cor); M(24, y + 1, 2, 2, PRETO); M(23, y, 1, 1, '#fff'); }
    else if (lado) { S(24, y, 3, 3, cor); S(24, y + 1, 2, 2, PRETO); S(26, y, 1, 1, '#fff'); }
  };
  const base = () => { for (const l of [L.corpo, L.cabeca, L.olhos]) if (l.folha) g.drawImage(l.folha, l.ox, l.oy, 64, 64, 0, 0, 64, 64); };
  /** Braços: cada um é um grupo de pixels de pele vizinhos. `cor(d, beira, x, braco)`: `d` = distância até a ponta da mão. */
  const mangas = (cor: (d: number, beira: boolean, x: number, braco: boolean) => string) => {
    const pele = (x: number, y: number) => tem(L.corpo, x, y) && !tem(L.cabeca, x, y) && !tem(L.camiseta, x, y) && !tem(L.calca, x, y) && !tem(L.tenis, x, y) && y >= hy0 + 17;
    const visto = new Set<number>();
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      if (!pele(x, y) || visto.has(y * 64 + x)) continue;
      const grupo: [number, number][] = [], fila: [number, number][] = [[x, y]];
      visto.add(y * 64 + x);
      while (fila.length) {
        const [a, b] = fila.pop()!;
        grupo.push([a, b]);
        for (const [u, v] of [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]) if (pele(u, v) && !visto.has(v * 64 + u)) { visto.add(v * 64 + u); fila.push([u, v]); }
      }
      const fundo = Math.max(...grupo.map((p) => p[1])), alto = Math.min(...grupo.map((p) => p[1]));
      // cor vazia = deixa a pele como está
      for (const [a, b] of grupo) { const c = cor(fundo - b, !tem(L.corpo, a - 1, b) || !tem(L.corpo, a + 1, b), a - dx, fundo - alto >= 5); if (c) P(a, b, c); }
    }
  };
  /** Pinta uma linha da roupa (camiseta ou calça), na altura `y` do quadro de frente parado. */
  const faixa = (y: number, cor: string) => { for (let x = 0; x < 64; x++) if (tem(L.camiseta, x, y + dy) || tem(L.calca, x, y + dy)) P(x, y + dy, cor); };
  /** Barriga oval: de frente e de costas no meio, de lado no lado para onde olha. `fn(x, y, r2)` em coordenadas de frente. */
  const oval = (fn: (x: number, y: number, r2: number) => string | null) => {
    const bx = cx + lado * 4.6, rx = lado ? 3.3 : 5.6, by = hy0 + 27.5, ox = Math.round(bx - 31.5);
    for (let y = hy0 + 18; y <= hy0 + 36; y++) for (let x = 16; x <= 47; x++) {
      const u = (x - bx) / rx, v = (y - by) / 7.6, r2 = u * u + v * v;
      if (r2 <= 1 && (tem(L.camiseta, x, y) || tem(L.calca, x, y))) { const c = fn(x - ox, y - dy, r2); if (c) P(x, y, c); }
    }
  };
  /** Barra da calça: a linha logo acima do sapato. */
  const barra = (cor: string) => { for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (tem(L.calca, x, y) && !tem(L.tenis, x, y) && !tem(L.tenis, x, y + 1) && tem(L.tenis, x, y + 2)) P(x, y, cor); };
  const sola = (cores: Rampa) => {
    let pe = 0;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (tem(L.tenis, x, y)) pe = Math.max(pe, y);
    pintar(L.tenis, cores, (x, y) => y >= pe - 2);
  };
  /** Capuz: a cabeça "engordada", com a janela do rosto (de frente e de lado; de costas é fechado). */
  const capuz = (C: Rampa, cfg: Desenho) => {
    const dentro = (x: number, y: number) => {
      for (let b = -3; b <= 2; b++) for (let a = -2; a <= 2; a++) if (Math.abs(a) + Math.abs(b) <= 3 && tem(L.cabeca, x + a, y + b)) return true;
      return false;
    };
    const janela = (x: number, y: number) => {
      if (costas) return 9;
      const v = (y - (hy0 + 10.5)) / (lado ? 6 : 6.2);
      if (!lado) { const u = (x - cx) / 8.2; return u * u + v * v; }
      // de lado a janela fica aberta para a frente do rosto
      const du = (x - (cx + lado * 3.2)) * lado, u = du > 0 ? 0 : du / 5.6;
      return u * u + v * v;
    };
    for (let y = 4; y <= 40; y++) for (let x = 10; x <= 53; x++) if (dentro(x, y) && janela(x, y) > 1) {
      const borda = !dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1), j = janela(x, y), yr = y - dy;
      P(x, y, borda ? C[0] : cfg.capuz?.(j, x - dx, yr) ?? (j < 1.45 && yr >= 26 ? (cfg.queixo ?? BRANCO) : j < 1.3 ? C[1] : yr <= 15 ? C[3] : C[2]));
    }
    // a franja do jogador aparece na janela do capuz
    if (!costas) copiar(L.cabelo, (x, y) => janela(x, y) <= 1 && y <= hy0 + 7);
  };
  /** Pinta só onde há roupa (camisa ou calça); `soCamisa`: só na camisa. */
  const T = (x: number, y: number, w: number, a: number, cor: string, soCamisa = false) => {
    for (let j = y + dy; j < y + dy + a; j++) for (let i = x + dx; i < x + dx + w; i++) if (tem(L.camiseta, i, j) || (!soCamisa && tem(L.calca, i, j))) P(i, j, cor);
  };
  /** O cabelo do jogador por cima de tudo; `desde`: só da linha para baixo (o resto fica debaixo do chapéu). */
  const cabelo = (desde = 0) => copiar(L.cabelo, (_x, y) => y - dy >= desde);
  return { T, cabelo, L, g, tem, P, R, M, S, forma, asa, pintar, olhos, base, mangas, faixa, oval, barra, sola, capuz, linha, coluna, frente, costas, lado, cx, dx, dy, hy0 };
}
type Pincel = NonNullable<ReturnType<typeof preparar>>;

/** Modelo "pijama com capuz": macacão da cor do Pokémon, barriga, capuz com o rosto dele e os enfeites. */
function pijama(h: Pincel, cfg: Desenho) {
  const C = cfg.corpo!, mao = cfg.mao ?? [SOMBRA, BRANCO];
  cfg.atras?.(h);
  h.base();
  h.pintar(h.L.calca, C);
  h.pintar(h.L.camiseta, C);
  h.mangas((d, beira, x, braco) => (braco && d <= 2 ? (beira ? mao[0] : mao[1]) : cfg.manga?.(x, 50 - d) ?? (beira ? C[1] : C[2])));
  const barriga = h.costas ? cfg.barrigaCostas : cfg.barriga;
  if (barriga) h.oval(barriga);
  if (cfg.barra) h.barra(cfg.barra);
  h.pintar(h.L.tenis, C);
  h.sola(cfg.pe ?? mao);
  h.capuz(C, cfg);
  cfg.depois?.(h);
}

/** Modelo "traje": roupa escura com ombreiras, luvas e botas da cor do Pokémon, peitoral claro, cinto dourado e capuz. */
function traje(h: Pincel, cfg: Desenho) {
  const { L, tem, P, R, dx, dy, hy0 } = h, B = cfg.base!, C = cfg.cor!, PL = cfg.peito!, O = cfg.ombro ?? C;
  cfg.atras?.(h);
  h.base();
  h.pintar(L.calca, B);
  h.pintar(L.camiseta, B);
  h.mangas((d, beira, x, braco) => (braco && d <= 4 ? (beira ? C[1] : C[2]) : braco && d === 5 ? OURO : beira ? B[1] : B[2]));
  if (h.frente) {
    const meia: Record<number, number> = { 34: 4, 35: 5, 36: 5, 37: 4, 38: 4, 39: 3, 40: 3, 41: 2, 42: 2, 43: 1 };
    for (const [ys, hw] of Object.entries(meia)) for (let x = 32 - hw; x <= 31 + hw; x++) if (tem(L.camiseta, x + dx, +ys + dy)) R(x, +ys, 1, 1, x === 32 - hw || x === 31 + hw ? PL[0] : PL[1]);
  } else if (h.lado) {
    // de lado: uma tira do peitoral na frente do peito
    for (let y = hy0 + 19; y <= hy0 + 27; y++) {
      let x = h.lado < 0 ? 0 : 63;
      while (x >= 0 && x < 64 && !tem(L.camiseta, x, y)) x -= h.lado;
      const larg = y <= hy0 + 23 ? 3 : y <= hy0 + 25 ? 2 : 1;
      for (let i = 0; i < larg; i++) if (tem(L.camiseta, x - i * h.lado, y)) P(x - i * h.lado, y, i === larg - 1 ? PL[0] : PL[1]);
    }
  }
  h.faixa(45, OURO);
  h.faixa(46, OUROE);
  if (h.frente) { R(30, 44, 4, 4, OUROE); R(31, 45, 2, 2, cfg.gema!); }
  // botas: o cano dourado é a parte de cima do sapato, onde encosta na calça
  h.pintar(L.tenis, C);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (tem(L.tenis, x, y) && !tem(L.tenis, x, y - 1) && (tem(L.calca, x, y) || tem(L.calca, x, y - 1) || tem(L.calca, x, y - 2))) { P(x, y, OURO); if (tem(L.tenis, x, y + 1)) P(x, y + 1, OUROE); }
  // ombreiras
  const corOmbro = (y: number, borda: boolean) => (y === 35 ? OURO : borda || y === 30 ? O[0] : y === 31 ? O[3] : O[2]);
  if (h.lado) h.forma({ 30: [29, 34], 31: [28, 35], 32: [27, 36], 33: [27, 36], 34: [27, 36], 35: [28, 35] }, (x, y, x0, x1) => corOmbro(y, x === x0 || x === x1), 'lado');
  else h.forma({ 30: [18, 22], 31: [16, 23], 32: [14, 24], 33: [13, 24], 34: [14, 23], 35: [16, 22] }, (x, y, x0) => corOmbro(y, x === x0));
  h.capuz(C, cfg);
  cfg.depois?.(h);
}

// ---------- peças usadas por mais de uma skin ----------
const NADADEIRA: Linhas = { 30: [13, 17], 31: [11, 18], 32: [10, 18], 33: [9, 18], 34: [9, 17], 35: [9, 16], 36: [10, 15], 37: [12, 14] };
/** Espinho/garra clara com contorno: espelhado (frente e costas) ou saindo das costas (de lado). */
const espinho = (h: Pincel, linhas: Linhas, modo: Modo = 'par', cor = BRANCO, borda = '#8f8a80') => h.forma(linhas, (x, _y, x0, x1) => ((modo === 'lado' ? x === x1 : x === x0) ? borda : cor), modo);
/** Cauda de lado (sai para trás, desenhada antes do corpo). */
const caudaLado = (h: Pincel, cor: string, borda: string, ponta?: string) =>
  h.forma({ 44: [38, 41], 45: [39, 43], 46: [40, 45], 47: [42, 47], 48: [43, 47] }, (x, y, _x0, x1) => (x === x1 || y === 44 ? borda : ponta && x >= x1 - 2 && y >= 46 ? ponta : cor), 'lado');
/** Cauda de costas (pendurada no meio, por cima do corpo). */
const caudaCostas = (h: Pincel, cor: string, borda: string, ponta?: string) =>
  h.forma({ 44: [30, 33], 45: [29, 34], 46: [29, 34], 47: [30, 33], 48: [30, 33], 49: [31, 32] }, (x, y, x0, x1) => (x === x0 || x === x1 || y === 49 ? borda : ponta && y >= 47 ? ponta : cor), 'um');
/** Orelhas de lobo que nascem do capuz (Zacian e Zamazenta): a base se junta ao capuz, sem contorno embaixo. */
const orelhas = (h: Pincel, C: Rampa, dentro: string, ponta?: string) => {
  const cor: CorForma = (x, y, x0, x1) => (y === 6 || (x === x0 && (y <= 11 || !h.lado)) || (x === x1 && y <= 11) ? C[0] : ponta && y <= 8 ? ponta : !h.costas && x > x0 + 1 && x < x1 - 1 && y >= 9 && y <= 12 ? dentro : C[2]);
  if (h.lado) h.forma({ 6: [36, 36], 7: [35, 37], 8: [35, 38], 9: [34, 38], 10: [34, 39], 11: [33, 39], 12: [33, 39], 13: [33, 39] }, cor, 'lado');
  else h.forma({ 6: [22, 22], 7: [21, 23], 8: [21, 24], 9: [21, 25], 10: [21, 26], 11: [21, 27], 12: [22, 27], 13: [23, 27] }, cor);
};

interface CoresZacian { base: Rampa; cor: Rampa; tranca: string; trancaE: string; lamina: [string, string, string]; cabo: string; gema: string; olho: string }
/** Espada do Zacian nas costas. De frente aparece o cabo por cima do ombro e a ponta do outro lado; de costas, inteira. */
const espada = (h: Pincel, c: CoresZacian, espelhar: boolean) => {
  const q = (x: number, y: number, w: number, a: number, cor: string) => h.R(espelhar ? 64 - x - w : x, y, w, a, cor);
  const reta = (x0: number, y0: number, x1: number, y1: number, l: number, cor: string, o = 0) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) q(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, l + 2 * o, l + 2 * o, cor);
  };
  const [LE, LM, LC] = c.lamina;
  reta(40, 31, 16, 52, 2, LE, 1); q(13, 54, 3, 2, LE); q(14, 53, 2, 2, LE);
  reta(40, 31, 16, 52, 2, LM); q(14, 54, 1, 1, LM); q(15, 53, 1, 1, LM);
  reta(40, 31, 17, 51, 1, LC);
  reta(43, 29, 47, 24, 2, OUROB, 1); reta(43, 29, 47, 24, 2, c.cabo);
  reta(38, 27, 45, 33, 2, OUROB, 1); reta(38, 27, 45, 33, 2, OURO); q(41, 30, 2, 2, c.gema);
  q(47, 20, 4, 4, OUROB); q(48, 21, 2, 2, OURO);
};
const espadaLado = (h: Pincel, c: CoresZacian) => {
  const { S } = h, [LE, LM, LC] = c.lamina, xDe = (y: number) => 46 - Math.round(((y - 22) * 5) / 32);
  for (let y = 31; y <= 54; y++) S(xDe(y) - 2, y, 4, 1, LE);
  for (let y = 31; y <= 53; y++) { S(xDe(y) - 1, y, 2, 1, LM); S(xDe(y) - 1, y, 1, 1, LC); }
  S(42, 28, 7, 3, OUROB); S(43, 29, 5, 1, OURO);
  S(44, 22, 4, 6, OUROB); S(45, 22, 2, 6, c.cabo);
  S(44, 19, 4, 4, OUROB); S(45, 20, 2, 2, OURO);
};

interface CoresZamazenta { base: Rampa; cor: Rampa; juba: string; jubaC: string; jubaE: string; gema: string; olho: string }
/** Escudo do Zamazenta nas costas: de frente só aparece o aro dourado em volta do corpo; de costas, inteiro. */
const escudo = (h: Pincel, c: CoresZamazenta) => {
  const meio = 31.5;
  const dentro = (x: number, y: number) => {
    if (y < 30 || y > 53) return false;
    const t = y < 40 ? (y - 40) / 10.5 : (y - 40) / 13.5;
    return Math.abs(x - meio) <= 18 * Math.sqrt(Math.max(0, 1 - t * t));
  };
  for (let y = 30; y <= 53; y++) for (let x = 12; x <= 51; x++) if (dentro(x, y)) {
    const borda = !dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1);
    const aro = h.frente || !dentro(x - 3, y) || !dentro(x + 3, y) || !dentro(x, y - 2) || !dentro(x, y + 3);
    const d2 = (x - meio) * (x - meio) + (y - 40.5) * (y - 40.5);
    const corAro = h.frente ? (Math.abs(x - meio) > 15.5 ? '#ffe27a' : y >= 48 ? OUROE : OURO) : y <= 34 ? '#ffe27a' : OURO;
    h.R(x, y, 1, 1, borda ? OUROB : aro ? corAro : d2 < 7 ? c.jubaC : d2 < 14 ? OUROE : Math.abs(x - meio) < 1.5 || y === 40 || y === 41 ? OURO : (x + y) % 7 === 0 ? c.cor[3] : c.cor[2]);
  }
};
const escudoLado = (h: Pincel) => {
  for (let y = 30; y <= 53; y++) {
    const fino = y === 30 || y === 53;
    h.S(fino ? 41 : 40, y, fino ? 3 : 5, 1, OUROB);
    if (!fino) { h.S(41, y, 3, 1, y % 6 === 0 ? OUROE : OURO); h.S(43, y, 1, 1, '#ffe27a'); }
  }
};

/** Uma skin: o desenho com as cores normais e com as do shiny. */
interface Arte {
  normal: Desenho;
  shiny: Desenho;
}
const arte = <C>(cores: { normal: C; shiny: C }, desenho: (c: C) => Desenho): Arte => ({ normal: desenho(cores.normal), shiny: desenho(cores.shiny) });

/** As skins com arte, pelo nome em minúsculas (o do id do item: `skin-<nome>[-shiny]`). As especiais entram mais abaixo. */
const ARTES: Record<string, Arte> = {
  kyogre: arte(
    { normal: { corpo: ['#12285c', '#1d44a0', '#2a5fc0', '#4f86e0'], marca: '#e0322d', olho: '#f7d13a' }, shiny: { corpo: ['#5a1248', '#9c1f7d', '#cf3fa6', '#ee7fd0'], marca: '#f59a1b', olho: '#fff06a' } },
    (c) => {
      const K = c.corpo, VM = c.marca;
      return {
        corpo: K,
        barriga: (_x, _y, r2) => (r2 > 0.72 ? SOMBRA : BRANCO),
        atras: (h) => {
          if (h.lado) {
            h.forma({ 44: [38, 41], 45: [39, 43], 46: [40, 45], 47: [42, 47], 48: [43, 44], 49: [43, 43] }, (x, y, _x0, x1) => (x === x1 || y === 44 ? K[0] : K[2]), 'lado');
            h.forma({ 48: [46, 48], 49: [47, 48] }, (x, _y, _x0, x1) => (x === x1 ? K[0] : K[2]), 'lado');
            return;
          }
          const N = h.asa(NADADEIRA, (x, y, x0) => (x <= x0 + 2 && y >= 32 && y <= 36 ? BRANCO : K[2]), K[0]);
          for (const x of [9, 10, 11]) N(x, 34, K[0]);
          for (const [x, y] of h.frente ? [[14, 32], [15, 33], [16, 34], [14, 35], [15, 35]] : [[13, 33], [14, 34], [15, 34]]) N(x, y, VM);
        },
        depois: (h) => {
          const { M, S } = h;
          if (h.frente) { M(24, 39, 1, 3, VM); M(25, 43, 1, 2, VM); h.olhos(c.olho); M(22, 14, 1, 1, VM); M(23, 13, 3, 1, VM); M(26, 14, 1, 1, VM); M(21, 20, 1, 3, VM); }
          // de costas: faixas em "V" descendo para o meio (não podem parecer um rosto)
          else if (h.costas) { for (let i = 0; i < 5; i++) { M(24 + i, 15 + i, 1, 1, VM); M(23 + i, 21 + i, 1, 1, VM); } M(21, 20, 1, 3, VM); }
          else { h.olhos(c.olho); S(23, 14, 1, 1, VM); S(24, 13, 3, 1, VM); S(27, 14, 1, 1, VM); S(37, 19, 1, 4, VM); S(38, 22, 1, 3, VM); S(34, 26, 3, 1, VM); }
          if (!h.lado) { M(27, 9, 2, 3, K[2]); M(27, 9, 2, 1, K[0]); M(26, 10, 1, 2, K[0]); }
          else { S(29, 9, 3, 3, K[2]); S(29, 9, 3, 1, K[0]); S(28, 10, 1, 2, K[0]); S(35, 10, 2, 2, K[2]); S(35, 10, 2, 1, K[0]); S(37, 11, 1, 1, K[0]); }
          if (h.lado) {
            h.forma({ 33: [31, 35], 34: [31, 38], 35: [32, 40], 36: [34, 41], 37: [36, 41], 38: [38, 40] }, (x, y, x0, x1) => (x === x0 || x === x1 || y === 33 || y === 38 ? K[0] : x >= x1 - 2 && y >= 35 && y <= 37 ? BRANCO : K[2]), 'lado');
            S(33, 34, 2, 1, VM); S(35, 35, 1, 1, VM); S(36, 36, 1, 1, VM);
          }
          if (h.costas) {
            h.forma({ 44: [30, 33], 45: [29, 34], 46: [28, 35] }, (x, _y, x0, x1) => (x === x0 || x === x1 ? K[0] : K[2]), 'um');
            h.forma({ 47: [27, 30], 48: [26, 28] }, (x, _y, x0, x1) => (x === x0 || x === x1 ? K[0] : K[3]));
            M(30, 45, 2, 1, VM);
          }
        },
      };
    },
  ),

  groudon: arte(
    { normal: { corpo: ['#6a1212', '#a31d1d', '#d43a2a', '#f06a4c'], linha: '#23232c', olho: '#f7d13a' }, shiny: { corpo: ['#566210', '#86981c', '#b5c730', '#dbe86c'], linha: '#23232c', olho: '#f7d13a' } },
    (c) => {
      const V = c.corpo, PT = c.linha, CZ = ['#8f8a80', '#c2bcae', '#e2ddd0', '#f4f0e6'];
      return {
        corpo: V,
        queixo: CZ[2],
        barriga: (_x, y, r2) => (r2 > 0.72 ? CZ[0] : y % 3 === 1 ? CZ[1] : CZ[2]),
        manga: (_x, y) => (y === 43 || y === 45 ? PT : null),
        // dentes brancos em volta da boca do capuz (um sim, um não), queixo cinza embaixo
        capuz: (j, x, y) => (j < 1.32 && y >= 28 ? CZ[2] : j < 1.3 ? ((x + y) % 2 ? BRANCO : V[1]) : null),
        atras: (h) => {
          if (!h.lado) {
            espinho(h, { 30: [16, 17], 31: [14, 18], 32: [12, 18], 33: [11, 18], 34: [13, 18], 35: [15, 18] });
            espinho(h, { 43: [15, 16], 44: [13, 16], 45: [12, 16], 46: [14, 16] });
            espinho(h, { 21: [17, 19], 22: [16, 19], 23: [15, 19], 24: [17, 19] });
            return;
          }
          espinho(h, { 31: [39, 42], 32: [39, 44], 33: [39, 45], 34: [39, 43] }, 'lado');
          espinho(h, { 38: [39, 41], 39: [39, 43], 40: [39, 42] }, 'lado');
          espinho(h, { 20: [43, 45], 21: [43, 47], 22: [43, 46] }, 'lado');
          caudaLado(h, V[2], V[0]);
          espinho(h, { 45: [44, 46], 46: [46, 49], 47: [48, 50] }, 'lado');
        },
        depois: (h) => {
          const { M, R, S } = h;
          if (h.frente) { M(24, 38, 1, 4, PT); M(25, 37, 1, 1, PT); M(24, 44, 2, 1, PT); h.olhos(c.olho, 15); M(22, 13, 5, 1, PT); M(21, 14, 1, 2, PT); M(27, 14, 1, 3, PT); M(20, 20, 2, 1, PT); M(20, 22, 2, 1, PT); R(31, 12, 2, 4, PT); }
          else if (h.costas) { M(20, 20, 2, 1, PT); M(20, 22, 2, 1, PT); R(31, 12, 2, 5, PT); M(25, 37, 5, 1, PT); M(26, 41, 4, 1, PT); R(31, 35, 2, 8, PT); caudaCostas(h, V[2], V[0], BRANCO); }
          else { h.olhos(c.olho, 15); S(23, 13, 5, 1, PT); S(22, 14, 1, 2, PT); S(28, 14, 1, 3, PT); S(37, 20, 2, 1, PT); S(37, 22, 2, 1, PT); }
          // placas no alto da cabeça
          if (!h.lado) { M(23, 8, 4, 4, V[2]); M(23, 8, 4, 1, V[0]); M(22, 9, 1, 3, V[0]); M(27, 9, 1, 3, V[0]); M(24, 10, 2, 1, PT); }
          else { S(27, 8, 6, 4, V[2]); S(27, 8, 6, 1, V[0]); S(26, 9, 1, 3, V[0]); S(33, 9, 1, 3, V[0]); S(28, 10, 4, 1, PT); }
        },
      };
    },
  ),

  giratina: arte(
    { normal: { corpo: ['#34343e', '#585866', '#858594', '#b0b0be'], faixa: '#d42a2a', ouro: '#f2c230', ouroE: '#a8791a', olho: '#e0322d' }, shiny: { corpo: ['#3a4048', '#62707c', '#92a2ae', '#c0ced8'], faixa: '#2f6fe0', ouro: '#d4eef8', ouroE: '#7fa6be', olho: '#3f8cff' } },
    (c) => {
      const ASA = '#1c1c24', ASAE = '#0a0a10', FE = c.faixa;
      return {
        corpo: c.corpo,
        queixo: c.ouro,
        barra: c.ouro,
        barriga: (_x, y, r2) => (r2 > 0.72 ? ASAE : y % 2 ? FE : ASA),
        manga: (_x, y) => (y === 44 ? c.ouro : null),
        atras: (h) => {
          if (!h.lado) {
            h.asa({ 25: [10, 11], 26: [9, 13], 27: [9, 15], 28: [10, 16], 29: [11, 17], 30: [12, 18], 31: [10, 18], 32: [9, 18], 33: [10, 18], 34: [12, 17], 35: [14, 17] }, (x, y, x0) => (x <= x0 + 2 && [25, 26, 31, 32].includes(y) ? FE : ASA), ASAE);
            h.asa({ 38: [12, 16], 39: [10, 16], 40: [12, 16], 41: [14, 16] }, (x, _y, x0) => (x <= x0 + 2 ? FE : ASA), ASAE);
            return;
          }
          h.forma({ 25: [45, 47], 26: [43, 48], 27: [41, 49], 28: [39, 48], 29: [39, 46], 30: [39, 45], 31: [39, 47], 32: [39, 48], 33: [39, 46], 34: [39, 43] }, (x, y, _x0, x1) => (x === x1 || y === 25 ? ASAE : x >= x1 - 2 && [26, 27, 31, 32].includes(y) ? FE : ASA), 'lado');
          h.forma({ 38: [39, 43], 39: [39, 45], 40: [39, 43] }, (x, _y, _x0, x1) => (x === x1 ? ASAE : x >= x1 - 2 ? FE : ASA), 'lado');
        },
        depois: (h) => {
          const { M, R, S } = h;
          if (h.lado) {
            h.olhos(c.olho);
            S(23, 13, 15, 1, c.ouro); S(24, 14, 13, 1, c.ouroE); S(30, 8, 2, 5, c.ouro); S(32, 10, 1, 3, c.ouroE);
            h.forma({ 7: [40, 41], 8: [39, 41], 9: [38, 40], 10: [37, 39], 11: [36, 38], 12: [35, 37] }, (x, _y, _x0, x1) => (x === x1 ? c.ouroE : c.ouro), 'lado');
            S(37, 21, 2, 1, c.ouro); S(37, 23, 2, 1, c.ouro);
            return;
          }
          if (h.frente) h.olhos(c.olho);
          R(23, 13, 18, 1, c.ouro); R(24, 14, 16, 1, c.ouroE); R(31, 8, 2, 5, c.ouro); R(30, 10, 1, 3, c.ouroE);
          h.forma({ 7: [17, 18], 8: [17, 19], 9: [18, 20], 10: [19, 21], 11: [20, 22], 12: [21, 23] }, (x, _y, x0) => (x === x0 ? c.ouroE : c.ouro));
          M(20, 21, 2, 1, c.ouro); M(20, 23, 2, 1, c.ouro);
          // de costas: os anéis dourados das costelas
          if (h.costas) for (const y of [37, 41, 45]) { R(27, y, 10, 1, c.ouro); M(25, y + 1, 2, 1, c.ouroE); }
        },
      };
    },
  ),

  hoopa: arte(
    { normal: { corpo: ['#5e5080', '#8e80b0', '#b6a8d4', '#d9d0f0'], marca: '#e0489a', olho: '#3fd06a' }, shiny: { corpo: ['#54545e', '#80808c', '#a9a9b6', '#d0d0da'], marca: '#f2d23a', olho: '#3fd06a' } },
    (c) => {
      const CHIFRE = '#3a3a46', CHIFREE = '#1e1e26', MC = c.marca;
      return {
        corpo: c.corpo,
        queixo: c.corpo[3],
        mao: [c.corpo[1], c.corpo[3]],
        barra: MC,
        barriga: (x, y, r2) => (r2 > 0.86 ? c.corpo[2] : r2 > 0.42 ? (r2 > 0.68 ? OUROE : OURO) : (x + y) % 5 === 0 ? '#c070ff' : '#2a1040'),
        // de costas: só a argola (o portal fica na frente)
        barrigaCostas: (_x, _y, r2) => (r2 > 0.86 || r2 <= 0.42 ? null : r2 > 0.68 ? OUROE : OURO),
        manga: (_x, y) => (y === 42 || y === 43 ? MC : null),
        depois: (h) => {
          const { M, R, S } = h;
          const corChifre: CorForma = (x, y, x0, x1) => (y === 9 ? OURO : x === x0 || x === x1 ? CHIFREE : CHIFRE), corTufo: CorForma = (x, _y, x0) => (x === x0 ? '#a02a6a' : MC);
          if (h.lado) {
            h.olhos(c.olho);
            S(22, 13, 3, 2, MC);
            h.forma({ 5: [33, 34], 6: [32, 34], 7: [32, 35], 8: [31, 35], 9: [31, 35], 10: [31, 35], 11: [30, 35], 12: [30, 35] }, corChifre, 'lado');
            h.forma({ 7: [26, 27], 8: [25, 27], 9: [25, 27], 10: [25, 27], 11: [26, 27] }, corTufo, 'lado');
            return;
          }
          if (h.frente) { h.olhos(c.olho); R(30, 13, 4, 2, MC); R(31, 15, 2, 1, MC); M(27, 35, 2, 1, MC); R(30, 36, 4, 1, MC); }
          else { R(30, 16, 4, 3, MC); R(31, 19, 2, 1, MC); M(21, 20, 1, 3, MC); }
          h.forma({ 6: [16, 17], 7: [16, 18], 8: [17, 19], 9: [17, 20], 10: [18, 21], 11: [19, 22], 12: [20, 23] }, corChifre);
          h.forma({ 6: [31, 31], 7: [30, 32], 8: [30, 32], 9: [30, 32], 10: [31, 31] }, corTufo, 'um');
          R(32, 6, 1, 5, MC);
        },
      };
    },
  ),

  dialga: arte(
    { normal: { corpo: ['#142c58', '#204688', '#3064b4', '#588cd8'], linha: '#8fd8f6', gema: '#57c0ff', olho: '#e0322d' }, shiny: { corpo: ['#0e524a', '#198476', '#2cb49e', '#70e0ca'], linha: '#d6fff4', gema: '#ff7ad8', olho: '#e0322d' } },
    (c) => {
      const PR = ['#6a707c', '#9aa0ac', '#d2d6de', '#f0f2f6'], LN = c.linha, K = c.corpo;
      return {
        corpo: K,
        queixo: PR[2],
        barra: LN,
        barriga: (x, y, r2) => (Math.abs(x - 31.5) + Math.abs(y - 41) * 0.8 <= 2.6 ? c.gema : r2 > 0.72 ? PR[1] : PR[2]),
        manga: (_x, y) => (y === 42 ? LN : null),
        atras: (h) => {
          if (!h.lado) {
            espinho(h, { 26: [13, 14], 27: [12, 15], 28: [11, 16], 29: [12, 17], 30: [13, 18], 31: [14, 18], 32: [15, 18] }, 'par', PR[2], PR[0]);
            espinho(h, { 34: [11, 13], 35: [9, 15], 36: [10, 17], 37: [12, 18], 38: [14, 17] }, 'par', PR[2], PR[0]);
            return;
          }
          espinho(h, { 26: [42, 44], 27: [41, 46], 28: [39, 47], 29: [39, 48], 30: [39, 47], 31: [39, 45], 32: [39, 43] }, 'lado', PR[2], PR[0]);
          espinho(h, { 35: [39, 43], 36: [39, 46], 37: [39, 45], 38: [39, 42] }, 'lado', PR[2], PR[0]);
          caudaLado(h, K[2], K[0], PR[2]);
        },
        depois: (h) => {
          const { M, R, S } = h;
          const corCrista: CorForma = (x, y, x0, x1) => (x === x0 || x === x1 || y === 5 ? PR[0] : PR[2]);
          if (h.lado) {
            h.olhos(c.olho);
            S(23, 14, 4, 1, LN); S(37, 20, 1, 3, LN);
            h.forma({ 5: [30, 31], 6: [30, 32], 7: [29, 33], 8: [29, 33], 9: [29, 33], 10: [29, 33], 11: [29, 33], 12: [29, 33] }, corCrista, 'lado');
            S(30, 9, 2, 2, c.gema);
            h.forma({ 10: [38, 40], 11: [37, 42], 12: [37, 44], 13: [38, 42] }, (x, y, _x0, x1) => (x === x1 || y === 10 ? PR[0] : PR[2]), 'lado');
            return;
          }
          if (h.frente) { h.olhos(c.olho); M(22, 14, 4, 1, LN); M(25, 37, 1, 4, LN); }
          else { R(31, 35, 2, 8, LN); M(26, 38, 3, 1, LN); M(27, 42, 2, 1, LN); caudaCostas(h, K[2], K[0], PR[2]); }
          M(21, 20, 1, 3, LN);
          h.forma({ 5: [31, 32], 6: [31, 32], 7: [30, 33], 8: [30, 33], 9: [30, 33], 10: [30, 33], 11: [30, 33], 12: [30, 33] }, corCrista, 'um');
          R(31, 9, 2, 2, c.gema);
          h.forma({ 7: [22, 23], 8: [22, 24], 9: [23, 25], 10: [24, 26], 11: [25, 27] }, (x, _y, x0) => (x === x0 ? PR[0] : PR[2]));
        },
      };
    },
  ),

  palkia: arte(
    { normal: { corpo: ['#84728e', '#b4a2c0', '#dacde4', '#f6eefa'], linha: '#b03aa6', perola: '#f078b0', olho: '#f0562a' }, shiny: { corpo: ['#94506e', '#c67c9e', '#ecb0cc', '#fde2ee'], linha: '#7a2aa0', perola: '#ffd24a', olho: '#f0562a' } },
    (c) => {
      const K = c.corpo, LN = c.linha;
      return {
        corpo: K,
        queixo: K[3],
        mao: [K[1], K[3]],
        barra: LN,
        barriga: (_x, y, r2) => (r2 > 0.72 ? K[1] : y % 4 === 0 ? LN : K[3]),
        manga: (_x, y) => (y === 41 || y === 45 ? LN : null),
        atras: (h) => {
          if (!h.lado) { h.asa({ 26: [10, 12], 27: [9, 14], 28: [8, 16], 29: [9, 17], 30: [10, 18], 31: [12, 18], 32: [14, 18] }, (_x, y) => (y === 29 ? LN : K[2]), K[0]); return; }
          h.forma({ 25: [44, 46], 26: [42, 47], 27: [41, 48], 28: [39, 48], 29: [39, 47], 30: [39, 45], 31: [39, 43] }, (x, y, _x0, x1) => (x === x1 || y === 25 ? K[0] : y === 28 ? LN : K[2]), 'lado');
          caudaLado(h, K[2], K[0], LN);
        },
        depois: (h) => {
          const { M, S } = h;
          const corCrista: CorForma = (x, y, x0, x1) => (x === x0 || x === x1 || y === 4 ? K[0] : y === 7 || y === 10 ? LN : K[2]);
          const corPerola: CorForma = (x, y, x0, x1) => (x === x0 || x === x1 || y === 31 || y === 35 ? '#8a2a5e' : x === x0 + 1 && y === 32 ? '#fff' : c.perola);
          if (h.lado) {
            h.olhos(c.olho);
            S(23, 14, 5, 1, LN); S(37, 19, 1, 4, LN);
            h.forma({ 4: [30, 31], 5: [30, 32], 6: [29, 33], 7: [29, 33], 8: [29, 33], 9: [29, 33], 10: [29, 33], 11: [29, 33], 12: [29, 33] }, corCrista, 'lado');
            h.forma({ 31: [30, 32], 32: [29, 33], 33: [29, 33], 34: [29, 33], 35: [30, 32] }, corPerola, 'lado');
            return;
          }
          if (h.frente) { h.olhos(c.olho); M(22, 14, 5, 1, LN); }
          else { M(25, 38, 5, 1, LN); M(26, 42, 4, 1, LN); caudaCostas(h, K[2], K[0], LN); }
          M(21, 19, 1, 4, LN);
          h.forma({ 4: [31, 32], 5: [31, 32], 6: [30, 33], 7: [30, 33], 8: [30, 33], 9: [30, 33], 10: [30, 33], 11: [30, 33], 12: [30, 33] }, corCrista, 'um');
          h.forma({ 31: [18, 20], 32: [17, 21], 33: [17, 21], 34: [17, 21], 35: [18, 20] }, corPerola);
        },
      };
    },
  ),

  kyurem: arte(
    { normal: { corpo: ['#464c54', '#6a727c', '#949ea8', '#c0cad2'], gelo: ['#5aa8c4', '#8fd4ec', '#bfeaf8', '#eafaff'], olho: '#f7d13a' }, shiny: { corpo: ['#3a4e62', '#5c7690', '#86a2bc', '#b6cee2'], gelo: ['#5ab89a', '#8fe4c8', '#c4f6e4', '#effff8'], olho: '#f7d13a' } },
    (c) => {
      const G = c.gelo, K = c.corpo;
      return {
        corpo: K,
        mao: [G[1], G[3]],
        pe: [G[1], G[3]],
        barriga: (x, y, r2) => (r2 > 0.72 ? K[1] : (x * 3 + y) % 7 === 0 ? G[2] : K[3]),
        // capuz de gelo em cima, com os dentes em volta do rosto
        capuz: (j, x, y) => (j < 1.3 && y <= 22 ? (x % 2 ? '#fff' : G[0]) : j < 1.45 && y >= 26 ? G[3] : y <= 15 ? G[3] : y <= 20 ? G[2] : null),
        atras: (h) => {
          if (!h.lado) {
            h.asa({ 25: [11, 12], 26: [10, 13], 27: [9, 15], 28: [11, 16], 29: [10, 17], 30: [8, 18], 31: [11, 18], 32: [10, 18], 33: [13, 18], 34: [15, 18] }, (x, _y, x0) => (x === x0 ? G[3] : G[2]), G[0]);
            h.forma({ 37: [12, 15], 38: [10, 16], 39: [12, 16], 40: [14, 16] }, (x, _y, x0) => (x === x0 ? G[0] : G[2]));
            return;
          }
          h.forma({ 25: [44, 45], 26: [42, 46], 27: [41, 48], 28: [39, 45], 29: [39, 47], 30: [39, 49], 31: [39, 45], 32: [39, 47], 33: [39, 43] }, (x, y, _x0, x1) => (x === x1 || y === 25 ? G[0] : x === x1 - 1 ? G[3] : G[2]), 'lado');
          caudaLado(h, K[2], K[0], G[2]);
        },
        depois: (h) => {
          const { M, R, S } = h;
          const corCrista: CorForma = (x, _y, x0, x1) => (x === x0 || x === x1 ? '#a8861a' : '#f2d23a');
          if (h.lado) {
            h.olhos(c.olho);
            S(37, 21, 2, 1, G[0]);
            h.forma({ 6: [29, 30], 7: [29, 30], 8: [28, 31], 9: [28, 31], 10: [28, 31], 11: [28, 31] }, corCrista, 'lado');
            h.forma({ 10: [38, 40], 11: [37, 42], 12: [37, 43], 13: [38, 41] }, (x, _y, _x0, x1) => (x === x1 ? G[0] : G[2]), 'lado');
            return;
          }
          if (h.frente) { h.olhos(c.olho); M(24, 38, 2, 1, G[2]); M(25, 44, 1, 2, G[2]); }
          else { M(25, 37, 3, 1, G[2]); M(27, 42, 2, 1, G[2]); R(31, 36, 2, 3, G[2]); caudaCostas(h, K[2], K[0], G[2]); }
          M(20, 21, 2, 1, G[0]);
          h.forma({ 6: [31, 32], 7: [31, 32], 8: [30, 33], 9: [30, 33], 10: [30, 33], 11: [30, 33] }, corCrista, 'um');
          h.forma({ 10: [19, 20], 11: [18, 21], 12: [18, 22], 13: [19, 22] }, (x, _y, x0) => (x === x0 ? G[0] : G[2]));
        },
      };
    },
  ),

  zacian: arte<CoresZacian>(
    {
      normal: { base: ['#0c1830', '#14264a', '#1d3766', '#2a4c88'], cor: ['#1a5480', '#2a84bc', '#4eb0e6', '#90d8f8'], tranca: '#e04a8a', trancaE: '#9c2458', lamina: ['#2a6f92', '#9fdcf0', '#eafcff'], cabo: '#27357a', gema: '#e0322d', olho: '#f7d13a' },
      shiny: { base: ['#0c2a30', '#14424c', '#1d5c68', '#2a7a88'], cor: ['#1f6f7c', '#34a6b0', '#66d8dc', '#b6f6f4'], tranca: '#f58ac0', trancaE: '#b24a80', lamina: ['#3a8a8a', '#b6f0ea', '#f2fffd'], cabo: '#1f5a66', gema: '#e0322d', olho: '#f7d13a' },
    },
    (c) => ({
      modelo: 'traje',
      base: c.base,
      cor: c.cor,
      peito: [CREME[1], CREME[3]],
      gema: c.tranca,
      queixo: CREME[2],
      atras: (h) => {
        if (h.frente) espada(h, c, false);
        else if (h.lado) espadaLado(h, c);
      },
      depois: (h) => {
        const { M, R, S } = h, T = c.tranca, TE = c.trancaE;
        orelhas(h, c.cor, T);
        h.olhos(c.olho);
        // tranças saindo do capuz: de frente e de costas uma de cada lado; de lado, uma atrás
        if (h.lado) { for (let y = 27; y <= 38; y++) S(40, y, 2, 1, y % 3 === 0 ? TE : T); S(40, 27, 2, 1, OURO); S(40, 38, 2, 1, OURO); S(40, 39, 2, 2, CREME[3]); S(22, 13, 3, 2, T); return; }
        const x = h.frente ? 18 : 24, fim = h.frente ? 40 : 39;
        for (let y = 27; y <= fim; y++) M(x, y, 2, 1, y % 3 === 0 ? TE : T);
        M(x, 27, 2, 1, OURO); M(x, fim, 2, 1, OURO); M(x, fim + 1, 2, 2, CREME[3]);
        if (h.frente) { M(25, 37, 1, 1, T); M(24, 38, 1, 2, T); M(25, 40, 1, 2, T); R(30, 12, 4, 3, T); R(31, 15, 2, 1, TE); }
        else { R(30, 14, 4, 4, T); R(31, 18, 2, 1, TE); espada(h, c, true); }
      },
    }),
  ),

  zamazenta: arte<CoresZamazenta>(
    {
      normal: { base: ['#16161e', '#22222c', '#30303c', '#454552'], cor: ['#6a1420', '#a4202c', '#d63a40', '#f47068'], juba: '#27357a', jubaC: '#4a62c8', jubaE: '#141c48', gema: '#4a62c8', olho: '#f7d13a' },
      shiny: { base: ['#1a1622', '#282234', '#383048', '#4e4462'], cor: ['#74144c', '#b02478', '#de4ca6', '#f690cc'], juba: '#2a2a8a', jubaC: '#5a5ae0', jubaE: '#16164e', gema: '#5a5ae0', olho: '#f7d13a' },
    },
    (c) => ({
      modelo: 'traje',
      base: c.base,
      cor: c.cor,
      peito: [CREME[1], CREME[3]],
      gema: c.gema,
      queixo: CREME[2],
      // a juba azul fica nas ombreiras (de frente e de lado) e na nuca (de costas)
      ombro: [c.jubaE, c.juba, c.juba, c.jubaC],
      atras: (h) => {
        if (h.frente) escudo(h, c);
        else if (h.lado) escudoLado(h);
      },
      depois: (h) => {
        const { R, S } = h;
        orelhas(h, c.cor, c.jubaC, c.juba);
        if (h.costas) escudo(h, c);
        h.olhos(c.olho);
        if (h.costas) {
          for (let x = 22; x <= 41; x++) for (let y = 34; y <= 36 + (x % 3 === 0 ? 1 : 0); y++) R(x, y, 1, 1, y === 34 || (x + y) % 4 === 0 ? c.jubaC : c.juba);
          R(30, 14, 4, 4, c.juba); R(31, 18, 2, 1, c.jubaE);
        }
        if (h.frente) { R(30, 38, 4, 3, OURO); R(30, 38, 1, 3, OUROE); R(33, 38, 1, 3, OUROE); R(31, 41, 2, 1, OUROE); R(30, 12, 4, 3, c.juba); R(31, 15, 2, 1, c.jubaC); }
        if (h.lado) S(22, 13, 3, 2, c.juba);
      },
    }),
  ),
};

// ---------- modelo "roupa": as skins especiais (conquistas, sazonais e iniciais) ----------
// O personagem continua com o rosto e o cabelo dele; a skin troca a roupa (camisa, mangas, calça, sapato) e põe
// chapéu e acessórios. Coordenadas no quadro de frente parado, como nas outras.

/** Quatro tons (do escuro ao claro) a partir de uma cor. */
const tons = (cor: string): Rampa => {
  const c = [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16));
  const f = (k: number) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(k <= 1 ? v * k : v + (255 - v) * (k - 1)))).toString(16).padStart(2, '0')).join('');
  return [f(0.5), f(0.75), f(1), f(1.3)];
};

function roupa(h: Pincel, cfg: Desenho) {
  const { L, g, dy } = h, curto = cfg.curto, luva = cfg.luva, braco = cfg.braco;
  cfg.atras?.(h);
  const coberta = cfg.semCabelo || !!cfg.touca;
  // a parte do cabelo que passa por trás do corpo
  if (!coberta && L.cabeloFundo.folha) g.drawImage(L.cabeloFundo.folha, L.cabeloFundo.ox, L.cabeloFundo.oy, 64, 64, 0, 0, 64, 64);
  h.base();
  // calça curta: abaixo da linha fica a perna do personagem
  h.pintar(L.calca, cfg.perna!, curto ? (_x, y) => y - dy <= curto : undefined);
  h.pintar(L.camiseta, cfg.tecido!);
  if (braco || luva) h.mangas((d, beira, _x, eBraco) => (eBraco && d <= 2 ? (luva ? (beira ? luva[0] : luva[1]) : '') : braco ? (beira ? braco[1] : braco[2]) : ''));
  h.pintar(L.tenis, cfg.sapato!);
  if (cfg.sola) h.sola(cfg.sola);
  cfg.enfeite?.(h);
  // com chapéu, o cabelo acima da aba fica escondido; com touca, só a franja aparece na janela
  if (cfg.touca) h.capuz(cfg.touca, cfg);
  else if (!cfg.semCabelo) h.cabelo(cfg.corte ?? 0);
  cfg.depois?.(h);
}

/** Quanto os chapéus descem em relação às coordenadas em que foram desenhados (para assentar na testa). */
const DESCE = 4;
/** O mesmo pincel, desenhando DESCE linhas mais abaixo: usado em tudo o que vai na cabeça. */
const naCabeca = (h: Pincel): Pincel => ({
  ...h,
  R: (x, y, w, a, cor) => h.R(x, y + DESCE, w, a, cor),
  M: (x, y, w, a, cor) => h.M(x, y + DESCE, w, a, cor),
  S: (x, y, w, a, cor) => h.S(x, y + DESCE, w, a, cor),
  forma: (linhas, cor, modo) => h.forma(Object.fromEntries(Object.entries(linhas).map(([y, v]) => [+y + DESCE, v])), (x, y, x0, x1) => cor(x, y - DESCE, x0, x1), modo),
});
/** Chapéu por linhas inteiras (a mesma forma de frente, de costas e de lado); as linhas largas ganham 2 de cada lado. */
const chapeu = (h: Pincel, linhas: Linhas, cor: CorForma) =>
  h.forma(Object.fromEntries(Object.entries(linhas).map(([y, [x0, x1]]) => { const f = x1 - x0 >= 9 ? 2 : x1 - x0 >= 5 ? 1 : 0; return [y, [x0 - f, x1 + f]]; })), cor, 'um');
/** Cor de chapéu: contorno escuro nas pontas, faixa nas linhas dadas. */
const corDeChapeu = (C: Rampa, faixas: number[] = [], corFaixa = PRETO, topo = -1): CorForma => (x, y, x0, x1) => (x === x0 || x === x1 || y === topo ? C[0] : faixas.includes(y) ? corFaixa : x <= x0 + 2 ? C[1] : x >= x1 - 2 ? C[1] : C[2]);
/** "V" da camisa de baixo aparecendo no peito (só de frente). */
const decote = (h: Pincel, cor: string, sombra: string, ate = 41, meia = 3) => {
  if (!h.frente) return;
  for (let y = 34; y <= ate; y++) {
    const hw = Math.max(1, meia - Math.floor(((y - 34) * meia) / (ate - 33)));
    h.T(32 - hw, y, hw * 2, 1, cor);
    h.T(32 - hw, y, 1, 1, sombra);
    h.T(31 + hw, y, 1, 1, sombra);
  }
};
/** Pontinhos coloridos espalhados pela camisa (lantejoula, confete). */
const pontinhos = (h: Pincel, cores: string[], passo = 11) => {
  for (let y = 33; y <= 46; y++) for (let x = 12; x <= 51; x++) { const k = x * 7 + y * 13; if (k % passo === 0) h.T(x, y, 1, 1, cores[(k / passo) % cores.length | 0], true); }
};
const BONE: Linhas = { 8: [27, 36], 9: [25, 38], 10: [24, 39], 11: [24, 39], 12: [23, 40], 13: [23, 40], 14: [23, 40] };
/** Boné: copa, aba (de frente uma faixa; de lado, para a frente) e painel da frente. */
const bone = (h: Pincel, C: Rampa, painel?: string, aba = C) => {
  chapeu(h, BONE, corDeChapeu(C, [], PRETO, 8));
  if (h.frente) { if (painel) { h.R(28, 10, 8, 5, painel); h.R(28, 10, 8, 1, C[1]); } h.R(22, 15, 20, 2, aba[2]); h.R(22, 16, 20, 1, aba[0]); }
  else if (h.lado) { if (painel) h.S(24, 10, 5, 5, painel); h.S(17, 14, 9, 2, aba[2]); h.S(17, 15, 9, 1, aba[0]); }
  else { h.R(29, 13, 6, 2, C[0]); h.R(30, 13, 4, 1, PRETO); }
};
/** Forma cheia com contorno (corações, ovos, abóbora), só na roupa. */
const figura = (h: Pincel, linhas: Record<number, [number, number][]>, cor: (x: number, y: number) => string) => {
  for (const [ys, trechos] of Object.entries(linhas)) for (const [x0, x1] of trechos) for (let x = x0; x <= x1; x++) h.T(x, +ys, 1, 1, cor(x, +ys));
};
const CORACAO: Record<number, [number, number][]> = { 36: [[27, 30], [33, 36]], 37: [[26, 37]], 38: [[26, 37]], 39: [[27, 36]], 40: [[28, 35]], 41: [[29, 34]], 42: [[30, 33]], 43: [[31, 32]] };
const OVAL: Record<number, [number, number][]> = { 36: [[30, 33]], 37: [[29, 34]], 38: [[28, 35]], 39: [[28, 35]], 40: [[28, 35]], 41: [[28, 35]], 42: [[29, 34]], 43: [[30, 33]] };
/** Pinta a roupa pixel a pixel (estampas); soCamisa: só a camisa. Cor null = deixa como está. */
const estampa = (h: Pincel, cor: (x: number, y: number) => string | null, soCamisa = false) => {
  for (let y = 32; y <= 58; y++) for (let x = 8; x <= 55; x++) { const c = cor(x, y); if (c) h.T(x, y, 1, 1, c, soCamisa); }
};
/** "PO" de PokeOrigins em dourado (letras de 3 × 5), no tamanho dado. */
const monograma = (h: Pincel, x: number, y: number, e: number) => {
  const P_ = ['###', '#.#', '###', '#..', '#..'], O_ = ['###', '#.#', '#.#', '#.#', '###'];
  [P_, O_].forEach((letra, k) => letra.forEach((linha, j) => [...linha].forEach((c, i) => { if (c === '#') h.T(x + (k * 4 + i) * e, y + j * e, e, e, j === 0 ? '#ffe27a' : OURO); })));
};
/** Saco do Papai Noel nas costas (Natal): de frente aparece por cima do ombro, de lado atrás, de costas inteiro. */
const saco = (h: Pincel) => {
  const C = ['#5a3c1a', '#8a6230', '#b48a4a', '#d6b478'];
  const bola = (mx: number, my: number, rx: number, ry: number, p: (x: number, y: number, cor: string) => void) => {
    for (let y = Math.floor(my - ry); y <= Math.ceil(my + ry); y++) for (let x = Math.floor(mx - rx); x <= Math.ceil(mx + rx); x++) {
      const u = (x - mx) / rx, v = (y - my) / ry, r2 = u * u + v * v;
      if (r2 <= 1) p(x, y, r2 > 0.8 ? C[0] : u + v > 0.55 ? C[1] : u + v < -0.6 ? C[3] : C[2]);
    }
  };
  const um = (x: number, y: number, cor: string) => h.R(x, y, 1, 1, cor), lado = (x: number, y: number, cor: string) => h.S(x, y, 1, 1, cor);
  if (h.frente) {
    // a boca do saco amarrada por cima do ombro e o corpo dele atrás do braço
    bola(43, 38, 7.5, 10, um);
    h.R(40, 26, 5, 3, C[2]); h.R(40, 26, 5, 1, C[0]); h.R(40, 26, 1, 3, C[0]); h.R(44, 26, 1, 3, C[0]); h.R(40, 29, 5, 1, '#d42a2a');
  } else if (h.lado) {
    bola(45, 40, 6.5, 10, lado);
    h.S(42, 28, 4, 3, C[2]); h.S(42, 28, 4, 1, C[0]); h.S(45, 28, 1, 3, C[0]); h.S(42, 31, 4, 1, '#d42a2a');
  } else {
    bola(31.5, 42, 10, 10.5, um);
    h.R(29, 29, 6, 3, C[2]); h.R(29, 29, 6, 1, C[0]); h.R(29, 29, 1, 3, C[0]); h.R(34, 29, 1, 3, C[0]); h.R(29, 32, 6, 1, '#d42a2a');
    // remendo e a corda que passa pelo ombro
    h.R(34, 44, 4, 4, C[1]); h.R(34, 44, 4, 1, C[0]); h.R(34, 44, 1, 4, C[0]);
  }
};
/** Cabeça de abóbora (Halloween): cobre a cabeça inteira; rosto recortado e aceso de frente e de lado. */
const abobora = (h: Pincel) => {
  const LJ = ['#8a3c08', '#c8600e', '#f08a1c', '#f8ac48'], LUZ = '#ffe27a', FOGO = '#f6a81c', mx = 31.5, my = 25.5, rx = 12.5, ry = 11.5;
  for (let y = 13; y <= 37; y++) for (let x = 18; x <= 45; x++) {
    const u = (x - mx) / rx, v = (y - my) / ry, r2 = u * u + v * v;
    if (r2 > 1) continue;
    const gomo = Math.abs(Math.abs(u) - 0.4) < 0.045 || Math.abs(Math.abs(u) - 0.76) < 0.04;
    h.R(x, y, 1, 1, r2 > 0.85 ? LJ[0] : gomo ? LJ[1] : v < -0.5 ? LJ[3] : LJ[2]);
  }
  h.R(30, 10, 4, 4, '#3f7a2c'); h.R(30, 10, 1, 4, '#285018'); h.R(33, 9, 3, 2, '#3f7a2c'); h.R(35, 10, 2, 1, '#285018');
  if (h.frente) {
    h.M(24, 24, 6, 1, LUZ); h.M(25, 23, 4, 1, LUZ); h.M(26, 22, 2, 1, LUZ); h.M(24, 25, 6, 1, FOGO);
    h.R(31, 27, 2, 2, LUZ);
    h.R(24, 30, 16, 1, LUZ); h.R(25, 31, 14, 2, LUZ); h.R(27, 33, 10, 1, FOGO);
    h.R(27, 30, 2, 2, LJ[2]); h.R(35, 30, 2, 2, LJ[2]); h.R(31, 32, 2, 2, LJ[2]);
  } else if (h.lado) {
    h.S(21, 24, 5, 1, LUZ); h.S(22, 23, 3, 1, LUZ); h.S(23, 22, 1, 1, LUZ); h.S(21, 25, 5, 1, FOGO);
    h.S(20, 30, 8, 1, LUZ); h.S(20, 31, 7, 2, LUZ); h.S(23, 30, 2, 2, LJ[2]);
  }
};
const igual = (d: Desenho): Arte => ({ normal: d, shiny: d });

const COURO = ['#3e2414', '#5c3820', '#7a4e2c', '#9a6a42'], PRETOS = ['#0c0c12', '#1a1a22', '#262630', '#3c3c4a'], BRANCOS = ['#aab4c6', '#ccd4e2', '#eef1f6', '#ffffff'];
const VERMELHO = tons('#d42a2a'), JEANS = ['#2c4a7c', '#3f66a4', '#5884c4', '#8cb0e2'];

Object.assign(ARTES, {
  // ---------- conquistas ----------
  galante: igual({
    modelo: 'roupa', tecido: PRETOS, braco: PRETOS, luva: [SOMBRA, BRANCO], perna: PRETOS, sapato: PRETOS, corte: 19,
    enfeite: (h) => {
      decote(h, BRANCO, SOMBRA, 42);
      if (h.frente) { h.T(29, 34, 6, 2, '#d42a2a'); h.T(31, 34, 2, 2, '#8a1414'); h.T(36, 37, 2, 2, '#e0322d'); h.T(37, 39, 1, 1, '#2e8a3a'); h.T(31, 44, 2, 1, OURO); }
      h.faixa(46, '#3c3c4a');
    },
    depois: (h0) => chapeu(naCabeca(h0), { 2: [25, 38], 3: [25, 38], 4: [25, 38], 5: [25, 38], 6: [25, 38], 7: [25, 38], 8: [25, 38], 9: [25, 38], 10: [25, 38], 11: [25, 38], 12: [25, 38], 13: [20, 43], 14: [20, 43] }, corDeChapeu(PRETOS, [10, 11], '#d42a2a', 2)),
  }),
  chaveiro: igual({
    modelo: 'roupa', tecido: tons('#c9cdd6'), perna: tons('#2f58a8'), sapato: COURO, corte: 19,
    enfeite: (h) => {
      const AZ = tons('#2f58a8');
      // macacão: peitilho e alças de frente, alças cruzadas de costas
      if (h.frente) { h.T(26, 38, 12, 9, AZ[2]); h.T(26, 38, 12, 1, AZ[3]); h.T(26, 33, 2, 5, AZ[2]); h.T(36, 33, 2, 5, AZ[2]); h.T(26, 38, 1, 1, OURO); h.T(37, 38, 1, 1, OURO);
        h.T(30, 40, 4, 3, OURO); h.T(31, 41, 2, 1, AZ[0]); h.T(31, 43, 2, 3, OURO); h.T(33, 44, 1, 1, OURO); h.T(33, 45, 1, 1, OUROE); }
      else if (h.costas) { for (let i = 0; i < 9; i++) { h.T(26 + i, 33 + i, 2, 1, AZ[2]); h.T(36 - i, 33 + i, 2, 1, AZ[2]); } h.T(24, 42, 16, 5, AZ[2]); }
      else { h.T(0, 41, 64, 6, AZ[2]); h.S(30, 33, 2, 8, AZ[2]); }
      // molho de chaves no cinto
      if (h.frente) { h.R(40, 46, 3, 3, OUROB); h.R(41, 47, 1, 1, OURO); h.R(41, 49, 1, 3, OURO); h.R(42, 51, 1, 1, OURO); }
    },
    depois: (h0) => { const h = naCabeca(h0); bone(h, tons('#2f58a8'), OURO); if (h.frente) { h.R(31, 11, 2, 1, OUROB); h.R(31, 12, 1, 2, OUROB); } },
  }),
  indianajones: igual({
    modelo: 'roupa', tecido: COURO, braco: COURO, perna: tons('#a89466'), sapato: ['#22140a', '#36200e', '#4a2e16', '#6a4424'], corte: 19,
    enfeite: (h) => {
      decote(h, '#efe2c0', '#b9a47a', 43);
      const TIRA = '#22140a';
      // bolsa a tiracolo e chicote enrolado no cinto
      if (h.frente) { for (let i = 0; i <= 12; i++) h.T(26 + Math.round((i * 11) / 12), 33 + i, 2, 1, TIRA); h.R(38, 45, 5, 5, TIRA); h.R(39, 46, 3, 3, '#8a6a3a'); h.R(20, 45, 4, 4, TIRA); h.R(21, 46, 2, 2, COURO[2]); }
      else if (h.costas) { for (let i = 0; i <= 12; i++) h.T(37 - Math.round((i * 11) / 12), 33 + i, 2, 1, TIRA); h.R(21, 45, 5, 5, TIRA); h.R(22, 46, 3, 3, '#8a6a3a'); }
      else { h.S(29, 33, 2, 12, TIRA); h.S(27, 45, 6, 5, TIRA); h.S(28, 46, 4, 3, '#8a6a3a'); }
      h.faixa(46, TIRA);
    },
    depois: (h0) => {
      const h = naCabeca(h0);
      const F = ['#3a2412', '#5a3a1e', '#7a5230', '#98703f'];
      chapeu(h, { 6: [27, 36], 7: [25, 38], 8: [24, 39], 9: [24, 39], 10: [24, 39], 11: [24, 39], 12: [24, 39], 13: [19, 44], 14: [17, 46] }, corDeChapeu(F, [11, 12], '#22140a', 6));
      h.R(30, 6, 4, 2, F[0]);
    },
  }),

  // ---------- sazonais ----------
  halloween: igual({
    modelo: 'roupa', tecido: ['#120c1c', '#20142e', '#2e1c42', '#44305e'], braco: ['#120c1c', '#20142e', '#2e1c42', '#44305e'], perna: tons('#6a2c9c'), sapato: PRETOS, semCabelo: true,
    enfeite: (h) => {
      const LJ = '#f08a1c';
      h.faixa(49, LJ); h.faixa(52, LJ);
      // esqueleto no peito (de frente) e a coluna (de costas)
      if (h.frente) { h.T(31, 34, 2, 11, BRANCO); for (const y of [36, 38, 40]) { h.T(27, y, 10, 1, BRANCO); h.T(27, y, 1, 1, SOMBRA); h.T(36, y, 1, 1, SOMBRA); } h.T(29, 42, 6, 1, BRANCO); }
      else if (h.costas) { h.T(31, 34, 2, 12, BRANCO); for (const y of [36, 39, 42]) h.T(30, y, 4, 1, SOMBRA); }
    },
    depois: (h) => abobora(h),
  }),
  natal: igual({
    modelo: 'roupa', tecido: VERMELHO, braco: VERMELHO, luva: [SOMBRA, BRANCO], perna: VERMELHO, sapato: PRETOS, corte: 19,
    enfeite: (h) => {
      h.faixa(33, BRANCO);
      if (h.frente) { h.T(31, 34, 2, 12, BRANCO); h.T(31, 34, 1, 12, SOMBRA); }
      h.faixa(44, BRANCO); h.faixa(45, PRETO); h.faixa(46, PRETO); h.barra(BRANCO);
      if (h.frente) { h.R(30, 44, 4, 4, OURO); h.R(31, 45, 2, 2, PRETO); }
      // a corda do saco passa pelo ombro
      if (h.frente) for (let i = 0; i <= 7; i++) h.T(38 - i, 33 + i, 2, 1, i % 2 ? '#8a6230' : '#b48a4a');
    },
    atras: (h) => { if (!h.costas) saco(h); },
    depois: (h0) => {
      if (h0.costas) saco(h0);
      const h = naCabeca(h0);
      chapeu(h, { 4: [30, 34], 5: [28, 36], 6: [27, 37], 7: [26, 38], 8: [25, 39], 9: [25, 39], 10: [24, 40], 11: [24, 40], 12: [22, 42], 13: [22, 42], 14: [22, 42] }, (x, y, x0, x1) => (y >= 12 ? (x === x0 || x === x1 || y === 14 ? SOMBRA : BRANCO) : x === x0 || x === x1 ? VERMELHO[0] : VERMELHO[2]));
      chapeu(h, { 1: [31, 33], 2: [30, 34], 3: [30, 34], 4: [31, 33] }, (x, y, x0, x1) => (x === x0 || x === x1 || y === 4 ? SOMBRA : BRANCO));
    },
  }),
  // Carnaval: folião de bloco (escolha do dono entre três opções)
  carnaval: igual({
    modelo: 'roupa', tecido: tons('#18b0b0'), perna: tons('#f08a1c'), curto: 50, sapato: COURO, corte: 19,
    enfeite: (h) => {
      // folião de bloco: camisa florida e colar de flores
      estampa(h, (x, y) => ((x * 5 + y * 3) % 13 === 0 ? '#f6a0c8' : (x * 3 + y * 7) % 17 === 0 ? '#ffe27a' : (x * 5 + y * 3) % 13 === 1 ? '#e0489a' : null), true);
      const FLOR = ['#e0489a', '#ffe27a', '#ffffff', '#f08a1c'];
      if (h.frente) for (const [x, y] of [[26, 34], [27, 35], [28, 36], [29, 37], [30, 38], [31, 38], [32, 38], [33, 38], [34, 37], [35, 36], [36, 35], [37, 34]]) { h.T(x, y, 1, 1, FLOR[x % 4]); h.T(x, y + 1, 1, 1, FLOR[(x + 1) % 4]); }
      else if (h.costas) for (let x = 26; x <= 37; x++) { h.T(x, 34, 1, 1, FLOR[x % 4]); h.T(x, 35, 1, 1, FLOR[(x + 1) % 4]); }
      else for (let x = 27; x <= 34; x++) h.S(x, 34 + Math.max(0, 31 - x), 1, 2, FLOR[x % 4]);
    },
    depois: (h0) => {
      const { L, tem, P } = h0;
      // óculos escuros em volta dos olhos
      let x0 = 64, x1 = -1, y0 = 64, y1 = -1;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (tem(L.olhos, x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 >= 0) {
        const meio = (x0 + x1) / 2;
        for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 2; x <= x1 + 2; x++) {
          if (h0.frente && Math.abs(x - meio) < 1.5 && y > y0 - 1) continue;
          P(x, y, y === y0 - 1 ? '#3a3a48' : (x + y) % 5 === 0 ? '#4a6a9a' : '#14141c');
        }
      }
      const h = naCabeca(h0);
      chapeu(h, { 8: [27, 36], 9: [25, 38], 10: [24, 39], 11: [24, 39], 12: [24, 39], 13: [19, 44], 14: [17, 46] }, corDeChapeu(tons('#e8cc7a'), [11, 12], '#e0489a', 8));
    },
  }),
  pascoa: igual({
    modelo: 'roupa', tecido: tons('#9ccdf0'), braco: tons('#9ccdf0'), luva: [SOMBRA, BRANCO], perna: BRANCOS, sapato: tons('#f29abc'), touca: BRANCOS, queixo: '#f6a8c4',
    atras: (h) => { if (h.lado) h.forma({ 44: [40, 42], 45: [39, 43], 46: [39, 43], 47: [40, 42] }, (x, y, x0, x1) => (x === x1 || y === 44 || y === 47 ? SOMBRA : BRANCO), 'lado'); },
    enfeite: (h) => {
      if (h.frente) figura(h, OVAL, (x, y) => (y === 36 || y === 43 || x === 28 || x === 35 ? '#c06a9a' : y === 38 || y === 41 ? '#f6e27a' : (x + y) % 2 ? '#f29abc' : '#ffffff'));
      h.faixa(46, '#f29abc');
    },
    depois: (h) => {
      const dentro = '#f6a8c4';
      if (h.costas) h.forma({ 44: [30, 33], 45: [29, 34], 46: [29, 34], 47: [30, 33] }, (x, y, x0, x1) => (x === x0 || x === x1 || y === 47 ? SOMBRA : BRANCO), 'um');
      // orelhas de coelho que nascem da touca
      const ORELHA: Linhas = { 1: [25, 27], 2: [24, 28], 3: [24, 28], 4: [24, 28], 5: [24, 28], 6: [24, 28], 7: [24, 28], 8: [24, 28], 9: [24, 28], 10: [24, 28], 11: [24, 28], 12: [24, 28], 13: [24, 28] };
      const cor: CorForma = (x, y, x0, x1) => (x === x0 || x === x1 || y === 1 ? BRANCOS[0] : !h.costas && y >= 3 && y <= 11 && x > x0 + 1 && x < x1 - 1 ? dentro : BRANCO);
      if (h.lado) h.forma(Object.fromEntries(Object.entries(ORELHA).map(([y, [x0, x1]]) => [y, [x0 + 8, x1 + 8]])), cor, 'lado');
      else h.forma(ORELHA, cor);
    },
  }),
  namorados: igual({
    modelo: 'roupa', tecido: tons('#f6a0c0'), perna: tons('#8a1c44'), sapato: BRANCOS,
    atras: (h) => {
      // asinhas de cupido
      if (!h.lado) { h.asa({ 29: [13, 15], 30: [11, 17], 31: [10, 18], 32: [10, 18], 33: [11, 18], 34: [13, 18], 35: [15, 18] }, (x, _y, x0) => (x <= x0 + 1 ? '#ffffff' : BRANCO), '#b8a8c8'); return; }
      h.forma({ 29: [40, 43], 30: [39, 45], 31: [39, 46], 32: [39, 46], 33: [39, 45], 34: [39, 43] }, (x, y, _x0, x1) => (x === x1 || y === 29 || y === 34 ? '#b8a8c8' : BRANCO), 'lado');
    },
    enfeite: (h) => {
      const V = '#e0223a', VE = '#9c1428';
      if (h.frente) { figura(h, CORACAO, (x, y) => (y === 36 && (x === 28 || x === 34) ? '#ff8a9c' : x <= 26 || x >= 37 || y >= 42 ? VE : V)); h.T(28, 37, 2, 1, '#ff8a9c'); }
      else if (h.costas) { h.T(29, 38, 2, 2, V); h.T(33, 38, 2, 2, V); h.T(29, 40, 6, 1, V); h.T(30, 41, 4, 1, V); h.T(31, 42, 2, 1, V); }
      h.faixa(33, '#ffffff'); h.faixa(46, V);
    },
    depois: (h0) => {
      const h = naCabeca(h0), V = '#e0223a';
      h.R(22, 13, 20, 1, V); h.R(22, 14, 20, 1, '#9c1428');
      if (!h.lado) { h.M(28, 8, 3, 1, V); h.R(27, 9, 10, 2, V); h.R(28, 11, 8, 1, V); h.R(29, 12, 6, 1, V); h.R(28, 9, 1, 1, '#ff8a9c'); }
      else { h.R(30, 9, 4, 4, V); h.R(31, 8, 2, 1, V); }
    },
  }),
  // aniversário do PokeOrigins: preto, dourado e creme, com o "PO" da marca no peito e nas costas
  aniversario: igual({
    modelo: 'roupa', tecido: PRETOS, braco: PRETOS, luva: [CREME[1], CREME[3]], perna: CREME, sapato: PRETOS, sola: [OUROE, OURO], corte: 17,
    enfeite: (h) => {
      h.faixa(33, OURO);
      if (h.frente) { monograma(h, 28, 37, 1); h.T(25, 34, 1, 11, OUROE); h.T(38, 34, 1, 11, OUROE); }
      else if (h.costas) monograma(h, 25, 35, 2);
      h.faixa(45, OURO); h.faixa(46, OUROE); h.barra(OURO);
      if (h.frente) { h.R(30, 45, 4, 2, OUROB); h.R(31, 45, 2, 1, CREME[3]); }
    },
    depois: (h0) => {
      const h = naCabeca(h0);
      // coroa dourada
      h.R(21, 12, 22, 3, OURO); h.R(21, 14, 22, 1, OUROE); h.R(21, 12, 1, 3, OUROB); h.R(42, 12, 1, 3, OUROB);
      h.R(21, 9, 2, 3, OURO); h.R(26, 8, 2, 4, OURO); h.R(31, 6, 2, 6, OURO); h.R(36, 8, 2, 4, OURO); h.R(41, 9, 2, 3, OURO);
      h.R(31, 13, 2, 1, PRETO); h.R(26, 13, 2, 1, CREME[3]); h.R(36, 13, 2, 1, CREME[3]); h.R(31, 5, 2, 1, CREME[3]);
    },
  }),

  // ---------- iniciais: vêm com o cabelo do personagem oficial (o mais parecido do LPC) ----------
  ash: igual({
    modelo: 'roupa', cabelo: ['messy2', 'black'], tecido: tons('#2f52b8'), luva: ['#1f7a3a', '#3fae5a'], perna: JEANS, sapato: ['#101014', '#1c1c24', '#2a2a34', '#f0f0f0'], sola: ['#c9d3e6', '#ffffff'], corte: 19,
    enfeite: (h) => {
      h.faixa(33, BRANCO);
      // camiseta preta aparecendo no colete aberto e mangas brancas
      if (h.frente) { h.T(30, 34, 4, 12, '#1c1c24'); h.T(29, 34, 1, 12, OURO); h.T(34, 34, 1, 12, OURO); }
      if (!h.lado) { h.T(12, 33, 11, 8, BRANCO, true); h.T(41, 33, 11, 8, BRANCO, true); h.T(12, 40, 11, 1, SOMBRA, true); h.T(41, 40, 11, 1, SOMBRA, true); }
      h.faixa(46, '#1c1c24');
    },
    depois: (h0) => { const h = naCabeca(h0); bone(h, VERMELHO, BRANCO); if (h.frente) { h.R(30, 11, 4, 1, '#2fae5a'); h.R(31, 12, 2, 2, '#2fae5a'); } else if (h.lado) h.S(25, 11, 3, 2, '#2fae5a'); },
  }),
  gary: igual({
    modelo: 'roupa', cabelo: ['spiked', 'light_brown'], tecido: tons('#6a3aa8'), braco: tons('#6a3aa8'), perna: tons('#2a3a78'), sapato: COURO,
    enfeite: (h) => {
      const R = tons('#6a3aa8');
      h.faixa(33, R[0]);
      // cordão com o pingente
      if (h.frente) { h.T(29, 34, 1, 2, '#22222a'); h.T(34, 34, 1, 2, '#22222a'); h.T(30, 36, 1, 1, '#22222a'); h.T(33, 36, 1, 1, '#22222a'); h.T(31, 37, 2, 3, OURO); h.T(31, 39, 2, 1, '#2fae5a'); }
      h.faixa(45, '#22222a'); h.faixa(46, '#22222a');
      if (h.frente) h.R(30, 45, 4, 2, OURO);
    },
  }),
  may: igual({
    modelo: 'roupa', cabelo: ['bunches', 'chestnut'], tecido: VERMELHO, luva: ['#1c2858', '#2c3c84'], perna: BRANCOS, curto: 49, sapato: VERMELHO, sola: ['#c9d3e6', '#ffffff'], corte: 19,
    enfeite: (h) => {
      const AZ = tons('#22306a');
      // bermuda azul por baixo do short branco
      h.pintar(h.L.calca, AZ, (_x, y) => y - h.dy >= 50 && y - h.dy <= 52);
      h.faixa(33, AZ[2]); h.faixa(34, AZ[2]);
      if (h.frente) { h.T(31, 35, 2, 9, AZ[1]); h.T(26, 44, 12, 3, '#f2c81c'); h.T(26, 46, 12, 1, '#b8901a'); h.T(31, 45, 2, 1, '#b8901a'); }
      else h.faixa(45, '#f2c81c');
    },
    depois: (h0) => {
      const h = naCabeca(h0);
      chapeu(h, { 8: [27, 36], 9: [25, 38], 10: [24, 39], 11: [24, 39], 12: [23, 40], 13: [23, 40], 14: [23, 40] }, corDeChapeu(VERMELHO, [], PRETO, 8));
      if (h.frente) { h.R(30, 10, 4, 1, BRANCO); h.R(29, 11, 6, 2, BRANCO); h.R(31, 11, 2, 1, VERMELHO[2]); }
      else if (h.costas) { h.R(30, 15, 4, 2, VERMELHO[1]); h.R(28, 17, 3, 3, VERMELHO[2]); h.R(33, 17, 3, 3, VERMELHO[2]); }
      else { h.S(24, 11, 4, 2, BRANCO); h.S(40, 13, 3, 2, VERMELHO[1]); h.S(41, 15, 3, 4, VERMELHO[2]); }
    },
  }),
  misty: igual({
    modelo: 'roupa', cabelo: ['high_ponytail', 'orange'], tecido: tons('#f2d030'), perna: JEANS, curto: 50, sapato: VERMELHO, sola: ['#c9d3e6', '#ffffff'],
    enfeite: (h) => {
      const V = '#d42a2a';
      // suspensórios vermelhos
      if (!h.lado) { h.T(26, 33, 2, 14, V); h.T(36, 33, 2, 14, V); }
      else h.S(30, 33, 2, 14, V);
      if (h.frente) { h.T(26, 45, 1, 1, OURO); h.T(37, 45, 1, 1, OURO); }
      h.faixa(47, JEANS[0]);
    },
  }),
});

/** De qual arte é o item (`skin-kyogre`, `skin-kyogre-shiny`…); null = skin sem arte (as especiais, por enquanto). */
function arteDoItem(id: string | null | undefined): { desenho: Desenho; shiny: boolean } | null {
  if (!id?.startsWith('skin-')) return null;
  const shiny = id.endsWith('-shiny');
  const a = ARTES[id.slice(5, shiny ? -6 : undefined)];
  return a ? { desenho: shiny ? a.shiny : a.normal, shiny } : null;
}
/** Skins de personagem oficial trocam o cabelo do jogador: [id do cabelo LPC, cor], ou null. */
export const cabeloDaSkin = (id: string | null | undefined): [string, string] | null => arteDoItem(id)?.desenho.cabelo ?? null;
/** A skin tem visual no personagem? */
export const temArteDeSkin = (id: string | null | undefined): boolean => !!arteDoItem(id);

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
/** Aura do shiny: o contorno "engordado" de cada quadro, numa cor clara (o mapa desenha por baixo e faz pulsar). */
function auraDe(folha: HTMLCanvasElement, cor: string): HTMLCanvasElement {
  const W = folha.width, H = folha.height, src = folha.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, H).data;
  const g = tela(W, H), img = g.createImageData(W, H), [r, v, b] = hex(cor);
  for (let fy = 0; fy < H; fy += 64) for (let fx = 0; fx < W; fx += 64) {
    const op = (x: number, y: number) => x >= fx && y >= fy && x < fx + 64 && y < fy + 64 && src[(y * W + x) * 4 + 3] > 40;
    for (let y = fy; y < fy + 64; y++) for (let x = fx; x < fx + 64; x++) {
      if (op(x, y)) continue;
      let d = 9;
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const m = Math.abs(i) + Math.abs(j); if (m <= 3 && m < d && op(x + i, y + j)) d = m; }
      if (d > 3) continue;
      const k = (y * W + x) * 4;
      img.data[k] = r + (255 - r) * 0.55;
      img.data[k + 1] = v + (255 - v) * 0.55;
      img.data[k + 2] = b + (255 - b) * 0.55;
      img.data[k + 3] = d === 1 ? 215 : d === 2 ? 130 : 60;
    }
  }
  g.putImageData(img, 0, 0);
  return g.canvas;
}

/**
 * Desenha a folha do personagem (qualquer animação: quadros 64×64 em 4 linhas) vestindo a skin, a partir das camadas
 * LPC dele já recoloridas (corpo, cabeça, olhos e cabelo; as roupas só dão o formato). `comAura`: gera também a
 * aura do shiny. Devolve null se a skin não tem arte.
 */
export function desenharSkin(camadas: Map<string, HTMLCanvasElement>, idSkin: string, comAura: boolean): { folha: HTMLCanvasElement; aura: HTMLCanvasElement | null } | null {
  const a = arteDoItem(idSkin);
  const corpo = camadas.get('corpo');
  if (!a || !corpo) return null;
  const W = corpo.width, H = corpo.height, colunas = W / 64;
  const contextos = new Map(NOMES_CAMADAS.map((n) => [n, camadas.get(n)?.getContext('2d', { willReadFrequently: true }) ?? null]));
  const saida = tela(W, H);
  for (let linha = 0; linha < H / 64; linha++) for (let col = 0; col < colunas; col++) {
    const L = {} as Camadas;
    for (const n of NOMES_CAMADAS) {
      const ctx = contextos.get(n), cabe = ctx && col * 64 < ctx.canvas.width && linha * 64 < ctx.canvas.height;
      L[n] = { d: cabe ? ctx.getImageData(col * 64, linha * 64, 64, 64) : new ImageData(64, 64), folha: cabe ? ctx.canvas : null, ox: col * 64, oy: linha * 64 };
    }
    const h = preparar(L, linha, col, colunas);
    if (!h) continue;
    (a.desenho.modelo === 'traje' ? traje : a.desenho.modelo === 'roupa' ? roupa : pijama)(h, a.desenho);
    saida.drawImage(h.g.canvas, col * 64, linha * 64);
  }
  return { folha: saida.canvas, aura: comAura && a.shiny ? auraDe(saida.canvas, (a.desenho.corpo ?? a.desenho.cor!)[3]) : null };
}
