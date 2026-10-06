// Gera o mapa de um bioma e desenha em pixel art (tiles de 16px, ampliados 2× pela câmera).
// Tudo é desenhado por código até termos um tileset de verdade.
import type { Paleta } from './paletas';

export const TAM = 16;
export const LARGURA = 48;
export const ALTURA = 36;

export type Terreno = 'chao' | 'mato' | 'caminho' | 'liquido';

export interface Mapa {
  terreno: Terreno[][];
  bloqueado: boolean[][];
  /** obstáculos 2×2 (árvores, pedras grandes…) com canto superior esquerdo em x,y */
  grandes: { x: number; y: number }[];
  pedrinhas: { x: number; y: number }[];
  /** dx/dy só servem para variar qual flor do tileset aparece */
  flores: { x: number; y: number; dx: number; dy: number }[];
  inicio: { x: number; y: number };
}

/** Gerador aleatório com semente: o mesmo bioma gera sempre o mesmo mapa. */
export function aleatorioComSemente(texto: string): () => number {
  let s = 0;
  for (const c of texto) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- geração ----------

export function gerarMapa(semente: string, paleta: Paleta): Mapa {
  const r = aleatorioComSemente(semente);
  const entre = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const terreno: Terreno[][] = Array.from({ length: ALTURA }, () => Array<Terreno>(LARGURA).fill('chao'));
  const bloqueado: boolean[][] = Array.from({ length: ALTURA }, () => Array<boolean>(LARGURA).fill(false));
  const dentro = (x: number, y: number) => x >= 0 && y >= 0 && x < LARGURA && y < ALTURA;

  const mancha = (cx: number, cy: number, raio: number, tipo: Terreno, so: Terreno[]) => {
    for (let y = Math.floor(cy - raio - 1); y <= cy + raio + 1; y++)
      for (let x = Math.floor(cx - raio - 1); x <= cx + raio + 1; x++)
        if (dentro(x, y) && so.includes(terreno[y][x]) && Math.hypot(x - cx, (y - cy) * 1.15) < raio + r() * 0.9) terreno[y][x] = tipo;
  };

  // caminhos que cruzam o mapa (2 de largura)
  const pintarCaminho = (x: number, y: number) => {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const [px, py] = [x + dx, y + dy];
      if (dentro(px, py)) terreno[py][px] = 'caminho';
    }
  };
  let y = entre(ALTURA / 2 - 4, ALTURA / 2 + 4);
  for (let x = 0; x < LARGURA; x++) {
    pintarCaminho(x, y);
    if (r() < 0.18) y = Math.max(4, Math.min(ALTURA - 6, y + (r() < 0.5 ? -1 : 1)));
    pintarCaminho(x, y);
  }
  let x = entre(LARGURA / 2 - 6, LARGURA / 2 + 6);
  for (let yy = 0; yy < ALTURA; yy++) {
    pintarCaminho(x, yy);
    if (r() < 0.18) x = Math.max(4, Math.min(LARGURA - 6, x + (r() < 0.5 ? -1 : 1)));
    pintarCaminho(x, yy);
  }

  // lagos retangulares (a moldura de margem do tileset só encaixa em retângulos), sem encostar
  // em caminhos nem em outros lagos; mínimo 3×3 para caber os cantos e as bordas
  for (let i = 0, tentativas = 0; i < paleta.lagos && tentativas < 200; tentativas++) {
    const [w, h] = [entre(4, 9), entre(3, 6)];
    const [lx, ly] = [entre(4, LARGURA - w - 4), entre(4, ALTURA - h - 4)];
    let cabe = true;
    for (let yy = ly - 1; yy <= ly + h && cabe; yy++) for (let xx = lx - 1; xx <= lx + w && cabe; xx++) cabe = terreno[yy][xx] === 'chao';
    if (!cabe) continue;
    for (let yy = ly; yy < ly + h; yy++) for (let xx = lx; xx < lx + w; xx++) terreno[yy][xx] = 'liquido';
    i++;
  }

  // mato alto (só enfeite: os encontros acontecem em qualquer passo)
  for (let i = 0; i < 10; i++) mancha(entre(3, LARGURA - 4), entre(3, ALTURA - 4), 1.5 + r() * 2.5, 'mato', ['chao']);

  // obstáculos grandes: borda grossa de "floresta" e bosques espalhados
  const grandes: Mapa['grandes'] = [];
  const livre = (cx: number, cy: number) => dentro(cx, cy) && !bloqueado[cy][cx] && (terreno[cy][cx] === 'chao' || terreno[cy][cx] === 'mato');
  const colocarGrande = (gx: number, gy: number) => {
    if (![[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dy]) => livre(gx + dx, gy + dy))) return false;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) bloqueado[gy + dy][gx + dx] = true;
    grandes.push({ x: gx, y: gy });
    return true;
  };
  for (let gy = 0; gy < ALTURA - 1; gy += 2)
    for (let gx = 0; gx < LARGURA - 1; gx += 2)
      if (gx < 4 || gy < 4 || gx >= LARGURA - 5 || gy >= ALTURA - 5) colocarGrande(gx, gy);
  for (let i = 0; i < 16; i++) {
    const cx = entre(5, LARGURA - 7);
    const cy = entre(5, ALTURA - 7);
    for (let j = entre(2, 6); j > 0; j--) colocarGrande(cx + entre(-3, 3), cy + entre(-3, 3));
  }

  // pedrinhas e flores
  const pedrinhas: Mapa['pedrinhas'] = [];
  for (let i = 0; i < 30; i++) {
    const [px, py] = [entre(1, LARGURA - 2), entre(1, ALTURA - 2)];
    if (livre(px, py) && terreno[py][px] === 'chao') {
      bloqueado[py][px] = true;
      pedrinhas.push({ x: px, y: py });
    }
  }
  const flores: Mapa['flores'] = [];
  for (let fy = 0; fy < ALTURA; fy++)
    for (let fx = 0; fx < LARGURA; fx++)
      if (terreno[fy][fx] === 'chao' && !bloqueado[fy][fx] && r() < 0.07)
        flores.push({ x: fx, y: fy, dx: entre(2, 10), dy: entre(2, 10) });

  for (let by = 0; by < ALTURA; by++) for (let bx = 0; bx < LARGURA; bx++) if (terreno[by][bx] === 'liquido') bloqueado[by][bx] = true;

  // começa no trecho de caminho mais perto do centro
  let inicio = { x: LARGURA / 2, y: ALTURA / 2 };
  let melhor = Infinity;
  for (let iy = 0; iy < ALTURA; iy++)
    for (let ix = 0; ix < LARGURA; ix++) {
      const d = Math.hypot(ix - LARGURA / 2, iy - ALTURA / 2);
      if (terreno[iy][ix] === 'caminho' && !bloqueado[iy][ix] && d < melhor) {
        melhor = d;
        inicio = { x: ix, y: iy };
      }
    }
  return { terreno, bloqueado, grandes, pedrinhas, flores, inicio };
}

// ---------- desenho ----------

type Ctx = CanvasRenderingContext2D;

function circulo(ctx: Ctx, cx: number, cy: number, raio: number, cor: string) {
  ctx.fillStyle = cor;
  for (let y = -raio; y <= raio; y++)
    for (let x = -raio; x <= raio; x++) if (x * x + y * y <= raio * raio + raio * 0.6) ctx.fillRect(cx + x, cy + y, 1, 1);
}

function elipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, cor: string) {
  ctx.fillStyle = cor;
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.05) ctx.fillRect(cx + x, cy + y, 1, 1);
}

/** Desenha um modelo de texto: cada letra é uma cor, '.' é transparente. */
function modelo(ctx: Ctx, ox: number, oy: number, linhas: string[], cores: Record<string, string>) {
  linhas.forEach((linha, y) =>
    [...linha].forEach((c, x) => {
      if (c === '.' || !cores[c]) return;
      ctx.fillStyle = cores[c];
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }),
  );
}

/** Imagens dos tilesets (créditos em CREDITOS.md). */
export interface Tilesets {
  /** "Tuxemon Tileset" de Buch (CC-BY-SA 3.0): grama, mato, flores, areia */
  buch: CanvasImageSource;
  /** core_outdoor_nature do Tuxemon (CC-BY-SA 4.0): árvores e pedras */
  natureza: CanvasImageSource;
  /** core_outdoor_water do Tuxemon (CC-BY-SA 4.0): água e margens */
  agua: CanvasImageSource;
}

// posições (coluna, linha) dos tiles no tileset do Buch
const GRAMAS: [number, number][] = [[2, 1], [3, 1], [5, 5], [6, 5], [2, 1], [3, 1]];
const MATO_ALTO: [number, number] = [1, 5];
const FLORES: [number, number][] = [[7, 0], [7, 1], [7, 3], [7, 4], [7, 6], [7, 7]];
const AREIA: [number, number] = [4, 5];
// no core_outdoor_water: textura da água (bloco 6×6) e moldura da margem (3×3, meio transparente)
const AGUA: [number, number] = [9, 0];
const MARGEM: [number, number] = [6, 1];

/** Cópia do tileset com o filtro de cor do bioma já aplicado. */
function comFiltro(img: CanvasImageSource, filtro: string): CanvasImageSource {
  if (filtro === 'none') return img;
  const { width, height } = img as HTMLImageElement;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d')!;
  ctx.filter = filtro;
  ctx.drawImage(img, 0, 0);
  return c;
}

export function desenharMapa(mapa: Mapa, paleta: Paleta, semente: string, tilesets: Tilesets): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA * TAM;
  canvas.height = ALTURA * TAM;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const r = aleatorioComSemente(`${semente}:desenho`);
  const { terreno } = mapa;
  const t = (x: number, y: number): Terreno | null => terreno[y]?.[x] ?? null;

  const buch = comFiltro(tilesets.buch, paleta.filtro);
  const natureza = comFiltro(tilesets.natureza, paleta.filtroObjetos);
  const agua = comFiltro(tilesets.agua, paleta.filtroLiquido);
  const tile = (src: CanvasImageSource, [tx, ty]: [number, number], px: number, py: number, w = 1, h = 1) =>
    ctx.drawImage(src, tx * TAM, ty * TAM, w * TAM, h * TAM, px, py, w * TAM, h * TAM);

  for (let y = 0; y < ALTURA; y++)
    for (let x = 0; x < LARGURA; x++) {
      const px = x * TAM;
      const py = y * TAM;
      const tipo = terreno[y][x];

      if (tipo === 'liquido') {
        // textura repetida em blocos de 6×6 para não aparecer emenda
        tile(agua, [AGUA[0] + (x % 6), AGUA[1] + (y % 6)], px, py);
        const terra = (v: Terreno | null) => v !== 'liquido' && v !== null;
        const col = terra(t(x - 1, y)) ? 0 : terra(t(x + 1, y)) ? 2 : 1;
        const lin = terra(t(x, y - 1)) ? 0 : terra(t(x, y + 1)) ? 2 : 1;
        if (col !== 1 || lin !== 1) tile(agua, [MARGEM[0] + col, MARGEM[1] + lin], px, py);
        continue;
      }

      // grama do tileset é a base do resto
      tile(buch, GRAMAS[Math.floor(r() * GRAMAS.length)], px, py);

      if (tipo === 'mato') {
        tile(buch, MATO_ALTO, px, py);
      } else if (tipo === 'caminho') {
        // areia do tileset + borda onde encosta na grama
        tile(buch, AREIA, px, py);
        const ehCaminho = (v: Terreno | null) => v === 'caminho' || v === null;
        const bordas: [boolean, number, number, number, number][] = [
          [!ehCaminho(t(x, y - 1)), px, py, TAM, 1],
          [!ehCaminho(t(x, y + 1)), px, py + TAM - 1, TAM, 1],
          [!ehCaminho(t(x - 1, y)), px, py, 1, TAM],
          [!ehCaminho(t(x + 1, y)), px + TAM - 1, py, 1, TAM],
        ];
        ctx.save();
        ctx.filter = paleta.filtro;
        ctx.fillStyle = '#c8a860';
        for (const [ativo, bx, by, bw, bh] of bordas) if (ativo) ctx.fillRect(bx, by, bw, bh);
        ctx.restore();
      }
    }

  for (const f of mapa.flores) tile(buch, FLORES[(f.dx + f.dy) % FLORES.length], f.x * TAM, f.y * TAM);
  for (const p of mapa.pedrinhas) tile(natureza, paleta.pedrinhas[(p.x + p.y) % paleta.pedrinhas.length], p.x * TAM, p.y * TAM);

  // grandes em ordem de cima para baixo, para os de baixo cobrirem os de cima
  for (const g of [...mapa.grandes].sort((a, b) => a.y - b.y)) {
    const escolher = (lista: [number, number][]) => lista[(g.x * 7 + g.y * 3) % lista.length];
    if (paleta.obstaculo === 'arvore' && paleta.arvores) {
      // árvore de 2×3 tiles: a copa passa 1 tile acima do espaço 2×2 que ela bloqueia
      tile(natureza, escolher(paleta.arvores), g.x * TAM, (g.y - 1) * TAM, 2, 3);
    } else if (paleta.obstaculo === 'rocha' && paleta.rochas) {
      tile(natureza, escolher(paleta.rochas), g.x * TAM, g.y * TAM, 2, 2);
    } else desenharGrande(ctx, g.x * TAM, g.y * TAM, paleta);
  }

  return canvas;
}

/** Obstáculos sem tile no tileset (caixas da usina, lápides da torre), desenhados por código. */
function desenharGrande(ctx: Ctx, ox: number, oy: number, paleta: Paleta) {
  const [contorno, escuro, medio, claro] = paleta.copa;
  const cx = ox + 16;
  elipse(ctx, cx, oy + 28, 12, 3, 'rgba(0,0,0,0.2)');

  switch (paleta.obstaculo) {
    case 'caixa': {
      ctx.fillStyle = contorno;
      ctx.fillRect(ox + 3, oy + 4, 26, 25);
      ctx.fillStyle = medio;
      ctx.fillRect(ox + 4, oy + 5, 24, 23);
      ctx.fillStyle = claro;
      ctx.fillRect(ox + 4, oy + 5, 24, 2);
      ctx.fillStyle = escuro;
      for (let i = 0; i < 3; i++) ctx.fillRect(ox + 4, oy + 12 + i * 6, 24, 1);
      ctx.fillStyle = '#e8c832';
      ctx.fillRect(ox + 12, oy + 14, 8, 6);
      ctx.fillStyle = contorno;
      ctx.fillRect(ox + 15, oy + 15, 2, 4);
      break;
    }
    case 'lapide': {
      const [x0, y0] = [cx - 8, oy + 6];
      ctx.fillStyle = contorno;
      ctx.fillRect(x0 - 1, y0 + 3, 18, 21);
      circulo(ctx, cx, y0 + 4, 9, contorno);
      ctx.fillStyle = medio;
      ctx.fillRect(x0, y0 + 4, 16, 19);
      circulo(ctx, cx, y0 + 4, 8, medio);
      ctx.fillStyle = claro;
      ctx.fillRect(x0 + 1, y0, 3, 20);
      ctx.fillStyle = escuro;
      ctx.fillRect(cx - 1, y0 + 2, 2, 10);
      ctx.fillRect(cx - 4, y0 + 5, 8, 2);
      ctx.fillStyle = escuro;
      ctx.fillRect(x0 - 2, y0 + 22, 20, 3);
      break;
    }
  }
}

// ---------- jogador ----------

const JOGADOR = [
  '.....kkkkkk.....',
  '....krrrrrrk....',
  '...krrwrrrrrk...',
  '...kkkkkkkkkk...',
  '..kkrrrrrrrrkk..',
  '...ksssssssk....',
  '...kseksskes....',
  '...kssssssk.....',
  '....kssssk......',
  '...kbbbbbbk.....',
  '..kbbwbbbbbk....',
  '..ksbbbbbbsk....',
  '..kskbbbbksk....',
  '...kddkkddk.....',
  '...kddk.kddk....',
  '....kk...kk.....',
];

export function desenharJogador(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  modelo(canvas.getContext('2d')!, 1, 0, JOGADOR, {
    k: '#1e1e28',
    r: '#e03838',
    w: '#ffffff',
    s: '#f8c8a0',
    e: '#1e1e28',
    b: '#3060d0',
    d: '#3a4258',
  });
  return canvas;
}
