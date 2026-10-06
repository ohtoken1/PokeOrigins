import type { Tela } from '../main';
import { biomaPorId } from '../../../shared/biomas';
import { regiaoPorId } from '../../../shared/regioes';
import { nivelTreinador } from '../../../shared/treinador';
import { NIVEL_LENDARIO, ajustarTabela, biomaDoPokemon, encontroForcado, faixaDosEncontros, montarTabela, probabilidades, sortearEncontro } from '../../../shared/encontros';
import { comoEvolui } from '../../../shared/evolucoes';
import type { BiomaScene, OpcoesBioma } from '../jogo/BiomaScene';
import { mostrarJogo } from '../jogo/jogoUnico';
import { abrirBatalha } from '../batalha/telaBatalha';
import { pokemonPorId, pokemonsDaRegiao, todosOsPokemons } from '../dados';
import { ajustesAdmin, aoMudarAdmin } from '../ui/admin';
import { carregarSave, usarSave, curarTime, novoPokemon, salvar } from '../estado';
import { el, selosTipos, spritePokemon } from '../ui/dom';
import { aoMudarJanelas } from '../ui/janela';
import { botaoIcone, botoesMenus } from '../ui/menus';
import { mostrarEncontro } from '../ui/popupEncontro';
import { painelTime } from '../ui/time';
import { atalhosBiomas } from '../ui/atalhosBiomas';

export const telaBioma = (biomaId: string): Tela => (raiz, navegar) => {
  const save = carregarSave();
  if (!save) return navegar({ tela: 'inicial' });
  usarSave(save);
  const bioma = biomaPorId(biomaId);
  const regiao = regiaoPorId(save.regiao);
  const tabelaNormal = montarTabela(bioma, pokemonsDaRegiao(regiao.id), [], todosOsPokemons());
  // tabela com os ajustes do painel de administrador (lendários mais/menos comuns…)
  let tabela = ajustarTabela(tabelaNormal, ajustesAdmin());
  const nivelDoTreinador = nivelTreinador(save.xpTreinador);
  const faixaNatural = faixaDosEncontros(bioma, nivelDoTreinador);
  const faixaAtual = () => faixaDosEncontros(bioma, nivelDoTreinador, save.nivelEncontro);

  const contador = el('span', { class: 'meta' }, '');
  const atualizarContador = () =>
    (contador.textContent = `Treinador Nv. ${nivelTreinador(save.xpTreinador)} · ${save.passos} passos · ${save.vistos.length} vistos`);
  atualizarContador();

  let cena: () => BiomaScene | null = () => null;
  const caixaTime = el('div', {});
  const atualizarTime = () => {
    caixaTime.replaceChildren(
      painelTime(save.time, () => {
        salvar(save);
        atualizarTime();
      }),
    );
    // o primeiro do time anda atrás do jogador (a cena ainda não existe na primeira chamada)
    cena()?.definirSeguidor(save.time[0] ? { especie: save.time[0].especieId, shiny: save.time[0].shiny } : null);
  };
  atualizarTime();

  // todos os Pokémon que moram neste bioma: com % só quem pode aparecer na faixa de nível atual;
  // os de outras faixas mostram o nível, e os que só vêm por evolução (pedra/troca/amizade) mostram como
  const moradores = pokemonsDaRegiao(regiao.id).filter((p) => biomaDoPokemon(p) === bioma.id);
  // atalhos minimizados: um botãozinho com o sprite de cada morador; clicar mostra a ficha curta embaixo
  const listaChances = el('div', { class: 'atalhos-moradores' });
  const fichaMorador = el('div', { class: 'ficha-morador' });
  let selecionado: number | null = null;
  const atualizarChances = () => {
    const nivelFixo = ajustesAdmin().nivel;
    const chances = probabilidades(tabela, nivelFixo === null ? faixaAtual() : [nivelFixo, nivelFixo]);
    const chancePorId = new Map(tabela.map((e, i) => [e.pokemon.id, chances[i]]));
    const entradaPorId = new Map(tabelaNormal.map((e) => [e.pokemon.id, e]));
    const linhas = moradores.map((p) => {
      const chance = chancePorId.get(p.id) ?? 0;
      const entrada = entradaPorId.get(p.id);
      const lendario = p.lendario || p.mitico;
      const info = chance > 0
        ? `${(chance * 100).toFixed(chance < 0.0001 ? 4 : chance < 0.001 ? 3 : 2)}%`
        : entrada
          ? `Nv. ${lendario ? `${Math.max(NIVEL_LENDARIO, entrada.nivelMin)}+` : `${entrada.nivelMin}–${entrada.nivelMax}`}`
          : comoEvolui(p);
      return { p, chance, info, solto: !!entrada };
    });
    linhas.sort((a, b) => b.chance - a.chance || Number(b.solto) - Number(a.solto) || a.p.id - b.p.id);
    const mostrarFicha = () => {
      const linha = linhas.find((l) => l.p.id === selecionado);
      if (!linha) return fichaMorador.replaceChildren();
      const { p, chance, info, solto } = linha;
      const capturado = save.capturados.includes(p.id);
      const visto = save.vistos.includes(p.id);
      fichaMorador.replaceChildren(
        spritePokemon(p, { animado: false }),
        el(
          'div',
          {},
          el('strong', {}, `#${p.id} ${p.nome}`),
          selosTipos(p),
          el('small', {}, chance > 0 ? `Aparição agora: ${info}` : solto ? `Aparece em outra faixa: ${info}` : `Não aparece solto: ${info}`),
          el('small', { class: capturado ? 'capturado' : visto ? 'visto' : 'nunca' }, capturado ? '● Já capturado' : visto ? '○ Já visto (não capturado)' : '— Nunca visto'),
        ),
        el('button', { class: 'botao secundario', title: 'Ver na Pokédex', onclick: () => navegar({ tela: 'pokedex', id: p.id }) }, 'Pokédex'),
      );
    };
    listaChances.replaceChildren(
      ...linhas.map(({ p, chance, info, solto }) => {
        const capturado = save.capturados.includes(p.id);
        const botao = el(
          'button',
          {
            class: `morador ${save.vistos.includes(p.id) ? 'visto' : ''} ${chance > 0 ? '' : 'fora-da-faixa'} ${selecionado === p.id ? 'selecionado' : ''}`,
            title: `${p.nome} · ${chance > 0 ? info : solto ? `outra faixa (${info})` : info}`,
            onclick: () => {
              selecionado = selecionado === p.id ? null : p.id;
              listaChances.querySelectorAll('.morador').forEach((b) => b.classList.remove('selecionado'));
              if (selecionado !== null) botao.classList.add('selecionado');
              mostrarFicha();
            },
          },
          spritePokemon(p, { animado: false }),
          capturado ? el('span', { class: 'marca-capturado', title: 'Capturado' }) : null,
          chance > 0 ? el('small', {}, `${(chance * 100).toFixed(chance < 0.0001 ? 4 : chance < 0.001 ? 3 : 2)}%`) : null,
        );
        return botao;
      }),
    );
    mostrarFicha();
  };
  atualizarChances();

  const tituloChances = el('h2', {}, '');
  const atualizarTitulo = () => {
    const [min, max] = faixaAtual();
    const { nivel, especie } = ajustesAdmin();
    tituloChances.textContent = `Pokémon deste bioma · Nv. ${nivel ?? `${min}–${max}`}${especie !== null ? ' · (admin: Pokémon forçado)' : ''}`;
  };
  atualizarTitulo();

  const areaJogo = el('div', { class: 'area-jogo' });
  // escolher um teto MENOR para os encontros (canto do mapa); disponível em qualquer nível
  {
    const valor = el('strong', {}, '');
    const deslizante = el('input', { type: 'range', min: 1, max: faixaNatural[1], value: save.nivelEncontro ?? faixaNatural[1] });
    const auto = el('input', { type: 'checkbox', checked: save.nivelEncontro === null });
    const aplicar = () => {
      save.nivelEncontro = auto.checked ? null : Number(deslizante.value);
      deslizante.disabled = auto.checked;
      valor.textContent = auto.checked ? `Nv. ${faixaNatural[1]} (máx.)` : `Nv. ${deslizante.value}`;
      salvar(save);
      atualizarChances();
      atualizarTitulo();
    };
    deslizante.addEventListener('input', aplicar);
    auto.addEventListener('change', aplicar);
    // não deixar as setas do teclado mexerem no controle em vez de andar
    deslizante.addEventListener('keydown', (e) => e.preventDefault());
    areaJogo.append(el('div', { class: 'nivel-encontros' }, el('span', {}, 'Encontros até: ', valor), deslizante, el('label', {}, auto, ' Auto')));
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
        botaoIcone('coracao', 'Curar time', () => {
          curarTime(save);
          atualizarTime();
        }),
        ...botoesMenus(save, () => atualizarTime(), true),
        contador,
      ),
      el(
        'div',
        { class: 'layout-bioma' },
        el('section', {}, atalhosBiomas(bioma.id, (id) => navegar({ tela: 'bioma', biomaId: id })), areaJogo, el('p', { class: 'dica' }, 'Ande com as setas ou W A S D. A cada passo aparece um Pokémon: Enter para lutar, ou continue andando para fugir.')),
        el('aside', {}, caixaTime, tituloChances, listaChances, fichaMorador),
      ),
    ),
  );

  let fecharEncontro: (() => void) | undefined;
  const fugirDoEncontro = () => {
    fecharEncontro?.();
    fecharEncontro = undefined;
  };

  // aviso enquanto o mapa é gerado e desenhado (antes ficava só um quadro preto)
  const carregando = el('div', { class: 'carregando-mapa' }, el('span', { class: 'giro' }), 'Carregando mapa…');
  areaJogo.append(carregando);

  const opcoesCena: OpcoesBioma = {
    bioma,
    aoPronto: () => carregando.remove(),
    seguidor: save.time[0] ? { especie: save.time[0].especieId, shiny: save.time[0].shiny } : null,
    aoPisar: () => {
      // andar com um encontro aberto = fugir dele
      fugirDoEncontro();
      save.passos++;
      atualizarContador();
      const ajustes = ajustesAdmin();
      if (tabela.length === 0 || Math.random() >= ajustes.chancePorPasso) {
        salvar(save);
        return;
      }

      const encontro =
        ajustes.especie !== null ? encontroForcado(pokemonPorId(ajustes.especie), faixaAtual(), ajustes) : sortearEncontro(tabela, faixaAtual(), Math.random, ajustes);
      if (!save.vistos.includes(encontro.pokemon.id)) save.vistos.push(encontro.pokemon.id);
      salvar(save);
      atualizarContador();

      // o indivíduo já nasce aqui para o cartão mostrar o gênero
      const selvagem = novoPokemon(encontro.pokemon.id, encontro.nivel, encontro.shiny);
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
            selvagem,
            aoTerminar: (resultado) => {
              if (resultado === 'derrota') return navegar({ tela: 'regiao' });
              atualizarTime();
              atualizarContador();
              emBatalha = false;
              atualizarPausa();
            },
          });
        },
      }, selvagem.genero);
    },
  };

  const jogo = mostrarJogo(areaJogo, opcoesCena);
  cena = jogo.cena;

  // o mapa fica parado durante a batalha e com PC/Bolsa/ficha abertos
  let emBatalha = false;
  let janelaAberta = false;
  function atualizarPausa() {
    cena()?.pausar(emBatalha || janelaAberta);
  }
  const pararDeOuvirJanelas = aoMudarJanelas((aberta) => {
    janelaAberta = aberta;
    atualizarPausa();
  });

  const pararDeOuvirAdmin = aoMudarAdmin(() => {
    tabela = ajustarTabela(tabelaNormal, ajustesAdmin());
    atualizarChances();
    atualizarTitulo();
  });

  return () => {
    pararDeOuvirAdmin();
    pararDeOuvirJanelas();
    fugirDoEncontro();
    jogo.tirar();
  };
};
