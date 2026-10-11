// Arte das skins de lendário (as dos tickets), desenhada por código em cima das camadas LPC do personagem do jogador.
// Sete são "pijama com capuz" (macacão da cor do Pokémon, barriga, capuz com o rosto dele); Zacian e Zamazenta são
// "traje" (roupa escura com ombreiras, capuz com orelhas e a espada / o escudo nas costas). Cada skin tem as cores
// normais e as do shiny; o shiny ganha também uma aura (folha à parte) que o mapa faz pulsar (jogo/brilhoSkin.ts).
// As coordenadas são pensadas no quadro de frente parado (64×64) e acompanham a cabeça em cada quadro da animação.

type Rampa = string[];
type Linhas = Record<number, [number, number]>;
type CorForma = (x: number, y: number, x0: number, x1: number) => string;
type Modo = 'par' | 'um' | 'lado';
const NOMES_CAMADAS = ['corpo', 'cabeca', 'olhos', 'camiseta', 'calca', 'tenis', 'cabelo'] as const;
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
  modelo?: 'traje';
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
      for (const [a, b] of grupo) P(a, b, cor(fundo - b, !tem(L.corpo, a - 1, b) || !tem(L.corpo, a + 1, b), a - dx, fundo - alto >= 5));
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
  return { L, g, tem, P, R, M, S, forma, asa, pintar, olhos, base, mangas, faixa, oval, barra, sola, capuz, linha, coluna, frente, costas, lado, cx, dx, dy, hy0 };
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

/** As skins com arte, pelo nome do Pokémon em minúsculas (o do id do item: `skin-<nome>[-shiny]`). */
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

/** De qual arte é o item (`skin-kyogre`, `skin-kyogre-shiny`…); null = skin sem arte (as especiais, por enquanto). */
function arteDoItem(id: string | null | undefined): { desenho: Desenho; shiny: boolean } | null {
  if (!id?.startsWith('skin-')) return null;
  const shiny = id.endsWith('-shiny');
  const a = ARTES[id.slice(5, shiny ? -6 : undefined)];
  return a ? { desenho: shiny ? a.shiny : a.normal, shiny } : null;
}
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
    (a.desenho.modelo === 'traje' ? traje : pijama)(h, a.desenho);
    saida.drawImage(h.g.canvas, col * 64, linha * 64);
  }
  return { folha: saida.canvas, aura: comAura && a.shiny ? auraDe(saida.canvas, (a.desenho.corpo ?? a.desenho.cor!)[3]) : null };
}
