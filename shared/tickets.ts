// Tickets: itens raros que, ao abrir, sorteiam uma RARIDADE (comum, raro, épico, lendário) e depois um prêmio
// dessa raridade. Ex.: Ticket de Kyogre → no lendário vem Kyogre (pode ser shiny) + Blue Orb (Primal Kyogre).
// Fica em shared/ porque, no MMO, quem sorteia é o servidor. Conteúdo dos tickets: o dono vai definir; os
// prêmios abaixo são um rascunho fácil de trocar.

export type Raridade = 'comum' | 'raro' | 'epico' | 'lendario';

/** Chance de cada raridade ao abrir um ticket (soma 1). */
export const RARIDADES: { id: Raridade; nome: string; chance: number }[] = [
  { id: 'comum', nome: 'Comum', chance: 0.7 },
  { id: 'raro', nome: 'Raro', chance: 0.22 },
  { id: 'epico', nome: 'Épico', chance: 0.07 },
  { id: 'lendario', nome: 'Lendário', chance: 0.01 },
];

/** Chance de ganhar um ticket (sorteado entre os existentes) ao vencer ou capturar um selvagem. */
export const CHANCE_TICKET_POR_BATALHA = 1 / 1000;

/** Um prêmio: item (id da bolsa), silver ou Pokémon. */
export type Premio =
  | { tipo: 'item'; id: string; quantidade: number }
  | { tipo: 'silver'; quantidade: number }
  | { tipo: 'pokemon'; especie: number; nivel: number; chanceShiny: number };

/** Um pacote sai inteiro (ex.: Kyogre + Blue Orb). Dentro de uma raridade, todos os pacotes têm a mesma chance. */
export type Pacote = Premio[];

export interface Ticket {
  /** id na bolsa */
  id: string;
  nome: string;
  descricao: string;
  premios: Record<Raridade, Pacote[]>;
}

export const TICKETS: Ticket[] = [
  {
    id: 'ticket-kyogre',
    nome: 'Ticket de Kyogre',
    descricao: 'Abra para sortear um prêmio. No lendário: Kyogre (pode vir shiny) com a Blue Orb, que o transforma em Primal Kyogre.',
    premios: {
      comum: [[{ tipo: 'item', id: 'diveball', quantidade: 5 }], [{ tipo: 'item', id: 'superpotion', quantidade: 5 }], [{ tipo: 'silver', quantidade: 100 }]],
      raro: [[{ tipo: 'item', id: 'ultraball', quantidade: 5 }], [{ tipo: 'item', id: 'maxrevive', quantidade: 2 }], [{ tipo: 'silver', quantidade: 300 }]],
      epico: [[{ tipo: 'item', id: 'mysticwater', quantidade: 1 }], [{ tipo: 'item', id: 'masterball', quantidade: 1 }]],
      lendario: [
        [
          { tipo: 'pokemon', especie: 382, nivel: 50, chanceShiny: 1 / 20 },
          { tipo: 'item', id: 'blueorb', quantidade: 1 },
        ],
      ],
    },
  },
];

/** Itens que não são vendidos na loja, mas podem sair de tickets (orbes e itens de forma de lendários). */
export const ITENS_ESPECIAIS = ['blueorb', 'redorb', 'griseousorb', 'griseouscore'];

export function ticketPorId(id: string): Ticket | undefined {
  return TICKETS.find((t) => t.id === id);
}

export interface ResultadoTicket {
  raridade: Raridade;
  pacote: Pacote;
  /** shiny sorteado para cada prêmio de Pokémon (mesma posição do pacote) */
  shiny: boolean[];
}

/** Sorteia a raridade (só entre as que têm prêmio) e depois um pacote dela. */
export function abrirTicket(ticket: Ticket, aleatorio = Math.random): ResultadoTicket {
  const possiveis = RARIDADES.filter((r) => ticket.premios[r.id].length);
  const total = possiveis.reduce((s, r) => s + r.chance, 0);
  let sorteio = aleatorio() * total;
  let raridade = possiveis[possiveis.length - 1].id;
  for (const r of possiveis) {
    sorteio -= r.chance;
    if (sorteio < 0) {
      raridade = r.id;
      break;
    }
  }
  const pacotes = ticket.premios[raridade];
  const pacote = pacotes[Math.floor(aleatorio() * pacotes.length)];
  return { raridade, pacote, shiny: pacote.map((p) => p.tipo === 'pokemon' && aleatorio() < p.chanceShiny) };
}

/** Sorteia qual ticket cai numa batalha (null = nenhum). */
export function sortearTicketDaBatalha(aleatorio = Math.random): Ticket | null {
  if (!TICKETS.length || aleatorio() >= CHANCE_TICKET_POR_BATALHA) return null;
  return TICKETS[Math.floor(aleatorio() * TICKETS.length)];
}
