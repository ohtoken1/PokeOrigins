import Phaser from 'phaser';
import type { Tela } from '../main';
import { biomaPorId } from '../../../shared/biomas';
import { regiaoPorId } from '../../../shared/regioes';
import { CHANCE_ENCONTRO_POR_PASSO, montarTabela, probabilidades, sortearEncontro } from '../../../shared/encontros';
import { BiomaScene, COLUNAS, LINHAS, TILE } from '../jogo/BiomaScene';
import { pokemonsDaRegiao } from '../dados';
import { carregarSave, salvar, TAMANHO_MAXIMO_TIME } from '../estado';
import { el, spritePokemon } from '../ui/dom';
import { mostrarEncontro } from '../ui/popupEncontro';
import { painelTime } from '../ui/time';

export const telaBioma = (biomaId: string): Tela => (raiz, navegar) => {
  const save = carregarSave();
  if (!save) return navegar({ tela: 'inicial' });
  const bioma = biomaPorId(biomaId);
  const regiao = regiaoPorId(save.regiao);
  const tabela = montarTabela(bioma, pokemonsDaRegiao(regiao.id), regiao.iniciais);
  const chances = probabilidades(tabela);

  const contador = el('span', { class: 'meta' }, '');
  const atualizarContador = () => (contador.textContent = `${save.passos} passos · ${save.vistos.length} vistos`);
  atualizarContador();

  const caixaTime = el('div', {});
  const atualizarTime = () => caixaTime.replaceChildren(painelTime(save.time));
  atualizarTime();

  const listaChances = el(
    'ol',
    { class: 'lista-chances' },
    tabela
      .map((entrada, i) => ({ entrada, chance: chances[i] }))
      .sort((a, b) => b.chance - a.chance)
      .map(({ entrada, chance }) =>
        el(
          'li',
          { class: save.vistos.includes(entrada.pokemon.id) ? 'visto' : '' },
          spritePokemon(entrada.pokemon, { animado: false }),
          el('span', {}, entrada.pokemon.nome),
          el('small', {}, `${(chance * 100).toFixed(1)}%`),
        ),
      ),
  );

  const areaJogo = el('div', { class: 'area-jogo' });
  raiz.append(
    el(
      'main',
      { class: 'tela tela-bioma' },
      el(
        'header',
        { class: 'barra' },
        el('button', { class: 'botao secundario', onclick: () => navegar({ tela: 'regiao' }) }, '← Voltar'),
        el('h1', {}, `${bioma.nome}`, el('small', {}, ` · ${regiao.nome}`)),
        contador,
      ),
      el(
        'div',
        { class: 'layout-bioma' },
        el('section', {}, areaJogo, el('p', { class: 'dica' }, 'Ande com as setas ou W A S D. Pokémon aparecem quando você anda no mato.')),
        el('aside', {}, caixaTime, el('h2', {}, 'Pokémon deste bioma'), listaChances),
      ),
    ),
  );

  let fecharPopup: (() => void) | undefined;
  const cena = new BiomaScene({
    bioma,
    aoPisar: (celula) => {
      save.passos++;
      atualizarContador();
      if (celula !== 'zona' || tabela.length === 0 || Math.random() >= CHANCE_ENCONTRO_POR_PASSO) {
        salvar(save);
        return;
      }

      const encontro = sortearEncontro(tabela, bioma);
      if (!save.vistos.includes(encontro.pokemon.id)) save.vistos.push(encontro.pokemon.id);
      salvar(save);
      atualizarContador();

      cena.pausar(true);
      const encerrar = () => {
        fecharPopup?.();
        fecharPopup = undefined;
        cena.pausar(false);
      };
      fecharPopup = mostrarEncontro(document.body, encontro, {
        podeCapturar: save.time.length < TAMANHO_MAXIMO_TIME,
        capturar: () => {
          save.time.push({ especieId: encontro.pokemon.id, nivel: encontro.nivel, shiny: encontro.shiny });
          salvar(save);
          atualizarTime();
          encerrar();
        },
        fugir: encerrar,
      });
    },
  });

  const jogo = new Phaser.Game({
    type: Phaser.AUTO,
    parent: areaJogo,
    width: COLUNAS * TILE,
    height: LINHAS * TILE,
    pixelArt: true,
    backgroundColor: '#000000',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene: cena,
  });

  return () => {
    fecharPopup?.();
    jogo.destroy(true);
  };
};
