// Trocas entre jogadores (lado do jogo). Quem decide e faz a troca é o servidor (server/src/trocas.ts);
// aqui ficam as chamadas, a chave que libera o sistema e o vigia dos convites.
import { api } from './conta';
import { ehAdministrador } from './bonificacao';

/**
 * Liga as trocas para todos (pedido do dono: abriram junto com a interação com os outros jogadores no mapa:
 * clicar no boneco → Trocar). Desligado, só administradores testam (painel ⚙ Admin).
 */
export const TROCAS_LIBERADAS = true;
export const trocasDisponiveis = () => TROCAS_LIBERADAS || ehAdministrador();

export interface PokemonNaTroca {
  uid: number;
  especieId: number;
  nivel: number;
  shiny: boolean;
  genero: 'M' | 'F' | 'N';
  item: string | null;
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

export const trocasAgora = () => api<EstadoTrocas>('GET', '/trocas/atual');
export const convidarParaTroca = (usuario: string) => api<Troca>('POST', '/trocas', { usuario });
export const responderConvite = (id: string, aceitar: boolean) => api<Troca>('POST', `/trocas/${id}/${aceitar ? 'aceitar' : 'recusar'}`);
export const mudarOferta = (id: string, oferta: Oferta) => api<Troca>('PUT', `/trocas/${id}/oferta`, oferta);
export const confirmarOferta = (id: string, confirmado: boolean) => api<Troca>('POST', `/trocas/${id}/confirmar`, { confirmado });
export const clicarTrocar = (id: string) => api<Troca>('POST', `/trocas/${id}/trocar`);
export const cancelarTroca = (id: string) => api<Troca>('POST', `/trocas/${id}/cancelar`);
