import type { Save } from '../estado';
import { abrirBolsa } from './bolsa';
import { el } from './dom';
import { abrirPC } from './pc';

/** Botões "PC" e "Bolsa" usados no menu da região e no bioma. */
export function botoesMenus(save: Save, aoMudar: () => void): HTMLElement[] {
  return [
    el('button', { class: 'botao secundario', onclick: () => abrirPC(save, aoMudar) }, '🖥 PC'),
    el('button', { class: 'botao secundario', onclick: () => abrirBolsa(save, aoMudar) }, '🎒 Bolsa'),
  ];
}
