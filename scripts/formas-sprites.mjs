// Gera shared/data/formas-sprites.json: forma do Showdown (ex.: "Arceus-Fire") → nome do arquivo de sprite
// na PokéAPI (ex.: "493-fire" ou "10007"). Só as formas que mudam por item segurado (Arceus, Silvally,
// Genesect, Giratina/Dialga/Palkia-Origin, Ogerpon), as de batalha (Primal, Crowned, Ultra Necrozma) e as Megas.
// Uso: node scripts/formas-sprites.mjs
import { writeFileSync } from 'node:fs';
import { Dex } from '@pkmn/sim';

const formas = Dex.species
  .all()
  .filter((s) => s.num > 0 && s.isNonstandard !== 'CAP' && (s.requiredItem || s.requiredItems || s.isMega))
  .map((s) => s.name);

const candidatos = (nome) => {
  const id = nome.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const lista = [id];
  if (id.startsWith('ogerpon-')) lista.unshift(id.replace(/^ogerpon-(\w+)/, 'ogerpon-$1-mask'));
  // Megas com gênero no nome (Meowstic-M-Mega → meowstic-male-mega)
  if (/-mega/.test(id)) lista.push(id.replace(/-m-mega/, '-male-mega').replace(/-f-mega/, '-female-mega'));
  return lista;
};

const saida = {};
for (const nome of formas) {
  let achou = null;
  for (const c of candidatos(nome)) {
    const r = await fetch(`https://pokeapi.co/api/v2/pokemon-form/${c}`);
    if (!r.ok) continue;
    const d = await r.json();
    const url = d.sprites?.front_default;
    if (url) achou = url.split('/').pop().replace('.png', '');
    // formas que são "Pokémon" próprios na PokéAPI (Giratina-Origin = 10007): o arquivo usa o id
    else if (d.pokemon?.url) achou = d.pokemon.url.split('/').filter(Boolean).pop();
    break;
  }
  // só vale se a imagem em pixel art existir (ex.: Mega Zygarde ainda não tem nenhuma; fica com o sprite normal)
  if (achou) {
    const png = await fetch(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${achou}.png`, { method: 'HEAD' });
    if (!png.ok) achou = null;
  }
  if (achou) saida[nome] = achou;
  console.log(nome.padEnd(28), achou ?? '— sem sprite');
}
writeFileSync('shared/data/formas-sprites.json', JSON.stringify(saida, null, 2) + '\n');
