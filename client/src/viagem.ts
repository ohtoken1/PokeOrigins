// Viagem de trem (server/src/viagem.ts): compra o ticket, mostra "Viajando…" com o tempo que falta no canto de
// cima à esquerda e, quando o tempo acaba, pede ao servidor para concluir (é ele que troca a região).
import { REGIOES } from '../../shared/regioes';
import { lerViagem, textoDoTempo, type MoedaTicket, type Viagem } from '../../shared/viagem';
import { api, ErroApi } from './conta';
import { adotarSaveDoServidor, carregarSave, salvarAgora, type Save } from './estado';
import { el } from './ui/dom';

interface Resposta {
  save: Save;
  versao: number;
  agora: number;
}

export const ORDEM_DAS_REGIOES = REGIOES.map((r) => r.id);
/** Diferença entre o relógio do servidor e o deste computador (as horas da viagem são do servidor). */
let ajuste = 0;
const acertar = (agoraDoServidor: number) => void (ajuste = agoraDoServidor - Date.now());
const ouvintes = new Set<() => void>();
/** Chamado quando uma viagem começa ou termina. */
export function aoMudarViagem(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export const viagemAtual = (): Viagem | null => lerViagem(carregarSave()?.viagem);
/** Quanto falta para o trem chegar (0 = chegou ou não há viagem). */
export const faltaDaViagem = (): number => {
  const v = viagemAtual();
  return v ? Math.max(0, v.chegaEm - (Date.now() + ajuste)) : 0;
};
const nomeDaRegiao = (id: string) => REGIOES.find((r) => r.id === id)?.nome ?? id;

function adotar(r: Resposta): void {
  acertar(r.agora);
  adotarSaveDoServidor(r.save, r.versao);
  ouvintes.forEach((f) => f());
}

/** Compra o ticket e parte (o servidor confere o saldo no save guardado, por isso salva antes). */
export async function comprarTicket(destino: string, moeda: MoedaTicket): Promise<void> {
  await salvarAgora();
  adotar(await api<Resposta>('POST', '/viagem', { destino, moeda }));
}

let chegando = false;
let proximaTentativa = 0;
/** O tempo acabou: pede ao servidor para concluir a viagem. */
async function chegar(): Promise<void> {
  if (chegando || Date.now() < proximaTentativa) return;
  chegando = true;
  const destino = viagemAtual()?.para;
  try {
    await salvarAgora();
    adotar(await api<Resposta>('POST', '/viagem/chegar'));
    if (destino) avisar(`Você chegou a ${nomeDaRegiao(destino)}!`);
  } catch (e) {
    // relógio adiantado ou sem conexão: tenta de novo daqui a pouco (e acerta o relógio pelo servidor)
    proximaTentativa = Date.now() + 5000;
    if (e instanceof ErroApi) void api<{ agora: number }>('GET', '/viagem').then((r) => acertar(r.agora), () => {});
  }
  chegando = false;
}

let selo: HTMLElement | null = null;
let relogioAviso = 0;
function avisar(texto: string): void {
  if (!selo) return;
  selo.hidden = false;
  selo.classList.add('chegou');
  selo.replaceChildren(el('strong', {}, texto));
  clearTimeout(relogioAviso);
  relogioAviso = window.setTimeout(() => {
    selo!.classList.remove('chegou');
    desenhar();
  }, 6000);
}
function desenhar(): void {
  if (!selo || selo.classList.contains('chegou')) return;
  const v = viagemAtual();
  selo.hidden = !v;
  if (!v) return;
  const falta = faltaDaViagem();
  selo.replaceChildren(el('strong', {}, `Viajando para ${nomeDaRegiao(v.para)}`), el('span', {}, falta > 0 ? `Chega em ${textoDoTempo(falta)}` : 'Chegando…'));
  if (falta <= 0) void chegar();
}

/** Liga o aviso de viagem (uma vez, depois do login). */
export function vigiarViagem(): void {
  if (selo) return;
  selo = el('div', { class: 'aviso-viagem', role: 'status', hidden: true });
  document.body.append(selo);
  void api<{ agora: number }>('GET', '/viagem').then((r) => acertar(r.agora), () => {}).finally(desenhar);
  setInterval(desenhar, 1000);
}
