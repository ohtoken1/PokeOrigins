// Tela de Início: o time atual lado a lado, cada Pokémon grande num pedestal (clicar abre a ficha).
// É a primeira tela ao abrir o jogo (com save) e tem atalho "Início" na barra do topo.
import type { Tela } from '../main';
import { hpMaximo } from '../../../shared/batalha/pokemon';
import { itemDaLoja } from '../../../shared/loja';
import { nomeItemEquipado } from '../../../shared/usoItens';
import { abrirJanela } from '../ui/janela';
import { pokemonPorId } from '../dados';
import { TAMANHO_MAXIMO_TIME, carregarSave, salvar, type PokemonDoJogador, type Save } from '../estado';
import { NIVEIS_PASSE, XP_POR_MISSAO, XP_POR_NIVEL_PASSE, missaoCompleta, nivelPasse } from '../../../shared/passe';
import { ondeMissao, passeDeHoje, textoMissao } from '../passe';
import { tornarArrastavel } from '../ui/arrastar';
import { abrirDetalhes } from '../ui/detalhes';
import { el, seloGenero, selosTipos, spritePokemon } from '../ui/dom';
import { iconeItem } from '../ui/iconeItem';
import { barraHp } from '../ui/time';

function pedestal(p: PokemonDoJogador, posicao: number): HTMLElement {
  const dados = pokemonPorId(p.especieId);
  const max = hpMaximo(p);
  return el(
    'button',
    { class: `pedestal ${p.shiny ? 'shiny' : ''} ${p.hp <= 0 ? 'desmaiado' : ''}`, title: 'Clique para ver a ficha · arraste para trocar a ordem', 'data-alvo': 'time', 'data-i': posicao },
    el('div', { class: 'pedestal-palco' }, spritePokemon(dados, { shiny: p.shiny, palco: true })),
    el('strong', {}, dados.nome, p.shiny ? ' ✨' : '', seloGenero(p.genero)),
    el('small', {}, `Nv. ${p.nivel}`),
    selosTipos(dados),
    barraHp(p.hp, max),
    el('small', { class: 'pedestal-hp' }, `HP ${p.hp}/${max}`),
    p.item ? el('span', { class: 'pedestal-item', title: `Segurando ${nomeItemEquipado(p.item)}` }, iconeItem(itemDaLoja(p.item) ?? { id: p.item, categoria: 'batalha' }), nomeItemEquipado(p.item)) : null,
  );
}

/** Janela das missões de hoje (renovam à meia-noite). */
function abrirMissoes(save: Save): void {
  const passe = passeDeHoje(save);
  salvar(save);
  abrirJanela('Missões diárias', () =>
    el('div', { class: 'missoes' },
      el('p', { class: 'meta' }, `${passe.missoes.length} missões por dia, renovam à meia-noite (as quantidades são as mesmas para todos os jogadores no dia). Cada uma vale ${XP_POR_MISSAO} XP do passe (até 2 níveis por dia). Derrotar e capturar: só Pokémon selvagens.`),
      el('section', { class: 'missoes-grupo' },
        ...passe.missoes.map((m) => {
          const dados = m.especieId ? pokemonPorId(m.especieId) : null;
          const completa = missaoCompleta(m);
          return el('div', { class: `missao ${completa ? 'completa' : ''}` },
            el('span', { class: 'missao-check' }, completa ? '✓' : ''),
            el('span', { class: `missao-sprite missao-${m.tipo}` }, dados ? spritePokemon(dados, { animado: false }) : m.tipo === 'shiny' ? '✨' : '⚔'),
            el('span', { class: 'missao-texto' }, textoMissao(m),
              el('small', {}, `${Math.min(m.feito, m.alvo)} / ${m.alvo} · ${ondeMissao(m)}`),
              el('span', { class: 'barra-exp barra-missao' }, el('span', { class: 'preenchido', style: { width: `${(Math.min(m.feito, m.alvo) / m.alvo) * 100}%` } }))),
            el('strong', { class: 'missao-xp' }, `+${XP_POR_MISSAO} XP`));
        }),
        ),
    ), { classe: 'janela-missoes' });
}

/** Passe de batalha: XP só das missões diárias; recompensas ainda vão ser definidas. */
function passeDeBatalha(save: Save): HTMLElement {
  const passe = passeDeHoje(save);
  const nivel = nivelPasse(passe.xp);
  const noNivel = nivel >= NIVEIS_PASSE ? XP_POR_NIVEL_PASSE : passe.xp - nivel * XP_POR_NIVEL_PASSE;
  const feitasHoje = passe.missoes.filter(missaoCompleta).length;
  const casa = (n: number, premium: boolean) =>
    el('div', { class: `passe-casa ${premium ? 'premium' : 'gratis'} ${n <= nivel ? 'alcancada' : ''}`, title: 'Recompensa a definir' }, el('span', { class: 'passe-cadeado' }, '?'));
  return el(
    'section',
    { class: 'passe-batalha' },
    el('div', { class: 'passe-topo' },
      el('div', {}, el('h2', {}, 'Passe de batalha'), el('small', { class: 'meta' }, 'Temporada 1 · recompensas em breve')),
      el('div', { class: 'passe-acoes' }, el('button', { class: 'botao secundario', onclick: () => abrirMissoes(save) }, `Missões ${feitasHoje}/${passe.missoes.length}`))),
    el('div', { class: 'passe-progresso' },
      el('small', {}, `Nível ${nivel} de ${NIVEIS_PASSE}`),
      el('div', { class: 'barra-exp barra-passe' }, el('div', { class: 'preenchido', style: { width: `${(noNivel / XP_POR_NIVEL_PASSE) * 100}%` } }), el('span', {}, nivel >= NIVEIS_PASSE ? 'Completo!' : `${noNivel} / ${XP_POR_NIVEL_PASSE} XP`))),
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
  // arrastar um Pokémon para outra posição troca a ordem (o primeiro é quem entra na batalha e segue no mapa)
  const fila = el('div', { class: 'fila-time' });
  const desenharFila = () =>
    fila.replaceChildren(
      ...Array.from({ length: TAMANHO_MAXIMO_TIME }, (_, i) => {
        const p = save.time[i];
        if (!p) return el('div', { class: 'pedestal vazio', 'data-alvo': 'time', 'data-i': i }, el('small', {}, 'Vaga livre'));
        const caixa = pedestal(p, i);
        tornarArrastavel(caixa, {
          aoClicar: () => abrirDetalhes(p),
          aoSoltar: (alvo) => {
            if (!alvo) return;
            const destino = Math.min(Number(alvo.dataset.i), save.time.length - 1);
            if (Number.isNaN(destino) || destino === i) return;
            // troca de lugar com quem está no destino (vaga livre = vai para o fim do time)
            [save.time[i], save.time[destino]] = [save.time[destino], save.time[i]];
            salvar(save);
            desenharFila();
          },
        });
        return caixa;
      }),
    );
  desenharFila();
  tela.append(
    el('h1', {}, 'Início'),
    el('p', { class: 'sub' }, `Olá, ${nome}!`),
    el('h2', { class: 'titulo-time' }, 'Seu time', el('small', { class: 'meta' }, ' · arraste para trocar a ordem')),
    fila,
    passeDeBatalha(save),
  );
};
