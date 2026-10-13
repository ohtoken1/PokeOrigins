// Enquadra o personagem num retrato (perfil, provador de skins): o quadro do LPC tem 64 × 64 com o boneco mais para
// baixo e sobras transparentes diferentes por skin (orelhas, chapéus, asas). Em vez de um deslocamento fixo, mede a
// parte DESENHADA e põe ela no meio da moldura, no maior tamanho inteiro que cabe (fator quebrado borra o pixel art).

const QUADRO = 64;

/** Caixa da parte desenhada de um quadro da folha (null se estiver vazio). */
function caixaDoQuadro(folhas: CanvasImageSource[], sx: number, sy: number): { x: number; y: number; l: number; a: number } | null {
  const tela = document.createElement('canvas');
  tela.width = tela.height = QUADRO;
  const ctx = tela.getContext('2d', { willReadFrequently: true })!;
  for (const folha of folhas) ctx.drawImage(folha, sx, sy, QUADRO, QUADRO, 0, 0, QUADRO, QUADRO);
  const { data } = ctx.getImageData(0, 0, QUADRO, QUADRO);
  let [x0, y0, x1, y1] = [QUADRO, QUADRO, -1, -1];
  for (let y = 0; y < QUADRO; y++)
    for (let x = 0; x < QUADRO; x++)
      if (data[(y * QUADRO + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x: x0, y: y0, l: x1 - x0 + 1, a: y1 - y0 + 1 };
}

/**
 * Ajusta o tamanho e a posição do `canvas` (64 × 64, dentro de uma moldura com `overflow: hidden` e o conteúdo no
 * centro) para o boneco do quadro (`sx`, `sy`) ficar inteiro e centralizado. `moldura` = lado interno em pixels;
 * `folga` = espaço mínimo em volta.
 */
export function enquadrarPersonagem(canvas: HTMLCanvasElement, folhas: (CanvasImageSource | null | undefined)[], sx: number, sy: number, moldura: number, folga = 4): void {
  const caixa = caixaDoQuadro(folhas.filter((f): f is CanvasImageSource => !!f), sx, sy);
  if (!caixa) return;
  const escala = Math.max(1, Math.min(4, Math.floor((moldura - folga * 2) / Math.max(caixa.l, caixa.a))));
  const lado = QUADRO * escala;
  // o canvas fica centralizado na moldura: desloca pelo quanto o meio do boneco está fora do meio do quadro
  const dx = (QUADRO / 2 - (caixa.x + caixa.l / 2)) * escala;
  const dy = (QUADRO / 2 - (caixa.y + caixa.a / 2)) * escala;
  Object.assign(canvas.style, { width: `${lado}px`, height: `${lado}px`, transform: `translate(${Math.round(dx)}px, ${Math.round(dy)}px)` });
}
