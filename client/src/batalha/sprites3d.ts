// Sprites de batalha dos modelos 3D (site do Pokémon Showdown). O TESTE foi encerrado pelo dono:
// a opção saiu do menu e a batalha é sempre em pixel art. Fica aqui caso volte a ser usado.
import { especie } from '../../../shared/batalha/pokemon';

export function usarSprites3D(): boolean {
  return false;
}

export function urlSprite3D(especieId: number, opcoes: { shiny?: boolean; costas?: boolean } = {}): string {
  const pasta = `ani${opcoes.costas ? '-back' : ''}${opcoes.shiny ? '-shiny' : ''}`;
  return `https://play.pokemonshowdown.com/sprites/${pasta}/${especie(especieId).spriteid}.gif`;
}
