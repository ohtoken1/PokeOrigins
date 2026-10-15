// Temporadas do passe de batalha: as recompensas de cada nível (trilha grátis e premium). Conteúdo = planilha do
// dono ("Passe de batalha.xlsx", uma por mês). O XP continua vindo só das missões diárias (shared/passe.ts).
// Prêmios no mesmo formato dos tickets/Orbs (shared/tickets.ts), mais o título.
import { NIVEIS_PASSE } from './passe';
import type { Premio } from './tickets';

export interface TemporadaPasse {
  /** muda a cada temporada (o progresso do save é zerado quando muda) */
  id: string;
  nome: string;
  /** fim da temporada (ms). A temporada em vigor é a primeira da lista que ainda não acabou. */
  fim: number;
  /** recompensa de cada nível (posição 0 = nível 1) */
  gratis: Premio[];
  premium: Premio[];
}

/** Item que libera a trilha premium da temporada em vigor (usado pela bolsa). Por enquanto só a staff entrega. */
export const PASSE_PREMIUM = 'passe-premium';

// Pokémon do passe (decisão provisória: nível 1, como os de Orb e de ovo; IVs normais; 5% de chance de shiny)
const pokemon = (especie: number): Premio => ({ tipo: 'pokemon', especie, nivel: 1, chanceShiny: 0.05, ivMinimo: 0 });
const item = (id: string, quantidade = 1): Premio => ({ tipo: 'item', id, quantidade });
const silver = (quantidade: number): Premio => ({ tipo: 'silver', quantidade });
const gold = (quantidade: number): Premio => ({ tipo: 'gold', quantidade });
const bolas = (quantidade: number): Premio => ({ tipo: 'aleatorio', grupo: 'bola', quantidade });
const berries = (quantidade: number): Premio => ({ tipo: 'aleatorio', grupo: 'fruta', quantidade });
const apricorns = (quantidade: number): Premio => ({ tipo: 'aleatorio', grupo: 'apricorn', quantidade });
const energies = (quantidade: number): Premio => ({ tipo: 'aleatorio', grupo: 'energia', quantidade });
const charm = (): Premio => ({ tipo: 'aleatorio', grupo: 'charm', quantidade: 1 });

const BULBASAUR = 1;
const SQUIRTLE = 7;
const CHARMANDER = 4;
const FLOETTE_ETERNAL = 10061;

/** Fim de um mês no horário de Brasília (meia-noite do dia 1º do mês seguinte = 03:00 UTC). */
const fimDoMes = (ano: number, mes: number) => Date.UTC(ano, mes, 1, 3);

export const TEMPORADAS_PASSE: TemporadaPasse[] = [
  {
    id: '2026-11',
    nome: 'Passe de novembro',
    fim: fimDoMes(2026, 11),
    gratis: [
      item('ultraball', 25), berries(20), silver(50_000), apricorns(15), bolas(20), energies(20), item('abilitycapsule'), berries(20), silver(50_000), apricorns(15),
      bolas(20), energies(20), pokemon(BULBASAUR), berries(20), silver(50_000), apricorns(15), bolas(20), energies(20), pokemon(SQUIRTLE), berries(20),
      silver(50_000), apricorns(15), bolas(20), energies(20), pokemon(CHARMANDER), berries(20), silver(50_000), apricorns(15), bolas(20), item('ovo-misterioso-s'),
    ],
    premium: [
      { tipo: 'titulo', id: 'passe-nov26' }, energies(30), gold(50), berries(30), pokemon(FLOETTE_ETERNAL), item('abilitycapsule'), apricorns(35), bolas(30), gold(50), pokemon(BULBASAUR),
      item('ticket-palkia', 5), item('abilitypatch'), charm(), energies(30), gold(50), pokemon(SQUIRTLE), item('ticket-dialga', 5), item('ovo-lendario'), bolas(30), item('rotomcatalog'),
      gold(50), pokemon(CHARMANDER), item('ticket-giratina', 5), berries(30), pokemon(FLOETTE_ETERNAL), charm(), gold(50), apricorns(35), item('ticket-arceus', 3), item('skin-passe-nov26'),
    ],
  },
];

// confere a planilha: cada trilha tem um prêmio por nível
for (const t of TEMPORADAS_PASSE)
  if (t.gratis.length !== NIVEIS_PASSE || t.premium.length !== NIVEIS_PASSE) throw new Error(`Passe ${t.id}: precisa de ${NIVEIS_PASSE} prêmios em cada trilha`);

/** A temporada em vigor (a primeira que ainda não acabou), ou null se não há nenhuma cadastrada para agora. */
export const temporadaAtual = (agora = Date.now()): TemporadaPasse | null => TEMPORADAS_PASSE.find((t) => t.fim > agora) ?? null;
