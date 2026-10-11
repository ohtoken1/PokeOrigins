// Conquistas: a lista vem da planilha do dono ("Conquistas PokeOrigins"). Aqui ficam o nome, a descrição e a
// recompensa de cada uma; quem confere o progresso é o jogo (client/src/conquistas.ts).
// Só entram as que dependem de sistemas que já existem: torneios, Liga, Safari, breeding, farming, craft,
// monotype, bosses, baú, mercado negro, selos sazonais, Dynamax, doação/VIP, Discord e tutorial entram quando
// cada sistema chegar (pedido do dono: um por um).
// Sem imports: o servidor usa este arquivo para mostrar o título no perfil.

/** Bônus permanentes que as conquistas dão (frações: 0.05 = +5%). */
export type AlvoBonusConquista = 'silver' | 'raros' | 'captura';

export type RecompensaConquista =
  | { tipo: 'bonus'; alvo: AlvoBonusConquista; valor: number }
  | { tipo: 'item'; id: string; nome: string; quantidade: number }
  | { tipo: 'silver'; quantidade: number }
  | { tipo: 'fragmentos'; quantidade: number }
  | { tipo: 'titulo'; titulo: string };

export type GrupoConquista = 'ginasios' | 'pokedex' | 'shiny' | 'capturas' | 'batalhas' | 'riqueza' | 'treinador' | 'jornada' | 'colecao';
export const GRUPOS_CONQUISTA: { id: GrupoConquista; nome: string }[] = [
  { id: 'ginasios', nome: 'Ginásios' },
  { id: 'pokedex', nome: 'Pokédex' },
  { id: 'shiny', nome: 'Pokédex shiny' },
  { id: 'capturas', nome: 'Capturas raras' },
  { id: 'batalhas', nome: 'Batalhas' },
  { id: 'treinador', nome: 'Treinador' },
  { id: 'riqueza', nome: 'Riqueza' },
  { id: 'jornada', nome: 'Jornada' },
  { id: 'colecao', nome: 'Coleção de conquistas' },
];

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  grupo: GrupoConquista;
  recompensa: RecompensaConquista;
  /** região da conquista (ginásios e Pokédex por região) */
  regiao?: string;
  /** conquistas "conclua X% das conquistas": a fração */
  parte?: number;
}

/** O que o save guarda. */
export interface EstadoConquistas {
  /** id da conquista → quando foi concluída (ms) */
  feitas: Record<string, number>;
  /** coisas feitas uma vez que o save não mostra sozinho (usou um cubo, mega evoluiu…) */
  marcas: Record<string, number>;
}

/** As regiões na ordem do jogo (igual a shared/regioes.ts). */
export const REGIOES_DAS_CONQUISTAS: [string, string][] = [
  ['kanto', 'Kanto'],
  ['johto', 'Johto'],
  ['hoenn', 'Hoenn'],
  ['sinnoh', 'Sinnoh'],
  ['unova', 'Unova'],
  ['kalos', 'Kalos'],
  ['alola', 'Alola'],
  ['galar', 'Galar'],
  ['paldea', 'Paldea'],
];

const silver = (valor: number): RecompensaConquista => ({ tipo: 'bonus', alvo: 'silver', valor });
const raros = (valor: number): RecompensaConquista => ({ tipo: 'bonus', alvo: 'raros', valor });
const captura = (valor: number): RecompensaConquista => ({ tipo: 'bonus', alvo: 'captura', valor });
const item = (id: string, nome: string, quantidade = 1): RecompensaConquista => ({ tipo: 'item', id, nome, quantidade });
const titulo = (nome: string): RecompensaConquista => ({ tipo: 'titulo', titulo: nome });
const c = (id: string, grupo: GrupoConquista, nome: string, descricao: string, recompensa: RecompensaConquista, extra: Partial<Conquista> = {}): Conquista => ({ id, grupo, nome, descricao, recompensa, ...extra });

export const CONQUISTAS: Conquista[] = [
  // ---- ginásios: 5% de silver cada (50% no total)
  ...REGIOES_DAS_CONQUISTAS.map(([id, nome]) =>
    c(`ginasios-${id}`, 'ginasios', `${nome} é fichinha`, id === 'alola' ? 'Conclua todos os desafios das ilhas da região de Alola.' : `Conclua todos os ginásios da região de ${nome}.`, silver(0.05), { regiao: id })),
  c('ginasios-todos', 'ginasios', 'Poke Origins é fichinha', 'Vença todos os ginásios.', silver(0.05)),

  // ---- Pokédex: 1% de shiny, lendários e iniciais cada (10% no total)
  ...REGIOES_DAS_CONQUISTAS.map(([id, nome]) => c(`dex-${id}`, 'pokedex', `Já vi de tudo em ${nome}`, `Capture 100% da Pokédex de ${nome}.`, raros(0.01), { regiao: id })),
  c('dex-todos', 'pokedex', 'Já vi de tudo no Poke Origins', 'Capture 100% dos Pokémon do jogo.', raros(0.01)),

  // ---- Pokédex shiny (só os comuns): 1% cada (10% no total)
  ...REGIOES_DAS_CONQUISTAS.map(([id, nome]) =>
    c(`shiny-${id}`, 'shiny', `Já vi tudo colorido em ${nome}`, `Capture todas as versões shiny da região de ${nome} (Pokémon comuns).`, raros(0.01), { regiao: id })),
  c('shiny-todos', 'shiny', 'Já vi tudo colorido no Poke Origins', 'Capture 100% dos Pokémon comuns shiny.', raros(0.01)),

  // ---- capturas raras
  c('pokemon-splus', 'capturas', 'Pokemon S+', 'Capture um Pokémon S+.', item('masterball', 'Master Ball')),
  c('shiny-splus', 'capturas', 'Shiny S+', 'Capture um shiny S+.', item('ovo-lendario', 'Ovo Lendário')),
  c('lendario-ultraball', 'capturas', 'Na ultraball?', 'Capture um lendário na Ultra Ball.', item('masterball', 'Master Ball')),
  c('lendario-s', 'capturas', 'Lendário S', 'Consiga um lendário S (recebido em troca não conta).', item('ovo-lendario', 'Ovo Lendário')),
  c('lendario-shiny', 'capturas', 'Lendario Shiny', 'Consiga um lendário shiny (recebido em troca não conta).', titulo('1 em 1.000.000')),
  c('lendario-escapou', 'capturas', 'Por que o arceus não entra na pokebola?', 'Derrote ou deixe um Pokémon lendário fugir.', item('masterball', 'Master Ball')),
  c('ovo-lendario', 'capturas', 'Isso era pra vir aqui?', 'Ganhe um lendário no Ovo Misterioso.', item('ovo-misterioso-s', 'Ovo Misterioso S')),

  // ---- batalhas
  c('duelos-todos', 'batalhas', '50/50', 'Vença todos os treinadores no "Duelos com treinadores".', silver(0.1)),
  c('mega', 'batalhas', 'Mega evolução', 'Mega evolua um Pokémon em batalha.', captura(0.01)),
  c('tera', 'batalhas', 'Terastall', 'Terastalize o Pokémon uma vez em batalha.', captura(0.01)),
  c('nivel-100', 'batalhas', 'Level 100', 'Evolua um Pokémon para o level 100.', captura(0.01)),
  c('time-100', 'batalhas', 'Time level 100', 'Evolua 6 Pokémon para o level 100.', captura(0.01)),

  // ---- nível de treinador
  c('treinador-5', 'treinador', 'Treinador iniciante', 'Alcance o nível 5 de treinador.', item('ovo-misterioso', 'Ovo Misterioso')),
  c('treinador-10', 'treinador', 'Treinador intermediário', 'Alcance o nível 10 de treinador.', item('ovo-inicial-a', 'Ovo Inicial A')),
  c('treinador-15', 'treinador', 'Treinador avançado', 'Alcance o nível 15 de treinador.', item('masterball', 'Master Ball')),
  c('treinador-20', 'treinador', 'Treinador mestre', 'Alcance o nível 20 de treinador.', item('ovo-lendario', 'Ovo Lendário')),
  c('treinador-25', 'treinador', 'Mestre pokemon', 'Alcance o nível 25 de treinador.', item('ovo-lendario-s', 'Ovo Lendário S')),

  // ---- riqueza: silver dá bônus (10% no total), gold dá títulos
  c('silver-500k', 'riqueza', 'Rico', 'Tenha 500 mil de silver.', silver(0.01)),
  c('silver-1kk', 'riqueza', 'Milionario', 'Tenha 1 milhão de silver.', silver(0.02)),
  c('silver-50kk', 'riqueza', 'Multimilionario', 'Tenha 50 milhões de silver.', silver(0.07)),
  c('gold-500', 'riqueza', 'Rico (Gold)', 'Tenha 500 de gold.', titulo('CLT')),
  c('gold-1000', 'riqueza', 'Milionario (Gold)', 'Tenha 1.000 de gold.', titulo('Patrão')),
  c('gold-10000', 'riqueza', 'Multimilionario (Gold)', 'Tenha 10.000 de gold.', titulo('Burguesia')),

  // ---- jornada
  c('charmeiro', 'jornada', 'Charmeiro', 'Use um Charm uma vez.', captura(0.01)),
  c('galante', 'jornada', 'Galante', 'Use todos os tipos de Charm uma vez.', item('skin-galante', 'Skin Galante (NT)')),
  c('cubo-passado', 'jornada', 'Isso não tava extinto?', 'Utilize um cubo da versão passado.', { tipo: 'fragmentos', quantidade: 5 }),
  c('cubo-futuro', 'jornada', 'Isso é um robô?', 'Utilize um cubo da versão futuro.', { tipo: 'fragmentos', quantidade: 5 }),
  c('ticket-epico', 'jornada', 'Sorte?', 'Consiga um prêmio épico no sistema de tickets.', item('ticket-arceus', 'Ticket de Arceus')),
  c('ticket-lendario', 'jornada', 'Homem de sorte', 'Consiga um prêmio lendário no sistema de tickets.', item('ticket-arceus', 'Ticket de Arceus', 10)),
  c('ticket-mitico', 'jornada', 'Ganhei na loteria', 'Consiga um prêmio mítico no sistema de tickets.', titulo('P2W')),
  c('trem-1', 'jornada', 'Viajante', 'Viaje de trem uma vez.', { tipo: 'silver', quantidade: 50_000 }),
  c('trem-todas', 'jornada', 'Viajado', 'Viaje por todas as regiões de trem.', item('skin-indianajones', 'Skin Indiana Jones (NT)')),
  c('guilda-entrar', 'jornada', 'União', 'Entre em uma guilda.', titulo('Membro de guilda')),
  c('guilda-criar', 'jornada', 'Lider da união', 'Crie uma guilda.', titulo('Líder de guilda')),
  c('guilda-max', 'jornada', 'União max', 'Esteja em uma guilda de nível máximo.', item('ovo-misterioso-a', 'Ovo Misterioso A')),

  // ---- coleção: parte das outras conquistas concluídas
  c('conquistas-25', 'colecao', '25%', 'Conclua 25% das conquistas.', item('ovo-inicial-a', 'Ovo Inicial A'), { parte: 0.25 }),
  c('conquistas-50', 'colecao', '50%', 'Conclua 50% das conquistas.', item('ovo-lendario-a', 'Ovo Lendário A'), { parte: 0.5 }),
  c('conquistas-75', 'colecao', '75%', 'Conclua 75% das conquistas.', item('ovo-lendario-s', 'Ovo Lendário S'), { parte: 0.75 }),
  c('conquistas-100', 'colecao', '100%', 'Conclua 100% das conquistas.', item('ovo-lendario-splus', 'Ovo Lendário S+'), { parte: 1 }),
];

export const conquistaPorId = (id: string): Conquista | undefined => CONQUISTAS.find((x) => x.id === id);
/** As que contam para "conclua X% das conquistas" (todas menos as da própria coleção). */
export const CONQUISTAS_CONTADAS = CONQUISTAS.filter((x) => x.parte === undefined);

type ComConquistas = { conquistas?: Partial<EstadoConquistas> | null; titulo?: unknown };
const feitasDe = (s: ComConquistas): Record<string, number> => (s.conquistas && typeof s.conquistas === 'object' && s.conquistas.feitas && typeof s.conquistas.feitas === 'object' ? s.conquistas.feitas : {});
export const conquistaFeita = (s: ComConquistas, id: string): boolean => !!feitasDe(s)[id];

/** Soma dos bônus permanentes das conquistas concluídas. */
export function bonusDasConquistas(s: ComConquistas): Record<AlvoBonusConquista, number> {
  const total = { silver: 0, raros: 0, captura: 0 };
  const feitas = feitasDe(s);
  for (const x of CONQUISTAS) if (x.recompensa.tipo === 'bonus' && feitas[x.id]) total[x.recompensa.alvo] += x.recompensa.valor;
  // contas com frações (0.01 + 0.02…) deixam restos: arredonda em milésimos
  for (const k of Object.keys(total) as AlvoBonusConquista[]) total[k] = Math.round(total[k] * 1000) / 1000;
  return total;
}
/** Multiplicador de um bônus das conquistas (1 = nenhum). */
export const multConquistas = (s: ComConquistas, alvo: AlvoBonusConquista) => 1 + bonusDasConquistas(s)[alvo];

const pct = (v: number) => `${(Math.round(v * 1000) / 10).toLocaleString('pt-BR')}%`;
const TEXTO_BONUS: Record<AlvoBonusConquista, string> = {
  silver: 'de silver em batalhas',
  raros: 'de chance de shiny, lendários e iniciais',
  captura: 'de chance de captura',
};
export function textoRecompensa(r: RecompensaConquista): string {
  if (r.tipo === 'bonus') return `+${pct(r.valor)} ${TEXTO_BONUS[r.alvo]}`;
  if (r.tipo === 'item') return `${r.quantidade}x ${r.nome}`;
  if (r.tipo === 'silver') return `${r.quantidade.toLocaleString('pt-BR')} de silver`;
  if (r.tipo === 'fragmentos') return `${r.quantidade}x Fragmento Temporal`;
  return `Título "${r.titulo}"`;
}

// ---- títulos (por enquanto só aparecem no perfil)
export interface Titulo {
  /** id da conquista que libera */
  id: string;
  nome: string;
  /** como libera (nome da conquista) */
  conquista: string;
}
export const TITULOS: Titulo[] = CONQUISTAS.flatMap((x) => (x.recompensa.tipo === 'titulo' ? [{ id: x.id, nome: x.recompensa.titulo, conquista: x.nome }] : []));
/** O título em uso: só vale se foi escolhido e a conquista dele está concluída. */
export function tituloAtivo(s: ComConquistas): string | null {
  const t = typeof s.titulo === 'string' ? TITULOS.find((x) => x.id === s.titulo) : undefined;
  return t && conquistaFeita(s, t.id) ? t.nome : null;
}
