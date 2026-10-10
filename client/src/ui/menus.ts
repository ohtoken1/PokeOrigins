import { ehAdministrador } from '../bonificacao';
import type { Save } from '../estado';
import { abrirBolsa } from './bolsa';
import { el } from './dom';
import { icone, type NomeIcone } from './icones';
import { abrirLoja } from './loja';
import { abrirPC } from './pc';

/** Botão só com ícone (o nome aparece ao passar o mouse). */
export function botaoIcone(nomeIcone: NomeIcone, nome: string, onclick: () => void): HTMLElement {
  return el('button', { class: 'botao secundario botao-icone', title: nome, 'aria-label': nome, onclick }, icone(nomeIcone));
}

/**
 * Botões "PC" e "Bolsa" usados no menu da região e no bioma (`soIcone` no bioma). A "Loja" só aparece para
 * administradores: os jogadores usam o Pokémarket indo até ele na cidade (pedido do dono).
 */
export function botoesMenus(save: Save, aoMudar: () => void, soIcone = false): HTMLElement[] {
  const menus: [NomeIcone, string, () => void][] = [
    ['computador', 'PC', () => abrirPC(save, aoMudar)],
    ['mochila', 'Bolsa', () => abrirBolsa(save, aoMudar)],
  ];
  if (ehAdministrador()) menus.push(['loja', 'Loja', () => abrirLoja(save, aoMudar)]);
  return menus.map(([nomeIcone, nome, onclick]) =>
    soIcone ? botaoIcone(nomeIcone, nome, onclick) : el('button', { class: 'botao secundario botao-com-icone', onclick }, icone(nomeIcone), nome),
  );
}
