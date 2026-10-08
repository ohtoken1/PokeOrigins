// Mais peças da cidade desenhadas por código em pixel art: barracas de feira, cercas (branca e de madeira),
// cerca-viva, caixa de correio, bandeirolas de festa e o trem que passa na estação.
import { elipse, novoCanvas, ret } from './cidadeDesenhos';
import { ruido } from './ruido';

type Ctx = CanvasRenderingContext2D;

// ---------- barraca de feira ----------

export const TAM_BARRACA = { w: 52, h: 56 };
/** Cores do toldo: [listra, listra escura, contorno]. */
export const TOLDOS: Record<string, [string, string, string]> = {
  vermelho: ['#e0484a', '#b23436', '#6a1a1c'],
  verde: ['#4cae5a', '#2f8a42', '#164a24'],
  amarelo: ['#f2c440', '#d09a26', '#6a4a10'],
  azul: ['#4a86e0', '#2f62b6', '#16306a'],
};
/** Caixotes de frutas no core_city_and_country (x, y, 16 × 25). */
const CAIXOTES: [number, number][] = [[416, 316], [432, 316], [448, 316], [464, 316]];

/** Barraca com toldo listrado (bordas em ondinhas), balcão de madeira com frutas e um caixote na frente. */
export function desenharBarraca(cidade: CanvasImageSource | undefined, toldo: string, caixote: number): HTMLCanvasElement {
  const [c, ctx] = novoCanvas(TAM_BARRACA.w, TAM_BARRACA.h);
  const [cor, corEscura, contorno] = TOLDOS[toldo] ?? TOLDOS.vermelho;
  const ox = 2;
  // postes
  for (const x of [ox + 3, ox + 42]) {
    ret(ctx, '#4a2e1a', x - 1, 18, 4, 33);
    ret(ctx, '#8a5a34', x, 18, 2, 33);
    ret(ctx, '#b07a48', x, 18, 1, 33);
  }
  // balcão: tampo e frente de tábuas
  ret(ctx, '#4a2e1a', ox, 30, 48, 18);
  ret(ctx, '#d2a066', ox + 1, 31, 46, 4);
  ret(ctx, '#e6bc84', ox + 1, 31, 46, 1);
  ret(ctx, '#9a6a3e', ox + 1, 35, 46, 12);
  for (let x = ox + 8; x < ox + 47; x += 8) ret(ctx, '#7a4e2c', x, 35, 1, 12);
  ret(ctx, '#b47e4c', ox + 1, 35, 46, 1);
  // frutas no balcão (montinhos de bolinhas com brilho)
  const montinho = (x: number, base: string, luz: string) => {
    for (const [dx, dy] of [[0, 2], [3, 2], [6, 2], [1, 0], [4, 0], [2, -2]]) {
      ret(ctx, '#3a2414', x + dx, 29 + dy, 3, 3);
      ret(ctx, base, x + dx, 29 + dy, 2, 2);
      ret(ctx, luz, x + dx, 29 + dy, 1, 1);
    }
  };
  montinho(ox + 5, '#d83a3a', '#ff9a8a');
  montinho(ox + 19, '#f29a2a', '#ffd08a');
  montinho(ox + 33, '#7ac04a', '#c8f09a');
  // toldo listrado inclinado
  for (let y = 4; y <= 17; y++) {
    const recuo = Math.max(0, 4 - Math.floor((y - 4) / 3));
    for (let x = ox + recuo; x < ox + 48 - recuo; x++) {
      const listra = Math.floor((x - ox) / 6) % 2 === 0;
      let tom = listra ? cor : '#f6f2ea';
      if (y >= 14) tom = listra ? corEscura : '#d8d2c8';
      ret(ctx, tom, x, y, 1, 1);
    }
  }
  ret(ctx, contorno, ox + 4, 3, 40, 1);
  ret(ctx, '#ffffff', ox + 5, 5, 38, 1);
  // ondinhas embaixo do toldo
  for (let k = 0; k < 8; k++) {
    const x = ox + k * 6;
    const listra = k % 2 === 0;
    ret(ctx, listra ? corEscura : '#d8d2c8', x, 18, 6, 2);
    ret(ctx, listra ? corEscura : '#d8d2c8', x + 1, 20, 4, 1);
    ret(ctx, contorno, x + 1, 21, 4, 1);
    ret(ctx, contorno, x, 20, 1, 1);
    ret(ctx, contorno, x + 5, 20, 1, 1);
  }
  for (let y = 4; y <= 17; y++) {
    const recuo = Math.max(0, 4 - Math.floor((y - 4) / 3));
    ret(ctx, contorno, ox + recuo - 1, y, 1, 1);
    ret(ctx, contorno, ox + 48 - recuo, y, 1, 1);
  }
  // caixote de frutas na frente (do tileset)
  if (cidade) {
    const [sx, sy] = CAIXOTES[caixote % CAIXOTES.length];
    ctx.drawImage(cidade, sx, sy, 16, 25, caixote % 2 ? 0 : TAM_BARRACA.w - 16, TAM_BARRACA.h - 25, 16, 25);
  }
  return c;
}

// ---------- cercas ----------

/** Cerca branca de ripas, na horizontal (n tiles) ou vertical. */
export function desenharCercaBranca(n: number, vertical = false): HTMLCanvasElement {
  const [contorno, branco, sombra, trilho] = ['#5e6474', '#f6f6f2', '#cdd2dc', '#e4e4e0'];
  const ripa = (ctx: Ctx, x: number, y: number, alt: number) => {
    ret(ctx, contorno, x, y + 1, 5, alt);
    ret(ctx, contorno, x + 1, y, 3, 1);
    ret(ctx, branco, x + 1, y + 1, 3, alt - 1);
    ret(ctx, sombra, x + 3, y + 2, 1, alt - 2);
    ret(ctx, '#ffffff', x + 1, y + 1, 1, 2);
  };
  if (!vertical) {
    const [c, ctx] = novoCanvas(n * 16, 18);
    for (const y of [7, 13]) {
      ret(ctx, contorno, 0, y - 1, n * 16, 4);
      ret(ctx, trilho, 0, y, n * 16, 2);
    }
    for (let x = 1; x < n * 16; x += 8) ripa(ctx, x, 2, 15);
    return c;
  }
  const [c, ctx] = novoCanvas(16, n * 16 + 6);
  ret(ctx, contorno, 6, 4, 4, n * 16);
  ret(ctx, trilho, 7, 4, 2, n * 16);
  for (let y = 0; y < n * 16; y += 8) ripa(ctx, 5, y, 13);
  return c;
}

/** Cerca rústica de madeira (postes e duas travessas), na horizontal ou vertical. */
export function desenharCercaMadeira(n: number, vertical = false): HTMLCanvasElement {
  const [contorno, madeira, luz] = ['#3e2818', '#946036', '#c08a56'];
  const poste = (ctx: Ctx, x: number, y: number, alt: number) => {
    ret(ctx, contorno, x, y, 5, alt);
    ret(ctx, madeira, x + 1, y + 1, 3, alt - 2);
    ret(ctx, luz, x + 1, y + 1, 1, alt - 2);
    ret(ctx, luz, x + 1, y + 1, 3, 1);
  };
  if (!vertical) {
    const [c, ctx] = novoCanvas(n * 16, 16);
    for (const y of [5, 10]) {
      ret(ctx, contorno, 0, y - 1, n * 16, 4);
      ret(ctx, madeira, 0, y, n * 16, 2);
      ret(ctx, luz, 0, y, n * 16, 1);
    }
    for (let x = 1; x < n * 16; x += 16) poste(ctx, x, 1, 15);
    poste(ctx, n * 16 - 6, 1, 15);
    return c;
  }
  const [c, ctx] = novoCanvas(16, n * 16 + 6);
  for (const x of [6]) {
    ret(ctx, contorno, x, 3, 4, n * 16);
    ret(ctx, madeira, x + 1, 3, 2, n * 16);
  }
  for (let y = 0; y < n * 16; y += 16) poste(ctx, 5, y, 14);
  poste(ctx, 5, n * 16 - 10, 14);
  return c;
}

// ---------- cerca-viva ----------

/** Cerca-viva (arbusto aparado) de w × h pixels de base: cantos arredondados, topo levemente irregular, folhas com luz de cima. */
export function desenharCercaViva(w: number, h: number, semente = 0): HTMLCanvasElement {
  const alto = 8;
  const [c, ctx] = novoCanvas(w, h + alto);
  const [contorno, escuro, medio, claro, brilho, sombra] = ['#1c4a2c', '#2a7a44', '#3f9a52', '#62b864', '#9ad882', '#215e36'];
  const raio = 6;
  const dentro = (x: number, y: number) => {
    const topo = 1 + Math.round(ruido(x / 4, semente, 77) * 2);
    if (y < topo || y >= h + alto || x < 0 || x >= w) return false;
    // cantos arredondados
    const cx = x < raio ? raio : x > w - 1 - raio ? w - 1 - raio : x;
    const cy = y < topo + raio ? topo + raio : y > h + alto - 1 - raio ? h + alto - 1 - raio : y;
    return (x - cx) ** 2 + (y - cy) ** 2 <= raio * raio;
  };
  for (let y = 0; y < h + alto; y++)
    for (let x = 0; x < w; x++) {
      if (!dentro(x, y)) continue;
      const borda = !dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1);
      if (borda) {
        ret(ctx, contorno, x, y, 1, 1);
        continue;
      }
      // a parte de cima é o topo aparado (mais claro); a frente fica mais escura embaixo
      const n = ruido(x / 2.6 + semente, y / 2.6, 78);
      const frente = y > alto + 2;
      let cor = n > 0.62 ? claro : n < 0.32 ? escuro : medio;
      if (!frente && n > 0.55) cor = brilho;
      if (frente && y > h + alto - 5) cor = n > 0.6 ? escuro : sombra;
      ret(ctx, cor, x, y, 1, 1);
    }
  // linha onde o topo vira a frente
  for (let x = 2; x < w - 2; x++) if (dentro(x, alto + 2) && ruido(x / 3, 1, 79) > 0.35) ret(ctx, escuro, x, alto + 2, 1, 1);
  return c;
}

// ---------- caixa de correio ----------

export const TAM_CORREIO = { w: 12, h: 20 };
export function desenharCaixaCorreio(): HTMLCanvasElement {
  const [c, ctx] = novoCanvas(TAM_CORREIO.w, TAM_CORREIO.h);
  ret(ctx, '#3e2818', 4, 9, 4, 11);
  ret(ctx, '#946036', 5, 9, 2, 11);
  ret(ctx, '#5a1a1a', 1, 2, 10, 9);
  ret(ctx, '#5a1a1a', 2, 1, 8, 1);
  ret(ctx, '#d0403e', 2, 2, 8, 8);
  ret(ctx, '#f07a6a', 3, 2, 6, 1);
  ret(ctx, '#a8302e', 2, 8, 8, 2);
  ret(ctx, '#5a1a1a', 2, 6, 8, 1);
  ret(ctx, '#f2c440', 10, 3, 2, 4);
  return c;
}

// ---------- bandeirolas ----------

const CORES_BANDEIROLA = ['#e0484a', '#f2c440', '#4a86e0', '#4cae5a', '#f6f2ea', '#e87ac0'];
/** Varal de bandeirolas penduradas entre dois postes (largura em px), balançando (quadro 0..1). */
export function desenharBandeirolas(largura: number, f: number): HTMLCanvasElement {
  const caida = Math.min(12, Math.round(largura / 12));
  const [c, ctx] = novoCanvas(largura, caida + 12);
  const yDe = (x: number) => Math.round((caida * 4 * x * (largura - x)) / (largura * largura));
  for (let x = 0; x < largura; x++) ret(ctx, '#3a3a44', x, yDe(x) + 1, 1, 1);
  let k = 0;
  for (let x = 4; x < largura - 6; x += 9, k++) {
    const y = yDe(x + 3) + 2;
    const balanco = (k + f) % 2;
    const cor = CORES_BANDEIROLA[k % CORES_BANDEIROLA.length];
    for (let i = 0; i < 6; i++) {
      const w = 7 - i - (i > 3 ? 1 : 0);
      ret(ctx, cor, x + Math.floor(i / 2) + (i > 2 ? balanco : 0), y + i, Math.max(1, w - Math.floor(i / 2)), 1);
    }
  }
  return c;
}

// ---------- trem ----------

export const TAM_TREM = { w: 196, h: 44 };
/** Trem de passageiros visto de lado (locomotiva à esquerda, dois vagões), rodas no quadro `f` (0..1). */
export function desenharTrem(f: number): HTMLCanvasElement {
  const [c, ctx] = novoCanvas(TAM_TREM.w, TAM_TREM.h);
  const roda = (x: number, y: number, r: number) => {
    elipse(ctx, x, y, r + 1, r + 1, '#1a1a20');
    elipse(ctx, x, y, r, r, '#c83a34');
    elipse(ctx, x, y, Math.max(1, r - 2), Math.max(1, r - 2), '#2a2a30');
    const a = f * Math.PI / 2;
    ret(ctx, '#e8e0d0', x + Math.round(Math.cos(a) * (r - 1)), y + Math.round(Math.sin(a) * (r - 1)), 1, 1);
  };
  // vagões (atrás)
  for (const x0 of [68, 132]) {
    ret(ctx, '#1e1e26', x0, 8, 62, 27);
    ret(ctx, '#ece2c8', x0 + 1, 9, 60, 12);
    ret(ctx, '#3a64b0', x0 + 1, 21, 60, 13);
    ret(ctx, '#5a86d0', x0 + 1, 21, 60, 1);
    ret(ctx, '#d8c8a4', x0 + 1, 20, 60, 1);
    for (let k = 0; k < 5; k++) {
      ret(ctx, '#3a3a48', x0 + 4 + k * 11, 11, 8, 7);
      ret(ctx, '#a8d4f0', x0 + 5 + k * 11, 12, 6, 5);
      ret(ctx, '#e4f4ff', x0 + 5 + k * 11, 12, 2, 2);
    }
    // teto arredondado
    ret(ctx, '#4a4a56', x0 - 1, 4, 64, 5);
    ret(ctx, '#6e6e7c', x0, 4, 62, 1);
    ret(ctx, '#2a2a34', x0 + 1, 3, 60, 1);
    ret(ctx, '#2a2a34', x0 + 4, 35, 54, 2);
    roda(x0 + 9, 37, 4);
    roda(x0 + 19, 37, 4);
    roda(x0 + 43, 37, 4);
    roda(x0 + 53, 37, 4);
    ret(ctx, '#2a2a34', x0 - 4, 28, 4, 3);
  }
  // locomotiva: caldeira, chaminé, cabine vermelha
  ret(ctx, '#1a1a20', 4, 14, 40, 20);
  ret(ctx, '#2e5a3a', 5, 15, 38, 18);
  ret(ctx, '#4a8a5a', 5, 16, 38, 3);
  for (const x of [14, 26, 38]) ret(ctx, '#d0a840', x, 15, 2, 18);
  ret(ctx, '#1a1a20', 9, 2, 9, 13);
  ret(ctx, '#3a3a44', 10, 3, 7, 12);
  ret(ctx, '#1a1a20', 7, 1, 13, 3);
  elipse(ctx, 30, 13, 4, 3, '#1a1a20');
  elipse(ctx, 30, 13, 3, 2, '#d0a840');
  ret(ctx, '#1a1a20', 42, 4, 24, 31);
  ret(ctx, '#c83a34', 43, 9, 22, 25);
  ret(ctx, '#e8625a', 43, 9, 22, 2);
  ret(ctx, '#3a3a48', 47, 12, 14, 9);
  ret(ctx, '#a8d4f0', 48, 13, 12, 7);
  ret(ctx, '#e4f4ff', 48, 13, 3, 2);
  ret(ctx, '#2a2a34', 40, 3, 28, 6);
  ret(ctx, '#4a4a56', 41, 4, 26, 2);
  // limpa-trilhos e farol
  for (let i = 0; i < 6; i++) ret(ctx, '#b02a28', 0 + i, 33 - i, 6 - i, 1);
  ret(ctx, '#1a1a20', 1, 18, 4, 6);
  ret(ctx, '#fff2a0', 2, 19, 2, 4);
  roda(12, 36, 5);
  roda(25, 36, 5);
  roda(52, 37, 4);
  ret(ctx, '#c8c8d0', 12, 35, 14, 1);
  return c;
}
