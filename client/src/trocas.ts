// Trocas entre jogadores (lado do jogo). Quem decide e faz a troca é o servidor (server/src/trocas.ts);
// aqui ficam as chamadas, a chave que libera o sistema e o vigia dos convites.
import { api } from './conta';
import { ehAdministrador } from './bonificacao';
import type { PokemonAnunciado } from '../../shared/mercado';

/**
 * Liga as trocas para todos (pedido do dono: abriram junto com a interação com os outros jogadores no mapa:
 * clicar no boneco → Trocar). Desligado, só administradores testam (painel ⚙ Admin).
 */
export const TROCAS_LIBERADAS = true;
export const trocasDisponiveis = () => TROCAS_LIBERADAS || ehAdministrador();

/** Um Pokémon na janela de troca: o que o servidor deixa ver (`verPokemon` de shared/mercado.ts) e o uid. */
export interface PokemonNaTroca extends PokemonAnunciado {
  uid: number;
}
export interface Oferta<P = number> {
  pokemons: P[];
  itens: Record<string, number>;
  silver: number;
  gold: number;
}
export interface LadoTroca {
  usuario: string;
  confirmado: boolean;
  trocar: boolean;
  oferta: Oferta<PokemonNaTroca>;
}
export interface Troca {
  id: string;
  status: 'convite' | 'aberta' | 'feita' | 'cancelada';
  motivo: string | null;
  souConvidado: boolean;
  eu: LadoTroca;
  outro: LadoTroca;
}
export interface EstadoTrocas {
  troca: Troca | null;
  convites: { id: string; de: string }[];
}

/**
 * Pokémon (uid) da MINHA oferta na troca aberta (ui/troca.ts mantém): o PC não solta nem tira o item deles, e a bolsa e o
 * Homem Suspeito não mexem neles. O servidor também recusa a troca se um deles mudar depois da confirmação.
 */
const emOferta = new Set<number>();
export const estaNaTroca = (uid: number | undefined): boolean => uid !== undefined && emOferta.has(uid);
export function marcarOfertaAberta(uids: number[]): void {
  emOferta.clear();
  for (const u of uids) emOferta.add(u);
}
export const MOTIVO_NA_TROCA = 'Está na sua oferta de troca';

export const trocasAgora = () => api<EstadoTrocas>('GET', '/trocas/atual');
export const convidarParaTroca = (usuario: string) => api<Troca>('POST', '/trocas', { usuario });
export const responderConvite = (id: string, aceitar: boolean) => api<Troca>('POST', `/trocas/${id}/${aceitar ? 'aceitar' : 'recusar'}`);
export const mudarOferta = (id: string, oferta: Oferta) => api<Troca>('PUT', `/trocas/${id}/oferta`, oferta);
export const confirmarOferta = (id: string, confirmado: boolean) => api<Troca>('POST', `/trocas/${id}/confirmar`, { confirmado });
export const clicarTrocar = (id: string) => api<Troca>('POST', `/trocas/${id}/trocar`);
export const cancelarTroca = (id: string) => api<Troca>('POST', `/trocas/${id}/cancelar`);
