// Personagem do jogador em pixel art de 24×32, exibido na metade do tamanho no mundo
// (cada pixel do desenho vira 1 pixel da tela): fica menor e menos "quadradão" que os tiles.

export type Direcao = 'baixo' | 'cima' | 'lado';

const CORES: Record<string, string> = {
  k: '#2a2430', // contorno
  h: '#e8403c', // boné
  H: '#a82828', // aba do boné
  w: '#f8f8f8', // logo do boné
  c: '#5a3a28', // cabelo
  s: '#ffd8b0', // pele
  S: '#e8b088', // sombra da pele
  e: '#2a2430', // olho
  r: '#f4a0a0', // bochecha
  b: '#3a78d8', // camisa
  B: '#2a58a8', // sombra da camisa
  g: '#f0c040', // mochila
  G: '#c09020', // sombra da mochila
  p: '#3a3e58', // calça
  P: '#2a2c40', // sombra da calça
  o: '#c84030', // tênis
};

/** Metade esquerda (12 colunas); a direita é o espelho. Linhas a partir da 2. */
const FRENTE = [
  '........kkkk',
  '......kkhhhh',
  '.....khhhhhw',
  '....khhhhhww',
  '....khhhhhhw',
  '....kHHHHHHH',
  '...kkkkkkkkk',
  '....kcccssss',
  '....kccsssss',
  '....kcsssess',
  '....kcsssess',
  '....kcsrssss',
  '.....kSsssss',
  '......kkkkkk',
  '.....kbbbbbb',
  '....kbbbbbbb',
  '...kbbkbbbbb',
  '...kskbbbbbb',
  '...kskBBBBBB',
  '....kkpppppp',
  '.....kpppppp',
  '.....kpppPk.',
  '.....kpppPk.',
  '.....kooook.',
  '.....kkkkkk.',
];

const COSTAS = [
  '........kkkk',
  '......kkhhhh',
  '.....khhhhhh',
  '....khhhhhhh',
  '....khhhhhhh',
  '....kHHHHHHH',
  '...kkkkkkkkk',
  '....kccccccc',
  '....kccccccc',
  '....kccccccc',
  '....kcCccccc',
  '.....kcccccc',
  '.....kSsssss',
  '......kkkkkk',
  '.....kbbbggg',
  '....kbbbgggg',
  '...kbbkgGggg',
  '...kskbgGggg',
  '...kskbggggg',
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
  '....kkHHHHHHHHHHHHHk....',
  '...kHHHkkkkkkkkkkkkk....',
  '......kssssscccccck.....',
  '.....kssssssscccccck....',
  '.....ksessssscccccck....',
  '.....ksessssssccccck....',
  '......ksrsssssscccck....',
  '.......kSssssssccck.....',
  '........kkkkkkkkkk......',
  '.........kbbbbbggk......',
  '........kbbbbbbggk......',
  '........kbbbbbbgggk.....',
  '........kbsskbbgggk.....',
  '........kbsskBBgggk.....',
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
  cima: espelhar(COSTAS.map((l) => l.replace('C', 'c'))),
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

/** Ícone pequeno oficial do Pokémon (40×30, da PokéAPI), usado para o Pokémon que segue o jogador. */
export function urlIconePokemon(especieId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/${especieId}.png`;
}
