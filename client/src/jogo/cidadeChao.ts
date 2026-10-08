// Chão da cidade desenhado pixel a pixel (só a cidade; os biomas continuam com os tiles): grama com manchas e
// folhinhas, ruas de terra com bordas orgânicas e pedrinhas, calçada de lajotas com meio-fio, praça de pedras
// (anéis em volta da fonte, fiadas no resto, faixas de tijolo), canteiros de terra com flores, lagos com margem
// e trilhas curvas nos parques. Formas tortas vêm do ruído (jogo/ruido.ts), sempre iguais para o mesmo mapa.
import { TAM, type Mapa, type Terreno } from './mapa';
import { dentroDoLago, hash2, ruido, ruidoFractal } from './ruido';

type Ctx = CanvasRenderingContext2D;
type Rgb = [number, number, number];

// ---------- cores ----------
const GRAMA: Rgb[] = [[40, 150, 104], [64, 176, 128], [86, 188, 138], [124, 204, 152]];
const TERRA: Rgb[] = [[184, 158, 104], [212, 190, 130], [226, 208, 154]];
const BORDA_TERRA: Rgb = [170, 142, 92];
const PEDRINHA: Rgb = [164, 140, 98];
const PEDRINHA_LUZ: Rgb = [238, 226, 184];
const LAJOTA: Rgb = [198, 199, 206];
const REJUNTE_LAJOTA: Rgb = [146, 148, 158];
const MEIO_FIO: Rgb[] = [[104, 106, 118], [236, 236, 240], [188, 190, 198]];
const PEDRAS_PRACA: Rgb[] = [[226, 216, 196], [216, 204, 182], [232, 224, 206], [210, 198, 176]];
const PEDRA_ANEL: Rgb = [208, 174, 142];
const REJUNTE_PRACA: Rgb = [186, 172, 152];
const TIJOLO: Rgb = [182, 110, 84];
const REJUNTE_TIJOLO: Rgb = [126, 80, 64];
const TERRA_CANTEIRO: Rgb[] = [[82, 58, 42], [102, 74, 54], [122, 92, 66]];
const AGUA: Rgb[] = [[52, 126, 204], [74, 154, 222], [104, 182, 236]];
const ESPUMA: Rgb = [196, 232, 250];
const MARGEM: Rgb[] = [[150, 128, 88], [118, 100, 70]];

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const misturar = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const somar = (c: Rgb, v: number): Rgb => [c[0] + v, c[1] + v, c[2] + v];

/** Calçamentos (cada um tem seu desenho de pedras e cores). */
const PAVIMENTOS: Partial<Record<Terreno, true>> = { pedra: true, praca: true, pedraEscura: true };
const ehGrama = (t: Terreno | undefined) => t === 'chao';

/** Desenha todo o chão da cidade no contexto (substitui os tiles). Trilhos e o resto vêm por cima depois. */
export function desenharChaoCidade(ctx: Ctx, mapa: Mapa): void {
  const W = mapa.largura * TAM;
  const H = mapa.altura * TAM;
  const imagem = ctx.createImageData(W, H);
  const px = new Uint32Array(imagem.data.buffer);
  const pintar = (i: number, c: Rgb) => {
    px[i] = (255 << 24) | (clamp(c[2]) << 16) | (clamp(c[1]) << 8) | clamp(c[0]);
  };
  const { terreno } = mapa;
  const tipo = (tx: number, ty: number): Terreno | undefined => terreno[ty]?.[tx];

  // ---------- grama e terra (funções por pixel) ----------
  const grama = (x: number, y: number): Rgb => {
    const tom = ruidoFractal(x / 72, y / 72, 1);
    const c: Rgb = tom < 0.34 ? misturar(GRAMA[1], GRAMA[0], 0.3) : tom > 0.68 ? misturar(GRAMA[1], GRAMA[2], 0.5) : GRAMA[1];
    // tufinhos "ʌ" espalhados (um em parte das casas de 8×8, em posição sorteada)
    const [cx, cy] = [x >> 3, y >> 3];
    if (hash2(cx, cy, 3) < 0.42) {
      const [ox, oy] = [(cx << 3) + Math.floor(hash2(cx, cy, 4) * 5), (cy << 3) + Math.floor(hash2(cx, cy, 5) * 6)];
      const [lx, ly] = [x - ox, y - oy];
      if ((ly === 0 && lx === 1) || (ly === 1 && (lx === 0 || lx === 2))) return misturar(c, GRAMA[0], 0.8);
      if (ly === 1 && lx === 1) return misturar(c, GRAMA[3], 0.5);
    }
    return c;
  };
  const terra = (x: number, y: number): Rgb => {
    const tom = ruidoFractal(x / 28, y / 28, 5);
    let c: Rgb = tom < 0.34 ? misturar(TERRA[1], TERRA[0], 0.4) : tom > 0.7 ? misturar(TERRA[1], TERRA[2], 0.5) : TERRA[1];
    // pedrinhas de 2 px com um brilho em cima à esquerda
    if (hash2(x >> 1, y >> 1, 9) < 0.012) c = (x & 1) + (y & 1) === 0 ? PEDRINHA_LUZ : PEDRINHA;
    return c;
  };

  /** Horta: terra arada em sulcos com pés de verdura (alface/repolho) enfileirados. */
  const horta = (x: number, y: number): Rgb => {
    const [lx, ly] = [x & 7, y & 7];
    const [dx, dy] = [lx - 3.5, ly - 3];
    if (dx * dx + dy * dy * 1.6 <= 7.5) return dy > 0.8 ? [44, 104, 48] : dx < 0 && dy < 0 ? [126, 200, 88] : [72, 152, 62];
    if (ly === 7) return [84, 58, 40];
    return ly === 6 ? [148, 108, 74] : [118, 84, 58];
  };

  /**
   * Distância (px) do centro do pixel até o tile vizinho mais perto que satisfaz `teste` (entre os 8 vizinhos);
   * Infinity se nenhum. Faz cantos arredondados e bordas que dá para entortar com ruído.
   */
  const distVizinho = (tx: number, ty: number, lx: number, ly: number, teste: (t: Terreno | undefined) => boolean) => {
    const [cx, cy] = [lx + 0.5, ly + 0.5];
    let d = Infinity;
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++) {
        if ((!ox && !oy) || !teste(tipo(tx + ox, ty + oy))) continue;
        const dx = ox < 0 ? cx : ox > 0 ? TAM - cx : 0;
        const dy = oy < 0 ? cy : oy > 0 ? TAM - cy : 0;
        d = Math.min(d, Math.hypot(dx, dy));
      }
    return d;
  };

  // ---------- desenho das pedras: cada pixel recebe o número da sua pedra; rejunte onde o número muda ----------
  const aneis = mapa.cidade?.aneis;
  const idPedra = (t: Terreno | undefined, x: number, y: number): number => {
    if (t === 'pedra') return ((y >> 3) << 12) + (x >> 3) + 1;
    if (t === 'pedraEscura') {
      // tijolos trançados: blocos 8×8 alternando deitados e em pé
      const [bx, by] = [x >> 3, y >> 3];
      const metade = (bx + by) & 1 ? (y & 7) >> 2 : (x & 7) >> 2;
      return 2e7 + ((by << 12) + bx) * 2 + metade;
    }
    if (t === 'praca') {
      if (aneis) {
        const [dx, dy] = [x + 0.5 - aneis.x, (y + 0.5 - aneis.y) / aneis.achatamento];
        const r = Math.hypot(dx, dy);
        if (r < aneis.raio) {
          const k = Math.floor(r / 8);
          if (k === 0) return 1e7;
          const n = Math.max(8, Math.round((2 * Math.PI * (k + 0.5) * 8) / 12));
          const a = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
          return 1e7 + k * 1000 + (Math.floor(a * n + (k & 1) * 0.5) % n) + 1;
        }
      }
      // paralelepípedos irregulares: cada pixel pertence ao ponto sorteado mais perto (células de 10 px)
      const [gx, gy] = [Math.floor(x / 10), Math.floor(y / 10)];
      let melhor = Infinity;
      let id = 0;
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          const [cx, cy] = [gx + ox, gy + oy];
          const px = cx * 10 + 2 + hash2(cx, cy, 35) * 6;
          const py = cy * 10 + 2 + hash2(cx, cy, 36) * 6;
          const d = (x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2;
          if (d < melhor) [melhor, id] = [d, (cy << 12) + cx];
        }
      return 3e7 + id;
    }
    return -1;
  };
  const corPedra = (t: Terreno, id: number, x: number, y: number): Rgb => {
    const v = (hash2(id, 7, 33) - 0.5) * 16;
    if (t === 'pedra') return somar(LAJOTA, v * 0.7 + (hash2(x, y, 22) < 0.05 ? -9 : 0));
    if (t === 'pedraEscura') return somar(TIJOLO, v);
    if (id >= 1e7 && id < 2e7) {
      // anéis em volta da fonte: um anel cor de terracota a cada três
      const k = Math.floor((id - 1e7) / 1000);
      return somar(k % 3 === 2 ? PEDRA_ANEL : PEDRAS_PRACA[k % 2 ? 2 : 0], v * 0.8);
    }
    return somar(PEDRAS_PRACA[Math.floor(hash2(id, 3, 34) * PEDRAS_PRACA.length)], v * 0.6);
  };
  const rejunte = (t: Terreno) => (t === 'pedra' ? REJUNTE_LAJOTA : t === 'pedraEscura' ? REJUNTE_TIJOLO : REJUNTE_PRACA);

  // ---------- passada principal: tile por tile ----------
  for (let ty = 0; ty < mapa.altura; ty++)
    for (let tx = 0; tx < mapa.largura; tx++) {
      const t = terreno[ty][tx];
      const temGramaPerto = [-1, 0, 1].some((oy) => [-1, 0, 1].some((ox) => ehGrama(tipo(tx + ox, ty + oy))));
      const temRuaPerto = [-1, 0, 1].some((oy) => [-1, 0, 1].some((ox) => tipo(tx + ox, ty + oy) === 'caminho'));
      for (let ly = 0; ly < TAM; ly++)
        for (let lx = 0; lx < TAM; lx++) {
          const [x, y] = [tx * TAM + lx, ty * TAM + ly];
          const i = y * W + x;
          if (t === 'caminho') {
            // a grama "invade" a borda da rua com o contorno tremido; aro mais escuro na emenda
            const d = temGramaPerto ? distVizinho(tx, ty, lx, ly, ehGrama) : Infinity;
            const limite = 1.2 + ruido(x / 5, y / 5, 17) * 3.2;
            if (d < limite) pintar(i, grama(x, y));
            else if (d < limite + 1.1) pintar(i, BORDA_TERRA);
            else {
              let c = terra(x, y);
              // sombra do meio-fio na rua (sol de cima à esquerda)
              if ((ly === 0 && PAVIMENTOS[tipo(tx, ty - 1)!]) || (lx === 0 && PAVIMENTOS[tipo(tx - 1, ty)!])) c = misturar(c, [90, 70, 40], 0.35);
              pintar(i, c);
            }
          } else if (PAVIMENTOS[t]) {
            // grama cobrindo um pouco a beirada do calçamento (contorno orgânico)
            if (temGramaPerto) {
              const d = distVizinho(tx, ty, lx, ly, ehGrama);
              const limite = 0.4 + ruido(x / 4, y / 4, 31) * 2.4;
              if (d < limite) {
                pintar(i, grama(x, y));
                continue;
              }
              if (d < limite + 1) {
                pintar(i, [92, 112, 96]);
                continue;
              }
            }
            // meio-fio de 3 px do lado da rua
            if (t === 'pedra' && temRuaPerto) {
              const lados: [boolean, number][] = [
                [tipo(tx, ty - 1) === 'caminho', ly],
                [tipo(tx, ty + 1) === 'caminho', TAM - 1 - ly],
                [tipo(tx - 1, ty) === 'caminho', lx],
                [tipo(tx + 1, ty) === 'caminho', TAM - 1 - lx],
              ];
              const borda = Math.min(...lados.filter(([s]) => s).map(([, d]) => d));
              if (borda < 3) {
                pintar(i, MEIO_FIO[borda]);
                continue;
              }
            }
            const id = idPedra(t, x, y);
            // rejunte embaixo/à direita da pedra, brilho em cima/à esquerda
            const tD = tipo(tx + (lx === TAM - 1 ? 1 : 0), ty);
            const tB = tipo(tx, ty + (ly === TAM - 1 ? 1 : 0));
            const tE = tipo(tx - (lx === 0 ? 1 : 0), ty);
            const tC = tipo(tx, ty - (ly === 0 ? 1 : 0));
            const idD = tD === t ? idPedra(t, x + 1, y) : id;
            const idB = tB === t ? idPedra(t, x, y + 1) : id;
            if (idD !== id || idB !== id || (tD !== t && PAVIMENTOS[tD!]) || (tB !== t && PAVIMENTOS[tB!])) pintar(i, rejunte(t));
            else if ((tE === t && idPedra(t, x - 1, y) !== id) || (tC === t && idPedra(t, x, y - 1) !== id)) pintar(i, somar(corPedra(t, id, x, y), 16));
            else pintar(i, corPedra(t, id, x, y));
          } else if (t === 'jardim') {
            // terra de canteiro com meio-fio de pedra (2 px), cantos de fora arredondados
            const fora = (ox: number, oy: number) => tipo(tx + ox, ty + oy) !== 'jardim';
            const d = Math.min(
              fora(0, -1) ? ly : 99, fora(0, 1) ? TAM - 1 - ly : 99,
              fora(-1, 0) ? lx : 99, fora(1, 0) ? TAM - 1 - lx : 99,
            );
            if (d < 2) pintar(i, d === 0 ? [120, 108, 98] : [222, 214, 198]);
            else {
              const tom = ruido(x / 3, y / 3, 51);
              pintar(i, tom < 0.3 ? TERRA_CANTEIRO[0] : tom > 0.75 ? TERRA_CANTEIRO[2] : TERRA_CANTEIRO[1]);
            }
          } else if (t === 'horta') pintar(i, horta(x, y));
          else pintar(i, grama(x, y));
        }
    }

  // ---------- trilhas curvas dos parques (terra, com borda tremida) ----------
  for (const c of mapa.cidade?.caminhos ?? []) desenharTrilhaCurva(c.pontos, c.largura, W, H, (x, y) => ehGrama(terreno[(y / TAM) | 0]?.[(x / TAM) | 0]), (i, borda, x, y) => pintar(i, borda ? BORDA_TERRA : terra(x, y)));

  // ---------- lagos (borda orgânica, água mais funda no meio, espuma e margem) ----------
  for (const l of mapa.cidade?.lagos ?? []) {
    const banda = 2 / Math.min(l.rx, l.ry);
    const [x0, x1] = [Math.max(0, Math.floor(l.x - l.rx * 1.4)), Math.min(W - 1, Math.ceil(l.x + l.rx * 1.4))];
    const [y0, y1] = [Math.max(0, Math.floor(l.y - l.ry * 1.4)), Math.min(H - 1, Math.ceil(l.y + l.ry * 1.4))];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const v = dentroDoLago(l, x + 0.5, y + 0.5);
        const i = y * W + x;
        if (v < 1 - banda * 1.2) pintar(i, v < 0.45 ? AGUA[0] : v < 0.8 ? AGUA[1] : AGUA[2]);
        else if (v < 1) pintar(i, ESPUMA);
        else if (v < 1 + banda * 1.5) pintar(i, MARGEM[0]);
        else if (v < 1 + banda * 2.5) pintar(i, MARGEM[1]);
      }
  }

  // ---------- trilhas de terra das portas (largura da porta, bordas tortas, abrindo em curva na calçada) ----------
  for (const tr of mapa.trilhas ?? []) {
    let [esq, dir] = [0, 0];
    for (let yy = 0; yy < tr.h; yy++) {
      if (yy % 3 === 0) {
        esq = Math.max(-1, Math.min(1, esq + Math.round(hash2(tr.x, tr.y + yy, 61) * 2 - 1)));
        dir = Math.max(-1, Math.min(1, dir + Math.round(hash2(tr.x, tr.y + yy, 62) * 2 - 1)));
      }
      const fim = tr.h - yy;
      const abertura = fim <= 16 ? Math.round(((16 - fim) * (16 - fim)) / 40) : 0;
      const [x0, x1] = [tr.x - esq - abertura, tr.x + tr.w + dir + abertura];
      const y = tr.y + yy;
      for (let x = x0; x < x1; x++) pintar(y * W + x, x === x0 || x === x1 - 1 ? BORDA_TERRA : terra(x, y));
    }
  }

  ctx.putImageData(imagem, 0, 0);
}

/** Trilha curva (Catmull-Rom pelos pontos) pintada onde `pode(x, y)`; `pintar(i, borda, x, y)`. */
function desenharTrilhaCurva(
  pontos: [number, number][], largura: number, W: number, H: number,
  pode: (x: number, y: number) => boolean, pintar: (i: number, borda: boolean, x: number, y: number) => void,
) {
  if (pontos.length < 2) return;
  // pontos da curva a cada ~1 px
  const amostras: [number, number][] = [];
  const p = [pontos[0], ...pontos, pontos[pontos.length - 1]];
  for (let s = 1; s < p.length - 2; s++) {
    const [p0, p1, p2, p3] = [p[s - 1], p[s], p[s + 1], p[s + 2]];
    const passos = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]));
    for (let k = 0; k < passos; k++) {
      const t = k / passos;
      const [t2, t3] = [t * t, t * t * t];
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      amostras.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  amostras.push(pontos[pontos.length - 1]);
  const raio = largura / 2;
  const alcance = Math.ceil(raio + 3);
  const xs = amostras.map((a) => a[0]);
  const ys = amostras.map((a) => a[1]);
  const [bx0, by0] = [Math.max(0, Math.floor(Math.min(...xs)) - alcance), Math.max(0, Math.floor(Math.min(...ys)) - alcance)];
  const [bx1, by1] = [Math.min(W - 1, Math.ceil(Math.max(...xs)) + alcance), Math.min(H - 1, Math.ceil(Math.max(...ys)) + alcance)];
  const bw = bx1 - bx0 + 1;
  const dist = new Float32Array(bw * (by1 - by0 + 1)).fill(Infinity);
  for (const [ax, ay] of amostras)
    for (let y = Math.floor(ay - alcance); y <= ay + alcance; y++)
      for (let x = Math.floor(ax - alcance); x <= ax + alcance; x++) {
        if (x < bx0 || y < by0 || x > bx1 || y > by1) continue;
        const j = (y - by0) * bw + (x - bx0);
        const d = Math.hypot(x + 0.5 - ax, y + 0.5 - ay);
        if (d < dist[j]) dist[j] = d;
      }
  for (let y = by0; y <= by1; y++)
    for (let x = bx0; x <= bx1; x++) {
      const d = dist[(y - by0) * bw + (x - bx0)];
      if (d === Infinity || !pode(x, y)) continue;
      const limite = raio + (ruido(x / 5, y / 5, 41) - 0.5) * 2.4;
      if (d < limite) pintar(y * W + x, d > limite - 1, x, y);
    }
}

/** Flores do tileset do Buch sem o fundo de grama (para plantar em cima da terra e da grama desenhada). */
const floresProntas = new Map<CanvasImageSource, HTMLCanvasElement>();
function floresSemFundo(buch: CanvasImageSource): HTMLCanvasElement {
  let c = floresProntas.get(buch);
  if (c) return c;
  c = document.createElement('canvas');
  [c.width, c.height] = [TAM, TAM * 8];
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(buch, 7 * TAM, 0, TAM, TAM * 8, 0, 0, TAM, TAM * 8);
  const dados = ctx.getImageData(0, 0, c.width, c.height);
  const d = dados.data;
  for (let i = 0; i < d.length; i += 4) if (d[i] === 64 && d[i + 1] === 176 && d[i + 2] === 128) d[i + 3] = 0;
  ctx.putImageData(dados, 0, 0);
  floresProntas.set(buch, c);
  return c;
}
/** Linhas (no recorte de flores) de cada cor: 2 flores e 4 flores. */
const FLORES_POR_COR: [number, number][] = [[0, 1], [3, 4], [6, 7]];

/** Vitórias-régias (recortes do core_city_and_country: x, y, w, h). */
const VITORIAS: [number, number, number, number][] = [[18, 2, 12, 11], [36, 5, 9, 9], [50, 3, 11, 11]];

/** Juncos/taboas na margem do lago (desenho por código, base em x, y). */
function junco(ctx: Ctx, x: number, y: number, v: number) {
  const hastes = 3 + (v % 2);
  for (let k = 0; k < hastes; k++) {
    const hx = x - 3 + k * 2 + (k === 1 ? 1 : 0);
    const alt = 8 + ((v + k * 3) % 5);
    ctx.fillStyle = '#2e6a3a';
    ctx.fillRect(hx, y - alt, 1, alt);
    ctx.fillStyle = '#5aa04e';
    ctx.fillRect(hx, y - alt, 1, Math.floor(alt / 2));
    if ((v + k) % 2 === 0) {
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(hx - (k % 2), y - alt - 3, 2, 4);
      ctx.fillStyle = '#7a5232';
      ctx.fillRect(hx - (k % 2), y - alt - 3, 1, 2);
    }
  }
}

/** Flores dos canteiros (cores em faixas por linha), flores soltas na grama (sem o quadrado de grama do tile) e enfeites do lago. */
export function plantarFlores(ctx: Ctx, mapa: Mapa, buch: CanvasImageSource, cidade?: CanvasImageSource): void {
  for (const e of mapa.cidade?.enfeites ?? []) {
    if (e.tipo === 'junco') junco(ctx, e.x, e.y, e.v);
    else if (cidade) {
      const [sx, sy, w, h] = VITORIAS[e.v % VITORIAS.length];
      ctx.drawImage(cidade, sx, sy, w, h, Math.round(e.x - w / 2), Math.round(e.y - h / 2), w, h);
    }
  }
  const flores = floresSemFundo(buch);
  const { terreno } = mapa;
  for (let ty = 0; ty < mapa.altura; ty++)
    for (let tx = 0; tx < mapa.largura; tx++) {
      if (terreno[ty][tx] !== 'jardim') continue;
      const fora = (ox: number, oy: number) => terreno[ty + oy]?.[tx + ox] !== 'jardim';
      // não cobre o meio-fio
      const [x0, y0] = [tx * TAM + (fora(-1, 0) ? 2 : 0), ty * TAM + (fora(0, -1) ? 2 : 0)];
      const [x1, y1] = [(tx + 1) * TAM - (fora(1, 0) ? 2 : 0), (ty + 1) * TAM - (fora(0, 1) ? 2 : 0)];
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, x1 - x0, y1 - y0);
      ctx.clip();
      const linha = FLORES_POR_COR[ty % 3][1];
      ctx.drawImage(flores, 0, linha * TAM, TAM, TAM, tx * TAM, ty * TAM, TAM, TAM);
      ctx.restore();
    }
  for (const f of mapa.flores) ctx.drawImage(flores, 0, FLORES_POR_COR[(f.dx + f.dy) % 3][(f.dx * 3 + f.dy) % 2] * TAM, TAM, TAM, f.x * TAM, f.y * TAM, TAM, TAM);
}
