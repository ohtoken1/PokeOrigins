// Cartão com as informações de um golpe ao passar o mouse (batalha, golpe novo para aprender, bolsa):
// nome, tipo, categoria, poder, precisão, PP, prioridade e descrição traduzida.
import { Dex } from '@pkmn/sim';
import { ppMaximo } from '../../../shared/batalha/pokemon';
import { nomeCategoria, traduzir } from '../../../shared/traducao';
import { el, seloTipo } from './dom';

let cartao: HTMLElement | null = null;
let atual: HTMLElement | null = null;
// o alvo pode sumir sem "mouseleave" (a tela redesenhou): esconde quando o mouse sai dele
document.addEventListener('mousemove', (e) => {
  if (cartao && !cartao.hidden && (!atual?.isConnected || !atual.contains(e.target as Node))) cartao.hidden = true;
});

function conteudo(golpeId: string, pp?: { atual: number; max: number }): HTMLElement[] {
  const m = Dex.moves.get(golpeId);
  const linha = (rotulo: string, valor: string) => el('div', { class: 'dica-golpe-linha' }, el('span', {}, rotulo), el('strong', {}, valor));
  return [
    el('div', { class: 'dica-golpe-topo' }, el('strong', {}, m.name), seloTipo(m.type)),
    el(
      'div',
      { class: 'dica-golpe-numeros' },
      linha('Categoria', nomeCategoria(m.category)),
      linha('Poder', m.basePower ? String(m.basePower) : '—'),
      linha('Precisão', m.accuracy === true ? 'Nunca erra' : `${m.accuracy}%`),
      linha('PP', pp ? `${pp.atual}/${pp.max}` : String(ppMaximo(golpeId))),
      m.priority ? linha('Prioridade', `${m.priority > 0 ? '+' : ''}${m.priority}`) : null,
    ),
    el('p', { class: 'dica-golpe-desc' }, traduzir(m.shortDesc || m.desc) || 'Sem efeito adicional.'),
  ];
}

/** Mostra o cartão do golpe ao lado de `alvo` enquanto o mouse estiver em cima. */
export function dicaGolpe(alvo: HTMLElement, golpeId: string, pp?: () => { atual: number; max: number }): HTMLElement {
  alvo.addEventListener('mouseenter', () => {
    atual = alvo;
    cartao ??= el('div', { class: 'dica-golpe' });
    document.body.appendChild(cartao);
    cartao.replaceChildren(...conteudo(golpeId, pp?.()));
    cartao.hidden = false;
    const r = alvo.getBoundingClientRect();
    const { offsetWidth: largura, offsetHeight: altura } = cartao;
    // em cima do botão; se não couber, embaixo
    const x = Math.max(8, Math.min(window.innerWidth - largura - 8, r.left + r.width / 2 - largura / 2));
    const y = r.top - altura - 8 > 8 ? r.top - altura - 8 : Math.min(window.innerHeight - altura - 8, r.bottom + 8);
    Object.assign(cartao.style, { left: `${x}px`, top: `${y}px` });
  });
  const esconder = () => cartao && (cartao.hidden = true);
  alvo.addEventListener('mouseleave', esconder);
  alvo.addEventListener('pointerdown', esconder);
  return alvo;
}
