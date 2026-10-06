// TESTE (não definitivo): sprites de batalha feitos dos modelos 3D dos jogos, do site do
// Pokémon Showdown. Liga/desliga no menu da região; o padrão é o pixel art.
import { especie } from '../../../shared/batalha/pokemon';

const CHAVE = 'jogo-claude:sprites3d';

export function usarSprites3D(): boolean {
  try {
    return localStorage.getItem(CHAVE) === 'sim';
  } catch {
    return false;
  }
}

export function definirSprites3D(ligado: boolean): void {
  try {
    localStorage.setItem(CHAVE, ligado ? 'sim' : 'nao');
  } catch {
    // sem armazenamento: vale só até recarregar
  }
}

export function urlSprite3D(especieId: number, opcoes: { shiny?: boolean; costas?: boolean } = {}): string {
  const pasta = `ani${opcoes.costas ? '-back' : ''}${opcoes.shiny ? '-shiny' : ''}`;
  return `https://play.pokemonshowdown.com/sprites/${pasta}/${especie(especieId).spriteid}.gif`;
}
