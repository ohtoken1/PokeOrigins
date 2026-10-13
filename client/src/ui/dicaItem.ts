// Cartão com a imagem e a descrição de um item ao passar o mouse (pedido do dono: em todas as telas).
// Funciona sozinho: qualquer elemento com `data-item="<id do item>"` mostra o cartão. Todo ícone de item
// (`iconeItem`) já sai com essa marca; para um NOME de item escrito num texto, use `textoDeItem`.
// Fica de fora onde a descrição já está na tela: loja e bolsa (`.mercado`) e as listas `.linha-item`.
import { itemDaLoja, nomeCategoriaItem } from '../../../shared/loja';
import { el } from './dom';
import { iconeItem } from './iconeItem';

const SEM_DICA = '.mercado, .linha-item, .dica-item';

let cartao: HTMLElement | null = null;
let atual: HTMLElement | null = null;

function esconder(): void {
  if (cartao) cartao.hidden = true;
  atual = null;
}

function mostrar(alvo: HTMLElement): void {
  const item = itemDaLoja(alvo.dataset.item ?? '');
  if (!item) return;
  atual = alvo;
  cartao ??= el('div', { class: 'dica-golpe dica-item' });
  document.body.appendChild(cartao);
  const icone = iconeItem(item);
  delete icone.dataset.item;
  cartao.replaceChildren(
    el('div', { class: 'dica-item-topo' }, el('div', { class: 'dica-item-icone' }, icone), el('div', {}, el('strong', {}, item.nome), el('small', {}, nomeCategoriaItem(item.categoria)))),
    el('p', { class: 'dica-golpe-desc' }, item.descricao || 'Sem descrição.'),
  );
  cartao.hidden = false;
  const r = alvo.getBoundingClientRect();
  const { offsetWidth: largura, offsetHeight: altura } = cartao;
  // em cima do item; se não couber, embaixo
  const x = Math.max(8, Math.min(window.innerWidth - largura - 8, r.left + r.width / 2 - largura / 2));
  const y = r.top - altura - 8 > 8 ? r.top - altura - 8 : Math.min(window.innerHeight - altura - 8, r.bottom + 8);
  Object.assign(cartao.style, { left: `${x}px`, top: `${y}px` });
}

/** Liga o cartão de item na página inteira (uma vez, no começo do jogo). */
export function ativarDicaDeItens(): void {
  document.addEventListener('mouseover', (e) => {
    const alvo = (e.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-item]') ?? null;
    if (alvo === atual) return;
    if (!alvo || alvo.closest(SEM_DICA)) return esconder();
    mostrar(alvo);
  });
  // o alvo pode sumir sem o mouse sair (a tela redesenhou)
  document.addEventListener('mousemove', () => {
    if (atual && !atual.isConnected) esconder();
  });
  document.addEventListener('pointerdown', esconder);
  document.addEventListener('scroll', esconder, true);
}

/** O nome de um item dentro de um texto: sublinhado pontilhado e o cartão ao passar o mouse. */
export const textoDeItem = (id: string, texto: string): HTMLElement => el('span', { class: 'texto-de-item', 'data-item': id }, texto);
