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

export function desenharPersonagem(direcao: Direcao): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA_PERSONAGEM;
  canvas.height = ALTURA_PERSONAGEM;
  const ctx = canvas.getContext('2d')!;
  // sombra no chão
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(7, 26, 10, 2);
  ctx.fillRect(6, 27, 12, 1);
  MODELOS[direcao].forEach((linha, y) => {
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
