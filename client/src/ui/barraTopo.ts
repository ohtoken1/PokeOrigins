// Barra no topo do site. "Jogar" e "Pokédex" funcionam; as outras abas serão ligadas depois.
import type { Destino, Navegar } from '../main';
import { carregarSave } from '../estado';
import { el } from './dom';

type Aba = { nome: string; destino?: () => Destino };

const ABAS: Aba[] = [
  { nome: 'Jogar', destino: () => (carregarSave() ? { tela: 'regiao' } : { tela: 'inicial' }) },
  { nome: 'Torneios' },
  { nome: 'Ranking' },
  { nome: 'Pokédex', destino: () => ({ tela: 'pokedex' }) },
  { nome: 'Comunidade' },
];

/** Cria a barra e devolve a função que marca a aba da tela atual. */
export function montarBarraTopo(navegar: Navegar): (destino: Destino) => void {
  const botoes = ABAS.map(({ nome, destino }) =>
    destino
      ? el('button', { class: 'aba-topo', onclick: () => navegar(destino()) }, nome)
      : el('button', { class: 'aba-topo', disabled: true, title: 'Em breve' }, nome),
  );
  document.body.prepend(
    el('nav', { class: 'barra-topo' },
      el('div', { class: 'barra-topo-conteudo' }, el('strong', { class: 'marca' }, 'Jogo Claude'), el('div', { class: 'abas-topo' }, ...botoes)),
    ),
  );
  return (destino) => {
    const ativa = destino.tela === 'pokedex' ? 'Pokédex' : 'Jogar';
    botoes.forEach((b, i) => b.classList.toggle('ativa', ABAS[i].nome === ativa));
  };
}
