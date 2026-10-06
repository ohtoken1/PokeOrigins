// Descrições do Pokémon Showdown (itens, golpes, habilidades) traduzidas para português.
// Regra do dono: todo texto visível ao jogador em português; só nomes de golpes, itens e
// atributos (Attack, Sp. Atk…) podem ficar em inglês. Para gerar traduções novas, ver CLAUDE.md.
import traducoes from './data/traducoes.json';

const MAPA = traducoes as Record<string, string>;

/** Devolve a descrição em português (ou o texto original, se ainda não houver tradução). */
export function traduzir(texto: string | undefined | null): string {
  if (!texto) return '';
  return MAPA[texto] ?? texto;
}

const TIPOS: Record<string, string> = {
  Normal: 'Normal',
  Fire: 'Fogo',
  Water: 'Água',
  Grass: 'Planta',
  Electric: 'Elétrico',
  Ice: 'Gelo',
  Fighting: 'Lutador',
  Poison: 'Veneno',
  Ground: 'Terra',
  Flying: 'Voador',
  Psychic: 'Psíquico',
  Bug: 'Inseto',
  Rock: 'Pedra',
  Ghost: 'Fantasma',
  Dragon: 'Dragão',
  Dark: 'Sombrio',
  Steel: 'Aço',
  Fairy: 'Fada',
  Stellar: 'Stellar',
};
const CATEGORIAS: Record<string, string> = { Physical: 'Físico', Special: 'Especial', Status: 'Status' };

export const nomeTipo = (tipo: string) => TIPOS[tipo] ?? tipo;
export const nomeCategoria = (categoria: string) => CATEGORIAS[categoria] ?? categoria;
