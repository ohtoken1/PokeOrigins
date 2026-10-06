// Cores e tipo de obstáculo de cada bioma para o desenho em pixel art do mapa.
export type Obstaculo = 'arvore' | 'pinheiro' | 'pedra' | 'caixa' | 'lapide';

export interface Paleta {
  /** chão: base, escuro, claro */
  chao: [string, string, string];
  /** mato alto: escuro, médio, claro */
  mato: [string, string, string];
  /** caminho: base, escuro, borda */
  caminho: [string, string, string];
  /** água/lava/abismo: base, brilho, borda escura, margem */
  liquido: [string, string, string, string];
  obstaculo: Obstaculo;
  /** copa/corpo do obstáculo: contorno, escuro, médio, claro */
  copa: [string, string, string, string];
  flores: string[];
  /** quantas manchas de líquido o mapa tem */
  lagos: number;
  /** Filtro CSS aplicado aos tiles do tileset para dar a cor do bioma (pixel a pixel, sem borrar). */
  filtro: string;
}

export const PALETAS: Record<string, Paleta> = {
  grama: {
    chao: ['#9ad87a', '#86c866', '#b2e692'],
    mato: ['#1f7a3a', '#2f9a48', '#62c860'],
    caminho: ['#ecdca4', '#d8c48a', '#bfa874'],
    liquido: ['#3f9ff0', '#9fd8ff', '#2a6fc0', '#e8d8a0'],
    obstaculo: 'arvore',
    copa: ['#1c4a2a', '#2f6e3a', '#4c9a4a', '#7cc46a'],
    flores: ['#ff8a9a', '#ffe070', '#ffffff', '#c8a0ff'],
    lagos: 3,
    filtro: 'none',
  },
  agua: {
    chao: ['#f0e2a8', '#e0cf90', '#fff2c4'],
    mato: ['#1f7a6e', '#2e9a8a', '#5cc8b0'],
    caminho: ['#d8c890', '#c4b27a', '#ac9a66'],
    liquido: ['#2f8fe0', '#8fd0ff', '#1a5aa8', '#fff0c0'],
    obstaculo: 'arvore',
    copa: ['#1a4a40', '#2a7060', '#3f9a7a', '#6cc89a'],
    flores: ['#ffffff', '#ffb0c0'],
    lagos: 7,
    filtro: 'hue-rotate(-12deg) saturate(1.15)',
  },
  vulcao: {
    chao: ['#6e4a3a', '#5a3a2e', '#86604a'],
    mato: ['#4a2e26', '#6a4436', '#9a6a52'],
    caminho: ['#9a7a62', '#86684f', '#5a4234'],
    liquido: ['#ff6a1a', '#ffd25a', '#a02010', '#3a2420'],
    obstaculo: 'pedra',
    copa: ['#1e1414', '#3a2a28', '#54403a', '#76605a'],
    flores: ['#ff9a3a', '#ffd25a'],
    lagos: 4,
    filtro: 'sepia(0.7) hue-rotate(-35deg) saturate(1.6) brightness(0.7)',
  },
  caverna: {
    chao: ['#a08a70', '#8c765e', '#b8a286'],
    mato: ['#6a5644', '#7e6a56', '#a08a70'],
    caminho: ['#c4ae90', '#b09a7c', '#8a7660'],
    liquido: ['#2a2018', '#4a3c30', '#120c08', '#7a6656'],
    obstaculo: 'pedra',
    copa: ['#2a221c', '#4a3e34', '#6e6050', '#958470'],
    flores: ['#c8b8a0'],
    lagos: 3,
    filtro: 'sepia(0.85) saturate(0.55) brightness(0.85)',
  },
  pantano: {
    chao: ['#7c8a5e', '#6a784e', '#94a272'],
    mato: ['#4a2a62', '#6a3f8a', '#a070c8'],
    caminho: ['#8a7050', '#765e42', '#5a4632'],
    liquido: ['#8a48c0', '#c89ae8', '#4a2070', '#5a6040'],
    obstaculo: 'arvore',
    copa: ['#1e1a14', '#3a3424', '#55503a', '#77724e'],
    flores: ['#c8a0ff', '#a0e070'],
    lagos: 4,
    filtro: 'hue-rotate(35deg) saturate(0.55) brightness(0.75)',
  },
  usina: {
    chao: ['#b8b8b0', '#a4a49c', '#cacac2'],
    mato: ['#4a4a40', '#6a6a5a', '#8a8a76'],
    caminho: ['#d8c060', '#c4ac4a', '#3a3a3a'],
    liquido: ['#4a8ac0', '#9ac8f0', '#2a5a8a', '#7a7a74'],
    obstaculo: 'caixa',
    copa: ['#2a2a30', '#4a4a54', '#6a6a78', '#9a9aa8'],
    flores: ['#ffe03a'],
    lagos: 2,
    filtro: 'grayscale(0.85) brightness(1.05)',
  },
  torre: {
    chao: ['#5a4a6e', '#4c3e5e', '#6c5a82'],
    mato: ['#3a2a52', '#5a4078', '#8a6ab8'],
    caminho: ['#7a5a90', '#664a7a', '#3a2a4a'],
    liquido: ['#1a1226', '#3a2a52', '#0a0612', '#4a3c5c'],
    obstaculo: 'lapide',
    copa: ['#1e1a24', '#5a5a66', '#7e7e8a', '#a8a8b4'],
    flores: ['#d0b8ff', '#9a7ad0'],
    lagos: 2,
    filtro: 'hue-rotate(115deg) saturate(0.75) brightness(0.62)',
  },
  gelo: {
    chao: ['#eef6fb', '#d8e8f2', '#ffffff'],
    mato: ['#5a9ab8', '#7ab8d0', '#b0dcec'],
    caminho: ['#cfe8f5', '#b8d8ea', '#94bcd4'],
    liquido: ['#4a98d0', '#b8e4ff', '#2a68a0', '#ffffff'],
    obstaculo: 'pinheiro',
    copa: ['#1a3a3a', '#2a5a54', '#3a7a6c', '#e8f4f8'],
    flores: ['#ffffff', '#b8e4ff'],
    lagos: 3,
    filtro: 'grayscale(1) brightness(1.6) sepia(0.25) hue-rotate(175deg) saturate(1.5)',
  },
  santuario: {
    chao: ['#f0d0e0', '#e0bcd0', '#fae4ee'],
    mato: ['#a04880', '#c868a0', '#f0a0c8'],
    caminho: ['#f8e8d0', '#e8d4b8', '#c8b090'],
    liquido: ['#7ab8f0', '#c8e8ff', '#4a80c0', '#fff0e0'],
    obstaculo: 'arvore',
    copa: ['#5a2a4a', '#a04a7a', '#d870a8', '#ffb0d8'],
    flores: ['#ffffff', '#ffe070', '#a0d0ff'],
    lagos: 2,
    filtro: 'hue-rotate(170deg) saturate(0.65) brightness(1.2)',
  },
};
