// Ruído suave (value noise) para formas orgânicas: bordas tortas de caminhos, manchas na grama, contorno de lagos.
// Sempre o mesmo resultado para a mesma posição (sem sorteio), então o gerador do mapa e o desenho combinam.

/** Número pseudoaleatório 0..1 fixo para cada par de inteiros (x, y) e semente. */
export function hash2(x: number, y: number, semente = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(semente | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const suave = (t: number) => t * t * (3 - 2 * t);

/** Ruído suave 0..1 (interpolado entre pontos inteiros). */
export function ruido(x: number, y: number, semente = 0): number {
  const [x0, y0] = [Math.floor(x), Math.floor(y)];
  const [tx, ty] = [suave(x - x0), suave(y - y0)];
  const a = hash2(x0, y0, semente);
  const b = hash2(x0 + 1, y0, semente);
  const c = hash2(x0, y0 + 1, semente);
  const d = hash2(x0 + 1, y0 + 1, semente);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/** Ruído em camadas (mais natural): soma de 3 escalas. */
export function ruidoFractal(x: number, y: number, semente = 0): number {
  return ruido(x, y, semente) * 0.57 + ruido(x * 2.03, y * 2.03, semente + 7) * 0.29 + ruido(x * 4.1, y * 4.1, semente + 13) * 0.14;
}

/** Lago orgânico (pixels): elipse com a borda deformada pelo ruído. */
export interface FormaLago {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/** "Distância" normalizada ao centro do lago: < 1 é água (a borda balança com o ruído). */
export function dentroDoLago(l: FormaLago, px: number, py: number): number {
  const [dx, dy] = [(px - l.x) / l.rx, (py - l.y) / l.ry];
  return dx * dx + dy * dy + (ruidoFractal(px / 22, py / 22, 91) - 0.5) * 0.42;
}
