// Mecânicas "fora da batalha" dos jogos (pedido do dono): habilidades do PRIMEIRO do time que mudam o Pokémon
// selvagem e itens segurados/itens-chave que mudam XP, EVs, silver, evolução e shiny. Números iguais aos dos jogos,
// menos onde está escrito.
import { Dex } from '@pkmn/sim';
import { especie, type PokemonIndividual } from './batalha/pokemon';
import { ehLendario, sortearEncontro, type AjustesEncontro, type Encontro, type EntradaTabela } from './encontros';

// ---------- habilidades do primeiro do time ----------
/** Synchronize: chance de o selvagem vir com a mesma Nature. */
export const CHANCE_SYNCHRONIZE = 0.5;
/** Cute Charm: chance de o selvagem vir do gênero oposto. */
export const CHANCE_CUTE_CHARM = 2 / 3;
/** Pressure, Hustle e Vital Spirit: chance de o selvagem vir no nível mais alto da faixa. */
export const CHANCE_NIVEL_ALTO = 0.5;
export const HABILIDADES_NIVEL_ALTO = ['Pressure', 'Hustle', 'Vital Spirit'];
/** Intimidate e Keen Eye: chance de evitar selvagens pelo menos NIVEIS_ABAIXO níveis abaixo do primeiro do time. */
export const CHANCE_EVITAR_FRACOS = 0.5;
export const NIVEIS_ABAIXO = 5;
export const HABILIDADES_EVITAM_FRACOS = ['Intimidate', 'Keen Eye'];
/** Habilidades que puxam um tipo: chance de o selvagem ser desse tipo (se houver algum no mapa). */
export const CHANCE_PUXAR_TIPO = 0.5;
export const HABILIDADE_PUXA_TIPO: Record<string, string> = {
  Static: 'electric',
  'Lightning Rod': 'electric',
  'Magnet Pull': 'steel',
  'Flash Fire': 'fire',
  'Storm Drain': 'water',
  Harvest: 'grass',
};

type Lider = Pick<PokemonIndividual, 'habilidade' | 'nivel' | 'natureza' | 'genero'>;

/**
 * Sorteia o encontro com a habilidade do primeiro do time valendo. Devolve null quando o encontro foi evitado
 * (Intimidate/Keen Eye): nesse passo não aparece Pokémon. Shiny e lendário nunca são evitados.
 */
export function sortearEncontroComLider(tabela: EntradaTabela[], faixa: [number, number], lider: Lider | undefined, ajustes: AjustesEncontro, aleatorio = Math.random): Encontro | null {
  const habilidade = lider?.habilidade ?? '';
  let usada = tabela;
  let faixaUsada = faixa;
  const tipo = HABILIDADE_PUXA_TIPO[habilidade];
  if (tipo && aleatorio() < CHANCE_PUXAR_TIPO) {
    // só os desse tipo que aparecem na faixa de nível de agora; sem nenhum, o sorteio é o normal
    const doTipo = tabela.filter((e) => e.pokemon.tipos.includes(tipo) && e.nivelMin <= faixa[1] && e.nivelMax >= faixa[0]);
    if (doTipo.length) usada = doTipo;
  }
  if (HABILIDADES_NIVEL_ALTO.includes(habilidade) && aleatorio() < CHANCE_NIVEL_ALTO) faixaUsada = [faixa[1], faixa[1]];
  const encontro = sortearEncontro(usada, faixaUsada, aleatorio, ajustes);
  if (lider && HABILIDADES_EVITAM_FRACOS.includes(habilidade) && !encontro.shiny && !ehLendario(encontro.pokemon) && encontro.nivel <= lider.nivel - NIVEIS_ABAIXO && aleatorio() < CHANCE_EVITAR_FRACOS)
    return null;
  return encontro;
}

/** Synchronize e Cute Charm: mudam a Nature e o gênero do selvagem que acabou de nascer. */
export function aplicarLiderNoSelvagem(selvagem: PokemonIndividual, lider: Lider | undefined, aleatorio = Math.random): void {
  if (!lider) return;
  if (lider.habilidade === 'Synchronize' && aleatorio() < CHANCE_SYNCHRONIZE) selvagem.natureza = lider.natureza;
  if (lider.habilidade === 'Cute Charm' && lider.genero !== 'N' && selvagem.genero !== 'N' && !especie(selvagem.especieId).gender && aleatorio() < CHANCE_CUTE_CHARM)
    selvagem.genero = lider.genero === 'M' ? 'F' : 'M';
}

// ---------- itens segurados ----------
/** Itens de segurar nossos (não existem no Showdown: não vão para o simulador). */
export const LUCKY_EGG = 'luckyegg';
export const EVERSTONE = 'everstone';
export const AMULET_COIN = 'amuletcoin';
export const LUCK_INCENSE = 'luckincense';
export const MACHO_BRACE = 'machobrace';
/** Lucky Egg: XP do Pokémon que segura. */
export const MULT_LUCKY_EGG = 1.5;
/** Amulet Coin e Luck Incense (pedido do dono: +20%, não o dobro dos jogos): silver da batalha se quem segura entrou em campo. Não acumulam. */
export const MULT_SILVER_AMULETO = 1.2;
/** Power Items: +8 EVs no atributo por Pokémon derrotado (como nos jogos atuais). */
export const EVS_POWER_ITEM = 8;
export const POWER_ITEMS: Record<string, keyof PokemonIndividual['evs']> = { powerweight: 'hp', powerbracer: 'atk', powerbelt: 'def', powerlens: 'spa', powerband: 'spd', poweranklet: 'spe' };

export const multXpDoItem = (p: Pick<PokemonIndividual, 'item'>) => (p.item === LUCKY_EGG ? MULT_LUCKY_EGG : 1);
/** EVs que o Pokémon ganha por um derrotado, com o item que segura: Macho Brace dobra, Power Item soma 8 no atributo dele. */
export function evsComItem(p: Pick<PokemonIndividual, 'item'>, rendimento: Partial<PokemonIndividual['evs']>): PokemonIndividual['evs'] {
  const r = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  for (const a of Object.keys(r) as (keyof typeof r)[]) r[a] = (rendimento[a] ?? 0) * (p.item === MACHO_BRACE ? 2 : 1);
  const atributo = p.item ? POWER_ITEMS[p.item] : undefined;
  if (atributo) r[atributo] += EVS_POWER_ITEM;
  return r;
}
/** Silver da batalha: +20% se alguém que entrou em campo segura Amulet Coin ou Luck Incense. */
export const multSilverDoTime = (participantes: Pick<PokemonIndividual, 'item'>[]) => (participantes.some((p) => p.item === AMULET_COIN || p.item === LUCK_INCENSE) ? MULT_SILVER_AMULETO : 1);
/** Everstone: quem segura não evolui por nível nem por amizade. */
export const impedeEvolucao = (p: Pick<PokemonIndividual, 'item'>) => p.item === EVERSTONE;

// ---------- item-chave ----------
/**
 * Shiny Charm (item-chave, fora da loja; pedido do dono): é USADO como uma poção e dá +20% na chance de shiny por
 * 1 hora (relógio de verdade). Só um por vez: com o bônus ativo o item fica travado (não estende nem acumula).
 */
export const SHINY_CHARM = 'shinycharm';
export const MULT_SHINY_CHARM = 1.2;
export const DURACAO_SHINY_CHARM_MS = 60 * 60 * 1000;
export interface ComShinyCharm {
  itens: Record<string, number>;
  /** quando o bônus do Shiny Charm acaba (ms) */
  shinyCharmAte?: number | null;
}
export const shinyCharmAtivo = (save: Pick<ComShinyCharm, 'shinyCharmAte'>, agora = Date.now()) => (save.shinyCharmAte ?? 0) > agora;
/** Usa um Shiny Charm da bolsa. Devolve '' se usou, ou o motivo de não usar. */
export function usarShinyCharm(save: ComShinyCharm, agora = Date.now()): string {
  if (shinyCharmAtivo(save, agora)) return 'O Shiny Charm já está ativo. Espere acabar para usar outro.';
  if ((save.itens[SHINY_CHARM] ?? 0) < 1) return 'Você não tem Shiny Charm.';
  save.itens[SHINY_CHARM] -= 1;
  if (save.itens[SHINY_CHARM] <= 0) delete save.itens[SHINY_CHARM];
  save.shinyCharmAte = agora + DURACAO_SHINY_CHARM_MS;
  return '';
}

/** Run Away: fuga garantida de selvagem. */
export const fugaGarantida = (habilidade: string) => Dex.abilities.get(habilidade).id === 'runaway';
