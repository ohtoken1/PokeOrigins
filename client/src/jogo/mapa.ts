// Gera o mapa de um bioma e desenha em pixel art (tiles de 16px, ampliados 2× pela câmera).
// Tudo é desenhado por código até termos um tileset de verdade.
import type { Paleta } from './paletas';
import { corComFiltro, imagemComFiltro } from './filtroCor';
import type { Aparencia } from '../personagem/lpc';
import { sombraProjetada } from './cidadeDesenhos';

export const TAM = 16;
export const LARGURA = 77;
export const ALTURA = 58;
/** Quantas vezes o mapa é maior que o original de 48×36 (quantidade de lagos, bosques, mato…). */
const ESCALA = (LARGURA * ALTURA) / (48 * 36);

/** pedra/pedraEscura = calçamento da cidade; jardim = canteiro de flores com meio-fio; trilho = linha do trem (bloqueia) */
export type Terreno = 'chao' | 'mato' | 'caminho' | 'liquido' | 'pedra' | 'pedraEscura' | 'jardim' | 'trilho';

/** Objeto em pé (prédio, fonte, banco…); `peca` é o nome em PECAS (jogo/cidade.ts). */
export interface ObjetoMapa {
  peca: string;
  /** borda esquerda da imagem, em tiles (pode ser fracionária para centralizar) */
  x: number;
  /** linha logo abaixo do objeto (a imagem encosta embaixo nela) */
  base: number;
  /** nome mostrado em cima (senão, o da peça) */
  rotulo?: string;
}

/** Personagem parado no mapa (por enquanto só visual). */
export interface NpcMapa {
  x: number;
  y: number;
  nome: string;
  aparencia: Aparencia;
}

export interface Mapa {
  /** tamanho em tiles (biomas: LARGURA × ALTURA; a cidade é maior) */
  largura: number;
  altura: number;
  terreno: Terreno[][];
  bloqueado: boolean[][];
  /** obstáculos 2×2 (árvores, pedras grandes…) com canto superior esquerdo em x,y */
  grandes: { x: number; y: number }[];
  pedrinhas: { x: number; y: number }[];
  /** dx/dy só servem para variar qual flor do tileset aparece */
  flores: { x: number; y: number; dx: number; dy: number }[];
  inicio: { x: number; y: number };
  /** prédios e decoração em pé (cidade) */
  objetos?: ObjetoMapa[];
  npcs?: NpcMapa[];
  /** árvores com sombra projetada no chão (cidade) */
  sombras?: boolean;
  /** trilhas de terra estreitas (em pixels), da largura da porta de cada casa até a calçada */
  trilhas?: { x: number; y: number; w: number; h: number }[];
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
  // um caminho horizontal e um vertical a cada ~36 tiles (mapa maior = mais caminhos)
  const horizontais = Math.max(1, Math.round(ALTURA / 36));
  for (let k = 0; k < horizontais; k++) {
    const centro = Math.round((ALTURA * (k + 0.5)) / horizontais);
    let y = entre(centro - 4, centro + 4);
    for (let x = 0; x < LARGURA; x++) {
      pintarCaminho(x, y);
      if (r() < 0.18) y = Math.max(4, Math.min(ALTURA - 6, y + (r() < 0.5 ? -1 : 1)));
      pintarCaminho(x, y);
    }
  }
  const verticais = Math.max(1, Math.round(LARGURA / 48));
  for (let k = 0; k < verticais; k++) {
    const centro = Math.round((LARGURA * (k + 0.5)) / verticais);
    let x = entre(centro - 6, centro + 6);
    for (let yy = 0; yy < ALTURA; yy++) {
      pintarCaminho(x, yy);
      if (r() < 0.18) x = Math.max(4, Math.min(LARGURA - 6, x + (r() < 0.5 ? -1 : 1)));
      pintarCaminho(x, yy);
    }
  }

  // lagos retangulares (a moldura de margem do tileset só encaixa em retângulos), sem encostar
  // em caminhos nem em outros lagos; mínimo 3×3 para caber os cantos e as bordas
  for (let i = 0, tentativas = 0; i < paleta.lagos * ESCALA && tentativas < 200 * ESCALA; tentativas++) {
    const [w, h] = [entre(4, 9), entre(3, 6)];
    const [lx, ly] = [entre(4, LARGURA - w - 4), entre(4, ALTURA - h - 4)];
    let cabe = true;
    for (let yy = ly - 1; yy <= ly + h && cabe; yy++) for (let xx = lx - 1; xx <= lx + w && cabe; xx++) cabe = terreno[yy][xx] === 'chao';
    if (!cabe) continue;
    for (let yy = ly; yy < ly + h; yy++) for (let xx = lx; xx < lx + w; xx++) terreno[yy][xx] = 'liquido';
    i++;
  }

  // mato alto (só enfeite: os encontros acontecem em qualquer passo)
  for (let i = 0; i < 10 * ESCALA; i++) mancha(entre(3, LARGURA - 4), entre(3, ALTURA - 4), 1.5 + r() * 2.5, 'mato', ['chao']);

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
  for (let i = 0; i < 16 * ESCALA; i++) {
    const cx = entre(5, LARGURA - 7);
    const cy = entre(5, ALTURA - 7);
    for (let j = entre(2, 6); j > 0; j--) colocarGrande(cx + entre(-3, 3), cy + entre(-3, 3));
  }

  // pedrinhas e flores
  const pedrinhas: Mapa['pedrinhas'] = [];
  for (let i = 0; i < 30 * ESCALA; i++) {
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
  return { largura: LARGURA, altura: ALTURA, terreno, bloqueado, grandes, pedrinhas, flores, inicio };
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


/** Imagens dos tilesets (créditos em CREDITOS.md). */
export interface Tilesets {
  /** "Tuxemon Tileset" de Buch (CC-BY-SA 3.0): grama, mato, flores, areia */
  buch: CanvasImageSource;
  /** core_outdoor_nature do Tuxemon (CC-BY-SA 4.0): árvores e pedras */
  natureza: CanvasImageSource;
  /** core_outdoor_water do Tuxemon (CC-BY-SA 4.0): água e margens */
  agua: CanvasImageSource;
  /** core_city_and_country do Tuxemon (CC-BY-SA 4.0): calçamento de pedra da cidade */
  cidade?: CanvasImageSource;
}

// posições (coluna, linha) dos tiles no tileset do Buch
const GRAMAS: [number, number][] = [[2, 1], [3, 1], [5, 5], [6, 5], [2, 1], [3, 1]];
const MATO_ALTO: [number, number] = [1, 5];
const FLORES: [number, number][] = [[7, 0], [7, 1], [7, 3], [7, 4], [7, 6], [7, 7]];
const AREIA: [number, number] = [4, 5];
// no core_outdoor_water: textura da água (bloco 6×6) e moldura da margem (3×3, meio transparente)
const AGUA: [number, number] = [9, 0];
const MARGEM: [number, number] = [6, 1];

/** Cópia do tileset com o filtro de cor do bioma (calculado por nós; guardada para as próximas vezes). */
const copiasFiltradas = new Map<CanvasImageSource, Map<string, CanvasImageSource>>();
function comFiltro(img: CanvasImageSource, filtro: string): CanvasImageSource {
  if (filtro === 'none') return img;
  let porFiltro = copiasFiltradas.get(img);
  if (!porFiltro) copiasFiltradas.set(img, (porFiltro = new Map()));
  let copia = porFiltro.get(filtro);
  if (!copia) porFiltro.set(filtro, (copia = imagemComFiltro(img, filtro)));
  return copia;
}

export function desenharMapa(mapa: Mapa, paleta: Paleta, semente: string, tilesets: Tilesets): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = mapa.largura * TAM;
  canvas.height = mapa.altura * TAM;
  // canvas na memória comum (não na placa de vídeo): milhares de desenhos pequenos ficam bem mais rápidos
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  const r = aleatorioComSemente(`${semente}:desenho`);
  const { terreno } = mapa;
  const t = (x: number, y: number): Terreno | null => terreno[y]?.[x] ?? null;

  const buch = comFiltro(tilesets.buch, paleta.filtro);
  const natureza = comFiltro(tilesets.natureza, paleta.filtroObjetos);
  const agua = comFiltro(tilesets.agua, paleta.filtroLiquido);
  // cor da borda dos caminhos já com o filtro do bioma (calculada uma vez, não a cada tile)
  const corBorda = corComFiltro('#c8a860', paleta.filtro);
  const tile = (src: CanvasImageSource, [tx, ty]: [number, number], px: number, py: number, w = 1, h = 1) =>
    ctx.drawImage(src, tx * TAM, ty * TAM, w * TAM, h * TAM, px, py, w * TAM, h * TAM);

  for (let y = 0; y < mapa.altura; y++)
    for (let x = 0; x < mapa.largura; x++) {
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

      if (paleta.submerso) {
        desenharFundoDoMar(ctx, tipo, px, py, r, (v) => v === 'caminho' || v === null, t(x, y - 1), t(x, y + 1), t(x - 1, y), t(x + 1, y), () => tile(buch, AREIA, px, py));
        continue;
      }

      if ((tipo === 'pedra' || tipo === 'pedraEscura') && tilesets.cidade) {
        const calcada = (v: Terreno | null) => v === 'pedra' || v === 'pedraEscura' || v === 'jardim';
        desenharPedra(ctx, tilesets.cidade, px, py, calcada, t(x, y - 1), t(x, y + 1), t(x - 1, y), t(x + 1, y));
        if (tipo === 'pedraEscura') {
          ctx.fillStyle = 'rgba(70,60,90,0.28)';
          ctx.fillRect(px, py, TAM, TAM);
        }
        continue;
      }
      if (tipo === 'jardim') {
        tile(buch, GRAMAS[(x * 3 + y * 5) % 4], px, py);
        tile(buch, FLORES[(x * 7 + y * 3) % FLORES.length], px, py);
        // meio-fio de pedra onde o canteiro acaba
        const fora = (v: Terreno | null) => v !== 'jardim';
        const lados: [boolean, number, number, number, number][] = [
          [fora(t(x, y - 1)), px, py, TAM, 3],
          [fora(t(x, y + 1)), px, py + TAM - 3, TAM, 3],
          [fora(t(x - 1, y)), px, py, 3, TAM],
          [fora(t(x + 1, y)), px + TAM - 3, py, 3, TAM],
        ];
        for (const [ativo, bx, by, bw, bh] of lados) {
          if (!ativo) continue;
          ctx.fillStyle = '#6c6f78';
          ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = '#d4d8e0';
          ctx.fillRect(bx + (bw === 3 ? 1 : 0), by + (bh === 3 ? 1 : 0), bw === 3 ? 1 : bw, bh === 3 ? 1 : bh);
        }
        continue;
      }
      if (tipo === 'trilho') {
        desenharTrilho(ctx, px, py, t(x, y - 1) === 'trilho');
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
        ctx.fillStyle = corBorda;
        for (const [ativo, bx, by, bw, bh] of bordas) if (ativo) ctx.fillRect(bx, by, bw, bh);
      }
    }

  // trilhas de terra das portas (areia do tileset, com borda dos lados)
  if (mapa.trilhas?.length) {
    const areia = document.createElement('canvas');
    [areia.width, areia.height] = [TAM, TAM];
    areia.getContext('2d')!.drawImage(buch, AREIA[0] * TAM, AREIA[1] * TAM, TAM, TAM, 0, 0, TAM, TAM);
    const padrao = ctx.createPattern(areia, 'repeat')!;
    for (const tr of mapa.trilhas) {
      // linha a linha: bordas um pouco tortas, cantos de cima arredondados e abrindo em curva onde encontra a rua
      const ra = aleatorioComSemente(`trilha:${tr.x},${tr.y}`);
      let [esq, dir] = [0, 0];
      for (let yy = 0; yy < tr.h; yy++) {
        if (yy % 3 === 0) {
          esq = Math.max(-1, Math.min(1, esq + Math.round(ra() * 2 - 1)));
          dir = Math.max(-1, Math.min(1, dir + Math.round(ra() * 2 - 1)));
        }
        const fim = tr.h - yy;
        // abre em curva nos últimos 16 px (calçada) e alarga um pouco junto à porta
        const abertura = fim <= 16 ? Math.round(((16 - fim) * (16 - fim)) / 40) : 0;
        const topo = yy < 5 ? -Math.round(((5 - yy) * (5 - yy)) / 10) : 0;
        const x0 = tr.x - esq - abertura + topo;
        const x1 = tr.x + tr.w + dir + abertura - topo;
        ctx.fillStyle = padrao;
        ctx.fillRect(x0, tr.y + yy, x1 - x0, 1);
        ctx.fillStyle = corBorda;
        ctx.fillRect(x0, tr.y + yy, 1, 1);
        ctx.fillRect(x1 - 1, tr.y + yy, 1, 1);
      }
    }
  }

  for (const f of mapa.flores) {
    if (paleta.submerso) desenharConcha(ctx, f.x * TAM, f.y * TAM, f.dx + f.dy);
    else tile(buch, FLORES[(f.dx + f.dy) % FLORES.length], f.x * TAM, f.y * TAM);
  }
  for (const p of mapa.pedrinhas) tile(natureza, paleta.pedrinhas[(p.x + p.y) % paleta.pedrinhas.length], p.x * TAM, p.y * TAM);

  // sombras primeiro (embaixo de todas as árvores)
  if (mapa.sombras && paleta.obstaculo === 'arvore' && paleta.arvores)
    for (const g of mapa.grandes) desenharSombraArvore(ctx, natureza, paleta.arvores[(g.x * 7 + g.y * 3) % paleta.arvores.length], g.x * TAM, (g.y + 2) * TAM);
  // grandes em ordem de cima para baixo, para os de baixo cobrirem os de cima
  for (const g of [...mapa.grandes].sort((a, b) => a.y - b.y)) {
    const escolher = (lista: [number, number][]) => lista[(g.x * 7 + g.y * 3) % lista.length];
    if (paleta.obstaculo === 'arvore' && paleta.arvores) {
      // árvore de 2×3 tiles: a copa passa 1 tile acima do espaço 2×2 que ela bloqueia
      tile(natureza, escolher(paleta.arvores), g.x * TAM, (g.y - 1) * TAM, 2, 3);
    } else if (paleta.obstaculo === 'coral') {
      // fundo do mar: maioria corais, algumas rochas
      if (paleta.rochas && (g.x * 5 + g.y * 3) % 7 === 0) tile(natureza, escolher(paleta.rochas), g.x * TAM, g.y * TAM, 2, 2);
      else ctx.drawImage(coralPronto((g.x * 3 + g.y * 5) % CORES_CORAL.length, (g.x * 7 + g.y * 11) % 6), g.x * TAM - 8, g.y * TAM - 16);
    } else if (paleta.obstaculo === 'rocha' && paleta.rochas) {
      tile(natureza, escolher(paleta.rochas), g.x * TAM, g.y * TAM, 2, 2);
    } else ctx.drawImage(grandePronto(paleta), g.x * TAM, g.y * TAM);
  }

  if (paleta.submerso) {
    // tudo fica azulado, como visto debaixo d'água
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#6aa6e6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  return canvas;
}

/** Obstáculos sem tile no tileset (caixas da usina, lápides da torre), desenhados por código. */
/** Desenhos feitos por código ficam prontos uma vez e depois só são copiados (bem mais rápido). */
const prontos = new Map<string, HTMLCanvasElement>();
function pronto(chave: string, largura: number, altura: number, desenhar: (ctx: Ctx) => void): HTMLCanvasElement {
  let c = prontos.get(chave);
  if (!c) {
    c = document.createElement('canvas');
    [c.width, c.height] = [largura, altura];
    desenhar(c.getContext('2d')!);
    prontos.set(chave, c);
  }
  return c;
}
const grandePronto = (paleta: Paleta) => pronto(`${paleta.obstaculo}:${paleta.copa.join()}`, 32, 32, (ctx) => desenharGrande(ctx, 0, 0, paleta));
/** 4 cores × 6 formatos de coral; o coral passa 16 px acima e 8 px para os lados do espaço 2×2. */
const coralPronto = (cor: number, formato: number) =>
  pronto(`coral:${cor}:${formato}`, 48, 52, (ctx) => desenharCoral(ctx, 8, 16, CORES_CORAL[cor], aleatorioComSemente(`coral${formato}`)));

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

// ---------- cidade ----------

/** Sombra de cada tipo de árvore (calculada uma vez). */
const sombrasArvore = new Map<string, HTMLCanvasElement>();
/** Sombra projetada da árvore (2×3 tiles) com a base em (x, base). */
function desenharSombraArvore(ctx: Ctx, img: CanvasImageSource, [tx, ty]: [number, number], x: number, base: number) {
  const chave = `${tx},${ty}`;
  let sombra = sombrasArvore.get(chave);
  if (!sombra) {
    const c = document.createElement('canvas');
    [c.width, c.height] = [2 * TAM, 3 * TAM];
    c.getContext('2d')!.drawImage(img, tx * TAM, ty * TAM, 2 * TAM, 3 * TAM, 0, 0, 2 * TAM, 3 * TAM);
    sombra = sombraProjetada(c, c.width, c.height).canvas;
    sombrasArvore.set(chave, sombra);
  }
  ctx.globalAlpha = 0.26;
  ctx.drawImage(sombra, x, base - sombra.height + 2);
  ctx.globalAlpha = 1;
}

/** Pedra do calçamento no core_city_and_country (pixels). */
const PEDRA_CIDADE: [number, number] = [368, 16];

/** Calçamento de pedra com uma borda escura onde encosta em outro chão. */
function desenharPedra(
  ctx: Ctx, img: CanvasImageSource, px: number, py: number, ehPedra: (v: Terreno | null) => boolean,
  cima: Terreno | null, baixo: Terreno | null, esq: Terreno | null, dir: Terreno | null,
) {
  ctx.drawImage(img, PEDRA_CIDADE[0], PEDRA_CIDADE[1], TAM, TAM, px, py, TAM, TAM);
  ctx.fillStyle = '#6c6f78';
  if (!ehPedra(cima)) ctx.fillRect(px, py, TAM, 2);
  if (!ehPedra(baixo)) ctx.fillRect(px, py + TAM - 2, TAM, 2);
  if (!ehPedra(esq)) ctx.fillRect(px, py, 2, TAM);
  if (!ehPedra(dir)) ctx.fillRect(px + TAM - 2, py, 2, TAM);
}

/** Linha do trem horizontal de 2 tiles: brita, dormentes de madeira e os dois trilhos. */
function desenharTrilho(ctx: Ctx, px: number, py: number, metadeDeBaixo: boolean) {
  ctx.fillStyle = '#8c8377';
  ctx.fillRect(px, py, TAM, TAM);
  ctx.fillStyle = '#a49a8c';
  for (let i = 0; i < 6; i++) ctx.fillRect(px + ((i * 7 + (metadeDeBaixo ? 3 : 0)) % 15), py + ((i * 5) % 15), 1, 1);
  // dormentes (a cada 8 px, atravessando as duas metades)
  for (const dx of [1, 9]) {
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(px + dx, metadeDeBaixo ? py : py + 3, 5, metadeDeBaixo ? 13 : 13);
    ctx.fillStyle = '#7a5232';
    ctx.fillRect(px + dx, metadeDeBaixo ? py : py + 3, 5, 1);
  }
  // trilho de aço
  const y = metadeDeBaixo ? py + 9 : py + 6;
  ctx.fillStyle = '#3c4048';
  ctx.fillRect(px, y, TAM, 3);
  ctx.fillStyle = '#c8ccd4';
  ctx.fillRect(px, y, TAM, 1);
}

// ---------- fundo do mar (desenhado por código) ----------

/** Cores dos corais: contorno, escuro, médio, claro. */
const CORES_CORAL: [string, string, string, string][] = [
  ['#4a1428', '#b83a58', '#f2727e', '#ffc2b8'], // rosa
  ['#4a2010', '#c0582a', '#f59a4a', '#ffd49a'], // laranja
  ['#2a1446', '#6a3aa8', '#a070e0', '#d8c0ff'], // roxo
  ['#3a3410', '#a89020', '#e8cc40', '#fff0a0'], // amarelo
];

/** Areia (chão mais escuro, trilhas mais claras), algas no lugar do mato. */
function desenharFundoDoMar(
  ctx: Ctx, tipo: Terreno, px: number, py: number, r: () => number, ehTrilha: (v: Terreno | null) => boolean,
  cima: Terreno | null, baixo: Terreno | null, esq: Terreno | null, dir: Terreno | null, areia: () => void,
) {
  areia();
  if (tipo === 'caminho') {
    ctx.fillStyle = 'rgba(255,250,220,0.18)';
    ctx.fillRect(px, py, TAM, TAM);
    ctx.fillStyle = 'rgba(90,70,40,0.35)';
    if (!ehTrilha(cima)) ctx.fillRect(px, py, TAM, 1);
    if (!ehTrilha(baixo)) ctx.fillRect(px, py + TAM - 1, TAM, 1);
    if (!ehTrilha(esq)) ctx.fillRect(px, py, 1, TAM);
    if (!ehTrilha(dir)) ctx.fillRect(px + TAM - 1, py, 1, TAM);
    return;
  }
  // chão: areia mais funda, com ondinhas e pontinhos
  ctx.fillStyle = 'rgba(40,60,70,0.28)';
  ctx.fillRect(px, py, TAM, TAM);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  const oy = Math.floor(r() * 12) + 2;
  for (let i = 0; i < 6; i++) ctx.fillRect(px + 2 + i * 2, py + oy + (i % 2), 2, 1);
  ctx.fillStyle = 'rgba(30,40,40,0.25)';
  for (let i = 0; i < 2; i++) ctx.fillRect(px + Math.floor(r() * 15), py + Math.floor(r() * 15), 1, 1);

  if (tipo === 'mato') {
    // 3 algas onduladas
    for (let k = 0; k < 3; k++) {
      const base = px + 2 + k * 5 + Math.floor(r() * 2);
      const altura = 9 + Math.floor(r() * 6);
      const fase = r() * 6;
      for (let i = 0; i < altura; i++) {
        const x = base + Math.round(Math.sin(i / 2.2 + fase) * 1.2);
        ctx.fillStyle = '#1e5a34';
        ctx.fillRect(x - 1, py + TAM - 1 - i, 3, 1);
        ctx.fillStyle = i > altura - 3 ? '#8ad070' : '#3f9a4c';
        ctx.fillRect(x, py + TAM - 1 - i, 1, 1);
      }
    }
  }
}

function desenharConcha(ctx: Ctx, px: number, py: number, variante: number) {
  const cx = px + 8;
  const cy = py + 9;
  if (variante % 2 === 0) {
    // estrela-do-mar
    const cor = variante % 4 === 0 ? '#ff8a5a' : '#ffcc4a';
    ctx.fillStyle = '#7a3a20';
    ctx.fillRect(cx - 1, cy - 4, 3, 9);
    ctx.fillRect(cx - 4, cy - 1, 9, 3);
    ctx.fillStyle = cor;
    ctx.fillRect(cx, cy - 3, 1, 7);
    ctx.fillRect(cx - 3, cy, 7, 1);
    ctx.fillRect(cx - 1, cy - 1, 3, 3);
  } else {
    // concha em leque
    ctx.fillStyle = '#8a6a5a';
    ctx.fillRect(cx - 3, cy - 2, 7, 4);
    ctx.fillRect(cx - 2, cy - 3, 5, 1);
    ctx.fillRect(cx - 1, cy + 2, 3, 1);
    ctx.fillStyle = '#f4e0d0';
    ctx.fillRect(cx - 2, cy - 2, 5, 3);
    ctx.fillStyle = '#c8a090';
    ctx.fillRect(cx - 1, cy - 2, 1, 3);
    ctx.fillRect(cx + 1, cy - 2, 1, 3);
  }
}

/** Coral ramificado num espaço de 2×2 tiles (passa um pouco acima, como as árvores). */
function desenharCoral(ctx: Ctx, ox: number, oy: number, [contorno, escuro, medio, claro]: [string, string, string, string], r: () => number) {
  const cx = ox + 16;
  elipse(ctx, cx, oy + 28, 13, 3, 'rgba(0,0,0,0.25)');
  // base de pedra
  elipse(ctx, cx, oy + 27, 10, 4, '#4a5560');
  elipse(ctx, cx, oy + 26, 8, 3, '#6a7884');

  const galhos: [number, number, number, number, number][] = [];
  const crescer = (x: number, y: number, angulo: number, tamanho: number, nivel: number) => {
    const x2 = x + Math.cos(angulo) * tamanho;
    const y2 = y + Math.sin(angulo) * tamanho;
    galhos.push([x, y, x2, y2, nivel]);
    if (nivel >= 3) return;
    for (let i = 0; i < 2; i++) {
      const abertura = (i - 0.5) * 0.8 + (r() - 0.5) * 0.3;
      crescer(x2, y2, angulo + abertura, tamanho * (0.75 + r() * 0.15), nivel + 1);
    }
  };
  // leque de galhos saindo da base
  const hastes = 3 + Math.floor(r() * 2);
  for (let i = 0; i < hastes; i++) crescer(cx + (i - (hastes - 1) / 2) * 2, oy + 25, -Math.PI / 2 + (i - (hastes - 1) / 2) * 0.55 + (r() - 0.5) * 0.2, 6 + r() * 2, 1);

  const linha = (x1: number, y1: number, x2: number, y2: number, largura: number, cor: string) => {
    ctx.fillStyle = cor;
    const passos = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    for (let i = 0; i <= passos; i++) {
      const x = Math.round(x1 + ((x2 - x1) * i) / passos - largura / 2);
      const y = Math.round(y1 + ((y2 - y1) * i) / passos - largura / 2);
      ctx.fillRect(x, y, largura, largura);
    }
  };
  const largura = (nivel: number) => Math.max(2, 4 - nivel);
  for (const [x1, y1, x2, y2, n] of galhos) linha(x1, y1, x2, y2, largura(n) + 2, contorno);
  for (const [x1, y1, x2, y2, n] of galhos) linha(x1, y1, x2, y2, largura(n), n < 2 ? escuro : medio);
  for (const [x1, y1, x2, y2, n] of galhos) if (n >= 2) linha(x1 - 0.5, y1 - 0.5, x2 - 0.5, y2 - 0.5, 1, claro);
  // pontas arredondadas e claras
  for (const [, , x2, y2, n] of galhos) if (n === 3) circulo(ctx, Math.round(x2), Math.round(y2), 1, claro);
}
