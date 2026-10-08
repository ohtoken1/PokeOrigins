// Tela de Início: o time atual lado a lado, cada Pokémon grande num pedestal (clicar abre a ficha).
// É a primeira tela ao abrir o jogo (com save) e tem atalho "Início" na barra do topo.
import type { Tela } from '../main';
import { hpMaximo } from '../../../shared/batalha/pokemon';
import { itemDaLoja } from '../../../shared/loja';
import { nomeItemEquipado } from '../../../shared/usoItens';
import { progressoTreinador } from '../../../shared/treinador';
import { pokemonPorId } from '../dados';
import { TAMANHO_MAXIMO_TIME, carregarSave, type PokemonDoJogador } from '../estado';
import { abrirDetalhes } from '../ui/detalhes';
import { el, seloGenero, selosTipos, spritePokemon } from '../ui/dom';
import { iconeItem } from '../ui/iconeItem';
import { barraHp } from '../ui/time';

function pedestal(p: PokemonDoJogador): HTMLElement {
  const dados = pokemonPorId(p.especieId);
  const max = hpMaximo(p);
  return el(
    'button',
    { class: `pedestal ${p.shiny ? 'shiny' : ''} ${p.hp <= 0 ? 'desmaiado' : ''}`, title: 'Ver a ficha', onclick: () => abrirDetalhes(p) },
    el('div', { class: 'pedestal-palco' }, spritePokemon(dados, { shiny: p.shiny, palco: true, escala: 2 })),
    el('strong', {}, dados.nome, p.shiny ? ' ✨' : '', seloGenero(p.genero)),
    el('small', {}, `Nv. ${p.nivel}`),
    selosTipos(dados),
    barraHp(p.hp, max),
    el('small', { class: 'pedestal-hp' }, `HP ${p.hp}/${max}`),
    p.item ? el('span', { class: 'pedestal-item', title: `Segurando ${nomeItemEquipado(p.item)}` }, iconeItem(itemDaLoja(p.item) ?? { id: p.item, categoria: 'batalha' }), nomeItemEquipado(p.item)) : null,
  );
}

export const telaInicio: Tela = (raiz, navegar) => {
  const save = carregarSave();
  const tela = el('main', { class: 'tela tela-inicio' });
  raiz.append(tela);
  if (!save) {
    tela.append(el('h1', {}, 'Início'), el('p', { class: 'sub' }, 'Você ainda não começou sua jornada.'), el('button', { class: 'botao grande', onclick: () => navegar({ tela: 'inicial' }) }, 'Começar'));
    return;
  }
  const treinador = progressoTreinador(save.xpTreinador);
  const nome = save.aparencia?.nome || 'Treinador';
  tela.append(
    el('h1', {}, 'Início'),
    el('p', { class: 'sub' }, `Olá, ${nome}! Treinador Nv. ${treinador.nivel}`),
    el('h2', { class: 'titulo-time' }, 'Seu time'),
    el(
      'div',
      { class: 'fila-time' },
      ...Array.from({ length: TAMANHO_MAXIMO_TIME }, (_, i) => (save.time[i] ? pedestal(save.time[i]) : el('div', { class: 'pedestal vazio' }, el('small', {}, 'Vaga livre')))),
    ),
    el('div', { class: 'inicio-botoes' }, el('button', { class: 'botao grande', onclick: () => navegar({ tela: 'regiao' }) }, 'Ir para os Mapas')),
  );
};
