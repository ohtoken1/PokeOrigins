// Filtros de cor (sepia, hue-rotate, saturate, brightness) calculados por nós, em vez do `ctx.filter`
// do navegador: aplicado centenas de vezes ao desenhar o mapa, ele congelava a página em muitas
// placas de vídeo (Vulcão, Caverna e Torre). As fórmulas são as da especificação de filtros do CSS.
type Matriz = number[]; // 3×3, linha a linha

const multiplicar = (a: Matriz, b: Matriz): Matriz => {
  const r: Matriz = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]);
  return r;
};

function matrizDe(nome: string, valor: number): Matriz {
  switch (nome) {
    case 'saturate': {
      const s = valor;
      return [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
    }
    case 'hue-rotate': {
      const a = (valor * Math.PI) / 180;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      return [
        0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
        0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
        0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
      ];
    }
    case 'sepia': {
      const k = 1 - Math.min(1, valor);
      return [
        0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k,
        0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k,
        0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k,
      ];
    }
    case 'brightness':
      return [valor, 0, 0, 0, valor, 0, 0, 0, valor];
    default:
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
}

/** "sepia(0.7) hue-rotate(-35deg) …" vira uma matriz só (aplicada na mesma ordem do CSS). */
function matrizDoFiltro(filtro: string): Matriz {
  let m: Matriz = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (const [, nome, valor] of filtro.matchAll(/([a-z-]+)\(\s*(-?[\d.]+)/g)) m = multiplicar(matrizDe(nome, Number(valor)), m);
  return m;
}

const limitar = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Cor "#rrggbb" com o filtro aplicado. */
export function corComFiltro(cor: string, filtro: string): string {
  if (filtro === 'none') return cor;
  const m = matrizDoFiltro(filtro);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16));
  const novo = [0, 1, 2].map((i) => Math.round(limitar(m[i * 3] * r + m[i * 3 + 1] * g + m[i * 3 + 2] * b)));
  return `rgb(${novo.join(',')})`;
}

/** Cópia da imagem com o filtro aplicado pixel a pixel. */
export function imagemComFiltro(img: CanvasImageSource, filtro: string): CanvasImageSource {
  if (filtro === 'none') return img;
  const { width, height } = img as HTMLImageElement;
  const c = document.createElement('canvas');
  [c.width, c.height] = [width, height];
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const dados = ctx.getImageData(0, 0, width, height);
  const d = dados.data;
  const m = matrizDoFiltro(filtro);
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    d[i] = limitar(m[0] * r + m[1] * g + m[2] * b);
    d[i + 1] = limitar(m[3] * r + m[4] * g + m[5] * b);
    d[i + 2] = limitar(m[6] * r + m[7] * g + m[8] * b);
  }
  ctx.putImageData(dados, 0, 0);
  return c;
}
