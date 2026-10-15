// Roleta de prêmios (Ninho e, depois, Torneio). Pedido do dono: todas as fatias do mesmo tamanho na roda e as chances
// reais escritas ao lado. O resultado já vem sorteado (pelo servidor); a roda só gira até ele.
import { el } from './dom';
import { abrirJanela } from './janela';

const CORES = ['#e9b949', '#5a4a23', '#c0392b', '#2a78d6', '#1baf7a', '#8e44ad', '#e67e22', '#16a085', '#d35400', '#7f8c8d'];
const pct = (c: number) => `${(Math.round(c * 1000) / 10).toLocaleString('pt-BR')}%`;

export function girarRoleta(titulo: string, fatias: { nome: string; chance: number }[], escolhida: number): Promise<void> {
  return new Promise((resolver) => {
    const n = fatias.length;
    const passo = 360 / n;
    const gradiente = fatias.map((_, i) => `${CORES[i % CORES.length]} ${i * passo}deg ${(i + 1) * passo}deg`).join(', ');
    const roda = el('div', { class: 'roleta-roda', style: `background: conic-gradient(${gradiente})` },
      ...fatias.map((_, i) => el('span', { class: 'roleta-numero', style: `transform: rotate(${(i + 0.5) * passo}deg) translateY(-92px)` }, String(i + 1))));
    const resultado = el('p', { class: 'roleta-resultado', hidden: true });
    const botao = el('button', { class: 'botao', hidden: true, onclick: () => janela.fechar() }, 'Pegar prêmio');
    const janela = abrirJanela(titulo, () =>
      el('div', { class: 'roleta' },
        el('div', { class: 'roleta-palco' }, el('div', { class: 'roleta-seta' }, '▼'), roda),
        el('ol', { class: 'roleta-lista' }, ...fatias.map((f, i) => el('li', {}, el('span', { class: 'roleta-cor', style: `background: ${CORES[i % CORES.length]}` }), `${f.nome} `, el('small', {}, pct(f.chance))))),
        resultado, botao),
    { classe: 'janela-roleta', aoFechar: () => resolver() });
    // várias voltas e para com o meio da fatia escolhida embaixo da seta
    const voltas = 5 * 360 + (360 - (escolhida + 0.5) * passo);
    requestAnimationFrame(() => requestAnimationFrame(() => (roda.style.transform = `rotate(${voltas}deg)`)));
    setTimeout(() => {
      resultado.hidden = false;
      resultado.textContent = `🎉 ${fatias[escolhida].nome}!`;
      botao.hidden = false;
    }, 4300);
  });
}
