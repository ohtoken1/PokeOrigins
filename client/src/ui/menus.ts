import type { Save } from '../estado';
import { abrirBolsa } from './bolsa';
import { el } from './dom';
import { abrirLoja } from './loja';
import { abrirPC } from './pc';

/** Botão só com ícone (o nome aparece ao passar o mouse). */
export function botaoIcone(icone: string, nome: string, onclick: () => void): HTMLElement {
  return el('button', { class: 'botao secundario botao-icone', title: nome, 'aria-label': nome, onclick }, icone);
}

/** Botões "PC", "Bolsa" e "Loja" usados no menu da região e no bioma (`soIcone` no bioma). */
export function botoesMenus(save: Save, aoMudar: () => void, soIcone = false): HTMLElement[] {
  const menus: [string, string, () => void][] = [
    ['🖥️', 'PC', () => abrirPC(save, aoMudar)],
    ['🎒', 'Bolsa', () => abrirBolsa(save, aoMudar)],
    ['🏪', 'Loja', () => abrirLoja(save, aoMudar)],
  ];
  return menus.map(([icone, nome, onclick]) =>
    soIcone ? botaoIcone(icone, nome, onclick) : el('button', { class: 'botao secundario', onclick }, `${icone} ${nome}`),
  );
}
