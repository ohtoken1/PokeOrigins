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

/** Efetividade de um golpe contra os tipos do alvo (só tipo; Abilities como Levitate não entram). */
function efetividade(tipo: string, tipos: string[]): { texto: string; classe: string } {
  if (!Dex.getImmunity(tipo, tipos)) return { texto: 'Sem efeito (0x)', classe: 'ef-nulo' };
  const x = 2 ** Dex.getEffectiveness(tipo, tipos);
  if (x >= 4) return { texto: 'Super efetivo (4x)', classe: 'ef-super' };
  if (x >= 2) return { texto: 'Efetivo (2x)', classe: 'ef-bom' };
  if (x === 1) return { texto: 'Normal (1x)', classe: 'ef-normal' };
  return { texto: `Pouco efetivo (${x}x)`, classe: 'ef-fraco' };
}

function conteudo(golpeId: string, pp?: { atual: number; max: number }, origem?: string, tiposAlvo?: string[]): HTMLElement[] {
  const m = Dex.moves.get(golpeId);
  // Max Move: a categoria e o poder vêm do golpe de origem (os dados do Max Move em si são só um molde)
  const base = origem ? Dex.moves.get(origem) : null;
  const categoria = base ? base.category : m.category;
  const poder = base ? (base.category === 'Status' ? 0 : (base.maxMove?.basePower ?? 0)) : m.basePower;
  const linha = (rotulo: string, valor: string) => el('div', { class: 'dica-golpe-linha' }, el('span', {}, rotulo), el('strong', {}, valor));
  return [
    el('div', { class: 'dica-golpe-topo' }, el('strong', {}, m.name), seloTipo(m.type)),
    el(
      'div',
      { class: 'dica-golpe-numeros' },
      linha('Categoria', nomeCategoria(categoria)),
      linha('Poder', poder ? String(poder) : '—'),
      linha('Precisão', m.accuracy === true ? 'Nunca erra' : `${m.accuracy}%`),
      linha('PP', pp ? `${pp.atual}/${pp.max}` : String(ppMaximo(origem ?? golpeId))),
      tiposAlvo?.length && categoria !== 'Status'
        ? (() => { const e = efetividade(m.type, tiposAlvo); const l = linha('Contra o adversário', e.texto); l.classList.add(e.classe); return l; })()
        : null,
      m.priority ? linha('Prioridade', `${m.priority > 0 ? '+' : ''}${m.priority}`) : null,
    ),
    el('p', { class: 'dica-golpe-desc' }, traduzir(m.shortDesc || m.desc) || 'Sem efeito adicional.'),
  ];
}

/** Mostra o cartão do golpe ao lado de `alvo` enquanto o mouse estiver em cima. */
export function dicaGolpe(alvo: HTMLElement, golpeId: string, pp?: () => { atual: number; max: number }, origem?: string, tiposAlvo?: string[]): HTMLElement {
  alvo.addEventListener('mouseenter', () => {
    atual = alvo;
    cartao ??= el('div', { class: 'dica-golpe' });
    document.body.appendChild(cartao);
    cartao.replaceChildren(...conteudo(golpeId, pp?.(), origem, tiposAlvo));
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
