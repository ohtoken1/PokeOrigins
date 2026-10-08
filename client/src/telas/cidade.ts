// Jogar → Cidade: a cidade inicial, onde os jogadores ficam quando não estão caçando nos mapas nem competindo.
// Mapa e prédios em jogo/cidade.ts (por enquanto só visuais: portas e NPCs ainda não fazem nada).
// Usa o mesmo jogo (Phaser) dos biomas, com o mapa da cidade e sem encontros.
import type { Tela } from '../main';
import { biomaPorId } from '../../../shared/biomas';
import type { BiomaScene, OpcoesBioma } from '../jogo/BiomaScene';
import { mostrarJogo } from '../jogo/jogoUnico';
import { carregarSave, usarSave, salvar } from '../estado';
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
  raiz.append(
    el('main', { class: 'tela tela-bioma tela-cidade' },
      el('header', { class: 'barra' },
        el('button', { class: 'botao secundario', onclick: () => navegar({ tela: 'inicio' }) }, '← Voltar'),
        el('h1', {}, 'Cidade', el('small', {}, ' · cidade inicial')),
        ...botoesMenus(save, () => atualizarTime(), true),
      ),
      el('div', { class: 'layout-bioma' },
        el('section', {}, areaJogo, el('p', { class: 'dica' }, 'Ande com as setas ou W A S D. Aqui não aparecem Pokémon selvagens. Os prédios ainda são só visuais (em breve dá para entrar).')),
        el('aside', {}, caixaTime),
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
    nomeJogador: save.mostrarNome === false ? undefined : save.aparencia?.nome,
  };
  const jogo = mostrarJogo(areaJogo, opcoes);
  cena = jogo.cena;

  // o mapa para com PC/Bolsa/ficha abertos
  const pararDeOuvirJanelas = aoMudarJanelas((aberta) => cena()?.pausar(aberta));

  return () => {
    pararDeOuvirJanelas();
    jogo.tirar();
  };
};
