// Pokédex: lista de todos os Pokémon da região com busca/filtro e a ficha completa da espécie
// (dados da PokéAPI + Pokémon Showdown: atributos, habilidades, fraquezas, evolução, golpes, onde achar).
import { Dex } from '@pkmn/sim';
import type { Tela } from '../main';
import { BIOMAS } from '../../../shared/biomas';
import { NIVEL_LENDARIO, montarTabela, type EntradaTabela } from '../../../shared/encontros';
import { especie, golpesPorNivel, nivelDeEvolucao } from '../../../shared/batalha/pokemon';
import maquinas from '../../../shared/data/maquinas.json';
import { REGIOES } from '../../../shared/regioes';
import { nomeCategoria, nomeTipo, traduzir } from '../../../shared/traducao';
import type { PokemonBase } from '../../../shared/tipos';
import { pokemonsDaRegiao } from '../dados';
import { carregarSave } from '../estado';
import { el, seloTipo, selosTipos, spritePokemon } from '../ui/dom';

const REGIAO = 'kanto';

const CRESCIMENTO: Record<string, string> = { fast: 'Rápido', medium: 'Médio', 'medium-slow': 'Médio-lento', slow: 'Lento' };
const ATRIBUTOS: [keyof PokemonBase['stats'], string][] = [
  ['hp', 'HP'], ['ataque', 'Attack'], ['defesa', 'Defense'], ['ataqueEspecial', 'Sp. Atk'], ['defesaEspecial', 'Sp. Def'], ['velocidade', 'Speed'],
];
const GRUPOS_OVO: Record<string, string> = {
  Monster: 'Monstro', 'Water 1': 'Água 1', 'Water 2': 'Água 2', 'Water 3': 'Água 3', Bug: 'Inseto', Flying: 'Voador', Field: 'Campo',
  Fairy: 'Fada', Grass: 'Planta', 'Human-Like': 'Humanoide', Mineral: 'Mineral', Amorphous: 'Amorfo', Dragon: 'Dragão',
  Ditto: 'Ditto', Undiscovered: 'Desconhecido',
};
const CONDICOES: Record<string, string> = { 'during the day': 'de dia', 'at night': 'à noite' };

/** Onde cada espécie aparece solta (bioma + faixa de nível). */
function mapaDeEncontros(pokemons: PokemonBase[]): Map<number, { bioma: string; entrada: EntradaTabela }> {
  const iniciais = REGIOES.find((r) => r.id === REGIAO)?.iniciais ?? [];
  const mapa = new Map<number, { bioma: string; entrada: EntradaTabela }>();
  for (const b of BIOMAS) for (const entrada of montarTabela(b, pokemons, iniciais)) mapa.set(entrada.pokemon.id, { bioma: b.nome, entrada });
  return mapa;
}

/** Como a espécie surge a partir da anterior (em português). */
function comoEvolui(p: PokemonBase): string {
  const s = especie(p.id);
  const nivel = nivelDeEvolucao(p.id);
  if (nivel) return `Nv. ${nivel}`;
  const condicao = s.evoCondition ? ` (${CONDICOES[s.evoCondition] ?? s.evoCondition})` : '';
  switch (s.evoType) {
    case 'useItem':
      return `Usar ${s.evoItem}`;
    case 'trade':
      return s.evoItem ? `Troca segurando ${s.evoItem}` : 'Troca';
    case 'levelFriendship':
      return `Amizade${condicao}`;
    case 'levelMove':
      return `Sabendo ${s.evoMove}`;
    default:
      return s.evoLevel ? `Nv. ${s.evoLevel}${condicao}` : s.evoItem ? `Usar ${s.evoItem}` : 'Condição especial';
  }
}

/** Multiplicador de dano de cada tipo atacante contra a espécie. */
function fraquezas(tipos: string[]): Map<number, string[]> {
  const alvo = tipos.map((t) => t[0].toUpperCase() + t.slice(1));
  const grupos = new Map<number, string[]>();
  for (const tipo of Dex.types.names()) {
    if (tipo === 'Stellar') continue;
    const mult = Dex.getImmunity(tipo, alvo) ? 2 ** Dex.getEffectiveness(tipo, alvo) : 0;
    if (mult === 1) continue;
    grupos.set(mult, [...(grupos.get(mult) ?? []), tipo]);
  }
  return grupos;
}

function podeAprenderTM(p: PokemonBase, golpe: string): boolean {
  const fontes = Dex.species.getLearnsetData(especie(p.id).id).learnset?.[golpe] ?? [];
  return fontes.some((f) => /^\dM$/.test(f));
}

const linha = (rotulo: string, valor: Node | string) => el('div', { class: 'dex-linha' }, el('span', {}, rotulo), el('strong', {}, valor));

function ficha(p: PokemonBase, todos: PokemonBase[], encontros: ReturnType<typeof mapaDeEncontros>, abrir: (id: number) => void): HTMLElement {
  const s = especie(p.id);
  const estado = { shiny: false, costas: false };
  const palco = el('div', { class: 'dex-palco' });
  const desenharSprite = () => palco.replaceChildren(spritePokemon(p, { shiny: estado.shiny, costas: estado.costas, palco: true, chao: 0.88 }));
  desenharSprite();
  const alternar = (chave: 'shiny' | 'costas', texto: string) => {
    const b = el('button', { class: 'botao secundario' }, texto);
    b.addEventListener('click', () => {
      estado[chave] = !estado[chave];
      b.classList.toggle('ligado', estado[chave]);
      desenharSprite();
    });
    return b;
  };

  // atributos base
  const total = ATRIBUTOS.reduce((soma, [a]) => soma + p.stats[a], 0);
  const atributos = el(
    'div',
    { class: 'dex-atributos' },
    ...ATRIBUTOS.map(([a, nome]) =>
      el('div', { class: 'dex-atributo' },
        el('span', {}, nome),
        el('strong', {}, String(p.stats[a])),
        el('span', { class: 'dex-barra' }, el('span', { style: { width: `${Math.min(100, (p.stats[a] / 200) * 100)}%`, background: `hsl(${Math.min(140, p.stats[a])} 70% 50%)` } })),
      ),
    ),
    el('div', { class: 'dex-atributo total' }, el('span', {}, 'Total'), el('strong', {}, String(total)), el('span')),
  );

  // habilidades
  const habilidades = el(
    'div',
    { class: 'dex-habilidades' },
    ...p.habilidades.map((h) => {
      const a = Dex.abilities.get(h.nome);
      return el('div', {}, el('strong', {}, a.name || h.nome), h.oculta ? el('small', { class: 'oculta' }, ' oculta') : null, el('p', {}, traduzir(a.shortDesc || a.desc)));
    }),
  );

  // fraquezas e resistências
  const grupos = fraquezas(p.tipos);
  const ROTULOS: [number, string][] = [[4, '4×'], [2, '2×'], [0.5, '½×'], [0.25, '¼×'], [0, 'Imune']];
  const efetividade = el(
    'div',
    { class: 'dex-efetividade' },
    ...ROTULOS.filter(([m]) => grupos.has(m)).map(([m, rotulo]) =>
      el('div', { class: 'dex-ef-linha' }, el('span', { class: 'dex-ef-mult' }, rotulo), el('div', { class: 'tipos' }, grupos.get(m)!.map((t) => seloTipo(t)))),
    ),
  );

  // linha evolutiva (só espécies da região)
  const cadeia = todos.filter((q) => q.cadeiaEvolucao === p.cadeiaEvolucao);
  const estagio = (q: PokemonBase): number => {
    const anterior = q.evoluiDe ? cadeia.find((c) => c.slug === q.evoluiDe) : undefined;
    return anterior ? estagio(anterior) + 1 : 0;
  };
  const porEstagio: PokemonBase[][] = [];
  for (const q of cadeia) (porEstagio[estagio(q)] ??= []).push(q);
  const evolucao = el(
    'div',
    { class: 'dex-evolucao' },
    ...porEstagio.flatMap((grupo, i) => [
      i > 0 ? el('span', { class: 'dex-seta' }, '→') : null,
      el('div', { class: 'dex-estagio' },
        ...grupo.map((q) =>
          el('button', { class: `dex-evo ${q.id === p.id ? 'atual' : ''}`, onclick: () => abrir(q.id) },
            spritePokemon(q, { animado: false }),
            el('span', {}, q.nome),
            i > 0 ? el('small', {}, comoEvolui(q)) : null,
          ),
        ),
      ),
    ]),
  );

  // onde encontrar
  const onde = encontros.get(p.id);
  const textoOnde = onde
    ? `${onde.bioma} · Nv. ${p.lendario || p.mitico ? `${Math.max(NIVEL_LENDARIO, onde.entrada.nivelMin)}+` : `${onde.entrada.nivelMin}–${onde.entrada.nivelMax}`}${p.lendario || p.mitico ? ' (raro)' : ''}`
    : REGIOES.find((r) => r.id === REGIAO)?.iniciais.includes(p.id)
      ? 'Inicial (escolhido no começo do jogo)'
      : 'Não aparece solto: só evoluindo';

  // gênero
  const genero = s.gender === 'N' ? 'Sem gênero' : s.gender === 'M' ? '100% ♂' : s.gender === 'F' ? '100% ♀' : `${(s.genderRatio.M * 100).toFixed(1).replace('.0', '')}% ♂ · ${(s.genderRatio.F * 100).toFixed(1).replace('.0', '')}% ♀`;
  const evs = Object.entries(p.evsDados).map(([a, v]) => `${v} ${ATRIBUTOS.find(([x]) => x === a)?.[1] ?? a}`).join(', ') || '—';

  // golpes por nível e por máquina
  const golpes = el(
    'table',
    { class: 'dex-golpes' },
    el('thead', {}, el('tr', {}, el('th', {}, 'Nv.'), el('th', {}, 'Golpe'), el('th', {}, 'Tipo'), el('th', {}, 'Categoria'), el('th', {}, 'Poder'), el('th', {}, 'Precisão'))),
    el('tbody', {},
      ...golpesPorNivel(p.id).map(({ id, nivel }) => {
        const m = Dex.moves.get(id);
        return el('tr', { title: traduzir(m.shortDesc) },
          el('td', {}, nivel <= 1 ? '—' : String(nivel)),
          el('td', {}, m.name),
          el('td', {}, seloTipo(m.type)),
          el('td', {}, nomeCategoria(m.category)),
          el('td', {}, m.basePower ? String(m.basePower) : '—'),
          el('td', {}, m.accuracy === true ? '—' : `${m.accuracy}%`),
        );
      }),
    ),
  );
  const tms = (maquinas as { id: string; golpe: string }[]).filter((m) => podeAprenderTM(p, m.golpe));
  const listaTms = el(
    'div',
    { class: 'dex-tms' },
    ...tms.map((m) => {
      const g = Dex.moves.get(m.golpe);
      const tr = m.id.startsWith('tr');
      return el('span', { class: 'dex-tm', title: `${nomeTipo(g.type)} · ${traduzir(g.shortDesc)}`, style: { borderColor: `var(--borda)` } },
        el('small', {}, `${tr ? 'TR' : 'TM'}${m.id.slice(2).padStart(tr ? 2 : 3, '0')}`), ' ', g.name);
    }),
  );

  const titulo = el('div', { class: 'dex-titulo' },
    el('span', { class: 'dex-numero' }, `#${String(p.id).padStart(4, '0')}`),
    el('h2', {}, p.nome),
    p.lendario ? el('span', { class: 'dex-selo lendario' }, 'Lendário') : null,
    p.mitico ? el('span', { class: 'dex-selo lendario' }, 'Mítico') : null,
    p.bebe ? el('span', { class: 'dex-selo' }, 'Bebê') : null,
  );

  return el(
    'article',
    { class: 'dex-ficha' },
    el('div', { class: 'dex-topo' },
      el('div', {}, palco, el('div', { class: 'dex-botoes' }, alternar('shiny', '✨ Shiny'), alternar('costas', 'Costas'))),
      el('div', { class: 'dex-resumo' },
        titulo,
        selosTipos(p),
        linha('Altura', `${(p.altura / 10).toLocaleString('pt-BR')} m`),
        linha('Peso', `${(p.peso / 10).toLocaleString('pt-BR')} kg`),
        linha('Gênero', genero),
        linha('Taxa de captura', `${p.taxaCaptura} / 255`),
        linha('Crescimento', CRESCIMENTO[p.crescimento ?? ''] ?? '—'),
        linha('XP base', String(p.experienciaBase ?? '—')),
        linha('EVs ao derrotar', evs),
        linha('Grupos de ovo', s.eggGroups.map((g) => GRUPOS_OVO[g] ?? g).join(', ')),
        linha('Onde encontrar', textoOnde),
      ),
    ),
    el('section', {}, el('h3', {}, 'Atributos base'), atributos),
    el('section', {}, el('h3', {}, 'Abilities'), habilidades),
    el('section', {}, el('h3', {}, 'Dano recebido por tipo'), efetividade),
    el('section', {}, el('h3', {}, 'Evolução'), cadeia.length > 1 ? evolucao : el('p', { class: 'dica' }, 'Não evolui.')),
    el('section', {}, el('h3', {}, 'Golpes por nível'), golpes),
    el('section', {}, el('h3', {}, `TMs e TRs (${tms.length})`), tms.length ? listaTms : el('p', { class: 'dica' }, 'Nenhum.')),
  );
}

export const telaPokedex = (inicial?: number): Tela => (raiz) => {
  const todos = pokemonsDaRegiao(REGIAO);
  const encontros = mapaDeEncontros(todos);
  const save = carregarSave();
  const vistos = new Set(save?.vistos ?? []);
  const capturados = new Set(save?.capturados ?? []);

  let selecionado = inicial ?? todos[0]?.id ?? 1;
  const busca = el('input', { type: 'search', placeholder: 'Buscar por nome ou número…', class: 'dex-busca' }) as HTMLInputElement;
  const tipos = [...new Set(todos.flatMap((p) => p.tipos))].sort((a, b) => nomeTipo(a[0].toUpperCase() + a.slice(1)).localeCompare(nomeTipo(b[0].toUpperCase() + b.slice(1))));
  const filtroTipo = el('select', { class: 'dex-filtro' },
    el('option', { value: '' }, 'Todos os tipos'),
    ...tipos.map((t) => el('option', { value: t }, nomeTipo(t[0].toUpperCase() + t.slice(1)))),
  ) as HTMLSelectElement;
  const lista = el('ol', { class: 'dex-lista' });
  const painel = el('div', { class: 'dex-painel' });

  const abrir = (id: number) => {
    selecionado = id;
    const p = todos.find((q) => q.id === id);
    if (p) painel.replaceChildren(ficha(p, todos, encontros, abrir));
    for (const item of lista.children) item.classList.toggle('ativo', (item as HTMLElement).dataset.id === String(id));
    painel.scrollTop = 0;
  };

  const desenharLista = () => {
    const termo = busca.value.trim().toLowerCase();
    const filtrados = todos.filter(
      (p) => (!termo || p.nome.toLowerCase().includes(termo) || String(p.id) === termo.replace('#', '')) && (!filtroTipo.value || p.tipos.includes(filtroTipo.value)),
    );
    lista.replaceChildren(
      ...filtrados.map((p) =>
        el('li', { 'data-id': p.id, class: p.id === selecionado ? 'ativo' : '', onclick: () => abrir(p.id) },
          spritePokemon(p, { animado: false }),
          el('span', { class: 'dex-num' }, `#${String(p.id).padStart(3, '0')}`),
          el('span', { class: 'dex-nome' }, p.nome),
          capturados.has(p.id) ? el('span', { class: 'dex-marca capturado', title: 'Capturado' }, '●') : vistos.has(p.id) ? el('span', { class: 'dex-marca', title: 'Visto' }, '○') : null,
        ),
      ),
    );
  };
  busca.addEventListener('input', desenharLista);
  filtroTipo.addEventListener('change', desenharLista);
  desenharLista();
  abrir(selecionado);

  raiz.append(
    el('main', { class: 'tela tela-pokedex' },
      el('header', { class: 'dex-cabecalho' },
        el('h1', {}, 'Pokédex', el('small', {}, ' · Kanto')),
        el('span', { class: 'meta' }, `${vistos.size} vistos · ${capturados.size} capturados · ${todos.length} no total`),
      ),
      el('div', { class: 'layout-pokedex' },
        el('aside', { class: 'dex-coluna' }, busca, filtroTipo, lista),
        painel,
      ),
    ),
  );
  // aberto pela Database: rola a lista até o Pokémon escolhido
  const ativo = lista.querySelector<HTMLElement>('.ativo');
  if (ativo) lista.scrollTop = ativo.offsetTop - lista.clientHeight / 2;
};
