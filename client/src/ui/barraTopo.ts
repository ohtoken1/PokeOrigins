// Barra no topo do site: Jogar, Pokédex e Database.
import type { Destino, Navegar } from '../main';
import { carregarSave } from '../estado';
import { el } from './dom';

type Aba = { nome: string; tela: Destino['tela'] | 'jogar'; destino: () => Destino };

const ABAS: Aba[] = [
  { nome: 'Jogar', tela: 'jogar', destino: () => (carregarSave() ? { tela: 'regiao' } : { tela: 'inicial' }) },
  { nome: 'Pokédex', tela: 'pokedex', destino: () => ({ tela: 'pokedex' }) },
  { nome: 'Database', tela: 'database', destino: () => ({ tela: 'database' }) },
];

/** Cria a barra e devolve a função que marca a aba da tela atual. */
export function montarBarraTopo(navegar: Navegar): (destino: Destino) => void {
  const botoes = ABAS.map(({ nome, destino }) => el('button', { class: 'aba-topo', onclick: () => navegar(destino()) }, nome));
  document.body.prepend(
    el('nav', { class: 'barra-topo' },
      el('div', { class: 'barra-topo-conteudo' }, el('strong', { class: 'marca' }, 'Jogo Claude'), el('div', { class: 'abas-topo' }, ...botoes)),
    ),
  );
  return (destino) => {
    const ativa = ABAS.some((a) => a.tela === destino.tela) ? destino.tela : 'jogar';
    botoes.forEach((b, i) => b.classList.toggle('ativa', ABAS[i].tela === ativa));
  };
}
