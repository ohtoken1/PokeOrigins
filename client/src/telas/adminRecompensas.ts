// Administração → Eventos: somar uma doação no acumulado de um jogador (doação manual ou teste). Os logins (contas
// novas e 30 dias do servidor) não são ligados pela staff (pedido do dono). Quem decide é o servidor (server/src/recompensas.ts).
import { api, ErroApi } from '../conta';
import { confirmar } from '../ui/confirmar';
import { el } from '../ui/dom';

export function painelRecompensasStaff(): HTMLElement {
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  const usuario = el('input', { type: 'text', class: 'db-busca', placeholder: 'Usuário do jogador', autocomplete: 'off', 'aria-label': 'Usuário' }) as HTMLInputElement;
  const gold = el('input', { type: 'number', class: 'db-busca', min: '1', max: '1000000', value: '500', 'aria-label': 'Origin Coins' }) as HTMLInputElement;
  const somar = async () => {
    const n = Math.round(Number(gold.value));
    if (!(await confirmar('Doação acumulada', `Somar ${n.toLocaleString('pt-BR')} Origin Coins ao acumulado de ${usuario.value.trim()}? Os prêmios das metas vão pelo Correio. (Não dá as Origin Coins: mande pelo Correio se for uma doação de verdade.)`))) return;
    try {
      const r = await api<{ jogador: string; acumulado: number }>('POST', '/admin/recompensas/doacao', { usuario: usuario.value.trim(), gold: n });
      aviso.textContent = `${r.jogador} agora tem ${r.acumulado.toLocaleString('pt-BR')} Origin Coins doadas neste trimestre.`;
    } catch (x) {
      aviso.textContent = x instanceof ErroApi ? x.message : 'Sem conexão com o servidor.';
    }
  };
  return el('div', { class: 'eventos-staff recompensas-staff' },
    el('h2', {}, 'Doação acumulada'),
    el('p', { class: 'meta' }, 'Soma no acumulado do trimestre de um jogador (doação feita por fora do site ou teste). Quando o pagamento for ligado, o servidor soma sozinho. Os logins de boas-vindas (7 primeiros dias da conta) e dos 30 dias (primeiros 30 dias do servidor) funcionam sozinhos.'),
    el('div', { class: 'evento-compra' }, usuario, gold, el('button', { class: 'botao', onclick: somar }, 'Somar ao acumulado')),
    aviso);
}
