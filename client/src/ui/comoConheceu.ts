// Pergunta "Por onde conheceu o jogo?" dos dois formulários de criar conta (tela de entrada e pré-registro).
// Regras e respostas em shared/comoConheceu.ts; o servidor confere de novo. Quem veio pelo link de um criador
// (/c/CODIGO) já encontra "Criador de conteúdo" escolhido e o código preenchido.
import { COMO_CONHECEU, DETALHE_COMO_CONHECEU_MAX, lerComoConheceu } from '../../../shared/comoConheceu';
import type { CriadorDoLink } from '../linkCriador';
import { el } from './dom';

export interface RespostaComoConheceu { comoConheceu: string; comoConheceuDetalhe: string; codigo: string; via: 'link' | 'codigo' }

export function campoComoConheceu(link: CriadorDoLink | null) {
  const escolha = el('select', { class: 'campo-entrada', 'aria-label': 'Por onde conheceu o jogo?' },
    el('option', { value: '', disabled: true, selected: true }, 'Escolha uma opção'),
    ...COMO_CONHECEU.map((o) => el('option', { value: o.id }, o.nome))) as HTMLSelectElement;
  const detalhe = el('input', { class: 'campo-entrada', maxlength: DETALHE_COMO_CONHECEU_MAX }) as HTMLInputElement;
  const rotuloDetalhe = el('span', {});
  const linhaDetalhe = el('label', { class: 'rotulo-entrada' }, rotuloDetalhe, detalhe);
  // o que foi escrito em cada resposta fica guardado ao trocar de uma para outra
  const escrito = new Map<string, string>();
  let atual = '';
  const mostrar = () => {
    escrito.set(atual, detalhe.value);
    atual = escolha.value;
    const d = COMO_CONHECEU.find((o) => o.id === atual)?.detalhe;
    linhaDetalhe.hidden = !d;
    rotuloDetalhe.textContent = d?.rotulo ?? '';
    detalhe.placeholder = d?.exemplo ?? '';
    detalhe.setAttribute('aria-label', d?.rotulo ?? '');
    detalhe.value = escrito.get(atual) ?? '';
    detalhe.style.textTransform = atual === 'criador' ? 'uppercase' : '';
  };
  escolha.addEventListener('change', () => {
    mostrar();
    if (!linhaDetalhe.hidden) detalhe.focus();
  });
  if (link) {
    escolha.value = 'criador';
    escrito.set('criador', link.codigo);
  }
  mostrar();
  const elemento = el('div', { class: 'como-conheceu' }, el('label', { class: 'rotulo-entrada' }, el('span', {}, 'Por onde conheceu o jogo?'), escolha), linhaDetalhe);

  /** A resposta para mandar ao servidor, ou a mensagem do que falta. */
  const ler = (): RespostaComoConheceu | string => {
    const r = lerComoConheceu(escolha.value, detalhe.value);
    if (typeof r === 'string') return r;
    // criador: o código digitado; outra resposta: só o do link (o servidor ignora se não valer mais)
    const codigo = r.tipo === 'criador' ? r.detalhe.toUpperCase() : (link?.codigo ?? '');
    const via = r.tipo !== 'criador' || codigo === link?.codigo ? 'link' : 'codigo';
    return { comoConheceu: r.tipo, comoConheceuDetalhe: r.detalhe, codigo, via };
  };
  return { elemento, ler };
}
