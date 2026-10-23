// Roleta de prêmios (Ninho e Torneio). Pedido do dono: fatias do mesmo tamanho, a imagem do item em cada fatia
// ("?" nos aleatórios), as chances reais ao lado e o botão Girar no meio. O resultado já vem sorteado pelo
// servidor; a roda só gira até ele.
import { itemDaLoja } from '../../../shared/loja';
import { TICKETS } from '../../../shared/tickets';
import { el } from './dom';
import { iconeCharm, iconeItem } from './iconeItem';
import { abrirJanela } from './janela';
import { confirmar } from './confirmar';

// cores fortes, alternando claro/escuro para as fatias vizinhas não se misturarem
const CORES = ['#b83a3a', '#2f5f9e', '#2f8a5b', '#7b3fa0', '#c06a1f', '#1f7f86', '#9e2f63', '#4b5f2a', '#8a6a1a', '#3d3d8f'];
const pct = (c: number) => `${(Math.round(c * 1000) / 10).toLocaleString('pt-BR')}%`;
/** Fatias de prêmio "aleatório" (Mint, Charm, Orb): mostram um exemplo com "?" por cima. */
const ALEATORIOS = new Set(['mint', 'charm', 'orb']);

function imagem(src: string): HTMLElement {
  return el('div', { class: 'icone-caixa' }, el('img', { class: 'icone-png', src, alt: '' }));
}
/** Ícone de cada prêmio das roletas (ids de ROLETA_NINHO / ROLETA_TORNEIO). */
function iconeDaFatia(id: string): HTMLElement {
  const item = (x: string) => {
    const i = itemDaLoja(x);
    return i ? iconeItem(i) : el('span', {}, '🎁');
  };
  const icone = id === 'silver' ? imagem('itens/pokedolar.svg')
    : id === 'fragmentos' ? imagem('itens/fragmento-temporal.svg')
    : id === 'mint' ? item('adamantmint')
    : id === 'charm' ? iconeCharm('fire')
    : id === 'orb' ? item(TICKETS[0].id)
    : item(id);
  return el('div', { class: 'giro-icone' }, icone, ALEATORIOS.has(id) ? el('span', { class: 'giro-interrogacao' }, '?') : '');
}

/**
 * Gira a roleta. Com `perdeAoFechar` (Ninho, pedido do dono): clicar fora não fecha e o ✕/Esc antes de "Pegar prêmio"
 * pergunta e, confirmando, o prêmio é perdido. Devolve se o jogador ficou com o prêmio.
 */
export function girarRoleta(titulo: string, fatias: { id: string; nome: string; chance: number }[], escolhida: number, opcoes: { perdeAoFechar?: boolean } = {}): Promise<boolean> {
  return new Promise((resolver) => {
    let pegou = true;
    const n = fatias.length;
    const passo = 360 / n;
    const cor = (i: number) => CORES[i % CORES.length];
    const gradiente = fatias.map((_, i) => `${cor(i)} ${i * passo}deg ${(i + 1) * passo}deg`).join(', ');
    const roda = el('div', { class: 'giro-roda', style: `background: conic-gradient(${gradiente})` },
      ...fatias.map((_, i) => el('div', { class: 'giro-divisa', style: `transform: rotate(${i * passo}deg)` })),
      ...fatias.map((f, i) => el('div', { class: 'giro-casa', 'data-i': i, style: `transform: rotate(${(i + 0.5) * passo}deg)` }, iconeDaFatia(f.id))));
    const lampadas = Array.from({ length: 20 }, (_, i) => el('span', { class: `giro-lampada ${i % 2 ? 'par' : ''}`, style: `transform: rotate(${i * 18}deg) translateY(-158px)` }));
    const resultado = el('p', { class: 'giro-resultado', hidden: true });
    const pegar = el('button', { class: 'botao', hidden: true, onclick: () => ((pegou = true), (pegando = true), janela.fechar()) }, 'Pegar prêmio');
    let pegando = false;
    const girar = el('button', { class: 'giro-botao', type: 'button', onclick: () => comecar() }, 'GIRAR') as HTMLButtonElement;
    const lista = el('ol', { class: 'giro-lista' }, ...fatias.map((f, i) =>
      el('li', { 'data-i': i }, el('span', { class: 'giro-cor', style: `background: ${cor(i)}` }), iconeDaFatia(f.id), el('span', { class: 'giro-nome' }, f.nome), el('small', {}, pct(f.chance)))));
    const palco = el('div', { class: 'giro-palco' }, el('div', { class: 'giro-aro' }, ...lampadas), roda, el('div', { class: 'giro-seta' }), girar);

    function comecar() {
      girar.disabled = true;
      girar.textContent = '…';
      palco.classList.add('girando');
      // várias voltas e para com o meio da fatia escolhida embaixo da seta (um pouco fora do centro, mais natural)
      const desvio = (Math.random() - 0.5) * passo * 0.5;
      roda.style.transform = `rotate(${6 * 360 + (360 - (escolhida + 0.5) * passo) + desvio}deg)`;
      setTimeout(() => {
        palco.classList.remove('girando');
        palco.classList.add('parou');
        roda.querySelector(`.giro-casa[data-i="${escolhida}"]`)?.classList.add('ganhou');
        lista.querySelector(`li[data-i="${escolhida}"]`)?.classList.add('ganhou');
        girar.textContent = '🎉';
        resultado.hidden = false;
        resultado.textContent = `Você ganhou: ${fatias[escolhida].nome}!`;
        pegar.hidden = false;
      }, 5200);
    }

    const janela = abrirJanela(titulo, () => el('div', { class: 'giro' }, palco, el('div', { class: 'giro-lado' }, el('h4', {}, 'Prêmios e chances'), lista), resultado, pegar),
      {
        classe: 'janela-roleta',
        aoFechar: () => resolver(pegou),
        semFecharFora: opcoes.perdeAoFechar,
        antesDeFechar: opcoes.perdeAoFechar
          ? async () => {
              if (pegando) return true;
              const sim = await confirmar('Fechar a roleta', 'Se fechar agora, você PERDE o prêmio da roleta. Fechar mesmo assim?');
              if (sim) pegou = false;
              return sim;
            }
          : undefined,
      });
  });
}
