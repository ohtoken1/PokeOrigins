// Safari (shared/safari.ts): entra pelo servidor (ele conta as entradas do dia e cobra o gold), sorteia os
// Pokémon das 3 salas e guarda o andamento no save (recarregar a página continua de onde parou).
import { BIOMAS, biomaPorId, type Bioma } from '../../shared/biomas';
import { AJUSTES_PADRAO, CHANCE_SHINY, ajustarTabela, faixaDosEncontros, montarTabelaDoTipo, sortearEncontro, type AjustesEncontro } from '../../shared/encontros';
import { MULT_RAROS_SAFARI, POKEMON_POR_SALA, SALAS_SAFARI, diaDoSafari, entradasUsadas, lerSafariAberto, ticketComprado, ticketsDoDia, type PokemonSafari, type SafariAberto } from '../../shared/safari';
import { nivelTreinador } from '../../shared/treinador';
import { vipAtivo } from '../../shared/vip';
import { ehAdministrador } from './bonificacao';
import { api } from './conta';
import { todosOsPokemons } from './dados';
import { adotarSaveDoServidor, carregarSave, salvar, salvarAgora, type Save } from './estado';

/**
 * Chances do Safari: shiny e raros 10× os dos mapas, e SÓ isso — os bônus do jogador (VIP, Pokédex, skins,
 * charms, conquistas, bonificação da staff) e os ajustes do painel Admin não entram (pedido do dono).
 */
export const AJUSTES_SAFARI: AjustesEncontro = { ...AJUSTES_PADRAO, chanceShiny: CHANCE_SHINY * MULT_RAROS_SAFARI, multLendario: MULT_RAROS_SAFARI, multInicial: MULT_RAROS_SAFARI };

/** O visual da sala (chão, árvores, fundo da batalha) vem do bioma que tem o tipo; Flying fica nos Campos Verdes. */
export const biomaDoTipo = (tipo: string): Bioma => BIOMAS.find((b) => b.tipos.includes(tipo)) ?? biomaPorId('grama');

/** Safari em andamento do jogador (null = não está em um). */
export const safariAberto = (save: Save | null = carregarSave()): SafariAberto | null => lerSafariAberto(save?.safari);

/** Tickets de hoje: quantos restam, o total e se o extra já foi comprado (administrador entra sempre, sem gastar). */
export function ticketsDeHoje(save: Save): { restam: number; total: number; comprada: boolean; livre: boolean } {
  const hoje = diaDoSafari(Date.now());
  const comprada = ticketComprado(save.safari, hoje);
  return { ...ticketsDoDia(entradasUsadas(save.safari, hoje), vipAtivo(save), comprada), comprada, livre: ehAdministrador() };
}

/** Compra o ticket extra de hoje (o servidor cobra o gold no save guardado, por isso salva antes). */
export async function comprarTicketDoSafari(): Promise<void> {
  await salvarAgora();
  const r = await api<{ save: Save; versao: number }>('POST', '/safari/comprar');
  adotarSaveDoServidor(r.save, r.versao);
}

/** Sorteia os 10 Pokémon de cada sala: todos os do tipo, de qualquer região, na faixa de nível do treinador. */
function sortearSalas(save: Save, tipo: string): PokemonSafari[][] {
  const tabela = ajustarTabela(montarTabelaDoTipo(tipo, todosOsPokemons()), AJUSTES_SAFARI);
  const faixa = faixaDosEncontros(biomaDoTipo(tipo), nivelTreinador(save.xpTreinador), save.nivelEncontro);
  return Array.from({ length: SALAS_SAFARI }, () =>
    Array.from({ length: POKEMON_POR_SALA }, () => {
      const e = sortearEncontro(tabela, faixa, Math.random, AJUSTES_SAFARI);
      return { id: e.pokemon.id, nivel: e.nivel, shiny: e.shiny };
    }));
}

/** Garante que o Safari em andamento tem as salas sorteadas (o servidor abre sem elas). */
export function prepararSafari(save: Save): SafariAberto | null {
  const aberto = safariAberto(save);
  if (!aberto) return null;
  const completo = aberto.salas.length === SALAS_SAFARI && aberto.salas.every((s) => Array.isArray(s) && s.length === POKEMON_POR_SALA);
  if (!completo) {
    aberto.salas = sortearSalas(save, aberto.tipo);
    save.safari = { ...save.safari!, aberto };
    salvar(save);
  }
  return aberto;
}

/** Entra num Safari do tipo (o servidor confere a entrada no save guardado, por isso salva antes). */
export async function entrarNoSafari(tipo: string): Promise<void> {
  await salvarAgora();
  const r = await api<{ save: Save; versao: number }>('POST', '/safari/entrar', { tipo });
  adotarSaveDoServidor(r.save, r.versao);
  const save = carregarSave();
  if (save) prepararSafari(save);
}

/** Guarda o andamento (sala e se já batalhou nela). */
export function guardarSafari(save: Save, aberto: SafariAberto): void {
  save.safari = { ...save.safari!, aberto };
  salvar(save);
}

/** Termina o Safari (saiu pela última porta, desistiu ou perdeu a batalha). */
export function fecharSafari(save: Save): void {
  if (!save.safari) return;
  const { aberto: _aberto, ...resto } = save.safari;
  save.safari = resto;
  salvar(save);
}
