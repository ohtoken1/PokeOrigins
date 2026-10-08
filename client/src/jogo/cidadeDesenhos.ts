// Peças da cidade desenhadas por código em pixel art (sem tile pronto que servisse): fonte grande animada com estátua
// de Pokémon, arena (estádio visto de cima), poste de luz, o Pokémarket (prédio do tileset recolorido de verde para
// azul) e a sombra projetada de qualquer objeto.
type Ctx = CanvasRenderingContext2D;

export function novoCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  [c.width, c.height] = [Math.ceil(w), Math.ceil(h)];
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}
export const ret = (ctx: Ctx, cor: string, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = cor;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
/** Elipse cheia, linha por linha, sempre em pixels inteiros (bordas nítidas e simétricas). */
export function elipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, cor: string) {
  [cx, cy, rx, ry] = [Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry)];
  if (rx <= 0 || ry <= 0) return;
  ctx.fillStyle = cor;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.5) * (ry + 0.5)))));
    if (w > 0) ctx.fillRect(cx - w, cy + y, w * 2, 1);
  }
}
/** Só o contorno de uma elipse (1 px), sem buracos. */
function anel(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, cor: string, pular = 0) {
  [cx, cy, rx, ry] = [Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry)];
  ctx.fillStyle = cor;
  const passos = Math.ceil((rx + ry) * 4);
  let anterior = '';
  for (let i = 0; i < passos; i++) {
    if (pular && Math.floor(i / 2) % pular === 0) continue;
    const a = (i / passos) * Math.PI * 2;
    const [x, y] = [Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry)];
    if (`${x},${y}` === anterior) continue;
    anterior = `${x},${y}`;
    ctx.fillRect(x, y, 1, 1);
  }
}
/** Borda de baixo da elipse no ponto x (onde começa a parede da frente). */
const baseDaElipse = (x: number, cx: number, cy: number, rx: number, ry: number) => Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)));
/** Pokébola pequena (emblemas). */
export function pokebola(ctx: Ctx, cx: number, cy: number, r: number, cima: string, contorno: string) {
  elipse(ctx, cx, cy, r + 1, r + 1, contorno);
  elipse(ctx, cx, cy, r, r, '#f4f4ee');
  ctx.fillStyle = cima;
  for (let y = -r; y < 0; y++) {
    const w = Math.round(r * Math.sqrt(1 - (y * y) / ((r + 0.5) * (r + 0.5))));
    ctx.fillRect(cx - w, cy + y, w * 2, 1);
  }
  ret(ctx, contorno, cx - r, cy - 1, r * 2, 2);
  elipse(ctx, cx, cy, Math.max(1, Math.round(r / 3)), Math.max(1, Math.round(r / 3)), contorno);
  ret(ctx, '#f4f4ee', cx - 1, cy - 1, 2, 2);
}

// ---------- sombra ----------

/** Quanto a sombra anda para a direita por pixel de altura, e quanto ela "deita" (sol vindo da esquerda, por cima). */
const SOMBRA_DX = 0.45;
const SOMBRA_DY = 0.8;
/**
 * Sombra projetada no chão: cada pixel do objeto vai para a direita conforme a altura em que está.
 * A base (linha de baixo) fica no lugar, então a sombra "sai" do pé do objeto. `x0` é quanto a sombra começa à esquerda do objeto.
 */
export function sombraProjetada(img: CanvasImageSource, w: number, h: number): { canvas: HTMLCanvasElement; x0: number } {
  const [fonte, fctx] = novoCanvas(w, h);
  fctx.drawImage(img, 0, 0);
  const dados = fctx.getImageData(0, 0, w, h).data;
  const extra = Math.ceil(h * SOMBRA_DX) + 2;
  const [c, ctx] = novoCanvas(w + extra, h + 2);
  ctx.fillStyle = '#141c2c';
  for (let y = 0; y < h; y++) {
    const altura = h - 1 - y;
    const sy = Math.round(h - altura * SOMBRA_DY);
    const dx = Math.round(altura * SOMBRA_DX);
    for (let x = 0; x < w; x++) if (dados[(y * w + x) * 4 + 3] > 40) ctx.fillRect(x + dx, sy, 1, 2);
  }
  return { canvas: c, x0: 0 };
}

// ---------- fonte ----------

export const TAM_FONTE = { w: 176, h: 160 };
export const QUADROS_FONTE = 4;
/** Pokémon da estátua da fonte (número da Pokédex; sprite da 5ª geração). */
export const ESTATUA_FONTE = 151;

/** Sprite do Pokémon transformado em estátua de pedra (tons de cinza, contorno escuro), recortado no que é desenhado. */
export function estatuaDePedra(img: CanvasImageSource, w: number, h: number): HTMLCanvasElement | null {
  const [orig, octx] = novoCanvas(w, h);
  octx.drawImage(img, 0, 0);
  let d: Uint8ClampedArray;
  try {
    d = octx.getImageData(0, 0, w, h).data;
  } catch {
    return null;
  }
  let [x0, y0, x1, y1] = [w, h, -1, -1];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 100) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
  if (x1 < 0) return null;
  const tons = ['#3f4450', '#6a7280', '#8d95a2', '#adb4bf', '#ccd1da', '#e6e9ef'];
  const [c, ctx] = novoCanvas(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] <= 100) continue;
      const lum = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
      // claridade levemente puxada para cima (pedra clara) e iluminação vinda da esquerda
      const luz = (x - x0) / (x1 - x0 + 1);
      const t = Math.max(0, Math.min(tons.length - 1, Math.floor(((lum / 255) * 0.9 + 0.02 - luz * 0.15) * tons.length)));
      ctx.fillStyle = lum < 45 ? '#2e323c' : tons[t];
      ctx.fillRect(x - x0, y - y0, 1, 1);
    }
  return c;
}

/** Fonte redonda com pedestal e estátua de Pokémon no meio; jatos saindo da borda em arco até o pedestal (quadro 0..3). */
export function desenharFonte(f: number, estatua: HTMLCanvasElement | null): HTMLCanvasElement {
  const [c, ctx] = novoCanvas(TAM_FONTE.w, TAM_FONTE.h);
  const cx = 88;
  const [contorno, parede, sombraParede, borda, bordaClara] = ['#353a46', '#7d8593', '#68707e', '#c3c9d4', '#e2e6ee'];
  const agua = ['#f2fbff', '#b4e0ff', '#7cc0f4'];
  // degrau largo em volta
  elipse(ctx, cx, 132, 87, 25, contorno);
  elipse(ctx, cx, 131, 86, 24, '#8e95a2');
  elipse(ctx, cx, 129, 86, 23, '#aab1bd');
  // bacia: parede da frente com juntas
  const [by, brx, bry, alt] = [112, 76, 30, 14];
  elipse(ctx, cx, by + alt + 1, brx + 1, bry + 1, contorno);
  for (let o = alt; o >= 1; o--) elipse(ctx, cx, by + o, brx, bry, o > alt - 3 ? sombraParede : parede);
  for (let x = cx - brx + 8; x <= cx + brx - 8; x += 10) ret(ctx, sombraParede, x, baseDaElipse(x, cx, by, brx, bry) + 2, 1, alt - 3);
  // borda e água
  elipse(ctx, cx, by, brx + 1, bry + 1, contorno);
  elipse(ctx, cx, by, brx, bry, borda);
  elipse(ctx, cx, by - 1, brx - 2, bry - 2, bordaClara);
  elipse(ctx, cx, by + 2, brx - 8, bry - 6, contorno);
  elipse(ctx, cx, by + 3, brx - 9, bry - 7, '#2a6fc0');
  elipse(ctx, cx, by + 2, brx - 12, bry - 9, '#3f8fe0');
  for (let k = 0; k < 3; k++) {
    const r = 24 + ((f * 6 + k * 13) % 38);
    anel(ctx, cx, by + 4, r, Math.round(r * 0.4), k === 0 ? '#b8e2ff' : '#86c4f6', 3);
  }
  // bicos na borda e jatos em arco até o pedestal
  const angulos = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i / 8) * Math.PI * 2 + Math.PI / 8);
  const jato = (a: number) => {
    const [x1, y1] = [cx + Math.cos(a) * (brx - 5), by + Math.sin(a) * (bry - 4)];
    const [x2, y2] = [cx + Math.cos(a) * 20, by + 2 + Math.sin(a) * 8];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      if ((i + f * 2) % 6 === 0) continue;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * 26;
      ret(ctx, i % 5 === 0 ? agua[0] : agua[1], x, y, 2, 2);
    }
    ret(ctx, contorno, x1 - 1, y1 - 2, 3, 3);
    ret(ctx, bordaClara, x1, y1 - 2, 1, 1);
  };
  for (const a of angulos) if (Math.sin(a) < 0) jato(a);
  // pedestal (cilindro com frisos)
  const [pRx, pRy, pTopo] = [18, 7, by - 26];
  elipse(ctx, cx, by + 3, pRx + 1, pRy + 1, contorno);
  for (let y = by + 2; y >= pTopo; y--) {
    elipse(ctx, cx, y, pRx, pRy, y > by - 4 ? sombraParede : parede);
    ret(ctx, '#9aa2ae', cx - pRx + 3, y, 3, 1);
    ret(ctx, '#5d6573', cx + pRx - 5, y, 3, 1);
  }
  for (const y of [by - 4, pTopo + 4]) {
    elipse(ctx, cx, y + 1, pRx + 2, pRy + 1, contorno);
    elipse(ctx, cx, y, pRx + 2, pRy + 1, borda);
  }
  elipse(ctx, cx, pTopo, pRx + 3, pRy + 2, contorno);
  elipse(ctx, cx, pTopo, pRx + 2, pRy + 1, bordaClara);
  // estátua (ou um globo de pedra se o sprite não carregar)
  if (estatua) ctx.drawImage(estatua, Math.round(cx - estatua.width / 2), pTopo + 2 - estatua.height);
  else {
    elipse(ctx, cx, pTopo - 10, 10, 10, contorno);
    elipse(ctx, cx, pTopo - 10, 9, 9, borda);
    elipse(ctx, cx - 3, pTopo - 13, 3, 3, bordaClara);
  }
  // espuma em volta do pedestal e jatos da frente
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + f * 0.4;
    ret(ctx, agua[0], cx + Math.cos(a) * 22, by + 3 + Math.sin(a) * 9, 2, 1);
  }
  for (const a of angulos) if (Math.sin(a) >= 0) jato(a);
  return c;
}

// ---------- arena ----------

export const TAM_ARENA = { w: 256, h: 192 };
export const QUADROS_ARENA = 2;

/** Estádio oval visto de cima: muro de tijolo com arcos, arquibancadas azuis, campo de batalha, portão com Pokébola e bandeiras (quadro 0..1). */
export function desenharArena(f: number): HTMLCanvasElement {
  const [c, ctx] = novoCanvas(TAM_ARENA.w, TAM_ARENA.h);
  const [cx, cy, rx, ry, alt] = [128, 82, 122, 62, 32];
  const contorno = '#3a1612';
  // muro de fora (parede da frente)
  elipse(ctx, cx, cy + alt + 1, rx + 1, ry + 1, contorno);
  for (let o = alt; o >= 1; o--) elipse(ctx, cx, cy + o, rx, ry, o > alt - 4 ? '#7c2a24' : o < 4 ? '#c9564a' : '#b2453a');
  for (let x = cx - rx + 6; x <= cx + rx - 6; x++) ret(ctx, '#d8d0c0', x, baseDaElipse(x, cx, cy, rx, ry) + 4, 1, 2);
  for (let x = cx - rx + 14; x <= cx + rx - 14; x += 15) {
    if (Math.abs(x - cx) < 34) continue;
    const yb = baseDaElipse(x, cx, cy, rx, ry);
    ret(ctx, contorno, x - 4, yb + 10, 9, 15);
    ret(ctx, '#2a100e', x - 3, yb + 11, 7, 14);
    ret(ctx, '#f2c86a', x - 2, yb + 13, 5, 4);
  }
  // borda de cima
  elipse(ctx, cx, cy, rx + 1, ry + 1, contorno);
  elipse(ctx, cx, cy, rx, ry, '#e6dccb');
  elipse(ctx, cx, cy + 1, rx - 5, ry - 4, '#b9ab94');
  // arquibancadas: fileiras inteiras alternando dois azuis
  for (let i = 0; i < 8; i++) elipse(ctx, cx, cy + 2 + Math.floor(i / 2), rx - 7 - i * 5, ry - 6 - i * 3, i % 2 ? '#2f5fa8' : '#4f82cc');
  // corredores (escadas) em 8 direções simétricas
  for (const a of [0.35, 1.0, 2.14, 2.79, 3.5, 4.15, 5.27, 5.93]) {
    let anterior = '';
    for (let t = 0; t <= 1; t += 0.01) {
      const r1 = 1 - t * 0.36;
      const [x, y] = [Math.round(cx + Math.cos(a) * (rx - 7) * r1), Math.round(cy + 2 + Math.sin(a) * (ry - 6) * r1)];
      if (`${x},${y}` === anterior) continue;
      anterior = `${x},${y}`;
      ret(ctx, '#d9d2c4', x, y, 2, 1);
    }
  }
  // campo de batalha (listras de grama)
  const [fy, frx, fry] = [cy + 6, 74, 34];
  elipse(ctx, cx, fy, frx + 2, fry + 2, contorno);
  elipse(ctx, cx, fy, frx + 1, fry + 1, '#6a6f78');
  for (let y = -fry + 1; y <= fry; y++) {
    const w = Math.round((frx - 1) * Math.sqrt(Math.max(0, 1 - (y * y) / ((fry + 0.5) * (fry + 0.5)))));
    for (let x = -w; x < w; x++) {
      ctx.fillStyle = Math.floor((x + 200) / 10) % 2 ? '#57a74a' : '#4f9a43';
      ctx.fillRect(cx + x, fy + y + 1, 1, 1);
    }
  }
  const branco = '#f4f4ee';
  ret(ctx, branco, cx - 54, fy - 18, 108, 1);
  ret(ctx, branco, cx - 54, fy + 20, 108, 1);
  ret(ctx, branco, cx - 54, fy - 18, 1, 39);
  ret(ctx, branco, cx + 53, fy - 18, 1, 39);
  ret(ctx, branco, cx, fy - 18, 1, 39);
  anel(ctx, cx, fy + 1, 12, 8, branco);
  pokebola(ctx, cx, fy + 1, 4, '#d83a3a', '#222222');
  // portão da frente com placa e Pokébola
  const yp = cy + ry;
  ret(ctx, contorno, cx - 24, yp - 10, 48, alt + 10);
  ret(ctx, '#e6dccb', cx - 23, yp - 9, 8, alt + 8);
  ret(ctx, '#e6dccb', cx + 15, yp - 9, 8, alt + 8);
  ret(ctx, '#2a100e', cx - 15, yp + 2, 30, alt - 3);
  ret(ctx, '#4a2a22', cx - 15, yp + 2, 30, 3);
  ret(ctx, contorno, cx - 30, yp - 22, 60, 14);
  ret(ctx, '#f0c040', cx - 29, yp - 21, 58, 12);
  ret(ctx, '#c8962a', cx - 29, yp - 11, 58, 2);
  pokebola(ctx, cx, yp - 15, 4, '#d83a3a', contorno);
  // bandeiras balançando (2 quadros)
  const bandeira = (x: number, y: number, cor: string) => {
    ret(ctx, contorno, x, y - 24, 1, 24);
    for (let i = 0; i < 6; i++) {
      const onda = f === 0 ? (i % 3 === 1 ? 1 : 0) : i % 3 === 2 ? 1 : 0;
      ret(ctx, cor, x + 1, y - 24 + i + onda, 11 - i * 1.5, 1);
    }
  };
  bandeira(cx - rx + 8, cy + 2, '#d83a3a');
  bandeira(cx + rx - 10, cy + 2, '#3a6fd8');
  bandeira(cx - 64, cy - ry + 8, '#3a6fd8');
  bandeira(cx + 63, cy - ry + 8, '#d83a3a');
  return c;
}

// ---------- poste ----------

export const TAM_POSTE = { w: 16, h: 46 };

/** Poste de luz preto com lanterna acesa. */
export function desenharPoste(): HTMLCanvasElement {
  const [c, ctx] = novoCanvas(TAM_POSTE.w, TAM_POSTE.h);
  const [preto, cinza] = ['#1d2229', '#4b5563'];
  ret(ctx, preto, 4, 40, 8, 6);
  ret(ctx, cinza, 5, 41, 2, 3);
  ret(ctx, preto, 5, 38, 6, 2);
  ret(ctx, preto, 7, 15, 2, 23);
  ret(ctx, cinza, 7, 15, 1, 23);
  ret(ctx, preto, 5, 25, 6, 2);
  ret(ctx, preto, 5, 13, 6, 2);
  ret(ctx, preto, 3, 3, 10, 11);
  ret(ctx, '#ffd970', 4, 4, 8, 9);
  ret(ctx, '#fff6d0', 5, 5, 3, 6);
  ret(ctx, preto, 7, 4, 1, 9);
  ret(ctx, preto, 2, 2, 12, 2);
  ret(ctx, preto, 4, 0, 8, 2);
  return c;
}

// ---------- Pokémarket ----------

/** Recorte do prédio grande (verde, com cruz) no core_buildings: vira o Pokémarket azul. */
export const RECORTE_MART = { x: 0, y: 288, w: 112, h: 128 };

/** Pokémarket: prédio grande do tileset com o verde trocado por azul e a cruz trocada por uma Pokébola azul. */
export function desenharMart(predios: CanvasImageSource): HTMLCanvasElement {
  const { x, y, w, h } = RECORTE_MART;
  const [c, ctx] = novoCanvas(w, h);
  ctx.drawImage(predios, x, y, w, h, 0, 0, w, h);
  const dados = ctx.getImageData(0, 0, w, h);
  const d = dados.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    if (g > r + 20 && g > b + 10) {
      d[i] = Math.round(r * 0.5);
      d[i + 1] = Math.round(b * 0.9 + (g - b) * 0.35);
      d[i + 2] = Math.min(255, Math.round(g * 1.12));
    }
  }
  ctx.putImageData(dados, 0, 0);
  pokebola(ctx, 73, 37, 9, '#2f6fd8', '#123a7a');
  return c;
}
