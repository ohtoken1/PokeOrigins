// Sprite de uma forma que muda por item ou na batalha (Giratina-Origin, Arceus-Fire, Primal Kyogre…):
// imagens da PokéAPI (o Showdown não libera CORS, e o palco da batalha precisa ler os pixels).
import { arquivoSpriteForma } from '../../../shared/formas';
import type { Mega } from '../../../shared/megas';
import type { PokemonBase } from '../../../shared/tipos';

const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Troca a imagem para a da forma (GIF animado; se não houver, PNG parado). Devolve false se não houver sprite. */
export function trocarSpriteForma(img: HTMLImageElement, forma: string, { shiny = false, costas = false } = {}): boolean {
  const arquivo = arquivoSpriteForma(forma);
  if (!arquivo) return false;
  const pasta = `${costas ? 'back/' : ''}${shiny ? 'shiny/' : ''}`;
  const png = `${BASE}/${pasta}${arquivo}.png`;
  img.addEventListener('error', () => img.src !== png && (img.src = png), { once: true });
  img.src = `${BASE}/other/showdown/${pasta}${arquivo}.gif`;
  return true;
}

/**
 * A Mega como se fosse uma espécie (Pokédex e Database): dados da espécie normal com tipos, atributos,
 * ability e sprites da Mega. O `id` continua o da espécie normal.
 */
export function megaComoPokemon(m: Mega, base: PokemonBase): PokemonBase {
  const a = m.sprite;
  const url = (pasta: string, ext = 'png') => (a ? `${BASE}/${pasta}${a}.${ext}` : null);
  return {
    ...base,
    nome: m.nome,
    tipos: m.tipos,
    stats: m.stats,
    habilidades: [{ nome: m.habilidade, oculta: false }],
    sprites: {
      frente: url(''),
      frenteShiny: url('shiny/'),
      costas: url('back/'),
      costasShiny: url('back/shiny/'),
      gif: url('other/showdown/', 'gif'),
      gifShiny: url('other/showdown/shiny/', 'gif'),
      gifCostas: url('other/showdown/back/', 'gif'),
      gifCostasShiny: url('other/showdown/back/shiny/', 'gif'),
    },
  };
}
