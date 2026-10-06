// Gera o mapa de um bioma e desenha em pixel art (tiles de 16px, ampliados 2× pela câmera).
// Tudo é desenhado por código até termos um tileset de verdade.
import type { Paleta } from './paletas';

export const TAM = 16;
export const LARGURA = 48;
export const ALTURA = 36;

export type Terreno = 'chao' | 'mato' | 'caminho' | 'ponte' | 'liquido';

export interface Mapa {
  terreno: Terreno[][];
  bloqueado: boolean[][];
  /** obstáculos 2×2 (árvores, pedras grandes…) com canto superior esquerdo em x,y */
  grandes: { x: number; y: number }[];
  pedrinhas: { x: number; y: number }[];
  flores: { x: number; y: number; cor: string; dx: number; dy: number }[];
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

  // lagos (água, lava ou abismo, conforme o bioma)
  for (let i = 0; i < paleta.lagos; i++) mancha(entre(7, LARGURA - 8), entre(6, ALTURA - 7), 2.5 + r() * 3, 'liquido', ['chao']);

  // caminhos que cruzam o mapa (2 de largura); sobre o líquido viram ponte
  const pintarCaminho = (x: number, y: number) => {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const [px, py] = [x + dx, y + dy];
      if (!dentro(px, py)) continue;
      terreno[py][px] = terreno[py][px] === 'liquido' || terreno[py][px] === 'ponte' ? 'ponte' : 'caminho';
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
        flores.push({ x: fx, y: fy, cor: paleta.flores[Math.floor(r() * paleta.flores.length)], dx: entre(2, 10), dy: entre(2, 10) });

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
  /** "Pokemon-inspired 16x16 tiles" de Red_Voxel (CC-BY-SA 3.0): árvore */
  voxel: CanvasImageSource;
}

// posições (coluna, linha) dos tiles no tileset do Buch
const GRAMAS: [number, number][] = [[2, 1], [3, 1], [5, 5], [6, 5], [2, 1], [3, 1]];
const MATO_ALTO: [number, number] = [1, 5];
const FLORES: [number, number][] = [[7, 0], [7, 1], [7, 3], [7, 4], [7, 6], [7, 7]];
const AREIA: [number, number] = [4, 5];

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
  const voxel = comFiltro(tilesets.voxel, paleta.filtro);
  const tile = (src: CanvasImageSource, [tx, ty]: [number, number], px: number, py: number) =>
    ctx.drawImage(src, tx * TAM, ty * TAM, TAM, TAM, px, py, TAM, TAM);

  const [liq, liqBrilho, liqBorda, liqMargem] = paleta.liquido;

  for (let y = 0; y < ALTURA; y++)
    for (let x = 0; x < LARGURA; x++) {
      const px = x * TAM;
      const py = y * TAM;
      const tipo = terreno[y][x];

      // grama do tileset é a base de tudo
      tile(buch, GRAMAS[Math.floor(r() * GRAMAS.length)], px, py);

      if (tipo === 'mato') {
        tile(buch, MATO_ALTO, px, py);
      } else if (tipo === 'caminho') {
        // areia do tileset + borda clara/escura onde encosta na grama (como no tileset)
        tile(buch, AREIA, px, py);
        const ehCaminho = (v: Terreno | null) => v === 'caminho' || v === 'ponte' || v === null;
        const bordas: [boolean, number, number, number, number][] = [
          [!ehCaminho(t(x, y - 1)), px, py, TAM, 1],
          [!ehCaminho(t(x, y + 1)), px, py + TAM - 1, TAM, 1],
          [!ehCaminho(t(x - 1, y)), px, py, 1, TAM],
          [!ehCaminho(t(x + 1, y)), px + TAM - 1, py, 1, TAM],
        ];
        ctx.save();
        ctx.filter = paleta.filtro;
        for (const [ativo, bx, by, bw, bh] of bordas) {
          if (!ativo) continue;
          ctx.fillStyle = '#c8a860';
          ctx.fillRect(bx, by, bw, bh);
        }
        ctx.restore();
      } else if (tipo === 'liquido' || tipo === 'ponte') {
        ctx.fillStyle = liq;
        ctx.fillRect(px, py, TAM, TAM);
        const ehLiquido = (v: Terreno | null) => v === 'liquido' || v === 'ponte' || v === null;
        // margem clara + borda escura onde encosta na terra
        const lados: [boolean, number, number, number, number][] = [
          [!ehLiquido(t(x, y - 1)), px, py, TAM, 1],
          [!ehLiquido(t(x, y + 1)), px, py + TAM - 1, TAM, 1],
          [!ehLiquido(t(x - 1, y)), px, py, 1, TAM],
          [!ehLiquido(t(x + 1, y)), px + TAM - 1, py, 1, TAM],
        ];
        for (const [ativo, lx, ly, lw, lh] of lados) {
          if (!ativo) continue;
          ctx.fillStyle = liqMargem;
          ctx.fillRect(lx, ly, lw, lh);
          ctx.fillStyle = liqBorda;
          ctx.fillRect(lw === 1 ? (lx === px ? lx + 1 : lx - 1) : lx, lh === 1 ? (ly === py ? ly + 1 : ly - 1) : ly, lw, lh);
        }
        if (r() < 0.5) {
          const [wx, wy] = [px + 3 + Math.floor(r() * 8), py + 4 + Math.floor(r() * 8)];
          ctx.fillStyle = liqBrilho;
          ctx.fillRect(wx, wy, 3, 1);
          ctx.fillRect(wx + 1, wy - 1, 1, 1);
        }
        if (tipo === 'ponte') {
          const horizontal = t(x - 1, y) === 'ponte' || t(x + 1, y) === 'ponte' || t(x - 1, y) === 'caminho' || t(x + 1, y) === 'caminho';
          ctx.fillStyle = '#b8824e';
          ctx.fillRect(px, py, TAM, TAM);
          ctx.fillStyle = '#6e4626';
          for (let i = 0; i < TAM; i += 4) horizontal ? ctx.fillRect(px + i, py, 1, TAM) : ctx.fillRect(px, py + i, TAM, 1);
          ctx.fillStyle = '#d8a46a';
          for (let i = 1; i < TAM; i += 4) horizontal ? ctx.fillRect(px + i, py + 1, 1, TAM - 2) : ctx.fillRect(px + 1, py + i, TAM - 2, 1);
        }
      }
    }

  for (const f of mapa.flores) tile(buch, FLORES[(f.dx + f.dy) % FLORES.length], f.x * TAM, f.y * TAM);

  const pixel = (x: number, y: number, cor: string) => {
    ctx.fillStyle = cor;
    ctx.fillRect(x, y, 1, 1);
  };
  for (const p of mapa.pedrinhas) {
    const [cx, cy] = [p.x * TAM + 8, p.y * TAM + 9];
    elipse(ctx, cx, cy + 3, 6, 2, 'rgba(0,0,0,0.18)');
    elipse(ctx, cx, cy, 6, 4, '#3a3a42');
    elipse(ctx, cx, cy, 5, 3, '#7a7a84');
    elipse(ctx, cx - 1, cy - 1, 3, 1, '#a8a8b2');
    pixel(cx - 2, cy - 2, '#d0d0d8');
  }

  // grandes em ordem de cima para baixo, para os de baixo cobrirem os de cima
  for (const g of [...mapa.grandes].sort((a, b) => a.y - b.y)) {
    if (paleta.obstaculo === 'arvore') {
      // árvore do Red_Voxel: 48×48 a partir do tile (5,3), base alinhada com o fim do espaço 2×2
      ctx.drawImage(voxel, 5 * TAM, 3 * TAM, 48, 48, g.x * TAM - 8, g.y * TAM - 16, 48, 48);
    } else desenharGrande(ctx, g.x * TAM, g.y * TAM, paleta, r);
  }

  return canvas;
}

function desenharGrande(ctx: Ctx, ox: number, oy: number, paleta: Paleta, r: () => number) {
  const [contorno, escuro, medio, claro] = paleta.copa;
  const cx = ox + 16;
  elipse(ctx, cx, oy + 28, 12, 3, 'rgba(0,0,0,0.2)');

  switch (paleta.obstaculo) {
    case 'arvore': {
      ctx.fillStyle = '#4a2e1a';
      ctx.fillRect(cx - 4, oy + 21, 8, 8);
      ctx.fillStyle = '#7a5030';
      ctx.fillRect(cx - 3, oy + 21, 6, 7);
      ctx.fillStyle = '#9a6a40';
      ctx.fillRect(cx - 2, oy + 22, 2, 5);
      const bolas: [number, number, number][] = [
        [cx, oy + 10, 10],
        [cx - 7, oy + 15, 7],
        [cx + 7, oy + 15, 7],
        [cx, oy + 17, 8],
      ];
      for (const [bx, by, br] of bolas) circulo(ctx, bx, by, br + 1, contorno);
      for (const [bx, by, br] of bolas) circulo(ctx, bx, by, br, escuro);
      for (const [bx, by, br] of bolas) circulo(ctx, bx - 1, by - 2, br - 2, medio);
      circulo(ctx, cx - 3, oy + 7, 4, claro);
      circulo(ctx, cx - 8, oy + 13, 2, claro);
      circulo(ctx, cx + 5, oy + 12, 2, claro);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = r() < 0.5 ? escuro : claro;
        ctx.fillRect(cx - 9 + Math.floor(r() * 18), oy + 4 + Math.floor(r() * 16), 1, 1);
      }
      break;
    }
    case 'pinheiro': {
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(cx - 2, oy + 24, 4, 6);
      const camadas: [number, number, number][] = [
        [oy + 2, oy + 12, 7],
        [oy + 7, oy + 19, 10],
        [oy + 12, oy + 26, 13],
      ];
      for (const [topo, base, meia] of camadas) {
        for (let y = topo; y <= base; y++) {
          const w = Math.round(((y - topo) / (base - topo)) * meia);
          ctx.fillStyle = contorno;
          ctx.fillRect(cx - w - 1, y, w * 2 + 3, 1);
          ctx.fillStyle = y > base - 2 ? escuro : medio;
          ctx.fillRect(cx - w, y, w * 2 + 1, 1);
          ctx.fillStyle = claro; // neve na beirada de cima
          if (y < topo + 3) ctx.fillRect(cx - w, y, w * 2 + 1, 1);
        }
      }
      break;
    }
    case 'pedra': {
      elipse(ctx, cx, oy + 18, 14, 11, contorno);
      elipse(ctx, cx, oy + 18, 13, 10, escuro);
      elipse(ctx, cx - 1, oy + 16, 11, 8, medio);
      elipse(ctx, cx - 4, oy + 12, 5, 3, claro);
      ctx.fillStyle = contorno;
      ctx.fillRect(cx + 3, oy + 14, 1, 5);
      ctx.fillRect(cx + 4, oy + 19, 3, 1);
      break;
    }
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
