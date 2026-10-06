import Phaser from 'phaser';
import type { Tela } from '../main';
import { biomaPorId } from '../../../shared/biomas';
import { regiaoPorId } from '../../../shared/regioes';
import { CHANCE_ENCONTRO_POR_PASSO, montarTabela, probabilidades, sortearEncontro } from '../../../shared/encontros';
import { ALTURA_TELA, BiomaScene, LARGURA_TELA } from '../jogo/BiomaScene';
import { abrirBatalha } from '../batalha/telaBatalha';
import { pokemonsDaRegiao } from '../dados';
import { carregarSave, curarTime, novoPokemon, salvar } from '../estado';
import { el, spritePokemon } from '../ui/dom';
import { aoMudarJanelas } from '../ui/janela';
import { botoesMenus } from '../ui/menus';
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
        el(
          'button',
          {
            class: 'botao secundario',
            onclick: () => {
              curarTime(save);
              atualizarTime();
            },
          },
          '❤ Curar time',
        ),
        ...botoesMenus(save, () => atualizarTime()),
        contador,
      ),
      el(
        'div',
        { class: 'layout-bioma' },
        el('section', {}, areaJogo, el('p', { class: 'dica' }, 'Ande com as setas ou W A S D. A cada passo aparece um Pokémon: Enter para lutar, ou continue andando para fugir.')),
        el('aside', {}, caixaTime, el('h2', {}, 'Pokémon deste bioma'), listaChances),
      ),
    ),
  );

  let fecharEncontro: (() => void) | undefined;
  const fugirDoEncontro = () => {
    fecharEncontro?.();
    fecharEncontro = undefined;
  };

  const cena = new BiomaScene({
    bioma,
    aoPisar: () => {
      // andar com um encontro aberto = fugir dele
      fugirDoEncontro();
      save.passos++;
      atualizarContador();
      if (tabela.length === 0 || Math.random() >= CHANCE_ENCONTRO_POR_PASSO) {
        salvar(save);
        return;
      }

      const encontro = sortearEncontro(tabela, bioma);
      if (!save.vistos.includes(encontro.pokemon.id)) save.vistos.push(encontro.pokemon.id);
      salvar(save);
      atualizarContador();

      const temQuemLute = save.time.some((p) => p.hp > 0);
      fecharEncontro = mostrarEncontro(areaJogo, encontro, {
        bloqueio: temQuemLute ? null : 'Seu time está desmaiado. Cure no Centro Pokémon.',
        lutar: () => {
          if (janelaAberta) return;
          fugirDoEncontro();
          emBatalha = true;
          atualizarPausa();
          abrirBatalha({
            save,
            bioma,
            selvagem: novoPokemon(encontro.pokemon.id, encontro.nivel, encontro.shiny),
            aoTerminar: (resultado) => {
              if (resultado === 'derrota') return navegar({ tela: 'regiao' });
              atualizarTime();
              atualizarContador();
              emBatalha = false;
              atualizarPausa();
            },
          });
        },
      });
    },
  });

  const jogo = new Phaser.Game({
    type: Phaser.AUTO,
    parent: areaJogo,
    width: LARGURA_TELA,
    height: ALTURA_TELA,
    pixelArt: true,
    backgroundColor: '#000000',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene: cena,
  });

  // o mapa fica parado durante a batalha e com PC/Bolsa/ficha abertos
  let emBatalha = false;
  let janelaAberta = false;
  function atualizarPausa() {
    cena.pausar(emBatalha || janelaAberta);
  }
  const pararDeOuvirJanelas = aoMudarJanelas((aberta) => {
    janelaAberta = aberta;
    atualizarPausa();
  });

  return () => {
    pararDeOuvirJanelas();
    fugirDoEncontro();
    jogo.destroy(true);
  };
};
