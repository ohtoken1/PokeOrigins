// Guia do jogo (botão "?" da barra do topo, pedido do dono): janela com os grupos (Eventos, Sistemas…) →
// os tópicos do grupo → o texto do tópico. O conteúdo mora em `guiaConteudo.ts`.
import { GUIA, type GrupoGuia, type TopicoGuia } from '../guiaConteudo';
import { TODOS_OS_ITENS } from '../../../shared/loja';
import { pokemonPorId } from '../dados';
import { el, spritePokemon } from './dom';
import { iconeCharm, iconeItem, iconeOvo } from './iconeItem';
import { iconeTicketDoPokemon } from './ticketEvento';
import { abrirJanela, type Janela } from './janela';
import { NIVEL_MINIMO } from '../../../shared/trancas';

let aberta: Janela | null = null;

/** Uma imagem de exemplo com a legenda embaixo. `zoom` aumenta ícones pequenos sem refazer o desenho. */
const exemplo = (icone: HTMLElement | null, legenda: string, zoom = 2) =>
  el('figure', { class: 'guia-exemplo' }, icone ? el('div', { class: 'guia-exemplo-icone', style: { zoom: String(zoom) } }, icone) : '', el('figcaption', {}, legenda));
const doItem = (id: string) => {
  const item = TODOS_OS_ITENS.find((x) => x.id === id);
  return item ? iconeItem(item) : null;
};

/** Print de uma tela/janela do jogo (`client/public/guia/<nome>.webp`, tiradas por roteiro). Clicar amplia. */
const print = (nome: string, legenda: string) =>
  el('figure', { class: 'guia-print' },
    el('img', { src: `guia/${nome}.webp`, alt: legenda, loading: 'lazy', onclick: () => ampliar(`guia/${nome}.webp`, legenda) }),
    el('figcaption', {}, legenda));
function ampliar(src: string, legenda: string): void {
  const fundo = el('div', { class: 'guia-ampliada', onclick: () => fundo.remove() }, el('img', { src, alt: legenda }), el('small', {}, 'Clique para fechar'));
  document.body.append(fundo);
}

/**
 * Imagens de cada tópico (pedido do dono: prints de como o sistema está no jogo; ícones só onde não há tela).
 * Chave = `grupo/tópico`. Para refazer as prints, rodar o roteiro de prints de novo e copiar para client/public/guia.
 */
const FIGURAS: Record<string, () => HTMLElement[]> = {
  'comeco/inicio': () => [print('inicio', 'Tela de Início: seu time e o passe de batalha')],
  'comeco/treinador': () => [print('perfil', 'Meu perfil')],
  'comeco/mapas': () => [print('cidade', 'A cidade, com o minimapa no canto'), print('regiao', 'Os biomas da região')],
  'comeco/encontros': () => [
    exemplo(spritePokemon(pokemonPorId(25), { animado: false }), 'Normal', 1),
    exemplo(spritePokemon(pokemonPorId(25), { animado: false, shiny: true }), 'Shiny (1 em 1.500)', 1),
  ],
  'comeco/ivs': () => [print('ficha', 'Ficha do Pokémon com o botão Avaliar IVs')],
  'comeco/centro': () => [print('cura', 'Máquina de cura do Centro Pokémon')],
  'comeco/moedas': () => [
    exemplo(el('span', { class: 'icone-moeda moeda-silver' }), 'Poké Dólar'),
    exemplo(el('span', { class: 'icone-moeda moeda-gold' }), 'Origin Coin'),
    exemplo(el('img', { src: 'itens/fragmento-temporal.svg', alt: '', class: 'guia-icone-26' }), 'Fragmento Temporal'),
  ],
  'sistemas/trem': () => [print('trem', 'Estação de trem')],
  'sistemas/ginasios': () => [print('ginasios', 'Ginásios da região')],
  'sistemas/duelos': () => [print('arena', 'A Arena da cidade'), print('duelos', 'Duelos com treinadores')],
  'sistemas/loja': () => [print('loja', 'Pokémarket'), print('bolsa', 'Bolsa')],
  'sistemas/pc': () => [print('pc', 'PC')],
  'sistemas/professores': () => [print('professores', 'Professores de golpes')],
  'sistemas/mercado': () => [print('mercado', 'Mercado negro')],
  'sistemas/guildas': () => [print('guilda', 'Tela das guildas')],
  'sistemas/amigos': () => [print('amigos', 'Amigos')],
  'sistemas/correio': () => [print('correio', 'Correio')],
  'sistemas/quadro': () => [print('quadro', 'Quadro de missões')],
  'sistemas/daycare': () => [print('daycare', 'Daycare')],
  'sistemas/craft': () => [print('craft', 'Artesã')],
  'sistemas/suspeito': () => [print('suspeito', 'Homem Suspeito')],
  'sistemas/viajante': () => [print('viajante', 'Loja do Viajante do tempo')],
  'sistemas/passe': () => [print('inicio', 'O passe fica na tela de Início')],
  'sistemas/conquistas': () => [print('conquistas', 'Conquistas')],
  'sistemas/ranking': () => [print('ranking', 'Ranking')],
  'eventos/outbreak': () => [print('eventos-info', 'Comunidade → Eventos: o que está acontecendo agora')],
  'eventos/ninho': () => [print('ev-ninho', 'Janela de Eventos: Ninho')],
  'eventos/captura': () => [print('ev-captura', 'Janela de Eventos: Captura')],
  'eventos/cofre': () => [print('ev-cofre', 'Janela de Eventos: Cofre')],
  'eventos/loteria': () => [print('ev-loteria', 'Janela de Eventos: Loteria')],
  'eventos/expedicao': () => [print('ev-expedicao', 'Janela de Eventos: Expedição')],
  'eventos/safari': () => [print('safari', 'Entrada do Safari')],
  'eventos/boss': () => [print('eventos-info', 'Comunidade → Eventos mostra quando há um Boss')],
  'eventos/torneio': () => [print('torneio', 'Torneio')],
  'eventos/liga': () => [print('liga', 'Liga Pokémon')],
  'bonus/vip': () => [print('doacao', 'O VIP vem nos pacotes de doação')],
  'bonus/skins': () => [print('skins', 'Minhas skins')],
  'bonus/titulos': () => [print('perfil', 'Os títulos ficam no seu perfil')],
  'bonus/charms': () => ['fire', 'water', 'grass'].map((t) => exemplo(iconeCharm(t), `${t[0].toUpperCase()}${t.slice(1)} Charm`)),
  'gachas/orbs': () => [
    print('orb', 'Janela de uma Orb'),
    exemplo(iconeTicketDoPokemon('ticket-palkia', 72), 'Orb de Palkia', 1),
    exemplo(iconeTicketDoPokemon('ticket-dialga', 72), 'Orb de Dialga', 1),
    exemplo(iconeTicketDoPokemon('ticket-giratina', 72), 'Orb de Giratina', 1),
  ],
  'gachas/ovos': () => [print('ovo', 'Janela de um ovo'), exemplo(iconeOvo('S'), 'Ovo Misterioso S'), exemplo(iconeOvo('L'), 'Ovo Lendário'), exemplo(iconeOvo('I'), 'Ovo Inicial')],
  'gachas/chave': () => [print('chave', 'Chave Temporal')],
  'gachas/kit': () => [exemplo(doItem('kit-iniciante'), 'Kit iniciante')],
};

/** Abre o guia; com `destino`, já abre naquele tópico (o tutorial usa). Sem destino e aberto, fecha. */
export function abrirGuia(destino?: { grupo: string; topico: string }): void {
  if (aberta) {
    aberta.fechar();
    if (!destino) return;
  }
  let grupo: GrupoGuia | null = destino ? GUIA.find((g) => g.id === destino.grupo) ?? null : null;
  let topico: TopicoGuia | null = destino && grupo ? grupo.topicos.find((t) => t.id === destino.topico) ?? null : null;

  const voltar = (texto: string, acao: () => void) => el('button', { class: 'botao secundario guia-voltar', onclick: acao }, `← ${texto}`);
  const paragrafo = (linha: string) => (linha.startsWith('• ') ? el('li', {}, linha.slice(2)) : el('p', {}, linha));

  aberta = abrirJanela('❓ Guia do jogo', (janela) => {
    if (grupo && topico) {
      // junta os itens "• " seguidos numa lista só
      const blocos: HTMLElement[] = [];
      let lista: HTMLElement | null = null;
      for (const linha of topico.texto) {
        const parte = paragrafo(linha);
        if (parte.tagName === 'LI') (lista ??= blocos[blocos.push(el('ul')) - 1]).append(parte);
        else (lista = null), blocos.push(parte);
      }
      return el('div', { class: 'guia' },
        voltar(grupo.nome, () => ((topico = null), janela.redesenhar())),
        el('h3', { class: 'guia-titulo' }, `${topico.emoji} ${topico.titulo}`),
        topico.trancas ? el('div', { class: 'guia-trancas' }, ...topico.trancas.map((t) =>
          el('span', { class: 'guia-tranca' }, t.rotulo ? `🔒 ${t.rotulo}: requer treinador nível ${NIVEL_MINIMO[t.conteudo]}` : `🔒 Requer treinador nível ${NIVEL_MINIMO[t.conteudo]}`))) : '',
        FIGURAS[`${grupo.id}/${topico.id}`] ? el('div', { class: 'guia-figuras' }, ...FIGURAS[`${grupo.id}/${topico.id}`]()) : '',
        el('div', { class: 'guia-texto' }, ...blocos));
    }
    if (grupo) {
      const g = grupo;
      return el('div', { class: 'guia' },
        voltar('Todos os assuntos', () => ((grupo = null), janela.redesenhar())),
        el('h3', { class: 'guia-titulo' }, `${g.emoji} ${g.nome}`),
        el('div', { class: 'guia-lista' },
          ...g.topicos.map((t) => el('button', { class: 'guia-item', onclick: () => ((topico = t), janela.redesenhar()) },
            el('span', { class: 'guia-emoji' }, t.emoji), el('strong', {}, t.titulo),
            t.trancas ? el('small', { class: 'guia-item-nivel' }, `🔒 Nv. ${Math.min(...t.trancas.map((x) => NIVEL_MINIMO[x.conteudo]))}`) : ''))));
    }
    return el('div', { class: 'guia' },
      el('p', { class: 'sub' }, 'Escolha um assunto para ver como funciona.'),
      el('div', { class: 'guia-grupos' },
        ...GUIA.map((g) => el('button', { class: 'guia-grupo', onclick: () => ((grupo = g), janela.redesenhar()) },
          el('span', { class: 'guia-emoji' }, g.emoji),
          el('strong', {}, g.nome),
          el('small', {}, g.descricao)))));
  }, { classe: 'janela-guia', aoFechar: () => (aberta = null) });
}
