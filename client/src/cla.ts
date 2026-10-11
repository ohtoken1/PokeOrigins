// Clã do jogador (server/src/cla.ts): estado único, chamadas e o envio do XP ganho em batalha para o clã.
import { NIVEL_MAX_CLA, type Bandeira } from '../../shared/cla';
import { conferirConquistasLogo, definirMarcasVivas } from './conquistas';
import { api } from './conta';
import { aoAvisoDoServidor } from './online';

export type Cargo = 'lider' | 'vice' | 'membro';
export const NOME_CARGO: Record<Cargo, string> = { lider: 'Líder', vice: 'Vice-líder', membro: 'Membro' };

export interface ResumoCla {
  id: number;
  nome: string;
  bandeira: Bandeira | null;
  nivel: number;
  aberto: boolean;
  membros: number;
  vagas: number;
}
export interface MembroCla {
  usuario: string;
  nome: string;
  cargo: Cargo;
  online: boolean;
  /** Parte (%) do XP do clã que veio deste membro. */
  parte: number;
}
export interface DetalheCla extends Omit<ResumoCla, 'membros'> {
  descricao: string;
  criadoEm: number;
  /** Só a porcentagem do nível atual (o número de XP não aparece, pedido do dono). */
  progresso: number;
  missoes: { id: string; texto: string; feita: boolean }[];
  meuCargo: Cargo | null;
  membros: MembroCla[];
  pedidos: { usuario: string; nome: string }[];
}
interface Estado {
  cla: DetalheCla | null;
  /** Clãs fechados onde tenho pedido de entrada esperando. */
  pedidos: number[];
}

let estado: Estado = { cla: null, pedidos: [] };
const ouvintes = new Set<() => void>();
export const meuCla = () => estado.cla;
export const meusPedidosDeCla = () => estado.pedidos;
export function aoMudarCla(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
const adotar = (novo: Estado) => {
  estado = novo;
  // conquistas da guilda (com folga: criar a guilda ainda troca o save pelo do servidor)
  if (novo.cla) conferirConquistasLogo(2000);
  ouvintes.forEach((f) => f());
};
const pedir = async (caminho: string, corpo?: unknown) => adotar(await api<Estado>('POST', caminho, corpo ?? {}));

export const carregarCla = async () => adotar(await api<Estado>('GET', '/cla'));
export const listarClas = (busca: string) => api<ResumoCla[]>('GET', `/clas?busca=${encodeURIComponent(busca)}`);
export const verCla = (id: number) => api<DetalheCla>('GET', `/clas/${id}`);
export const criarCla = async (dados: { nome: string; bandeira: Bandeira; descricao: string; aberto: boolean }) => {
  await pedir('/cla', dados);
  criouGuilda = true;
};
/** Criou uma guilda nesta sessão (conquista "Lider da união"). */
let criouGuilda = false;
definirMarcasVivas(() => ({ guildaEntrou: !!estado.cla, guildaMax: (estado.cla?.nivel ?? 0) >= NIVEL_MAX_CLA, guildaCriou: criouGuilda }));
export const entrarNoCla = (id: number) => pedir(`/clas/${id}/entrar`);
export const cancelarPedidoDeCla = (id: number) => pedir(`/clas/${id}/cancelar`);
export const sairDoCla = () => pedir('/cla/sair');
export const editarCla = (dados: { bandeira?: Bandeira; descricao?: string; aberto?: boolean }) => pedir('/cla/editar', dados);
export const responderPedidoDeCla = (usuario: string, aceitar: boolean) => pedir(`/cla/pedidos/${usuario}/${aceitar ? 'aceitar' : 'recusar'}`);
export const expulsarDoCla = (usuario: string) => pedir(`/cla/membros/${usuario}/expulsar`);
export const mudarCargoNoCla = (usuario: string, cargo: Cargo) => pedir(`/cla/membros/${usuario}/cargo`, { cargo });

// ---- XP para o clã: junta o que as batalhas deram e manda de tempos em tempos ----
let xpGuardado = 0;
let relogio = 0;
async function mandarXp(): Promise<void> {
  relogio = 0;
  const xp = xpGuardado;
  if (!xp || !estado.cla) return void (xpGuardado = 0);
  xpGuardado = 0;
  try {
    const r = await api<{ nivel: number; progresso: number }>('POST', '/cla/xp', { xp });
    if (estado.cla && (estado.cla.nivel !== r.nivel || estado.cla.progresso !== r.progresso)) {
      estado.cla.nivel = r.nivel;
      estado.cla.progresso = r.progresso;
      ouvintes.forEach((f) => f());
    }
  } catch {
    // sem conexão (ou cedo demais): tenta de novo junto com o próximo
    xpGuardado += xp;
    relogio ||= window.setTimeout(mandarXp, 5000);
  }
}
/** O Pokémon em campo ganhou XP numa batalha: o clã ganha o mesmo tanto. */
export function darXpAoCla(xp: number): void {
  if (!estado.cla || xp <= 0) return;
  xpGuardado += Math.round(xp);
  relogio ||= window.setTimeout(mandarXp, 3000);
}

/** Liga os avisos do servidor (depois do login). */
export function vigiarCla(): void {
  void carregarCla().catch(() => {});
  // fechando a página com XP ainda não enviado: manda agora
  window.addEventListener('pagehide', () => {
    if (!xpGuardado || !estado.cla) return;
    void api('POST', '/cla/xp', { xp: xpGuardado }, { keepalive: true }).catch(() => {});
    xpGuardado = 0;
  });
  aoAvisoDoServidor((msg) => {
    if (msg.t === 'cla') void carregarCla().catch(() => {});
  });
}
