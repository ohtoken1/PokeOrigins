// Mapa do tamanho da tela (pedido do dono, 25/10/2026): um botão no canto do mapa (cidade, biomas e Safari) deixa o
// jogo ocupando a tela inteira, por cima do cabeçalho e das colunas; no celular também pede a tela cheia do navegador
// (some a barra de endereço). Janelas, batalha e avisos continuam por cima. A escolha vale para os próximos mapas
// enquanto a aba estiver aberta.
import { definirTelaCheia } from '../jogo/jogoUnico';
import { el } from './dom';

const CHAVE = 'jogo-claude:mapa-tela-cheia';
const lembrar = (sim: boolean) => {
  try {
    sessionStorage.setItem(CHAVE, sim ? '1' : '0');
  } catch {
    // sem armazenamento: só não lembra
  }
};
const lembrado = (): boolean => {
  try {
    return sessionStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
};

export function botaoTelaCheia(area: HTMLElement): void {
  const botao = el('button', { type: 'button', class: 'botao-tela-cheia' }) as HTMLButtonElement;
  const aplicar = (sim: boolean) => {
    area.classList.toggle('em-tela-cheia', sim);
    botao.textContent = sim ? '✕' : '⛶';
    botao.title = sim ? 'Sair da tela cheia' : 'Mapa em tela cheia';
    botao.setAttribute('aria-label', botao.title);
    // o layout muda antes: o jogo mede a tela no quadro seguinte
    requestAnimationFrame(() => definirTelaCheia(sim));
  };
  botao.addEventListener('click', () => {
    const sim = !area.classList.contains('em-tela-cheia');
    aplicar(sim);
    lembrar(sim);
    // tela cheia do navegador (no celular some a barra de endereço); onde não existe (iPhone), fica só a nossa
    if (sim && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {});
    if (!sim && document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
  });
  // saiu da tela cheia do navegador (Esc, botão voltar do celular): o mapa volta ao normal também
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && area.isConnected && area.classList.contains('em-tela-cheia')) {
      aplicar(false);
      lembrar(false);
    }
  });
  area.append(botao);
  aplicar(lembrado());
}
