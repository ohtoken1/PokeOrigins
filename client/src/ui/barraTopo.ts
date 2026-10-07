// Barra no topo do site: Jogar, Pokédex, Database e Comunidade (menu com setinha: Amigos, Clã).
import type { Destino, Navegar } from '../main';
import { carregarSave } from '../estado';
import { el } from './dom';

type Aba = { nome: string; tela: Destino['tela'] | 'jogar'; destino: () => Destino };

const ABAS: Aba[] = [
  { nome: 'Jogar', tela: 'jogar', destino: () => (carregarSave() ? { tela: 'regiao' } : { tela: 'inicial' }) },
  { nome: 'Pokédex', tela: 'pokedex', destino: () => ({ tela: 'pokedex' }) },
  { nome: 'Database', tela: 'database', destino: () => ({ tela: 'database' }) },
  { nome: 'Golpes', tela: 'golpes', destino: () => ({ tela: 'golpes' }) },
  { nome: 'Opções', tela: 'opcoes', destino: () => ({ tela: 'opcoes' }) },
];

const COMUNIDADE: { nome: string; destino: Destino }[] = [
  { nome: '👥 Amigos', destino: { tela: 'comunidade', secao: 'amigos' } },
  { nome: '🛡️ Clã', destino: { tela: 'comunidade', secao: 'cla' } },
];

/** Cria a barra e devolve a função que marca a aba da tela atual. */
export function montarBarraTopo(navegar: Navegar): (destino: Destino) => void {
  const botoes = ABAS.map(({ nome, destino }) => el('button', { class: 'aba-topo', onclick: () => navegar(destino()) }, nome));

  // Comunidade: abre uma listinha ao clicar
  const menu = el('div', { class: 'menu-topo', hidden: true });
  const abaComunidade = el('button', { class: 'aba-topo aba-menu', 'aria-haspopup': 'true' }, 'Comunidade', el('span', { class: 'setinha' }, '▾'));
  const fechar = () => {
    menu.hidden = true;
    abaComunidade.classList.remove('aberta');
  };
  menu.append(
    ...COMUNIDADE.map(({ nome, destino }) =>
      el('button', { onclick: () => (fechar(), navegar(destino)) }, nome, el('small', {}, 'em breve')),
    ),
  );
  abaComunidade.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    abaComunidade.classList.toggle('aberta', !menu.hidden);
  });
  document.addEventListener('click', fechar);

  document.body.prepend(
    el('nav', { class: 'barra-topo' },
      el(
        'div',
        { class: 'barra-topo-conteudo' },
        el('strong', { class: 'marca' }, 'Jogo Claude'),
        el('div', { class: 'abas-topo' }, ...botoes, el('div', { class: 'aba-com-menu' }, abaComunidade, menu)),
      ),
    ),
  );
  return (destino) => {
    const ativa = ABAS.some((a) => a.tela === destino.tela) || destino.tela === 'comunidade' ? destino.tela : 'jogar';
    botoes.forEach((b, i) => b.classList.toggle('ativa', ABAS[i].tela === ativa));
    abaComunidade.classList.toggle('ativa', ativa === 'comunidade');
  };
}
