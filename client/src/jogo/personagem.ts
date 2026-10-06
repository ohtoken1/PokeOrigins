// Personagem do jogador em pixel art de 24×32, exibido na metade do tamanho no mundo
// (cada pixel do desenho vira 1 pixel da tela): fica menor e menos "quadradão" que os tiles.

export type Direcao = 'baixo' | 'cima' | 'lado';

const CORES: Record<string, string> = {
  k: '#3a2c3c', // contorno (mais suave que preto)
  h: '#ee4a46', // boné
  H: '#b02e34', // aba do boné
  w: '#ffffff', // logo do boné / gola
  W: '#ffffff', // brilho do olho / detalhe do tênis
  c: '#6a4430', // cabelo
  C: '#4e3020', // mecha escura do cabelo
  s: '#ffdcb8', // pele
  S: '#efb892', // sombra da pele
  e: '#263a6a', // olho
  r: '#ff9e9e', // bochecha
  b: '#3c86e0', // camisa
  B: '#2a62b0', // sombra da camisa
  g: '#f4c64a', // mochila
  G: '#c8962a', // sombra da mochila
  p: '#3c4262', // calça
  P: '#2a2e46', // sombra da calça
  o: '#e04a3a', // tênis
};

/** Metade esquerda (12 colunas); a direita é o espelho. Estilo "chibi": cabeça grande, olhos com brilho. */
const FRENTE = [
  '......kkkkkk',
  '....kkhhhhhh',
  '...khhhhhhhw',
  '..khhhhhhhww',
  '..khhhhhhhhw',
  '.kHHHHHHHHHH',
  '..kcccssssss',
  '.kcccsssssss',
  '.kccssWessss',
  '.kcsssseesss',
  '.kcsrrssssss',
  '..kSssssssss',
  '...kSSssssss',
  '....kkkkkkkk',
  '....kbbbbbwb',
  '...kbbbbbbbb',
  '..kbbkbbbbbb',
  '..kskbbbbbbb',
  '..kskBBBBBBB',
  '....kkpppppp',
  '.....kpppppp',
  '.....kpppPk.',
  '.....kpppPk.',
  '.....kooWok.',
  '.....kkkkkk.',
];

const COSTAS = [
  '......kkkkkk',
  '....kkhhhhhh',
  '...khhhhhhhh',
  '..khhhhhhhhh',
  '..khhhhhhhhh',
  '.kHHHHHHHHHH',
  '.kcccccccccc',
  '.kcCcccccccc',
  '.kcccccCcccc',
  '.kccCccccccc',
  '.kcccccccCcc',
  '..kccccccccc',
  '...kSsssssss',
  '....kkkkkkkk',
  '....kbbbgggg',
  '...kbbbggggg',
  '..kbbkgGgggg',
  '..kskbgGgggg',
  '..kskBgggggg',
  '....kkpppppp',
  '.....kpppppp',
  '.....kpppPk.',
  '.....kpppPk.',
  '.....kooook.',
  '.....kkkkkk.',
];

/** Olhando para a esquerda (para a direita, o sprite é espelhado). */
const LADO = [
  '..........kkkkkk........',
  '........kkhhhhhhkk......',
  '.......khhhhhhhhhhk.....',
  '......khhhhhhhhhhhhk....',
  '......khhhhhhhhhhhhk....',
  '...kkHHHHHHHHHhhhhhk....',
  '..kHHHHHkkkkkkcccccck...',
  '.....ksssssssscccccck...',
  '....kssWessssscccccck...',
  '....ksseesssssccccck....',
  '....ksrrsssssscccck.....',
  '.....kSssssssscccck.....',
  '......kSSssssssck.......',
  '.......kkkkkkkkkk.......',
  '.........kbbbbggk.......',
  '........kbbbbbgggk......',
  '........kbbbbbgGgk......',
  '........kbsskbgGgk......',
  '........kbsskBBggk......',
  '.........kkppppppk......',
  '.........kpppppppk......',
  '.........kppk.kppk......',
  '.........kppk.kppk......',
  '........koook.koook.....',
  '........kkkkk.kkkkk.....',
];

const espelhar = (metades: string[]) => metades.map((m) => m + [...m].reverse().join(''));

const MODELOS: Record<Direcao, string[]> = {
  baixo: espelhar(FRENTE),
  cima: espelhar(COSTAS),
  lado: LADO,
};

export const LARGURA_PERSONAGEM = 24;
export const ALTURA_PERSONAGEM = 32;
const LINHA_INICIAL = 2;

/** Quadro 0 = parado; 1 e 2 = passos (as pernas alternam). */
export type Quadro = 0 | 1 | 2;

// linhas do modelo onde ficam as pernas e os tênis
const PERNAS_INICIO = 21;
const PERNAS_FIM = 24;

/** Sobe 1 pixel as colunas x0..x1 das pernas: o pé sai do chão. */
function levantar(grade: string[][], x0: number, x1: number) {
  for (let y = PERNAS_INICIO; y <= PERNAS_FIM; y++)
    for (let x = x0; x <= x1; x++) grade[y - 1][x] = grade[y][x] === '.' && y - 1 < PERNAS_INICIO ? grade[y - 1][x] : grade[y][x];
  for (let x = x0; x <= x1; x++) grade[PERNAS_FIM][x] = '.';
}

/** Desliza as colunas x0..x1 das pernas para o lado (dx = -1 ou +1). */
function deslizar(grade: string[][], x0: number, x1: number, dx: number) {
  for (let y = PERNAS_INICIO; y <= PERNAS_FIM; y++) {
    const trecho = grade[y].slice(x0, x1 + 1);
    for (let x = x0; x <= x1; x++) grade[y][x] = '.';
    trecho.forEach((letra, i) => {
      if (letra !== '.') grade[y][x0 + i + dx] = letra;
    });
  }
}

function modeloDoQuadro(direcao: Direcao, quadro: Quadro): string[] {
  const grade = MODELOS[direcao].map((linha) => [...linha]);
  if (quadro !== 0) {
    if (direcao === 'lado') {
      // passo 1: pernas abertas (uma para frente, outra para trás); passo 2: perna de trás passando
      if (quadro === 1) {
        deslizar(grade, 8, 12, -1);
        deslizar(grade, 13, 19, 1);
      } else levantar(grade, 13, 19);
    } else if (quadro === 1) levantar(grade, 0, 11);
    else levantar(grade, 12, 23);
  }
  return grade.map((linha) => linha.join(''));
}

export function desenharPersonagem(direcao: Direcao, quadro: Quadro = 0): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA_PERSONAGEM;
  canvas.height = ALTURA_PERSONAGEM;
  const ctx = canvas.getContext('2d')!;
  // sombra no chão
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(7, 26, 10, 2);
  ctx.fillRect(6, 27, 12, 1);
  modeloDoQuadro(direcao, quadro).forEach((linha, y) => {
    if (linha.length !== LARGURA_PERSONAGEM) throw new Error(`Linha ${y} do personagem (${direcao}) com ${linha.length} colunas`);
    [...linha].forEach((letra, x) => {
      const cor = CORES[letra];
      if (!cor) return;
      ctx.fillStyle = cor;
      ctx.fillRect(x, LINHA_INICIAL + y, 1, 1);
    });
  });
  return canvas;
}
