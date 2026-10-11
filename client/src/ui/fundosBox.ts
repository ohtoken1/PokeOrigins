// Fundos das boxes do PC (client/public/fundos-box): os papéis de parede dos jogos oficiais. Os do Emerald são
// pixel art com moldura (esticados para caber na box, sem suavizar); os do X/Y são texturas (cobrem a box).
// O jogador escolhe um por box (`save.fundosBox`); sem escolha, a box é branca.
import type { Save } from '../estado';

export interface FundoBox {
  id: string;
  nome: string;
  jogo: 'Emerald' | 'X/Y';
}

const TEMAS = ['Floresta', 'Cidade', 'Deserto', 'Savana', 'Rochedo', 'Vulcão', 'Neve', 'Caverna', 'Praia', 'Fundo do mar', 'Rio', 'Céu'];
const numero = (i: number) => String(i + 1).padStart(2, '0');

export const FUNDOS_BOX: FundoBox[] = [
  ...[...TEMAS, 'Bolinhas', 'Centro Pokémon', 'Máquina', 'Simples'].map((nome, i): FundoBox => ({ id: `${numero(i)}e`, nome, jogo: 'Emerald' })),
  ...TEMAS.map((nome, i): FundoBox => ({ id: `${numero(i)}xy`, nome, jogo: 'X/Y' })),
  { id: '15xy', nome: 'Xadrez', jogo: 'X/Y' },
  { id: '16xy', nome: 'Simples', jogo: 'X/Y' },
];

/** O fundo escolhido para a box (null = branco). */
export const fundoDaBox = (save: Save, box: number): FundoBox | null => FUNDOS_BOX.find((f) => f.id === save.fundosBox?.[box]) ?? null;

/** Estilo CSS para pintar um elemento com o fundo (ou de branco). */
export function estiloDoFundo(fundo: FundoBox | null): Record<string, string> {
  if (!fundo) return { background: '#fff' };
  return {
    backgroundColor: '#fff',
    backgroundImage: `url("fundos-box/box_wp${fundo.id}.png")`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: fundo.jogo === 'Emerald' ? '100% 100%' : 'cover',
    imageRendering: fundo.jogo === 'Emerald' ? 'pixelated' : 'auto',
  };
}
