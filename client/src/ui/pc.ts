import { nomeItemEquipado } from '../../../shared/usoItens';
import { pokemonPorId } from '../dados';
import { NUMERO_BOXES, TAMANHO_BOX, TAMANHO_MAXIMO_TIME, TAMANHO_NOME_BOX, nomeDaBox, pokemonsDaBox, salvar, type PokemonDoJogador, type Save } from '../estado';
import { tornarArrastavel } from './arrastar';
import { fichaPokemon } from './detalhes';
import { abrirJanela } from './janela';
import { el, seloTier, spritePokemon } from './dom';
import { FUNDOS_BOX, estiloDoFundo, fundoDaBox, type FundoBox } from './fundosBox';
import { resumoAoPassar } from './resumo';
import { spriteMapa } from './spriteMapa';
import { cadeado, cartaoPokemon } from './time';

/** Box aberta por último (continua a mesma ao reabrir o PC). */
let boxAtual = 0;

/**
 * PC: time + 30 boxes de 50 (grade 10 × 5). Na box cada casa mostra só o Pokémon andando (sprite de mapa), com a
 * estrela do shiny e o cadeado; o resto aparece ao passar o mouse e ao clicar. Arrastar move/reordena (time ↔ box,
 * dentro da box, ou para a box vizinha soltando em cima das setas); clicar seleciona e mostra as opções (ficha,
 * item, mover de box, soltar). Cada box pode ganhar um nome e um fundo dos jogos (sem escolha, é branca); "Org. IVs"
 * ordena a box e a busca procura em todas.
 */
export function abrirPC(save: Save, aoMudar: () => void): void {
  let selecionado: PokemonDoJogador | null = null;
  let verFicha = false;
  /** Marcados para soltar juntos (segurar o clique num Pokémon marca; depois, cada clique marca/desmarca). */
  const marcados = new Set<PokemonDoJogador>();

  const mudou = () => {
    salvar(save);
    aoMudar();
  };
  /** A box aberta está com o nome em edição. */
  let renomeando = false;
  /** A lista de fundos da box aberta está aparecendo. */
  let escolhendoFundo = false;
  // busca em todas as boxes: o campo é o mesmo entre os redesenhos (não perde o texto nem o foco ao digitar)
  const campoBusca = el('input', { class: 'pc-busca', type: 'search', placeholder: 'Buscar em todas as boxes…', maxlength: 24 }) as HTMLInputElement;
  let desenharGrade = () => {};
  campoBusca.addEventListener('input', () => desenharGrade());
  const semAcento = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const avaliado = (p: PokemonDoJogador) => !!(p.ivsFaixa || p.ivsRevelados);
  const somaIvs = (p: PokemonDoJogador) => Object.values(p.ivs).reduce((s, v) => s + v, 0);
  const noTime = (p: PokemonDoJogador) => save.time.includes(p);
  const nome = (p: PokemonDoJogador) => pokemonPorId(p.especieId).nome;

  /** Tira o Pokémon de onde estiver (time ou PC). */
  const remover = (p: PokemonDoJogador) => {
    const lista = noTime(p) ? save.time : save.caixa;
    lista.splice(lista.indexOf(p), 1);
  };
  /** Coloca no PC, na box e posição dadas (posição = índice dentro da box). */
  const colocarNaBox = (p: PokemonDoJogador, box: number, posicao = Infinity) => {
    const daBox = pokemonsDaBox(save, box).filter((q) => q !== p);
    remover(p);
    p.box = box;
    const antes = daBox[posicao];
    if (antes) save.caixa.splice(save.caixa.indexOf(antes), 0, p);
    else save.caixa.push(p);
  };
  const colocarNoTime = (p: PokemonDoJogador, posicao: number) => {
    remover(p);
    delete p.box;
    save.time.splice(Math.min(posicao, save.time.length), 0, p);
  };

  /** Regras de soltar um Pokémon arrastado num alvo. Devolve false se não pode. */
  function mover(p: PokemonDoJogador, alvo: HTMLElement): boolean {
    const tipo = alvo.dataset.alvo;
    const i = Number(alvo.dataset.i ?? 0);
    if (tipo === 'time') {
      if (noTime(p)) {
        colocarNoTime(p, i);
        return true;
      }
      if (save.time.length < TAMANHO_MAXIMO_TIME) {
        colocarNoTime(p, i);
        return true;
      }
      // time cheio: troca de lugar com quem está na vaga (o outro vai para o lugar dele na box)
      const outro = save.time[i];
      save.caixa[save.caixa.indexOf(p)] = outro;
      outro.box = p.box;
      delete p.box;
      save.time[i] = p;
      return true;
    }
    if (tipo === 'box' || tipo === 'outra-box') {
      const box = tipo === 'box' ? boxAtual : Number(alvo.dataset.box);
      const cabe = pokemonsDaBox(save, box).filter((q) => q !== p).length < TAMANHO_BOX;
      if (!cabe) return false;
      if (noTime(p) && save.time.length <= 1) return false;
      colocarNaBox(p, box, tipo === 'box' ? i : Infinity);
      return true;
    }
    return false;
  }

  /** Janela de confirmação para soltar (o Pokémon não volta). */
  function confirmarSoltar(p: PokemonDoJogador, depois: () => void) {
    const janela = abrirJanela(
      'Soltar Pokémon',
      () =>
        el(
          'div',
          { class: 'soltar' },
          el('div', { class: 'soltar-palco' }, spritePokemon(pokemonPorId(p.especieId), { shiny: p.shiny, palco: true, chao: 0.85 })),
          el('p', {}, 'Soltar ', el('strong', {}, `${nome(p)} Nv. ${p.nivel}`), '? Ele vai embora e não volta mais.'),
          p.item ? el('p', { class: 'meta' }, `O item ${nomeItemEquipado(p.item)} volta para a bolsa.`) : null,
          el(
            'div',
            { class: 'soltar-botoes' },
            el('button', { class: 'botao secundario', onclick: () => janela.fechar() }, 'Cancelar'),
            el(
              'button',
              {
                class: 'botao perigo',
                onclick: () => {
                  if (p.item) save.itens[p.item] = (save.itens[p.item] ?? 0) + 1;
                  remover(p);
                  janela.fechar();
                  depois();
                },
              },
              'Soltar',
            ),
          ),
        ),
      { classe: 'janela-soltar' },
    );
  }

  /** Confirmação para soltar vários de uma vez. */
  function confirmarSoltarVarios(lista: PokemonDoJogador[], depois: () => void) {
    const janela = abrirJanela(
      `Soltar ${lista.length} Pokémon`,
      () =>
        el(
          'div',
          { class: 'soltar' },
          el('div', { class: 'soltar-grupo' }, ...lista.map((p) => el('div', { class: 'soltar-mini' }, spritePokemon(pokemonPorId(p.especieId), { shiny: p.shiny, animado: false }), el('small', {}, `${nome(p)} Nv. ${p.nivel}`)))),
          el('p', {}, `Soltar estes ${lista.length} Pokémon? Eles vão embora e não voltam mais.`),
          lista.some((p) => p.item) ? el('p', { class: 'meta' }, 'Os itens que eles seguravam voltam para a bolsa.') : null,
          el(
            'div',
            { class: 'soltar-botoes' },
            el('button', { class: 'botao secundario', onclick: () => janela.fechar() }, 'Cancelar'),
            el('button', {
              class: 'botao perigo',
              onclick: () => {
                for (const p of lista) {
                  if (p.item) save.itens[p.item] = (save.itens[p.item] ?? 0) + 1;
                  remover(p);
                }
                janela.fechar();
                depois();
              },
            }, `Soltar ${lista.length}`),
          ),
        ),
      { classe: 'janela-soltar' },
    );
  }

  /**
   * Ordena a box aberta pela soma dos IVs, do maior para o menor. Só os já avaliados entram na ordem; os outros
   * ficam no fim, como estavam (senão o botão revelaria de graça quem tem IV alto).
   */
  const organizarPorIvs = () => {
    const daBox = pokemonsDaBox(save, boxAtual);
    const ordenados = [...daBox].sort((a, b) => Number(avaliado(b)) - Number(avaliado(a)) || (avaliado(a) ? somaIvs(b) - somaIvs(a) : 0));
    const lugares = daBox.map((p) => save.caixa.indexOf(p));
    lugares.forEach((lugar, k) => (save.caixa[lugar] = ordenados[k]));
  };

  abrirJanela(
    'PC de Pokémon',
    (janela) => {
      const refazer = () => janela.redesenhar();
      if (selecionado && !save.time.includes(selecionado) && !save.caixa.includes(selecionado)) selecionado = null;
      for (const m of [...marcados]) if (!save.time.includes(m) && !save.caixa.includes(m)) marcados.delete(m);
      const marcar = (q: PokemonDoJogador) => {
        if (marcados.has(q)) marcados.delete(q);
        // trancado não entra na lista de soltar
        else if (!q.trancado) marcados.add(q);
        refazer();
      };

      const classes = (p: PokemonDoJogador) => `${selecionado === p && !marcados.size ? 'selecionada' : ''} ${marcados.has(p) ? 'marcada' : ''} ${p.hp <= 0 ? 'desmaiado' : ''}`;
      const arrastavel = (c: HTMLElement, p: PokemonDoJogador) => {
        tornarArrastavel(c, {
          aoSegurar: () => marcar(p),
          aoClicar: () => {
            // com algum marcado, o clique marca/desmarca em vez de abrir as opções
            if (marcados.size) return marcar(p);
            selecionado = p;
            verFicha = false;
            refazer();
          },
          aoSoltar: (destino) => {
            if (destino && mover(p, destino)) {
              selecionado = p;
              mudou();
            }
            refazer();
          },
        });
        return c;
      };
      /** Cartão completo (time). */
      const cartao = (p: PokemonDoJogador, alvo: Record<string, string | number>) => arrastavel(cartaoPokemon(p, { class: `vaga ${classes(p)}`, ...prefixar(alvo) }), p);
      /** Casa da box: só o Pokémon andando, a estrela do shiny e o cadeado; `legenda` = nome da box (resultado da busca). */
      const casa = (p: PokemonDoJogador, atributos: Record<string, unknown>, legenda?: string) => {
        const c = el(
          'button',
          { class: `vaga casa-box ${legenda ? 'casa-resultado' : ''} ${classes(p)}`, ...atributos },
          spriteMapa(p.especieId, p.shiny),
          p.shiny ? el('span', { class: 'casa-estrela', title: 'Shiny' }, '★') : null,
          p.trancado ? cadeado('casa-trancado') : null,
          legenda ? el('small', {}, legenda) : null,
        );
        resumoAoPassar(c, () => p);
        return c;
      };

      const vagasTime = Array.from({ length: TAMANHO_MAXIMO_TIME }, (_, i) =>
        save.time[i] ? cartao(save.time[i], { alvo: 'time', i }) : el('div', { class: 'vaga vazia', 'data-alvo': 'time', 'data-i': i }),
      );
      const daBox = pokemonsDaBox(save, boxAtual);
      const irPara = (b: number) => {
        boxAtual = (b + NUMERO_BOXES) % NUMERO_BOXES;
        renomeando = false;
        escolhendoFundo = false;
        refazer();
      };

      // a grade: a box aberta ou, com algo escrito na busca, os Pokémon de todas as boxes com aquele nome
      const grade = el('div', { class: 'vagas vagas-box' });
      Object.assign(grade.style, estiloDoFundo(fundoDaBox(save, boxAtual)));
      // fundos da box: branco ou um dos papéis de parede dos jogos
      const usarFundo = (fundo: FundoBox | null) => {
        const fundos = (save.fundosBox ??= []);
        while (fundos.length <= boxAtual) fundos.push(null);
        fundos[boxAtual] = fundo?.id ?? null;
        escolhendoFundo = false;
        mudou();
        refazer();
      };
      const amostra = (fundo: FundoBox | null) => {
        const b = el('button', { class: `fundo-amostra ${fundoDaBox(save, boxAtual) === fundo ? 'ativo' : ''}`, title: fundo ? `${fundo.nome} · ${fundo.jogo}` : 'Branco', onclick: () => usarFundo(fundo) });
        Object.assign(b.style, estiloDoFundo(fundo));
        return b;
      };
      const listaDeFundos = () =>
        el(
          'div',
          { class: 'fundos-box' },
          el('small', {}, 'Fundo desta box'),
          el('div', { class: 'fundos-grade' }, amostra(null), ...FUNDOS_BOX.map(amostra)),
        );
      desenharGrade = () => {
        const termo = semAcento(campoBusca.value.trim());
        grade.classList.toggle('buscando', !!termo);
        if (!termo) {
          grade.replaceChildren(
            ...Array.from({ length: TAMANHO_BOX }, (_, i) =>
              daBox[i] ? arrastavel(casa(daBox[i], prefixar({ alvo: 'box', i })), daBox[i]) : el('div', { class: 'vaga vazia', 'data-alvo': 'box', 'data-i': i }),
            ),
          );
          return;
        }
        const achados = save.caixa.filter((q) => semAcento(nome(q)).includes(termo)).sort((a, b) => (a.box ?? 0) - (b.box ?? 0));
        grade.replaceChildren(
          ...(achados.length
            ? achados.map((q) =>
                casa(q, {
                  title: `${nome(q)} Nv. ${q.nivel} · ${nomeDaBox(save, q.box ?? 0)} (clique para ir até ele)`,
                  onclick: () => {
                    boxAtual = q.box ?? 0;
                    selecionado = q;
                    verFicha = false;
                    campoBusca.value = '';
                    refazer();
                  },
                }, nomeDaBox(save, q.box ?? 0)),
              )
            : [el('p', { class: 'meta' }, 'Nenhum Pokémon com esse nome nas boxes.')]),
        );
      };
      desenharGrade();

      // escolher a box: setas e lista (soltar um Pokémon em cima de uma seta manda para aquela box)
      const lista = el(
        'select',
        { class: 'box-lista' },
        ...Array.from({ length: NUMERO_BOXES }, (_, b) => el('option', { value: b, selected: b === boxAtual }, `${nomeDaBox(save, b)} (${pokemonsDaBox(save, b).length}/${TAMANHO_BOX})`)),
      ) as HTMLSelectElement;
      lista.addEventListener('change', () => irPara(Number(lista.value)));
      const seta = (passo: number) => {
        const b = (boxAtual + passo + NUMERO_BOXES) % NUMERO_BOXES;
        return el('button', { class: 'botao secundario box-seta', 'data-alvo': 'outra-box', 'data-box': b, title: `${nomeDaBox(save, b)} (solte um Pokémon aqui para mandar para ela)`, onclick: () => irPara(b) }, passo < 0 ? '◀' : '▶');
      };
      // renomear a box aberta (vazio = volta a ser "Box N")
      const campoNome = el('input', { class: 'box-nome', type: 'text', maxlength: TAMANHO_NOME_BOX, placeholder: `Box ${boxAtual + 1}`, value: save.nomesBox?.[boxAtual] ?? '' }) as HTMLInputElement;
      const guardarNome = () => {
        const nomes = (save.nomesBox ??= []);
        while (nomes.length <= boxAtual) nomes.push(null);
        nomes[boxAtual] = campoNome.value.trim().replace(/\s+/g, ' ') || null;
        renomeando = false;
        mudou();
        refazer();
      };
      campoNome.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') guardarNome();
        else if (e.key === 'Escape') {
          e.stopPropagation();
          renomeando = false;
          refazer();
        }
      });
      if (renomeando) queueMicrotask(() => (campoNome.focus(), campoNome.select()));

      // opções do selecionado
      const acoes: (HTMLElement | null)[] = [];
      const p = selecionado;
      if (p) {
        acoes.push(el('button', { class: 'botao secundario', onclick: () => ((verFicha = !verFicha), refazer()) }, verFicha ? 'Esconder ficha' : 'Ver ficha'));
        if (p.item) {
          const item = p.item;
          acoes.push(
            el('button', { class: 'botao secundario', onclick: () => ((save.itens[item] = (save.itens[item] ?? 0) + 1), (p.item = null), mudou(), refazer()) }, `Tirar ${nomeItemEquipado(item)}`),
          );
        }
        if (noTime(p)) {
          acoes.push(
            el(
              'button',
              {
                class: 'botao secundario',
                disabled: save.time.length <= 1 || daBox.length >= TAMANHO_BOX,
                title: save.time.length <= 1 ? 'O time precisa de pelo menos 1 Pokémon' : '',
                onclick: () => (colocarNaBox(p, boxAtual), mudou(), refazer()),
              },
              `Guardar em ${nomeDaBox(save, boxAtual)}`,
            ),
          );
        } else {
          acoes.push(
            el(
              'button',
              {
                class: 'botao secundario',
                disabled: save.time.length >= TAMANHO_MAXIMO_TIME,
                title: save.time.length >= TAMANHO_MAXIMO_TIME ? 'Time cheio' : '',
                onclick: () => (colocarNoTime(p, save.time.length), mudou(), refazer()),
              },
              'Levar para o time',
            ),
          );
          const destino = el(
            'select',
            { class: 'box-lista' },
            ...Array.from({ length: NUMERO_BOXES }, (_, b) =>
              el('option', { value: b, selected: b === p.box, disabled: b !== p.box && pokemonsDaBox(save, b).length >= TAMANHO_BOX }, nomeDaBox(save, b)),
            ),
          ) as HTMLSelectElement;
          acoes.push(
            el('span', { class: 'mover-box' }, destino, el('button', { class: 'botao secundario', onclick: () => {
              const b = Number(destino.value);
              if (b === p.box) return;
              colocarNaBox(p, b);
              mudou();
              refazer();
            } }, 'Mover')),
          );
        }
        // trancar: o Pokémon não pode ser solto até destrancar (proteção contra soltar sem querer)
        acoes.push(
          el('button', { class: `botao secundario botao-trancar ${p.trancado ? 'ligado' : ''}`, onclick: () => ((p.trancado = !p.trancado), mudou(), refazer()) },
            cadeado(), p.trancado ? 'Destrancar' : 'Trancar'),
          el(
            'button',
            {
              class: 'botao perigo',
              disabled: !!p.trancado || (noTime(p) && save.time.length <= 1),
              title: p.trancado ? 'Trancado: destranque para poder soltar' : '',
              onclick: () => confirmarSoltar(p, () => ((selecionado = null), mudou(), refazer())),
            },
            'Soltar',
          ),
        );
      }

      const pc = el(
        'div',
        { class: 'pc' },
        el('section', {}, el('h4', {}, `Time (${save.time.length}/${TAMANHO_MAXIMO_TIME})`), el('div', { class: 'vagas vagas-time' }, vagasTime)),
        el(
          'section',
          { class: 'pc-box' },
          el(
            'div',
            { class: 'box-cabecalho' },
            seta(-1),
            renomeando ? campoNome : lista,
            seta(1),
            renomeando
              ? el('button', { class: 'botao secundario', onclick: guardarNome }, 'Salvar nome')
              : el('button', { class: 'botao secundario', title: 'Dar um nome a esta box', onclick: () => ((renomeando = true), refazer()) }, '✏️ Renomear'),
            el('button', { class: `botao secundario ${escolhendoFundo ? 'ligado' : ''}`, title: 'Trocar o fundo desta box', onclick: () => ((escolhendoFundo = !escolhendoFundo), refazer()) }, '🖼️ Fundo'),
            el('button', {
              class: 'botao secundario',
              disabled: daBox.length < 2,
              title: 'Ordena esta box pela soma dos IVs, do maior para o menor. Só os já avaliados entram na ordem; os outros ficam no fim.',
              onclick: () => (organizarPorIvs(), mudou(), refazer()),
            }, '⇅ Org. IVs'),
          ),
          escolhendoFundo ? listaDeFundos() : null,
          el('div', { class: 'box-busca' }, campoBusca, el('button', { class: 'botao secundario', title: 'Limpar a busca', onclick: () => ((campoBusca.value = ''), desenharGrade()) }, '×')),
          grade,
        ),
        el(
          'div',
          { class: 'acoes-pc' },
          marcados.size
            ? (() => {
                const lista = [...marcados];
                const timeTodo = save.time.length > 0 && save.time.every((t) => marcados.has(t));
                return [
                  el('strong', {}, `${lista.length} marcado${lista.length > 1 ? 's' : ''} para soltar`),
                  el('button', {
                    class: 'botao perigo',
                    disabled: timeTodo,
                    title: timeTodo ? 'O time precisa ficar com pelo menos 1 Pokémon' : '',
                    onclick: () => confirmarSoltarVarios(lista, () => (marcados.clear(), (selecionado = null), mudou(), refazer())),
                  }, `Soltar ${lista.length}`),
                  el('button', { class: 'botao secundario', onclick: () => (marcados.clear(), refazer()) }, 'Cancelar'),
                ];
              })()
            : p
              ? [el('strong', {}, `${nome(p)}${p.shiny ? ' ★' : ''} Nv. ${p.nivel}`), seloTier(p), ...acoes]
              : el('span', { class: 'meta' }, 'Clique num Pokémon para ver as opções, arraste para mover, ou segure o clique para marcar vários e soltar juntos.'),
        ),
      );
      // "Ver ficha": a ficha abre à esquerda e o PC vai para a direita
      // a janela alarga quando a ficha está aberta
      queueMicrotask(() => pc.closest('.janela')?.classList.toggle('com-ficha', verFicha && !!p));
      return verFicha && p ? el('div', { class: 'pc-com-ficha' }, el('div', { class: 'pc-ficha' }, fichaPokemon(p)), pc) : pc;
    },
    { classe: 'janela-pc' },
  );
}

/** { alvo: 'box', i: 3 } → { 'data-alvo': 'box', 'data-i': 3 } */
function prefixar(dados: Record<string, string | number>): Record<string, string | number> {
  return Object.fromEntries(Object.entries(dados).map(([k, v]) => [`data-${k}`, v]));
}
