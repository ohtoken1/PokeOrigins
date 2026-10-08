// Tela de Início: o time atual lado a lado, cada Pokémon grande num pedestal (clicar abre a ficha).
// É a primeira tela ao abrir o jogo (com save) e tem atalho "Início" na barra do topo.
import type { Tela } from '../main';
import { hpMaximo } from '../../../shared/batalha/pokemon';
import { itemDaLoja } from '../../../shared/loja';
import { nomeItemEquipado } from '../../../shared/usoItens';
import { abrirJanela } from '../ui/janela';
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
    el('div', { class: 'pedestal-palco' }, spritePokemon(dados, { shiny: p.shiny, palco: true })),
    el('strong', {}, dados.nome, p.shiny ? ' ✨' : '', seloGenero(p.genero)),
    el('small', {}, `Nv. ${p.nivel}`),
    selosTipos(dados),
    barraHp(p.hp, max),
    el('small', { class: 'pedestal-hp' }, `HP ${p.hp}/${max}`),
    p.item ? el('span', { class: 'pedestal-item', title: `Segurando ${nomeItemEquipado(p.item)}` }, iconeItem(itemDaLoja(p.item) ?? { id: p.item, categoria: 'batalha' }), nomeItemEquipado(p.item)) : null,
  );
}

/** Missões que dão XP do passe de batalha (exemplos; ainda não valem: a mecânica vem depois). */
const MISSOES: { tipo: string; lista: [string, number][] }[] = [
  { tipo: 'Diárias', lista: [['Vencer 10 batalhas', 100], ['Capturar 5 Pokémon', 100], ['Andar 500 passos nos mapas', 50]] },
  { tipo: 'Semanais', lista: [['Capturar 30 Pokémon', 400], ['Vencer 50 batalhas', 400], ['Evoluir 3 Pokémon', 300]] },
  { tipo: 'Da temporada', lista: [['Capturar um shiny', 1000], ['Chegar ao treinador Nv. 10', 1000]] },
];
function abrirMissoes(): void {
  abrirJanela('Missões do passe', () =>
    el('div', { class: 'missoes' },
      el('p', { class: 'meta' }, 'Cumpra missões para ganhar XP do passe de batalha. As missões ainda não estão valendo: são exemplos até a mecânica ser definida.'),
      ...MISSOES.map((g) =>
        el('section', { class: 'missoes-grupo' },
          el('h4', {}, g.tipo),
          ...g.lista.map(([texto, xp]) =>
            el('div', { class: 'missao' },
              el('span', { class: 'missao-check' }),
              el('span', { class: 'missao-texto' }, texto, el('small', {}, '0 / —')),
              el('strong', { class: 'missao-xp' }, `+${xp} XP`),
              el('span', { class: 'selo-em-breve' }, 'Em breve'))))),
    ), { classe: 'janela-missoes' });
}

/** Passe de batalha: por enquanto só a vitrine (a mecânica e as recompensas ainda vão ser definidas). */
const NIVEIS_PASSE = 30;
function passeDeBatalha(): HTMLElement {
  const casa = (nivel: number, premium: boolean) =>
    el('div', { class: `passe-casa ${premium ? 'premium' : 'gratis'}`, title: 'Recompensa a definir' }, el('span', { class: 'passe-cadeado' }, '?'));
  return el(
    'section',
    { class: 'passe-batalha' },
    el('div', { class: 'passe-topo' },
      el('div', {}, el('h2', {}, 'Passe de batalha'), el('small', { class: 'meta' }, 'Temporada 1 · recompensas e mecânica em breve')),
      el('div', { class: 'passe-acoes' }, el('button', { class: 'botao secundario', onclick: abrirMissoes }, 'Missões'), el('span', { class: 'selo-em-breve' }, 'Em breve'))),
    el('div', { class: 'passe-progresso' }, el('small', {}, `Nível 0 de ${NIVEIS_PASSE}`), el('div', { class: 'barra-exp' }, el('div', { class: 'preenchido', style: { width: '0%' } }))),
    el('div', { class: 'passe-trilha' },
      el('div', { class: 'passe-rotulos' }, el('small', {}, 'Grátis'), el('small', {}, 'Premium')),
      ...Array.from({ length: NIVEIS_PASSE }, (_, i) =>
        el('div', { class: 'passe-coluna' }, el('small', { class: 'passe-nivel' }, String(i + 1)), casa(i + 1, false), casa(i + 1, true)))),
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
  const nome = save.aparencia?.nome || 'Treinador';
  tela.append(
    el('h1', {}, 'Início'),
    el('p', { class: 'sub' }, `Olá, ${nome}!`),
    el('h2', { class: 'titulo-time' }, 'Seu time'),
    el(
      'div',
      { class: 'fila-time' },
      ...Array.from({ length: TAMANHO_MAXIMO_TIME }, (_, i) => (save.time[i] ? pedestal(save.time[i]) : el('div', { class: 'pedestal vazio' }, el('small', {}, 'Vaga livre')))),
    ),
    passeDeBatalha(),
  );
};
