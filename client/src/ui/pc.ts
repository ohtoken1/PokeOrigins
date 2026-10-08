import { nomeItemEquipado } from '../../../shared/usoItens';
import { pokemonPorId } from '../dados';
import { NUMERO_BOXES, TAMANHO_BOX, TAMANHO_MAXIMO_TIME, pokemonsDaBox, salvar, type PokemonDoJogador, type Save } from '../estado';
import { tornarArrastavel } from './arrastar';
import { fichaPokemon } from './detalhes';
import { abrirJanela } from './janela';
import { el, spritePokemon } from './dom';
import { cadeado, cartaoPokemon } from './time';

/** Box aberta por último (continua a mesma ao reabrir o PC). */
let boxAtual = 0;

/**
 * PC: time + 20 boxes de 30. Arrastar um Pokémon move/reordena (time ↔ box, dentro da box ou
 * para outra box pelas abas); clicar seleciona e mostra as opções (ficha, item, mover de box, soltar).
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

      const cartao = (p: PokemonDoJogador, alvo: Record<string, string | number>) => {
        const c = cartaoPokemon(p, { class: `vaga ${selecionado === p && !marcados.size ? 'selecionada' : ''} ${marcados.has(p) ? 'marcada' : ''} ${p.hp <= 0 ? 'desmaiado' : ''}`, ...prefixar(alvo) });
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

      const vagasTime = Array.from({ length: TAMANHO_MAXIMO_TIME }, (_, i) =>
        save.time[i] ? cartao(save.time[i], { alvo: 'time', i }) : el('div', { class: 'vaga vazia', 'data-alvo': 'time', 'data-i': i }),
      );
      const daBox = pokemonsDaBox(save, boxAtual);
      const vagasBox = Array.from({ length: TAMANHO_BOX }, (_, i) =>
        daBox[i] ? cartao(daBox[i], { alvo: 'box', i }) : el('div', { class: 'vaga vazia', 'data-alvo': 'box', 'data-i': i }),
      );

      // navegação entre boxes: setas, lista e "abas" numeradas (soltar numa aba manda o Pokémon para aquela box)
      const irPara = (b: number) => {
        boxAtual = (b + NUMERO_BOXES) % NUMERO_BOXES;
        refazer();
      };
      const lista = el(
        'select',
        { class: 'box-lista' },
        ...Array.from({ length: NUMERO_BOXES }, (_, b) => el('option', { value: b, selected: b === boxAtual }, `Box ${b + 1} (${pokemonsDaBox(save, b).length}/${TAMANHO_BOX})`)),
      ) as HTMLSelectElement;
      lista.addEventListener('change', () => irPara(Number(lista.value)));
      const abas = el(
        'div',
        { class: 'box-abas' },
        ...Array.from({ length: NUMERO_BOXES }, (_, b) =>
          el(
            'button',
            {
              class: `box-aba ${b === boxAtual ? 'ativa' : ''}`,
              'data-alvo': 'outra-box',
              'data-box': b,
              title: `Box ${b + 1} · ${pokemonsDaBox(save, b).length}/${TAMANHO_BOX} (solte um Pokémon aqui para mandar para esta box)`,
              onclick: () => irPara(b),
            },
            String(b + 1),
          ),
        ),
      );

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
              `Guardar na Box ${boxAtual + 1}`,
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
              el('option', { value: b, selected: b === p.box, disabled: b !== p.box && pokemonsDaBox(save, b).length >= TAMANHO_BOX }, `Box ${b + 1}`),
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
          {},
          el(
            'div',
            { class: 'box-cabecalho' },
            el('button', { class: 'botao secundario', title: 'Box anterior', onclick: () => irPara(boxAtual - 1) }, '◀'),
            lista,
            el('button', { class: 'botao secundario', title: 'Próxima box', onclick: () => irPara(boxAtual + 1) }, '▶'),
          ),
          abas,
          el('div', { class: 'vagas vagas-box' }, vagasBox),
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
              ? [el('strong', {}, `${nome(p)} Nv. ${p.nivel}`), ...acoes]
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
