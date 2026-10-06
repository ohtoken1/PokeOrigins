// Baixa da PokéAPI (GraphQL) a lista oficial de TMs (Scarlet/Violet) e TRs (Sword/Shield)
// e salva em shared/data/maquinas.json. Uso: npm run maquinas
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consulta = `{
  pokemon_v2_machine(where: { pokemon_v2_versiongroup: { name: { _in: ["scarlet-violet", "sword-shield"] } } }) {
    machine_number
    pokemon_v2_item { name }
    pokemon_v2_move { name }
    pokemon_v2_versiongroup { name }
  }
}`;

const resposta = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: consulta }),
});
if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
const { data } = await resposta.json();

// TMs do Scarlet/Violet e TRs do Sword/Shield; o golpe vira o id do Showdown ("mega-punch" -> "megapunch")
const maquinas = data.pokemon_v2_machine
  .map((m) => ({ id: m.pokemon_v2_item.name, golpe: m.pokemon_v2_move.name.replace(/-/g, ''), jogo: m.pokemon_v2_versiongroup.name }))
  .filter((m) => (m.jogo === 'scarlet-violet' && m.id.startsWith('tm')) || (m.jogo === 'sword-shield' && m.id.startsWith('tr')))
  .map(({ id, golpe }) => ({ id, golpe }))
  .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

await mkdir(path.join(raiz, 'shared', 'data'), { recursive: true });
await writeFile(path.join(raiz, 'shared', 'data', 'maquinas.json'), JSON.stringify(maquinas, null, 1) + '\n');
console.log(`TMs: ${maquinas.filter((m) => m.id.startsWith('tm')).length} · TRs: ${maquinas.filter((m) => m.id.startsWith('tr')).length}`);
