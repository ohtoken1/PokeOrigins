import Phaser from 'phaser';
import type { Tela } from '../main';
import { biomaPorId } from '../../../shared/biomas';
import { regiaoPorId } from '../../../shared/regioes';
import { NIVEL_ESCOLHER_ENCONTRO, nivelTreinador } from '../../../shared/treinador';
import { CHANCE_ENCONTRO_POR_PASSO, faixaDosEncontros, montarTabela, probabilidades, sortearEncontro } from '../../../shared/encontros';
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
  const nivelDoTreinador = nivelTreinador(save.xpTreinador);
  const podeEscolherNivel = nivelDoTreinador >= NIVEL_ESCOLHER_ENCONTRO;
  const faixaNatural = faixaDosEncontros(bioma, nivelDoTreinador);
  const faixaAtual = () => faixaDosEncontros(bioma, nivelDoTreinador, podeEscolherNivel ? save.nivelEncontro : null);

  const contador = el('span', { class: 'meta' }, '');
  const atualizarContador = () =>
    (contador.textContent = `Treinador Nv. ${nivelTreinador(save.xpTreinador)} · ${save.passos} passos · ${save.vistos.length} vistos`);
  atualizarContador();

  let cena: BiomaScene | undefined;
  const caixaTime = el('div', {});
  const atualizarTime = () => {
    caixaTime.replaceChildren(painelTime(save.time));
    // o primeiro do time anda atrás do jogador (a cena ainda não existe na primeira chamada)
    cena?.definirSeguidor(save.time[0]?.especieId ?? null);
  };
  atualizarTime();

  // só os Pokémon que podem aparecer na faixa de nível atual
  const listaChances = el('ol', { class: 'lista-chances' });
  const atualizarChances = () => {
    const chances = probabilidades(tabela, faixaAtual());
    listaChances.replaceChildren(
      ...tabela
      .map((entrada, i) => ({ entrada, chance: chances[i] }))
      .filter(({ chance }) => chance > 0)
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
  };
  atualizarChances();

  const tituloChances = el('h2', {}, '');
  const atualizarTitulo = () => {
    const [min, max] = faixaAtual();
    tituloChances.textContent = `Pokémon deste bioma · Nv. ${min}–${max}`;
  };
  atualizarTitulo();

  const areaJogo = el('div', { class: 'area-jogo' });
  // a partir do nível 35 de treinador: escolher o nível dos encontros (canto do mapa)
  if (podeEscolherNivel) {
    const valor = el('strong', {}, '');
    const deslizante = el('input', { type: 'range', min: 1, max: faixaNatural[1], value: save.nivelEncontro ?? faixaNatural[1] });
    const auto = el('input', { type: 'checkbox', checked: save.nivelEncontro === null });
    const aplicar = () => {
      save.nivelEncontro = auto.checked ? null : Number(deslizante.value);
      deslizante.disabled = auto.checked;
      valor.textContent = auto.checked ? 'Auto' : `Nv. ${deslizante.value}`;
      salvar(save);
      atualizarChances();
      atualizarTitulo();
    };
    deslizante.addEventListener('input', aplicar);
    auto.addEventListener('change', aplicar);
    // não deixar as setas do teclado mexerem no controle em vez de andar
    deslizante.addEventListener('keydown', (e) => e.preventDefault());
    areaJogo.append(el('div', { class: 'nivel-encontros' }, el('span', {}, 'Encontros: ', valor), deslizante, el('label', {}, auto, ' Auto')));
    aplicar();
  }
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
        el('aside', {}, caixaTime, tituloChances, listaChances),
      ),
    ),
  );

  let fecharEncontro: (() => void) | undefined;
  const fugirDoEncontro = () => {
    fecharEncontro?.();
    fecharEncontro = undefined;
  };

  cena = new BiomaScene({
    bioma,
    seguidor: save.time[0]?.especieId ?? null,
    aoPisar: () => {
      // andar com um encontro aberto = fugir dele
      fugirDoEncontro();
      save.passos++;
      atualizarContador();
      if (tabela.length === 0 || Math.random() >= CHANCE_ENCONTRO_POR_PASSO) {
        salvar(save);
        return;
      }

      const encontro = sortearEncontro(tabela, faixaAtual());
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
    cena?.pausar(emBatalha || janelaAberta);
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
