// Baixa os dados dos Pokémon da PokéAPI e salva em shared/data/pokemon-<regiao>.json.
// Uso: npm run dados -- kanto        (uma região)
//      npm run dados -- todas        (todas as regiões)
// Os dados ficam dentro do projeto, então o jogo não depende da PokéAPI estar no ar.
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REGIOES = {
  kanto: [1, 151],
  johto: [152, 251],
  hoenn: [252, 386],
  sinnoh: [387, 493],
  unova: [494, 649],
  kalos: [650, 721],
  alola: [722, 809],
  galar: [810, 905],
  paldea: [906, 1025],
};
const API = 'https://pokeapi.co/api/v2';
const SIMULTANEOS = 6; // poucas requisições ao mesmo tempo: gentil com a API e com internet lenta
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const NOMES_STATS = {
  hp: 'hp',
  attack: 'ataque',
  defense: 'defesa',
  'special-attack': 'ataqueEspecial',
  'special-defense': 'defesaEspecial',
  speed: 'velocidade',
};

async function buscar(url, tentativas = 4) {
  for (let i = 1; ; i++) {
    try {
      const resposta = await fetch(url);
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      return await resposta.json();
    } catch (erro) {
      if (i >= tentativas) throw new Error(`${url}: ${erro.message}`);
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

async function baixarPokemon(id) {
  const [p, especie] = await Promise.all([
    buscar(`${API}/pokemon/${id}`),
    buscar(`${API}/pokemon-species/${id}`),
  ]);
  const stats = {};
  for (const s of p.stats) stats[NOMES_STATS[s.stat.name]] = s.base_stat;
  const showdown = p.sprites.other?.showdown ?? {};

  return {
    id,
    nome: especie.names.find((n) => n.language.name === 'en')?.name ?? p.name,
    slug: p.name,
    tipos: [...p.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    stats,
    altura: p.height,
    peso: p.weight,
    experienciaBase: p.base_experience,
    taxaCaptura: especie.capture_rate,
    crescimento: especie.growth_rate?.name ?? null,
    lendario: especie.is_legendary,
    mitico: especie.is_mythical,
    bebe: especie.is_baby,
    evoluiDe: especie.evolves_from_species?.name ?? null,
    cadeiaEvolucao: Number(especie.evolution_chain.url.split('/').at(-2)),
    habilidades: p.abilities.map((a) => ({ nome: a.ability.name, oculta: a.is_hidden })),
    sprites: {
      frente: p.sprites.front_default,
      frenteShiny: p.sprites.front_shiny,
      costas: p.sprites.back_default,
      costasShiny: p.sprites.back_shiny,
      gif: showdown.front_default ?? null,
      gifShiny: showdown.front_shiny ?? null,
      gifCostas: showdown.back_default ?? null,
      gifCostasShiny: showdown.back_shiny ?? null,
    },
  };
}

async function baixarRegiao(regiao) {
  const [inicio, fim] = REGIOES[regiao];
  const ids = Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  const resultado = new Array(ids.length);
  let proximo = 0;
  let feitos = 0;

  async function trabalhador() {
    while (proximo < ids.length) {
      const i = proximo++;
      resultado[i] = await baixarPokemon(ids[i]);
      feitos++;
      process.stdout.write(`\r${regiao}: ${feitos}/${ids.length}`);
    }
  }
  await Promise.all(Array.from({ length: SIMULTANEOS }, trabalhador));

  const pasta = path.join(raiz, 'shared', 'data');
  await mkdir(pasta, { recursive: true });
  const arquivo = path.join(pasta, `pokemon-${regiao}.json`);
  await writeFile(arquivo, JSON.stringify(resultado, null, 1) + '\n');
  console.log(`\n${regiao}: salvo em ${path.relative(raiz, arquivo)}`);
}

const alvo = process.argv[2] ?? 'kanto';
const regioes = alvo === 'todas' ? Object.keys(REGIOES) : [alvo];
for (const r of regioes) {
  if (!REGIOES[r]) {
    console.error(`Região desconhecida: ${r}. Opções: ${Object.keys(REGIOES).join(', ')}, todas`);
    process.exit(1);
  }
  await baixarRegiao(r);
}
