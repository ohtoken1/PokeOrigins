// Descrições do Pokémon Showdown (itens, golpes, habilidades) traduzidas para português.
// Regra do dono: todo texto visível ao jogador em português; só nomes de golpes, itens e
// atributos (Attack, Sp. Atk…) podem ficar em inglês. Para gerar traduções novas, ver CLAUDE.md.
import traducoes from './data/traducoes.json';

const MAPA = traducoes as Record<string, string>;

/** Idioma escolhido no navegador (client/src/idioma.ts); no servidor não há escolha: português. */
function idioma(): string {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage?.getItem('jogo-claude:idioma') ?? 'pt';
  } catch {
    return 'pt';
  }
}

/**
 * Devolve a descrição em português (ou o texto original, se ainda não houver tradução). Em inglês, o original do
 * Showdown já serve; em espanhol, por enquanto, também fica o original em inglês (falta traduzir as descrições).
 */
export function traduzir(texto: string | undefined | null): string {
  if (!texto) return '';
  if (idioma() !== 'pt') return texto;
  return MAPA[texto] ?? texto;
}

const CATEGORIAS: Record<string, string> = { Physical: 'Físico', Special: 'Especial', Status: 'Status' };

/** Nomes de tipo ficam em inglês (pedido do dono): "fire"/"Fire" → "Fire". */
export const nomeTipo = (tipo: string) => tipo.charAt(0).toUpperCase() + tipo.slice(1);
export const nomeCategoria = (categoria: string) => CATEGORIAS[categoria] ?? categoria;
