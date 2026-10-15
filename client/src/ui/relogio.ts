// Relógio da barra do topo (pedido do dono): a hora de Brasília pelo relógio do SERVIDOR, para todo mundo ver o mesmo
// horário dos eventos (Outbreak 15h/21h, Loteria 20h, Torneio…), mesmo com o relógio do computador errado.
import { api } from '../conta';
import { el } from './dom';

let diferenca = 0;
/** Agora pelo relógio do servidor (ms). */
export const agoraDoServidor = () => Date.now() + diferenca;

export function relogioBrasilia(): HTMLElement {
  const caixa = el('span', { class: 'relogio-topo', title: 'Horário de Brasília (relógio do servidor)' });
  const desenhar = () => {
    const br = new Date(agoraDoServidor() - 3 * 3_600_000);
    caixa.textContent = `🕐 ${String(br.getUTCHours()).padStart(2, '0')}:${String(br.getUTCMinutes()).padStart(2, '0')}`;
  };
  const acertar = () => {
    const antes = Date.now();
    void api<{ agora: number }>('GET', '/viagem').then((r) => ((diferenca = r.agora - (antes + Date.now()) / 2), desenhar()), () => {});
  };
  desenhar();
  acertar();
  setInterval(desenhar, 10_000);
  setInterval(acertar, 10 * 60_000);
  return caixa;
}
