// Recompensas de login e de doação acumulada (server/src/recompensas.ts decide tudo). O jogo avisa o servidor que o
// jogador entrou (ao abrir e a cada 10 min, para pegar a virada do dia) e mostra o aviso
// de que o prêmio chegou no Correio. A tela fica em Minha conta → Recompensas (telas/conta.ts).
import type { EstadoRecompensas } from '../../shared/recompensas';
import { api } from './conta';
import { carregarSave } from './estado';
import { aoAvisoDoServidor } from './online';
import { avisar } from './ui/avisos';

let atual: EstadoRecompensas | null = null;
const ouvintes = new Set<() => void>();

export const estadoRecompensas = () => atual;
/** Avisa quando o estado muda (tela aberta). Devolve a função que para de ouvir. */
export function aoMudarRecompensas(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
const adotar = (r: EstadoRecompensas) => ((atual = r), ouvintes.forEach((f) => f()));

export async function buscarRecompensas(): Promise<EstadoRecompensas> {
  const r = await api<EstadoRecompensas>('GET', '/recompensas');
  adotar(r);
  return r;
}

async function registrarLogin(): Promise<void> {
  if (!carregarSave()) return;
  const r = await api<EstadoRecompensas & { novos: { evento: 'login' | 'trinta'; dia: number }[] }>('POST', '/recompensas/login');
  adotar(r);
  const login = r.novos.find((n) => n.evento === 'login');
  if (login) void import('./telas/conta').then((m) => m.janelaDoLogin(login.dia));
  for (const n of r.novos)
    avisar(n.evento === 'login' ? `🎁 Login de boas-vindas: o prêmio do dia ${n.dia} chegou no Correio!` : `📅 Login dos 30 dias: o prêmio do dia ${n.dia} chegou no Correio!`, 'ok');
}

/** VIP recupera o prêmio de um dia perdido do Login dos 30 dias (o servidor confere VIP e o limite). */
export async function recuperarDia(dia: number): Promise<void> {
  adotar(await api<EstadoRecompensas>('POST', '/recompensas/recuperar', { dia }));
}

let ligado = false;
export function vigiarRecompensas(): void {
  if (ligado) return;
  ligado = true;
  const tentar = () => registrarLogin().catch(() => {});
  aoAvisoDoServidor((msg) => {
    if (msg.t === 'recompensas') void tentar();
  });
  setInterval(() => document.visibilityState === 'visible' && void tentar(), 10 * 60 * 1000);
  void tentar();
}
