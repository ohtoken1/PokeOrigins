// Expedição (regras em shared/expedicao.ts): manda Pokémon do time/PC, cobra a entrada e, na volta, entrega os itens
// como NT (`entregar` de ui/ticket.ts) e devolve os Pokémon ao time ou ao PC. Ainda no navegador, como o craft.
import { DURACOES_EXPEDICAO, POKEMON_POR_EXPEDICAO, PRECO_EXPEDICAO, PRECO_EXPEDICAO_VIP, faixaDoPower, premiosDaExpedicao } from '../../shared/expedicao';
import { power } from '../../shared/batalha/pokemon';
import { vipAtivo } from '../../shared/vip';
import { TAMANHO_MAXIMO_TIME, guardarNoPC, salvar, type PokemonDoJogador, type Save } from './estado';
import { entregar } from './ui/ticket';

export const precoDaExpedicao = (save: Save) => (vipAtivo(save) ? PRECO_EXPEDICAO_VIP : PRECO_EXPEDICAO);
export const powerDoGrupo = (lista: PokemonDoJogador[]) => lista.reduce((s, p) => s + power(p), 0);

/** Quem pode ir: Pokémon do time e do PC, sem ovos. */
export const candidatosDaExpedicao = (save: Save) => [...save.time, ...save.caixa].filter((p) => !p.ovo);

export function comecarExpedicao(save: Save, escolhidos: PokemonDoJogador[], horas: number): string | null {
  if (save.expedicao) return 'Já há uma expedição em andamento.';
  if (!DURACOES_EXPEDICAO.includes(horas)) return 'Duração inválida.';
  if (!escolhidos.length || escolhidos.length > POKEMON_POR_EXPEDICAO) return `Escolha de 1 a ${POKEMON_POR_EXPEDICAO} Pokémon.`;
  if (save.time.filter((p) => !escolhidos.includes(p)).length < 1) return 'Deixe pelo menos um Pokémon no time.';
  const preco = precoDaExpedicao(save);
  if (save.silver < preco) return 'Poké Dólares insuficientes.';
  save.silver -= preco;
  save.time = save.time.filter((p) => !escolhidos.includes(p));
  save.caixa = save.caixa.filter((p) => !escolhidos.includes(p));
  const agora = Date.now();
  const total = powerDoGrupo(escolhidos);
  save.expedicao = { pokemons: escolhidos, inicio: agora, fim: agora + horas * 3_600_000, horas, faixa: faixaDoPower(total), power: total };
  salvar(save);
  return null;
}

/** Busca a expedição que já voltou: itens NT na bolsa e Pokémon de volta. Devolve as frases do que veio. */
export function buscarExpedicao(save: Save): string[] | null {
  const e = save.expedicao;
  if (!e || Date.now() < e.fim) return null;
  const itens = premiosDaExpedicao(e.faixa, e.horas);
  const frases = entregar(save, { raridade: 'comum', shiny: [], pacote: Object.entries(itens).map(([id, quantidade]) => ({ tipo: 'item' as const, id, quantidade })) }, { nt: true });
  for (const p of e.pokemons) {
    delete p.box;
    if (save.time.length < TAMANHO_MAXIMO_TIME) save.time.push(p);
    else guardarNoPC(save, p);
  }
  delete save.expedicao;
  salvar(save);
  return frases;
}
