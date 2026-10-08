// Jogar → Duelos com treinadores: sorteia um dos 50 treinadores NPC, mostra o time (no nível da média do seu time)
// e a recompensa, e abre a batalha. Lista de todos os treinadores embaixo.
import type { Tela } from '../main';
import { BIOMAS } from '../../../shared/biomas';
import { NOMES_DIFICULDADE, RECOMPENSA_POR_DIFICULDADE, TREINADORES_NPC, montarTimeNpc, sortearTreinador, type Dificuldade, type TreinadorNpc } from '../../../shared/treinadoresNpc';
import { abrirBatalha } from '../batalha/telaBatalha';
import { pokemonPorId } from '../dados';
import { carregarSave, salvar } from '../estado';
import { el, spritePokemon } from '../ui/dom';

/** Imagem do personagem (sprites do Pokémon Showdown, guardados em client/public/treinadores). */
export const imagemTreinador = (id: string) => `treinadores/${id}.png`;

/** Roleta do "Sortear outro": tempo total e intervalo inicial/final entre as trocas (vai desacelerando). */
const DURACAO_ROLETA_MS = 2600;
const PASSO_INICIAL_MS = 60;
const PASSO_FINAL_MS = 320;

// adversário sorteado fica guardado enquanto o jogo está aberto: sair e voltar na aba não sorteia de novo de graça
let npcAtual: TreinadorNpc | null = null;

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
  let npc: TreinadorNpc = npcAtual ??= sortearTreinador();
  let sorteando = false;
  let equipe = montarTimeNpc(npc, save.time, crescimentoDe);
  const cartao = el('section', { class: 'cartao-duelo' });

  /** Roleta: os retratos passam cada vez mais devagar e param no sorteado; botões travados até acabar. */
  const sortearOutro = () => {
    if (sorteando) return;
    sorteando = true;
    const escolhido = sortearTreinador(Math.random, npc.id);
    // já fica valendo: sair da aba no meio da roleta não cancela o sorteio
    npcAtual = escolhido;
    const retrato = el('img', { class: 'retrato-npc', alt: '' });
    const nome = el('h2', {}, '');
    const titulo = el('small', { class: 'meta' }, '');
    cartao.replaceChildren(
      el('div', { class: 'duelo-topo duelo-roleta' }, retrato, el('div', { class: 'duelo-nome' }, titulo, nome)),
      el('p', { class: 'sub duelo-sorteando' }, 'Sorteando adversário…'),
      el('div', { class: 'duelo-botoes' },
        el('button', { class: 'botao grande', disabled: true }, 'Batalhar!'),
        el('button', { class: 'botao secundario', disabled: true }, 'Sorteando…')),
    );
    const mostrar = (t: TreinadorNpc) => {
      retrato.setAttribute('src', imagemTreinador(t.id));
      nome.textContent = t.nome;
      titulo.textContent = t.titulo;
    };
    const inicio = performance.now();
    let anterior = '';
    const girar = () => {
      if (!cartao.isConnected) return (sorteando = false);
      const passou = performance.now() - inicio;
      if (passou >= DURACAO_ROLETA_MS) {
        npc = npcAtual = escolhido;
        equipe = montarTimeNpc(npc, save.time, crescimentoDe);
        sorteando = false;
        desenhar();
        cartao.classList.remove('duelo-revelado');
        void cartao.offsetWidth;
        cartao.classList.add('duelo-revelado');
        return;
      }
      const outros = TREINADORES_NPC.filter((t) => t.id !== anterior);
      const t = outros[Math.floor(Math.random() * outros.length)];
      anterior = t.id;
      mostrar(t);
      const fracao = passou / DURACAO_ROLETA_MS;
      setTimeout(girar, PASSO_INICIAL_MS + (PASSO_FINAL_MS - PASSO_INICIAL_MS) * fracao * fracao);
    };
    girar();
  };

  const desenhar = () => {
    const recompensa = RECOMPENSA_POR_DIFICULDADE[npc.dificuldade];
    const podeLutar = save.time.some((p) => p.hp > 0);
    cartao.replaceChildren(
      el('div', { class: 'duelo-topo' },
        el('img', { class: 'retrato-npc', src: imagemTreinador(npc.id), alt: npc.nome }),
        el('div', { class: 'duelo-nome' }, el('small', { class: 'meta' }, npc.titulo), el('h2', {}, npc.nome)),
        el('div', { class: 'duelo-dificuldade' }, estrelas(npc.dificuldade), el('small', {}, NOMES_DIFICULDADE[npc.dificuldade]))),
      el('div', { class: 'duelo-time' },
        ...equipe.map((p) => {
          const d = pokemonPorId(p.especieId);
          return el('div', { class: 'duelo-pokemon' }, spritePokemon(d, { animado: false }), el('small', {}, `${d.nome} · Nv. ${p.nivel}`));
        })),
      el('div', { class: 'duelo-info' }, el('strong', {}, `Recompensa: ${recompensa.toLocaleString('pt-BR')} silver`)),
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
              treinador: { nome: npc.nome, titulo: npc.titulo, equipe, recompensa, imagem: imagemTreinador(npc.id), duelo: true },
              aoTerminar: () => {
                // depois da batalha vem outro adversário
                npcAtual = null;
                salvar(save);
                navegar({ tela: 'duelos' });
              },
            });
          },
        }, 'Batalhar!'),
        el('button', { class: 'botao secundario', onclick: sortearOutro }, 'Sortear outro')),
    );
  };
  desenhar();

  tela.append(el('p', { class: 'sub' }, 'Um treinador é sorteado entre 50 personagens dos jogos e do anime.'), cartao);
};
