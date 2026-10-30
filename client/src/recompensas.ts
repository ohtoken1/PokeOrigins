// Recompensas de login e de doação acumulada (server/src/recompensas.ts decide tudo). O jogo avisa o servidor que o
// jogador entrou (ao abrir e a cada 10 min, para pegar a virada do dia) e mostra o aviso
// de que o prêmio chegou no Correio. A tela fica em Minha conta → Recompensas (telas/conta.ts).
import type { EstadoRecompensas } from '../../shared/recompensas';
import { api } from './conta';
import { CONQUISTA_NA_TELA, PREMIOS_NA_TELA, PROFESSOR_NA_TELA, quandoLivre } from './ui/semBatalha';
import { aoSalvar, carregarSave, salvarAgora } from './estado';
import { nivelTreinador } from '../../shared/treinador';
import { agoraDoServidor } from './ui/relogio';
import { aoAvisoDoServidor } from './online';

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
  // aviso claro do que chegou (uma janela com os prêmios de cada login)
  if (r.novos.length) void import('./telas/conta').then((m) => quandoLivre(`${PROFESSOR_NA_TELA}, ${CONQUISTA_NA_TELA}, ${PREMIOS_NA_TELA}`, () => m.janelaDosPremios(r.novos)));
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
  // na virada do dia (meia-noite de Brasília, pelo relógio do servidor) pergunta na hora, sem esperar os 10 min
  const DIA = 24 * 60 * 60 * 1000;
  const FUSO = -3 * 60 * 60 * 1000;
  const agendarVirada = () => {
    const agora = agoraDoServidor();
    const falta = DIA - ((agora + FUSO) % DIA) + 3000;
    setTimeout(() => (void tentar(), agendarVirada()), falta);
  };
  agendarVirada();
  // subiu de nível de treinador (a tranca do login é por nível): manda o save e pergunta de novo
  let nivel = nivelTreinador(carregarSave()?.xpTreinador ?? 0);
  aoSalvar((save) => {
    const novo = nivelTreinador(save.xpTreinador ?? 0);
    if (novo === nivel) return;
    nivel = novo;
    void salvarAgora().then(tentar, tentar);
  });
  void tentar();
}

/** A aba Recompensas foi aberta: confere o login de hoje na hora (não só o estado guardado). */
export const conferirLoginAgora = (): Promise<void> => registrarLogin().catch(() => {});
