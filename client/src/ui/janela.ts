import { el } from './dom';

// Avisa quem precisa saber (ex.: o mapa pausa) quando há alguma janela aberta.
let abertas = 0;
const todas = new Set<Janela>();

/** Fecha todas as janelas (ex.: ao ir para outra tela). */
export function fecharTodasJanelas(): void {
  for (const j of [...todas]) j.fechar();
}
const avisos = new EventTarget();
export function aoMudarJanelas(callback: (algumaAberta: boolean) => void): () => void {
  const ouvinte = () => callback(abertas > 0);
  avisos.addEventListener('mudou', ouvinte);
  return () => avisos.removeEventListener('mudou', ouvinte);
}

export interface Janela {
  fechar(): void;
  /** Desenha o conteúdo de novo (depois de alguma mudança). */
  redesenhar(): void;
}

/** Janela sobre a tela (Esc ou ✕ fecham). `conteudo` é chamado de novo a cada redesenho. */
export function abrirJanela(titulo: string, conteudo: (janela: Janela) => HTMLElement, opcoes: { aoFechar?: () => void; classe?: string } = {}): Janela {
  const corpo = el('div', { class: 'janela-corpo' });
  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      janela.fechar();
    }
  };
  const fundo = el(
    'div',
    {
      class: 'janela-fundo',
      onclick: (e: MouseEvent) => {
        if (e.target === fundo) janela.fechar();
      },
    },
    el(
      'div',
      { class: `janela ${opcoes.classe ?? ''}`, role: 'dialog', 'aria-label': titulo },
      el('header', {}, el('h2', {}, titulo), el('button', { class: 'fechar', 'aria-label': 'Fechar', onclick: () => janela.fechar() }, '✕')),
      corpo,
    ),
  );

  let fechada = false;
  const janela: Janela = {
    fechar() {
      if (fechada) return;
      fechada = true;
      window.removeEventListener('keydown', aoTeclar, true);
      fundo.remove();
      todas.delete(janela);
      abertas--;
      avisos.dispatchEvent(new Event('mudou'));
      opcoes.aoFechar?.();
    },
    redesenhar() {
      corpo.replaceChildren(conteudo(janela));
    },
  };

  window.addEventListener('keydown', aoTeclar, true);
  document.body.append(fundo);
  todas.add(janela);
  abertas++;
  avisos.dispatchEvent(new Event('mudou'));
  janela.redesenhar();
  return janela;
}
