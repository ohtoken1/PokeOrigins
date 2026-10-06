// Itens consumíveis do jogo: Pokébolas e remédios. Nomes em inglês (como os golpes),
// descrições em português. O efeito de captura de cada bola fica em shared/bolas.ts.
import { hpMaximo, ppMaximo, type PokemonIndividual } from './batalha/pokemon';

export type ItemId = string;

export interface Item {
  nome: string;
  descricao: string;
  categoria: 'bola' | 'remedio';
  /** Nome do arquivo da imagem na PokéAPI (remédios; as bolas usam os ícones do Showdown). */
  sprite?: string;
  /** HP recuperado ('total' = HP cheio). */
  cura?: number | 'total';
  /** Revive um Pokémon desmaiado com metade ou todo o HP. */
  reviver?: 'metade' | 'total';
  /** Sacred Ash: revive todo o time com HP cheio (só fora da batalha). */
  reviverTime?: boolean;
  /** Status curados ('todos' = qualquer um). */
  curaStatus?: string[] | 'todos';
  /** Recupera PP: de um golpe (o que mais gastou) ou de todos. */
  pp?: { quantidade: number | 'total'; todos: boolean };
}

const bola = (nome: string, descricao: string): Item => ({ nome, descricao, categoria: 'bola' });
const remedio = (nome: string, sprite: string, descricao: string, efeito: Partial<Item>): Item => ({ nome, sprite, descricao, categoria: 'remedio', ...efeito });
const TODOS = 'todos' as const;

export const ITENS: Record<ItemId, Item> = {
  // ---------- Pokébolas ----------
  pokeball: bola('Poké Ball', 'Bola básica para capturar Pokémon selvagens.'),
  greatball: bola('Great Ball', 'Chance de captura 1,5x.'),
  ultraball: bola('Ultra Ball', 'Chance de captura 2x.'),
  masterball: bola('Master Ball', 'Captura qualquer Pokémon selvagem sem falhar.'),
  premierball: bola('Premier Ball', 'Uma bola comemorativa. Mesma chance da Poké Ball.'),
  luxuryball: bola('Luxury Ball', 'Uma bola confortável. Mesma chance da Poké Ball.'),
  friendball: bola('Friend Ball', 'Uma bola amigável. Mesma chance da Poké Ball.'),
  healball: bola('Heal Ball', 'Mesma chance da Poké Ball, e o Pokémon capturado chega com HP e status curados.'),
  levelball: bola('Level Ball', 'Melhor quanto mais alto o nível do seu Pokémon em relação ao selvagem (até 8x).'),
  lureball: bola('Lure Ball', 'Chance de captura 4x no Mar Profundo.'),
  moonball: bola('Moon Ball', 'Chance de captura 4x em Pokémon que evoluem com Moon Stone.'),
  loveball: bola('Love Ball', 'Chance de captura 8x se o selvagem for da mesma espécie e do gênero oposto ao seu Pokémon.'),
  heavyball: bola('Heavy Ball', 'Melhor quanto mais pesado o Pokémon selvagem; pior nos leves.'),
  fastball: bola('Fast Ball', 'Chance de captura 4x em Pokémon com Speed base 100 ou mais.'),
  netball: bola('Net Ball', 'Chance de captura 3,5x em Pokémon dos tipos Água ou Inseto.'),
  diveball: bola('Dive Ball', 'Chance de captura 3,5x no Mar Profundo.'),
  nestball: bola('Nest Ball', 'Melhor quanto mais baixo o nível do selvagem (até 4x em nível 1; sem bônus do 30 em diante).'),
  repeatball: bola('Repeat Ball', 'Chance de captura 3,5x em espécies que você já tem.'),
  timerball: bola('Timer Ball', 'Fica melhor a cada turno da batalha, até 4x.'),
  quickball: bola('Quick Ball', 'Chance de captura 5x se usada no primeiro turno.'),
  duskball: bola('Dusk Ball', 'Chance de captura 3x em lugares escuros (Caverna Rochosa e Torre Assombrada).'),
  dreamball: bola('Dream Ball', 'Chance de captura 4x em Pokémon dormindo.'),
  beastball: bola('Beast Ball', 'Feita para Ultra Beasts (5x); em outros Pokémon a chance é muito baixa (0,1x).'),
  safariball: bola('Safari Ball', 'Chance de captura 1,5x.'),
  sportball: bola('Sport Ball', 'Chance de captura 1,5x.'),

  // ---------- Recuperar HP ----------
  potion: remedio('Potion', 'potion', 'Recupera 20 HP de um Pokémon.', { cura: 20 }),
  superpotion: remedio('Super Potion', 'super-potion', 'Recupera 60 HP de um Pokémon.', { cura: 60 }),
  hyperpotion: remedio('Hyper Potion', 'hyper-potion', 'Recupera 120 HP de um Pokémon.', { cura: 120 }),
  maxpotion: remedio('Max Potion', 'max-potion', 'Recupera todo o HP de um Pokémon.', { cura: 'total' }),
  fullrestore: remedio('Full Restore', 'full-restore', 'Recupera todo o HP e cura qualquer problema de status.', { cura: 'total', curaStatus: TODOS }),
  freshwater: remedio('Fresh Water', 'fresh-water', 'Água mineral. Recupera 30 HP de um Pokémon.', { cura: 30 }),
  sodapop: remedio('Soda Pop', 'soda-pop', 'Refrigerante gaseificado. Recupera 50 HP de um Pokémon.', { cura: 50 }),
  lemonade: remedio('Lemonade', 'lemonade', 'Limonada bem doce. Recupera 70 HP de um Pokémon.', { cura: 70 }),
  moomoomilk: remedio('Moomoo Milk', 'moomoo-milk', 'Leite muito nutritivo. Recupera 100 HP de um Pokémon.', { cura: 100 }),
  energypowder: remedio('Energy Powder', 'energy-powder', 'Pó amargo. Recupera 60 HP de um Pokémon.', { cura: 60 }),
  energyroot: remedio('Energy Root', 'energy-root', 'Raiz bem amarga. Recupera 120 HP de um Pokémon.', { cura: 120 }),

  // ---------- Reviver ----------
  revive: remedio('Revive', 'revive', 'Revive um Pokémon desmaiado com metade do HP.', { reviver: 'metade' }),
  maxrevive: remedio('Max Revive', 'max-revive', 'Revive um Pokémon desmaiado com todo o HP.', { reviver: 'total' }),
  revivalherb: remedio('Revival Herb', 'revival-herb', 'Erva muito amarga. Revive um Pokémon desmaiado com todo o HP.', { reviver: 'total' }),
  sacredash: remedio('Sacred Ash', 'sacred-ash', 'Revive todos os Pokémon desmaiados do time com todo o HP. Só fora da batalha.', { reviverTime: true }),

  // ---------- Curar status ----------
  antidote: remedio('Antidote', 'antidote', 'Cura um Pokémon envenenado.', { curaStatus: ['psn', 'tox'] }),
  burnheal: remedio('Burn Heal', 'burn-heal', 'Cura um Pokémon queimado.', { curaStatus: ['brn'] }),
  iceheal: remedio('Ice Heal', 'ice-heal', 'Descongela um Pokémon.', { curaStatus: ['frz'] }),
  awakening: remedio('Awakening', 'awakening', 'Acorda um Pokémon que está dormindo.', { curaStatus: ['slp'] }),
  paralyzeheal: remedio('Paralyze Heal', 'paralyze-heal', 'Cura um Pokémon paralisado.', { curaStatus: ['par'] }),
  fullheal: remedio('Full Heal', 'full-heal', 'Cura qualquer problema de status.', { curaStatus: TODOS }),
  healpowder: remedio('Heal Powder', 'heal-powder', 'Pó bem amargo. Cura qualquer problema de status.', { curaStatus: TODOS }),
  lavacookie: remedio('Lava Cookie', 'lava-cookie', 'Biscoito de Lavaridge. Cura qualquer problema de status.', { curaStatus: TODOS }),
  oldgateau: remedio('Old Gateau', 'old-gateau', 'Doce de Eterna. Cura qualquer problema de status.', { curaStatus: TODOS }),
  casteliacone: remedio('Casteliacone', 'casteliacone', 'Sorvete de Castelia. Cura qualquer problema de status.', { curaStatus: TODOS }),
  lumiosegalette: remedio('Lumiose Galette', 'lumiose-galette', 'Galette de Lumiose. Cura qualquer problema de status.', { curaStatus: TODOS }),
  shaloursable: remedio('Shalour Sable', 'shalour-sable', 'Biscoito de Shalour. Cura qualquer problema de status.', { curaStatus: TODOS }),
  bigmalasada: remedio('Big Malasada', 'big-malasada', 'Malasada de Alola. Cura qualquer problema de status.', { curaStatus: TODOS }),
  ragecandybar: remedio('Rage Candy Bar', 'rage-candy-bar', 'Doce de Mahogany. Cura qualquer problema de status.', { curaStatus: TODOS }),

  // ---------- Recuperar PP ----------
  ether: remedio('Ether', 'ether', 'Recupera 10 PP do golpe que mais gastou PP.', { pp: { quantidade: 10, todos: false } }),
  maxether: remedio('Max Ether', 'max-ether', 'Recupera todo o PP do golpe que mais gastou PP.', { pp: { quantidade: 'total', todos: false } }),
  elixir: remedio('Elixir', 'elixir', 'Recupera 10 PP de todos os golpes.', { pp: { quantidade: 10, todos: true } }),
  maxelixir: remedio('Max Elixir', 'max-elixir', 'Recupera todo o PP de todos os golpes.', { pp: { quantidade: 'total', todos: true } }),
};

export const ITENS_INICIAIS: Record<ItemId, number> = {
  pokeball: 20,
  greatball: 5,
  ultraball: 2,
  potion: 10,
  superpotion: 3,
  hyperpotion: 1,
  revive: 3,
  fullheal: 3,
};

/** Estado que um remédio lê/altera (serve para o save e para a batalha). */
export interface EstadoRemedio {
  hp: number;
  hpMax: number;
  status: string | null;
  golpes: { id: string; pp: number; ppMax: number }[];
}

const NOMES_STATUS: Record<string, string> = { brn: 'da queimadura', par: 'da paralisia', slp: 'do sono', frz: 'do congelamento', psn: 'do veneno', tox: 'do veneno' };

/**
 * Calcula o efeito de um remédio num Pokémon. Devolve o novo estado e a mensagem, ou null
 * se não teria efeito (nos jogos o item não é gasto nesse caso).
 */
export function aplicarRemedio(item: Item, alvo: EstadoRemedio, nome: string): { estado: EstadoRemedio; mensagem: string } | null {
  if (item.reviver) {
    if (alvo.hp > 0) return null;
    const hp = item.reviver === 'total' ? alvo.hpMax : Math.max(1, Math.floor(alvo.hpMax / 2));
    return { estado: { ...alvo, hp, status: null }, mensagem: `${nome} foi revivido!` };
  }
  if (alvo.hp <= 0) return null;

  const mensagens: string[] = [];
  let { hp, status } = alvo;
  let golpes = alvo.golpes;

  if (item.cura) {
    const novo = item.cura === 'total' ? alvo.hpMax : Math.min(alvo.hpMax, hp + item.cura);
    if (novo > hp) mensagens.push(`${nome} recuperou ${novo - hp} HP!`);
    hp = novo;
  }
  if (item.curaStatus && status && (item.curaStatus === TODOS || item.curaStatus.includes(status))) {
    mensagens.push(`${nome} foi curado ${NOMES_STATUS[status] ?? 'do status'}!`);
    status = null;
  }
  if (item.pp) {
    const quanto = (g: EstadoRemedio['golpes'][number]) => (item.pp!.quantidade === 'total' ? g.ppMax : Math.min(g.ppMax, g.pp + item.pp!.quantidade));
    if (item.pp.todos) {
      if (golpes.some((g) => g.pp < g.ppMax)) {
        golpes = golpes.map((g) => ({ ...g, pp: quanto(g) }));
        mensagens.push(`O PP dos golpes de ${nome} foi recuperado!`);
      }
    } else {
      const alvoPP = [...golpes].sort((a, b) => b.ppMax - b.pp - (a.ppMax - a.pp))[0];
      if (alvoPP && alvoPP.pp < alvoPP.ppMax) {
        golpes = golpes.map((g) => (g === alvoPP ? { ...g, pp: quanto(g) } : g));
        mensagens.push(`O PP de um golpe de ${nome} foi recuperado!`);
      }
    }
  }
  if (!mensagens.length) return null;
  return { estado: { hp, hpMax: alvo.hpMax, status, golpes }, mensagem: mensagens.join(' ') };
}

/** Usa um remédio num Pokémon fora da batalha. Devolve a mensagem, ou null se não teve efeito. */
export function usarRemedio(item: Item, p: PokemonIndividual, nome: string): string | null {
  const estado: EstadoRemedio = {
    hp: p.hp,
    hpMax: hpMaximo(p),
    status: p.status,
    golpes: p.golpes.map((g) => ({ id: g.id, pp: g.pp, ppMax: ppMaximo(g.id) })),
  };
  const r = aplicarRemedio(item, estado, nome);
  if (!r) return null;
  p.hp = r.estado.hp;
  p.status = r.estado.status;
  for (const g of p.golpes) g.pp = r.estado.golpes.find((x) => x.id === g.id)?.pp ?? g.pp;
  return r.mensagem;
}
