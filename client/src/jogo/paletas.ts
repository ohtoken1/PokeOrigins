// Visual de cada bioma: quais árvores/pedras do tileset usar e os filtros de cor.
// Coordenadas (coluna, linha) no core_outdoor_nature do Tuxemon.
export type Obstaculo = 'arvore' | 'rocha' | 'caixa' | 'lapide';

export interface Paleta {
  obstaculo: Obstaculo;
  /** árvores de 2×3 tiles (canto de cima à esquerda) */
  arvores?: [number, number][];
  /** pedras grandes de 2×2 tiles */
  rochas?: [number, number][];
  /** pedrinhas de 1 tile */
  pedrinhas: [number, number][];
  /** cores dos obstáculos desenhados por código (caixa, lápide): contorno, escuro, médio, claro */
  copa: [string, string, string, string];
  /** quantos lagos o mapa tem */
  lagos: number;
  /** filtro CSS do chão (grama, mato, areia, flores) */
  filtro: string;
  /** filtro CSS de árvores e pedras */
  filtroObjetos: string;
  /** filtro CSS da água (vira lava, abismo, veneno…) */
  filtroLiquido: string;
}

const ARVORES_VERDES: [number, number][] = [[48, 0], [44, 0], [50, 0], [46, 0]];
const PINHEIROS_AZULADOS: [number, number][] = [[44, 4], [46, 4]];
const ROCHA_MARROM: [number, number][] = [[42, 2]];
const ROCHA_CINZA: [number, number][] = [[42, 6]];
const PEDRINHAS_MARRONS: [number, number][] = [[40, 0], [41, 0], [40, 1], [41, 1]];
const PEDRINHAS_CINZAS: [number, number][] = [[40, 4], [41, 4], [40, 5], [41, 5]];

export const PALETAS: Record<string, Paleta> = {
  grama: {
    obstaculo: 'arvore',
    arvores: ARVORES_VERDES,
    pedrinhas: PEDRINHAS_CINZAS,
    copa: ['#1c4a2a', '#2f6e3a', '#4c9a4a', '#7cc46a'],
    lagos: 3,
    filtro: 'none',
    filtroObjetos: 'none',
    filtroLiquido: 'none',
  },
  agua: {
    obstaculo: 'arvore',
    arvores: PINHEIROS_AZULADOS,
    pedrinhas: PEDRINHAS_CINZAS,
    copa: ['#1a4a40', '#2a7060', '#3f9a7a', '#6cc89a'],
    lagos: 9,
    filtro: 'hue-rotate(-12deg) saturate(1.15)',
    filtroObjetos: 'none',
    filtroLiquido: 'none',
  },
  vulcao: {
    obstaculo: 'rocha',
    rochas: ROCHA_MARROM,
    pedrinhas: PEDRINHAS_MARRONS,
    copa: ['#1e1414', '#3a2a28', '#54403a', '#76605a'],
    lagos: 5,
    filtro: 'sepia(0.7) hue-rotate(-35deg) saturate(1.6) brightness(0.7)',
    filtroObjetos: 'brightness(0.8)',
    filtroLiquido: 'hue-rotate(170deg) saturate(2.2) brightness(1.15)',
  },
  caverna: {
    obstaculo: 'rocha',
    rochas: [...ROCHA_CINZA, ...ROCHA_MARROM],
    pedrinhas: PEDRINHAS_CINZAS,
    copa: ['#2a221c', '#4a3e34', '#6e6050', '#958470'],
    lagos: 3,
    filtro: 'sepia(0.85) saturate(0.55) brightness(0.85)',
    filtroObjetos: 'none',
    filtroLiquido: 'saturate(0.4) brightness(0.45)',
  },
  torre: {
    obstaculo: 'lapide',
    pedrinhas: PEDRINHAS_CINZAS,
    copa: ['#1e1a24', '#5a5a66', '#7e7e8a', '#a8a8b4'],
    lagos: 2,
    filtro: 'hue-rotate(115deg) saturate(0.75) brightness(0.62)',
    filtroObjetos: 'hue-rotate(200deg) saturate(0.5) brightness(0.7)',
    filtroLiquido: 'hue-rotate(40deg) saturate(0.7) brightness(0.35)',
  },
};
