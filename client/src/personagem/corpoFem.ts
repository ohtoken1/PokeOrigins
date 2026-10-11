// O corpo feminino do LPC tem o busto bem marcado: neste tamanho, com a camiseta caindo reta por cima, parecia uma
// barriga (o dono pediu a menina "mais magrinha"). Aqui as camadas do corpo e da camiseta são afinadas quadro a quadro,
// antes de trocar as cores: de lado sai a saliência da frente do tronco; de frente e de costas a cintura perde 1 px de
// cada lado e o brilho/sombra do busto some. A calça não muda (o quadril fica como era, e a cintura mais fina).

type Dados = { d: Uint8ClampedArray; l: number };

/** Tons da camada, do mais escuro ao mais claro (as camadas do LPC têm 6). */
function tonsDe(d: Dados): number[] {
  const cores = new Set<number>();
  for (let i = 0; i < d.d.length; i += 4) if (d.d[i + 3] > 0) cores.add((d.d[i] << 16) | (d.d[i + 1] << 8) | d.d[i + 2]);
  const lum = (k: number) => 0.3 * (k >> 16) + 0.59 * ((k >> 8) & 255) + 0.11 * (k & 255);
  return [...cores].sort((a, b) => lum(a) - lum(b));
}

/** Linhas da cintura (no quadro de frente parado, a cabeça começa na linha 15): [de frente, de costas]. */
const CINTURA = { frente: [42, 45], costas: [41, 44] } as const;
/** De lado: até onde a frente do tronco pode chegar (em pixels para trás da ponta do rosto) e em quais linhas. */
const RECUO_LADO = 2, LADO_DE = 35, LADO_ATE = 46;

export function afinarCorpoFem(corpo: HTMLCanvasElement, cabeca: CanvasImageSource & { width: number; height: number }, camiseta: HTMLCanvasElement): void {
  const ler = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height);
  const tela = document.createElement('canvas');
  tela.width = cabeca.width;
  tela.height = cabeca.height;
  tela.getContext('2d')!.drawImage(cabeca, 0, 0);
  const iCorpo = ler(corpo), iCam = ler(camiseta), iCab = ler(tela);
  const L = corpo.width;
  const B: Dados = { d: iCorpo.data, l: L }, S: Dados = { d: iCam.data, l: L }, H: Dados = { d: iCab.data, l: L };
  const tons = tonsDe(S);
  if (tons.length < 5) return;
  const tem = (c: Dados, x: number, y: number) => x >= 0 && y >= 0 && x < c.l && c.d[(y * c.l + x) * 4 + 3] > 40;
  const apagar = (c: Dados, x: number, y: number) => (c.d[(y * c.l + x) * 4 + 3] = 0);
  const tom = (x: number, y: number) => {
    const i = (y * L + x) * 4;
    return tons.indexOf((S.d[i] << 16) | (S.d[i + 1] << 8) | S.d[i + 2]);
  };
  const pintar = (x: number, y: number, t: number) => {
    const i = (y * L + x) * 4, k = tons[t];
    S.d[i] = k >> 16;
    S.d[i + 1] = (k >> 8) & 255;
    S.d[i + 2] = k & 255;
    S.d[i + 3] = 255;
  };
  const claro = tons.length - 1;

  for (let linha = 0; linha < 4; linha++)
    for (let col = 0; col < L / 64; col++) {
      const ox = col * 64, oy = linha * 64;
      // âncora: o topo e o meio da cabeça (ela sobe e desce 1 px ao andar)
      let topo = -1, esq = 64, dir = -1;
      for (let y = 0; y < 64 && topo < 0; y++) for (let x = 0; x < 64; x++) if (tem(H, ox + x, oy + y)) { topo = y; break; }
      if (topo < 0) continue;
      for (let y = topo; y < topo + 14; y++) for (let x = 0; x < 64; x++) if (tem(H, ox + x, oy + y)) { esq = Math.min(esq, x); dir = Math.max(dir, x); }
      const dy = topo - 15;

      if (linha === 1 || linha === 3) {
        // `n` = pixels para trás da ponta do rosto (a frente do tronco fica reta, `RECUO_LADO` atrás dela)
        const X = (n: number) => ox + (linha === 1 ? esq + n : dir - n);
        for (let y = LADO_DE; y <= LADO_ATE; y++) {
          const Y = oy + y + dy;
          let cortou = false;
          for (let n = -10; n < RECUO_LADO; n++) if (tem(S, X(n), Y)) { apagar(S, X(n), Y); apagar(B, X(n), Y); cortou = true; }
          if (cortou && tem(S, X(RECUO_LADO), Y)) pintar(X(RECUO_LADO), Y, 0);
          // sem o brilho do busto logo atrás da borda
          for (let n = RECUO_LADO + 1; n <= RECUO_LADO + 4; n++) if (tem(S, X(n), Y) && tom(X(n), Y) === claro && y >= 37 && y <= 42) pintar(X(n), Y, claro - 1);
        }
        continue;
      }

      const [de, ate] = linha === 2 ? CINTURA.frente : CINTURA.costas;
      let meioDe = 64, meioAte = -1;
      for (let y = de; y <= ate; y++) {
        const Y = oy + y + dy;
        let a = 64, b = -1;
        for (let x = 0; x < 64; x++) if (tem(S, ox + x, Y)) { a = Math.min(a, x); b = Math.max(b, x); }
        if (b - a < 8) continue;
        // a borda de cada lado sai (com a pele que estava por baixo) e a vizinha vira o contorno
        for (const [x, viz] of [[a, a + 1], [b, b - 1]]) { apagar(S, ox + x, Y); apagar(B, ox + x, Y); pintar(ox + viz, Y, 0); }
        // sem a sombra de baixo do busto: o miolo fica liso, só com um degradê nas beiradas
        for (let x = a + 2; x <= b - 2; x++) {
          const beira = Math.min(x - (a + 1), b - 1 - x);
          pintar(ox + x, Y, beira === 1 ? 2 : beira === 2 ? 3 : 4);
        }
        meioDe = Math.min(meioDe, a + 2);
        meioAte = Math.max(meioAte, b - 2);
      }
      // sem os dois brilhos do busto (só de frente), nas linhas logo acima da cintura
      if (linha === 2) for (let y = de - 6; y < de; y++) for (let x = meioDe; x <= meioAte; x++) if (tem(S, ox + x, oy + y + dy) && tom(ox + x, oy + y + dy) === claro) pintar(ox + x, oy + y + dy, claro - 1);
    }
  corpo.getContext('2d')!.putImageData(iCorpo, 0, 0);
  camiseta.getContext('2d')!.putImageData(iCam, 0, 0);
}
