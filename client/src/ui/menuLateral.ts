// Menu de abas na lateral (modelo 3 escolhido pelo dono para o Ranking, 20/10/2026): lista em pé à esquerda,
// separada em grupos com título pequeno, e o conteúdo à direita. No celular vira uma fileira em cima.
// Use `comMenuLateral(menu, ...conteudo)` para montar as duas colunas.
import { el } from './dom';
import { icone, type NomeIcone } from './icones';

/** `icone`: nome de `ui/icones.ts` ou um elemento pronto (ex.: a moedinha). */
export interface OpcaoMenu { id: string; nome: string; icone?: NomeIcone | HTMLElement }
export interface GrupoMenu { titulo?: string; opcoes: OpcaoMenu[] }

export function menuLateral(grupos: GrupoMenu[], ativa: string, aoEscolher: (id: string) => void): HTMLElement {
  return el('nav', { class: 'menu-lateral' }, ...grupos.flatMap((g) => [
    g.titulo ? el('small', { class: 'menu-lateral-grupo' }, g.titulo) : '',
    ...g.opcoes.map((o) => el('button', { type: 'button', class: `menu-lateral-opcao ${o.id === ativa ? 'ativa' : ''}`, onclick: () => aoEscolher(o.id) },
      o.icone ? el('span', { class: 'menu-lateral-icone' }, typeof o.icone === 'string' ? icone(o.icone) : o.icone) : '', o.nome)),
  ]));
}

export const comMenuLateral = (menu: HTMLElement, ...conteudo: (Node | string | null)[]): HTMLElement =>
  el('div', { class: 'com-menu-lateral' }, menu, el('div', { class: 'com-menu-lateral-conteudo' }, ...conteudo));
