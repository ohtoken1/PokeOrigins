// Cartão solto ao passar o mouse, com o conteúdo que a tela quiser (mesmo visual do cartão de golpe e de item).
// Usado nas conquistas: bônus atuais do jogador e o que um título dá.
import { el } from './dom';

let cartao: HTMLElement | null = null;
let atual: HTMLElement | null = null;
// o alvo pode sumir sem "mouseleave" (a tela redesenhou): esconde quando o mouse sai dele
document.addEventListener('mousemove', (e) => {
  if (cartao && !cartao.hidden && (!atual?.isConnected || !atual.contains(e.target as Node))) cartao.hidden = true;
});

/** Mostra um cartão com `conteudo()` (montado na hora) enquanto o mouse estiver em cima de `alvo`. */
export function comDica<T extends HTMLElement>(alvo: T, conteudo: () => (HTMLElement | string | null)[]): T {
  alvo.classList.add('com-dica');
  alvo.addEventListener('mouseenter', () => {
    atual = alvo;
    cartao ??= el('div', { class: 'dica-golpe dica-solta' });
    document.body.appendChild(cartao);
    cartao.replaceChildren(...conteudo().filter((x): x is HTMLElement | string => x !== null));
    cartao.hidden = false;
    const r = alvo.getBoundingClientRect();
    const { offsetWidth: largura, offsetHeight: altura } = cartao;
    // em cima do alvo; se não couber, embaixo
    const x = Math.max(8, Math.min(window.innerWidth - largura - 8, r.left + r.width / 2 - largura / 2));
    const y = r.top - altura - 8 > 8 ? r.top - altura - 8 : Math.min(window.innerHeight - altura - 8, r.bottom + 8);
    Object.assign(cartao.style, { left: `${x}px`, top: `${y}px` });
  });
  const esconder = () => cartao && (cartao.hidden = true);
  alvo.addEventListener('mouseleave', esconder);
  alvo.addEventListener('pointerdown', esconder);
  return alvo;
}

/** Uma linha "rótulo …… valor" dentro do cartão. */
export const linhaDaDica = (rotulo: string, valor: string, destaque = false): HTMLElement =>
  el('div', { class: `dica-golpe-linha${destaque ? ' destaque' : ''}` }, el('span', {}, rotulo), el('strong', {}, valor));
