// Sprite de uma forma que muda por item ou na batalha (Giratina-Origin, Arceus-Fire, Primal Kyogre…):
// imagens da PokéAPI (o Showdown não libera CORS, e o palco da batalha precisa ler os pixels).
import { arquivoSpriteForma } from '../../../shared/formas';

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
