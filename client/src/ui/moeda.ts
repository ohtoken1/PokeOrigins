// Valor com a moedinha na frente (pedido do dono: ver o desenho e saber de qual moeda é, sem ler o nome).
// Usar em preços, saldos e recompensas; o nome por extenso fica só em frases e no `title`.
import { nomeDaMoeda, type Moeda } from '../../../shared/moedas';
import { el } from './dom';

/** Moedas da Liga (saldos do save): desenho próprio, nome fixo. */
const NOMES_LIGA: Record<string, string> = { leagueCoins: 'League Coins', leagueCoinsNightmare: 'League Coins Nightmare' };
export type MoedaComDesenho = Moeda | 'leagueCoins' | 'leagueCoinsNightmare';

export const valorEmMoeda = (moeda: MoedaComDesenho, valor: number): HTMLElement =>
  el('span', { class: 'banco-moeda', title: `${valor.toLocaleString('pt-BR')} ${NOMES_LIGA[moeda] ?? nomeDaMoeda(moeda, valor)}` }, el('span', { class: `icone-moeda moeda-${moeda}` }), el('strong', {}, valor.toLocaleString('pt-BR')));
