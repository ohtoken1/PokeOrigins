// Amigos (server/src/amigos.ts): lista, pedidos de amizade e mensagens privadas. A lista fica guardada aqui e é
// buscada de novo quando o servidor avisa que mudou (pedido novo, amigo entrou/saiu); as conversas abertas também.
import { api, conta } from './conta';
import { aoAvisoDoServidor } from './online';

export interface Pessoa {
  id: number;
  usuario: string;
  nome: string;
  online: boolean;
}
export interface Amigo extends Pessoa {
  naoLidas: number;
}
export interface Recado {
  id: number;
  de: string;
  para: string;
  texto: string;
  em: number;
}
interface Lista {
  amigos: Amigo[];
  recebidos: Pessoa[];
  enviados: Pessoa[];
}

let lista: Lista = { amigos: [], recebidos: [], enviados: [] };
const conversas = new Map<string, Recado[]>();
/** Conversas na tela agora (mensagem que chega nelas já conta como lida). */
const abertas = new Map<string, number>();
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export const amigos = () => lista;
export const amigo = (usuario: string) => lista.amigos.find((a) => a.usuario === usuario);
export const conversaCom = (usuario: string) => conversas.get(usuario) ?? [];
/** Mensagens privadas não lidas + pedidos de amizade esperando resposta. */
export const pendenciasDeAmigos = () => lista.amigos.reduce((n, a) => n + a.naoLidas, 0) + lista.recebidos.length;
/** Avisa quando a lista ou alguma conversa muda; devolve a função que para de ouvir. */
export function aoMudarAmigos(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

const adotar = (nova: Lista) => {
  lista = nova;
  // conversa na tela não tem não lidas
  for (const a of lista.amigos) if (abertas.has(a.usuario)) a.naoLidas = 0;
  avisar();
};
export const carregarAmigos = async () => adotar(await api<Lista>('GET', '/amigos'));
export const pedirAmizade = async (usuario: string) => adotar(await api<Lista>('POST', '/amigos', { usuario }));
export const responderPedido = async (usuario: string, aceitar: boolean) => adotar(await api<Lista>('POST', `/amigos/${usuario}/${aceitar ? 'aceitar' : 'recusar'}`));
export async function removerAmigo(usuario: string): Promise<void> {
  adotar(await api<Lista>('POST', `/amigos/${usuario}/remover`));
  conversas.delete(usuario);
}

/** Busca a conversa com um amigo (o servidor marca como lida). */
export async function carregarConversa(usuario: string): Promise<void> {
  const r = await api<{ mensagens: Recado[] }>('GET', `/amigos/${usuario}/mensagens`);
  // junta com o que já chegou em tempo real (uma mensagem pode chegar pelo /ws antes desta resposta)
  const juntas = new Map([...r.mensagens, ...(conversas.get(usuario) ?? []).filter((m) => m.id > (r.mensagens.at(-1)?.id ?? 0))].map((m) => [m.id, m]));
  conversas.set(usuario, [...juntas.values()].sort((a, b) => a.id - b.id));
  const a = amigo(usuario);
  if (a) a.naoLidas = 0;
  avisar();
}
/** A conversa está na tela (devolve a função para quando sair dela). */
export function conversaNaTela(usuario: string): () => void {
  abertas.set(usuario, (abertas.get(usuario) ?? 0) + 1);
  return () => {
    const n = (abertas.get(usuario) ?? 1) - 1;
    if (n > 0) abertas.set(usuario, n);
    else abertas.delete(usuario);
  };
}

function guardar(usuario: string, m: Recado): void {
  const c = conversas.get(usuario) ?? [];
  if (c.some((x) => x.id === m.id)) return;
  c.push(m);
  if (c.length > 100) c.splice(0, c.length - 100);
  conversas.set(usuario, c);
}
export async function mandarPrivado(usuario: string, texto: string): Promise<void> {
  guardar(usuario, await api<Recado>('POST', `/amigos/${usuario}/mensagens`, { texto }));
  avisar();
}

/** Liga os avisos do servidor (depois do login). */
export function vigiarAmigos(): void {
  void carregarAmigos().catch(() => {});
  aoAvisoDoServidor((msg) => {
    if (msg.t === 'amigos') return void carregarAmigos().catch(() => {});
    if (msg.t !== 'privado') return;
    const m = msg.mensagem as Recado;
    const com = m.de === conta()?.usuario ? m.para : m.de;
    guardar(com, m);
    const a = amigo(com);
    // conversa aberta: avisa o servidor que já foi lida; senão, conta como não lida
    if (abertas.has(com)) void api('GET', `/amigos/${com}/mensagens`).catch(() => {});
    else if (a) a.naoLidas++;
    avisar();
  });
}
