// Avisos do jogo no lugar das janelas do navegador (pedido do dono: nada de alert/confirm/dica nativa do Chrome).
// - `avisar(texto, tipo)`: cartãozinho que aparece no alto da tela e some sozinho (clicar fecha).
// - `ativarDicasDoJogo()`: todo `title` vira uma dica no visual do jogo (a do navegador não aparece mais).
// Para perguntar Sim/Não, usar `confirmar` de ui/confirmar.ts.
import { el } from './dom';
import { depoisDaBatalha } from './semBatalha';

export type TipoAviso = 'info' | 'erro' | 'ok';
const ICONES: Record<TipoAviso, string> = { info: 'ℹ️', erro: '⚠️', ok: '✅' };
let pilha: HTMLElement | null = null;

export function avisar(texto: string, tipo: TipoAviso = 'info', duracaoMs = 4500): void {
  // com uma batalha aberta, o aviso espera ela acabar (não cobre a luta)
  depoisDaBatalha(() => mostrarAviso(texto, tipo, duracaoMs));
}
function mostrarAviso(texto: string, tipo: TipoAviso, duracaoMs: number): void {
  pilha ??= el('div', { class: 'avisos-jogo', role: 'status', 'aria-live': 'polite' });
  if (!pilha.isConnected) document.body.append(pilha);
  const cartao = el('div', { class: `aviso-jogo aviso-${tipo}`, onclick: () => fechar() }, el('span', { class: 'aviso-jogo-icone' }, ICONES[tipo]), el('span', {}, texto));
  const fechar = () => {
    cartao.classList.add('saindo');
    setTimeout(() => cartao.remove(), 250);
  };
  pilha.append(cartao);
  // no máximo 4 na tela: o mais antigo sai
  while (pilha.children.length > 4) pilha.firstElementChild?.remove();
  setTimeout(fechar, duracaoMs);
}

/** Erro de uma chamada ao servidor (ou sem conexão) como aviso. */
export const avisarErro = (erro: unknown, padrao = 'Sem conexão com o servidor.') => avisar(erro instanceof Error && erro.message ? erro.message : padrao, 'erro');

// ---------- dicas (title) no visual do jogo ----------
let dica: HTMLElement | null = null;
let alvo: HTMLElement | null = null;
function mostrar(elemento: HTMLElement): void {
  const texto = elemento.dataset.dica;
  if (!texto) return;
  alvo = elemento;
  dica ??= el('div', { class: 'dica-jogo', role: 'tooltip' });
  if (!dica.isConnected) document.body.append(dica);
  dica.textContent = texto;
  dica.hidden = false;
  const r = elemento.getBoundingClientRect();
  const { offsetWidth: largura, offsetHeight: altura } = dica;
  const x = Math.max(8, Math.min(window.innerWidth - largura - 8, r.left + r.width / 2 - largura / 2));
  const y = r.top - altura - 8 > 8 ? r.top - altura - 8 : Math.min(window.innerHeight - altura - 8, r.bottom + 8);
  Object.assign(dica.style, { left: `${x}px`, top: `${y}px` });
}
const esconder = () => {
  alvo = null;
  if (dica) dica.hidden = true;
};

export function ativarDicasDoJogo(): void {
  // o `title` sai do elemento (senão o navegador mostra a dele) e fica guardado em data-dica
  document.addEventListener('mouseover', (e) => {
    const comTitulo = (e.target as Element | null)?.closest?.('[title], [data-dica]') as HTMLElement | null;
    if (!comTitulo) return esconder();
    const titulo = comTitulo.getAttribute('title');
    if (titulo !== null) {
      if (titulo) comTitulo.dataset.dica = titulo;
      comTitulo.removeAttribute('title');
    }
    if (comTitulo !== alvo) mostrar(comTitulo);
  }, true);
  document.addEventListener('pointerdown', esconder, true);
  document.addEventListener('scroll', esconder, true);
  // o alvo sumiu da tela (redesenho) sem "mouseout"
  document.addEventListener('mousemove', () => alvo && !alvo.isConnected && esconder());
}
