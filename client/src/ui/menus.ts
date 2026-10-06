import type { Save } from '../estado';
import { abrirBolsa } from './bolsa';
import { el } from './dom';
import { abrirLoja } from './loja';
import { abrirPC } from './pc';

/** Botões "PC", "Bolsa" e "Loja" usados no menu da região e no bioma. */
export function botoesMenus(save: Save, aoMudar: () => void): HTMLElement[] {
  return [
    el('button', { class: 'botao secundario', onclick: () => abrirPC(save, aoMudar) }, '🖥 PC'),
    el('button', { class: 'botao secundario', onclick: () => abrirBolsa(save, aoMudar) }, '🎒 Bolsa'),
    el('button', { class: 'botao secundario', onclick: () => abrirLoja(save, aoMudar) }, '🏪 Loja'),
  ];
}
