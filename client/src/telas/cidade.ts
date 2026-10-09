// Jogar → Cidade: a cidade inicial, onde os jogadores ficam quando não estão caçando nos mapas nem competindo.
// Mapa e prédios em jogo/cidade.ts. Os nomes dos lugares são botões (Centro Pokémon cura, Pokémarket abre a loja,
// Move Reminder/Move Tutor abrem os professores, estação vai para os mapas, Arena para os ginásios) e o minimapa
// no canto mostra onde fica cada um. Usa o mesmo jogo (Phaser) dos biomas, com o mapa da cidade e sem encontros.
import type { Tela } from '../main';
import { biomaPorId } from '../../../shared/biomas';
import type { BiomaScene, OpcoesBioma } from '../jogo/BiomaScene';
import { mostrarJogo } from '../jogo/jogoUnico';
import { carregarSave, curarTime, usarSave, salvar } from '../estado';
import { abrirLoja } from '../ui/loja';
import { abrirProfessores } from './golpes';
import { montarMinimapa } from '../ui/minimapa';
import { abrirMenuJogador } from '../ui/menuJogador';
import { montarChat } from '../ui/chat';
import { el } from '../ui/dom';
import { aoMudarJanelas } from '../ui/janela';
import { botoesMenus } from '../ui/menus';
import { painelTime } from '../ui/time';
import { APARENCIA_PADRAO, montarPersonagem } from '../personagem/lpc';

export const telaCidade: Tela = (raiz, navegar) => {
  const save = carregarSave();
  if (!save) return navegar({ tela: 'inicial' });
  usarSave(save);

  let cena: () => BiomaScene | null = () => null;
  const caixaTime = el('div', {});
  const atualizarTime = () => {
    caixaTime.replaceChildren(
      painelTime(save.time, () => {
        salvar(save);
        atualizarTime();
      }),
    );
    cena()?.definirSeguidor(save.time[0] ? { especie: save.time[0].especieId, shiny: save.time[0].shiny } : null);
  };
  atualizarTime();

  const areaJogo = el('div', { class: 'area-jogo' });
  const chat = montarChat();
  raiz.append(
    el('main', { class: 'tela tela-bioma tela-cidade' },
      el('header', { class: 'barra' },
        el('button', { class: 'botao secundario', onclick: () => navegar({ tela: 'inicio' }) }, '← Voltar'),
        el('h1', {}, 'Cidade', el('small', {}, ' · cidade inicial')),
        ...botoesMenus(save, () => atualizarTime(), true),
      ),
      el('div', { class: 'layout-bioma' },
        el('section', {}, areaJogo, el('p', { class: 'dica' }, 'Ande com as setas ou W A S D. Aqui não aparecem Pokémon selvagens. Clique no nome de um lugar (ou no minimapa) para usar: Centro Pokémon, Pokémarket, Move Reminder, Move Tutor…')),
        el('aside', {}, caixaTime, chat.elemento),
      ),
    ),
  );

  const carregando = el('div', { class: 'carregando-mapa' }, el('span', { class: 'giro' }), 'Carregando cidade…');
  areaJogo.append(carregando);

  // boné guardado para depois (pedido do dono), como nos biomas
  const aparencia = { ...(save.aparencia ?? APARENCIA_PADRAO), bone: 'nenhum' as const };
  const opcoes: OpcoesBioma = {
    bioma: biomaPorId('grama'),
    cidade: true,
    aoPronto: () => carregando.remove(),
    seguidor: save.time[0] ? { especie: save.time[0].especieId, shiny: save.time[0].shiny } : null,
    // na cidade não há encontros
    aoPisar: () => {},
    personagem: { chave: JSON.stringify(aparencia), folhas: montarPersonagem(aparencia) },
    nomeJogador: save.aparencia?.nome,
    aoClicarLocal: (acao) => usarLocal(acao),
    // todos os jogadores na mesma cidade
    sala: 'cidade',
    aoClicarJogador: abrirMenuJogador,
  };
  const jogo = mostrarJogo(areaJogo, opcoes);
  cena = jogo.cena;

  // aviso curto em cima do jogo ("Seus Pokémon foram curados!")
  const aviso = el('div', { class: 'cidade-aviso', role: 'status' });
  areaJogo.append(aviso);
  let relogioAviso = 0;
  const avisar = (texto: string) => {
    aviso.textContent = texto;
    aviso.classList.add('visivel');
    clearTimeout(relogioAviso);
    relogioAviso = window.setTimeout(() => aviso.classList.remove('visivel'), 2200);
  };
  /** O que cada lugar faz ao clicar no nome (ou no minimapa). */
  function usarLocal(acao: string) {
    if (acao === 'centro') {
      // futuramente: animação da enfermeira/máquina de cura
      curarTime(save!);
      atualizarTime();
      avisar('Seus Pokémon foram curados!');
    } else if (acao === 'loja') abrirLoja(save!, () => atualizarTime());
    else if (acao === 'reminder') abrirProfessores(save!, 'relembrar', () => atualizarTime());
    else if (acao === 'tutor') abrirProfessores(save!, 'tutor', () => atualizarTime());
    else if (acao === 'estacao') navegar({ tela: 'regiao' });
    else if (acao === 'arena') navegar({ tela: 'ginasios' });
    else avisar(acao === 'banco' ? 'Banco: em breve.' : acao === 'torneios' ? 'Quadro de torneios: em breve.' : 'Mural de anúncios: em breve.');
  }
  const minimapa = montarMinimapa(areaJogo, () => cena(), usarLocal);

  // o mapa para com PC/Bolsa/ficha abertos
  const pararDeOuvirJanelas = aoMudarJanelas((aberta) => cena()?.pausar(aberta));

  return () => {
    pararDeOuvirJanelas();
    minimapa.parar();
    chat.parar();
    clearTimeout(relogioAviso);
    jogo.tirar();
  };
};
