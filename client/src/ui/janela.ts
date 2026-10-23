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
export function abrirJanela(titulo: string, conteudo: (janela: Janela) => HTMLElement, opcoes: {
  aoFechar?: () => void;
  classe?: string;
  /** fica no meio da barra do título, entre o nome e o ✕ */
  noTopo?: HTMLElement;
  /** clicar fora da janela não fecha */
  semFecharFora?: boolean;
  /** pergunta antes de fechar pelo ✕ ou pelo Esc (false = continua aberta) */
  antesDeFechar?: () => boolean | Promise<boolean>;
} = {}): Janela {
  const corpo = el('div', { class: 'janela-corpo' });
  // ✕ e Esc: o jogador pediu para fechar
  let perguntando = false;
  const pedirParaFechar = async () => {
    if (perguntando) return;
    perguntando = true;
    try {
      if (!opcoes.antesDeFechar || (await opcoes.antesDeFechar())) janela.fechar();
    } finally {
      perguntando = false;
    }
  };
  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      // com a confirmação aberta, o Esc é dela
      if (!perguntando) void pedirParaFechar();
    }
  };
  const fundo = el(
    'div',
    {
      class: 'janela-fundo',
      onclick: (e: MouseEvent) => {
        if (e.target === fundo && !opcoes.semFecharFora) void pedirParaFechar();
      },
    },
    el(
      'div',
      { class: `janela ${opcoes.classe ?? ''}`, role: 'dialog', 'aria-label': titulo },
      el('header', {}, el('h2', {}, titulo), opcoes.noTopo ? el('div', { class: 'janela-no-topo' }, opcoes.noTopo) : null, el('button', { class: 'fechar', 'aria-label': 'Fechar', onclick: () => void pedirParaFechar() }, '✕')),
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
