// Jogar → Duelos com treinadores: sorteia um dos 50 treinadores NPC, mostra o time (no nível da média do seu time)
// e a recompensa, e abre a batalha. Lista de todos os treinadores embaixo.
import type { Tela } from '../main';
import { BIOMAS } from '../../../shared/biomas';
import { IV_POR_DIFICULDADE, NOMES_DIFICULDADE, RECOMPENSA_POR_DIFICULDADE, TREINADORES_NPC, montarTimeNpc, nivelDoDuelo, sortearTreinador, type Dificuldade, type TreinadorNpc } from '../../../shared/treinadoresNpc';
import { abrirBatalha } from '../batalha/telaBatalha';
import { pokemonPorId } from '../dados';
import { carregarSave, salvar } from '../estado';
import { el, spritePokemon } from '../ui/dom';

const estrelas = (d: Dificuldade) => el('span', { class: `estrelas dificuldade-${d}`, title: NOMES_DIFICULDADE[d] }, '★'.repeat(d), el('span', { class: 'apagadas' }, '★'.repeat(5 - d)));

export const telaDuelos: Tela = (raiz, navegar) => {
  const save = carregarSave();
  const tela = el('main', { class: 'tela tela-duelos' }, el('h1', {}, 'Duelos com treinadores'));
  raiz.append(tela);
  if (!save) {
    tela.append(el('p', { class: 'sub' }, 'Comece um jogo para duelar.'), el('button', { class: 'botao', onclick: () => navegar({ tela: 'inicial' }) }, 'Começar'));
    return;
  }
  const crescimentoDe = (n: number) => pokemonPorId(n).crescimento;
  const nivel = nivelDoDuelo(save.time);
  let npc: TreinadorNpc = sortearTreinador();
  let equipe = montarTimeNpc(npc, save.time, crescimentoDe);
  const cartao = el('section', { class: 'cartao-duelo' });

  const desenhar = () => {
    const recompensa = RECOMPENSA_POR_DIFICULDADE[npc.dificuldade];
    const podeLutar = save.time.some((p) => p.hp > 0);
    cartao.replaceChildren(
      el('div', { class: 'duelo-topo' },
        el('div', {}, el('small', { class: 'meta' }, npc.titulo), el('h2', {}, npc.nome)),
        el('div', { class: 'duelo-dificuldade' }, estrelas(npc.dificuldade), el('small', {}, NOMES_DIFICULDADE[npc.dificuldade]))),
      el('div', { class: 'duelo-time' },
        ...equipe.map((p) => {
          const d = pokemonPorId(p.especieId);
          return el('div', { class: 'duelo-pokemon' }, spritePokemon(d, { animado: false }), el('small', {}, `${d.nome} · Nv. ${p.nivel}`));
        })),
      el('div', { class: 'duelo-info' },
        el('span', {}, `Nível ${nivel} (média do seu time)`),
        el('span', {}, `IVs ${IV_POR_DIFICULDADE[npc.dificuldade]} · sem EVs`),
        el('strong', {}, `Recompensa: ${recompensa.toLocaleString('pt-BR')} silver`)),
      el('div', { class: 'duelo-botoes' },
        el('button', {
          class: 'botao grande',
          disabled: !podeLutar,
          title: podeLutar ? '' : 'Seu time está todo desmaiado: cure no Centro Pokémon',
          onclick: () => {
            abrirBatalha({
              save,
              selvagem: equipe[0],
              bioma: BIOMAS[Math.floor(Math.random() * BIOMAS.length)],
              treinador: { nome: npc.nome, titulo: npc.titulo, equipe, recompensa },
              aoTerminar: () => {
                salvar(save);
                navegar({ tela: 'duelos' });
              },
            });
          },
        }, 'Batalhar!'),
        el('button', { class: 'botao secundario', onclick: () => ((npc = sortearTreinador(Math.random, npc.id)), (equipe = montarTimeNpc(npc, save.time, crescimentoDe)), desenhar()) }, 'Sortear outro')),
    );
  };
  desenhar();

  // todos os treinadores, por dificuldade
  const lista = el('details', { class: 'lista-treinadores' },
    el('summary', {}, `Todos os treinadores (${TREINADORES_NPC.length})`),
    ...([1, 2, 3, 4, 5] as Dificuldade[]).map((d) =>
      el('div', { class: 'grupo-treinadores' },
        el('h4', {}, estrelas(d), ` ${NOMES_DIFICULDADE[d]} · ${RECOMPENSA_POR_DIFICULDADE[d].toLocaleString('pt-BR')} silver`),
        ...TREINADORES_NPC.filter((x) => x.dificuldade === d).map((x) =>
          el('div', { class: 'linha-treinador-npc' },
            el('strong', {}, x.nome), el('small', {}, x.titulo),
            el('span', { class: 'mini-time' }, ...x.time.map((n) => spritePokemon(pokemonPorId(n), { animado: false }))))))),
  );
  tela.append(el('p', { class: 'sub' }, 'Um treinador é sorteado entre 50 personagens dos jogos e do anime. O time dele fica no nível médio do seu time.'), cartao, lista);
};
