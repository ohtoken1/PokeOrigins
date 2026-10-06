// Database: informações gerais do jogo em tabelas (Pokémon, itens, habilidades e golpes),
// com busca e ordenação por coluna. Textos em português (descrições traduzidas).
import { Dex } from '@pkmn/sim';
import type { Tela } from '../main';
import { CATALOGO, CATEGORIAS, MOEDA } from '../../../shared/loja';
import { nomeCategoria, nomeTipo, traduzir } from '../../../shared/traducao';
import type { PokemonBase } from '../../../shared/tipos';
import { ORDEM_TIERS, tierDoPokemon } from '../../../shared/tiers';
import { todosOsPokemons } from '../dados';
import { REGIOES } from '../../../shared/regioes';
import { CATEGORIAS_POKEMON, categoriasDoPokemon } from '../../../shared/categorias';
import { el, seloTipo, selosTipos, spritePokemon } from '../ui/dom';
import { iconeItem } from '../ui/iconeItem';

interface Coluna<T> {
  titulo: string;
  /** conteúdo da célula */
  celula: (linha: T) => Node | string;
  /** valor para ordenar (sem ele, a coluna não ordena) */
  ordem?: (linha: T) => number | string;
  classe?: string;
}

interface Secao<T> {
  id: string;
  nome: string;
  linhas: T[];
  colunas: Coluna<T>[];
  /** texto usado na busca */
  busca: (linha: T) => string;
  aoClicar?: (linha: T) => void;
  /** caixas de filtro (tipo, tier, categoria…): a linha passa se algum valor dela bater com o escolhido */
  filtros?: Filtro<T>[];
}

const POR_PAGINA = 100;
interface Filtro<T> {
  todos: string;
  opcoes: [valor: string, texto: string][];
  valores: (linha: T) => string[];
}

const TODOS_TIPOS = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

/** Tabela com busca, ordenação e "mostrar mais". */
function tabela<T>(secao: Secao<T>): HTMLElement {
  const campo = el('input', { type: 'search', class: 'db-busca', placeholder: `Buscar em ${secao.nome.toLowerCase()}…` }) as HTMLInputElement;
  const contador = el('span', { class: 'meta' });
  const filtros = (secao.filtros ?? []).map((f) => {
    const caixa = el('select', { class: 'db-busca db-filtro' }, el('option', { value: '' }, f.todos), ...f.opcoes.map(([v, t]) => el('option', { value: v }, t))) as HTMLSelectElement;
    caixa.addEventListener('change', () => {
      limite = POR_PAGINA;
      desenhar();
    });
    return { f, caixa };
  });
  const corpo = el('tbody');
  const mais = el('button', { class: 'botao secundario db-mais' }, 'Mostrar mais');
  let ordem: { i: number; asc: boolean } | null = null;
  let limite = POR_PAGINA;

  const cabecalhos = secao.colunas.map((c, i) => {
    const th = el('th', { class: `${c.classe ?? ''} ${c.ordem ? 'ordenavel' : ''}` }, c.titulo);
    if (c.ordem)
      th.addEventListener('click', () => {
        ordem = ordem?.i === i ? { i, asc: !ordem.asc } : { i, asc: true };
        cabecalhos.forEach((h, j) => h.setAttribute('data-ordem', ordem?.i === j ? (ordem.asc ? '▲' : '▼') : ''));
        desenhar();
      });
    return th;
  });

  const desenhar = () => {
    const termo = campo.value.trim().toLowerCase();
    let linhas = secao.linhas.filter(
      (l) => (!termo || secao.busca(l).toLowerCase().includes(termo)) && filtros.every(({ f, caixa }) => !caixa.value || f.valores(l).includes(caixa.value)),
    );
    if (ordem) {
      const { i, asc } = ordem;
      const valor = secao.colunas[i].ordem!;
      linhas.sort((a, b) => {
        const [x, y] = [valor(a), valor(b)];
        const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return asc ? r : -r;
      });
    }
    contador.textContent = `${linhas.length} resultado${linhas.length === 1 ? '' : 's'}`;
    mais.hidden = linhas.length <= limite;
    linhas = linhas.slice(0, limite);
    corpo.replaceChildren(
      ...linhas.map((l) => {
        const tr = el('tr', { class: secao.aoClicar ? 'clicavel' : '' }, ...secao.colunas.map((c) => el('td', { class: c.classe ?? '' }, c.celula(l))));
        if (secao.aoClicar) tr.addEventListener('click', () => secao.aoClicar!(l));
        return tr;
      }),
    );
  };
  campo.addEventListener('input', () => {
    limite = POR_PAGINA;
    desenhar();
  });
  mais.addEventListener('click', () => {
    limite += POR_PAGINA;
    desenhar();
  });
  desenhar();

  return el(
    'div',
    { class: 'db-secao' },
    el('div', { class: 'db-ferramentas' }, campo, ...filtros.map((x) => x.caixa), contador),
    el('div', { class: 'db-rolagem' }, el('table', { class: 'db-tabela' }, el('thead', {}, el('tr', {}, ...cabecalhos)), corpo)),
    mais,
  );
}

const ATRIBUTOS: [keyof PokemonBase['stats'], string][] = [
  ['hp', 'HP'], ['ataque', 'Atk'], ['defesa', 'Def'], ['ataqueEspecial', 'SpA'], ['defesaEspecial', 'SpD'], ['velocidade', 'Spe'],
];
const filtroTipos = <T,>(tiposDe: (linha: T) => string[]): Filtro<T> => ({
  todos: 'Tipagens',
  opcoes: TODOS_TIPOS.map((t) => [t, nomeTipo(t)]),
  valores: (l) => tiposDe(l).map((t) => t.toLowerCase()),
});
const posicaoTier = (t: string) => (ORDEM_TIERS.includes(t) ? ORDEM_TIERS.indexOf(t) : ORDEM_TIERS.length);
const total = (p: PokemonBase) => ATRIBUTOS.reduce((s, [a]) => s + p.stats[a], 0);
const numero = (v: number | true) => (v === true ? '—' : v ? String(v) : '—');

export const telaDatabase: Tela = (raiz, navegar) => {
  const pokemons = todosOsPokemons();

  // quais Pokémon do jogo têm cada habilidade
  const donos = new Map<string, PokemonBase[]>();
  for (const p of pokemons)
    for (const h of p.habilidades) {
      const id = Dex.abilities.get(h.nome).id;
      donos.set(id, [...(donos.get(id) ?? []), p]);
    }

  const secoes = [
    {
      id: 'pokemon',
      nome: 'Pokémon',
      linhas: pokemons,
      busca: (p: PokemonBase) => `${p.id} ${p.nome} ${p.tipos.join(' ')}`,
      aoClicar: (p: PokemonBase) => navegar({ tela: 'pokedex', id: p.id }),
      filtros: [
        filtroTipos((p: PokemonBase) => p.tipos),
        {
          todos: 'Regiões',
          opcoes: REGIOES.filter((r) => r.disponivel).map((r) => [r.id, r.nome]),
          valores: (p: PokemonBase) => [REGIOES.find((r) => p.id >= r.pokedex[0] && p.id <= r.pokedex[1])?.id ?? ''],
        },
        { todos: 'Tiers', opcoes: ORDEM_TIERS.map((t) => [t, t]), valores: (p: PokemonBase) => [tierDoPokemon(p.id)] },
        { todos: 'Categorias', opcoes: CATEGORIAS_POKEMON, valores: categoriasDoPokemon },
      ],
      colunas: [
        { titulo: '#', celula: (p) => String(p.id).padStart(3, '0'), ordem: (p) => p.id, classe: 'num' },
        { titulo: '', celula: (p) => spritePokemon(p, { animado: false }), classe: 'db-sprite' },
        { titulo: 'Nome', celula: (p) => p.nome, ordem: (p) => p.nome },
        { titulo: 'Tipos', celula: (p) => selosTipos(p), ordem: (p) => p.tipos.join() },
        { titulo: 'Tier', celula: (p) => el('span', { class: 'db-tier' }, tierDoPokemon(p.id)), ordem: (p) => posicaoTier(tierDoPokemon(p.id)) },
        ...ATRIBUTOS.map(([a, nome]): Coluna<PokemonBase> => ({ titulo: nome, celula: (p) => String(p.stats[a]), ordem: (p) => p.stats[a], classe: 'num' })),
        { titulo: 'Total', celula: (p) => el('strong', {}, String(total(p))), ordem: total, classe: 'num' },
      ],
    } satisfies Secao<PokemonBase>,
    {
      id: 'itens',
      nome: 'Itens',
      // TMs e TRs ficam fora (já aparecem como golpes)
      linhas: CATALOGO.filter((i) => i.categoria !== 'tm' && i.categoria !== 'tr'),
      busca: (i) => `${i.nome} ${i.descricao} ${CATEGORIAS.find((c) => c.id === i.categoria)?.nome}`,
      colunas: [
        { titulo: '', celula: (i) => iconeItem(i), classe: 'db-icone' },
        { titulo: 'Nome', celula: (i) => i.nome, ordem: (i) => i.nome },
        { titulo: 'Categoria', celula: (i) => CATEGORIAS.find((c) => c.id === i.categoria)?.nome ?? i.categoria, ordem: (i) => CATEGORIAS.findIndex((c) => c.id === i.categoria) },
        { titulo: 'Efeito', celula: (i) => i.descricao, classe: 'desc' },
        { titulo: 'Preço', celula: (i) => `${i.preco} ${MOEDA}`, ordem: (i) => i.preco, classe: 'num' },
      ],
    } satisfies Secao<(typeof CATALOGO)[number]>,
    {
      id: 'habilidades',
      nome: 'Abilities',
      linhas: Dex.abilities.all().filter((a) => !a.isNonstandard && a.num > 0),
      busca: (a) => `${a.name} ${traduzir(a.shortDesc || a.desc)} ${(donos.get(a.id) ?? []).map((p) => p.nome).join(' ')}`,
      colunas: [
        { titulo: 'Nome', celula: (a) => a.name, ordem: (a) => a.name },
        { titulo: 'Efeito', celula: (a) => traduzir(a.shortDesc || a.desc), classe: 'desc' },
        {
          titulo: 'Pokémon no jogo',
          celula: (a) => el('div', { class: 'db-donos' }, ...(donos.get(a.id) ?? []).map((p) => spritePokemon(p, { animado: false }))),
          ordem: (a) => donos.get(a.id)?.length ?? 0,
        },
      ],
    } satisfies Secao<ReturnType<typeof Dex.abilities.get>>,
    {
      id: 'golpes',
      nome: 'Golpes',
      linhas: Dex.moves.all().filter((m) => !m.isNonstandard && !m.isZ && !m.isMax),
      busca: (m) => `${m.name} ${m.type} ${traduzir(m.shortDesc || m.desc)}`,
      filtros: [
        filtroTipos((m) => [m.type]),
        { todos: 'Categorias', opcoes: ['Physical', 'Special', 'Status'].map((c) => [c, nomeCategoria(c)]), valores: (m) => [m.category] },
      ],
      colunas: [
        { titulo: 'Nome', celula: (m) => m.name, ordem: (m) => m.name },
        { titulo: 'Tipo', celula: (m) => seloTipo(m.type), ordem: (m) => m.type },
        { titulo: 'Categoria', celula: (m) => nomeCategoria(m.category), ordem: (m) => m.category },
        { titulo: 'Poder', celula: (m) => numero(m.basePower), ordem: (m) => m.basePower, classe: 'num' },
        { titulo: 'Precisão', celula: (m) => (m.accuracy === true ? '—' : `${m.accuracy}%`), ordem: (m) => (m.accuracy === true ? 101 : m.accuracy), classe: 'num' },
        { titulo: 'PP', celula: (m) => String(m.pp), ordem: (m) => m.pp, classe: 'num' },
        { titulo: 'Prioridade', celula: (m) => (m.priority > 0 ? `+${m.priority}` : String(m.priority)), ordem: (m) => m.priority, classe: 'num' },
        { titulo: 'Efeito', celula: (m) => traduzir(m.shortDesc || m.desc), classe: 'desc' },
      ],
    } satisfies Secao<ReturnType<typeof Dex.moves.get>>,
  ] as Secao<unknown>[];

  const conteudo = el('div');
  const abas = secoes.map((s) =>
    el('button', { class: 'aba', onclick: () => abrir(s.id) }, `${s.nome} (${s.linhas.length})`),
  );
  const abrir = (id: string) => {
    const i = secoes.findIndex((s) => s.id === id);
    abas.forEach((a, j) => a.classList.toggle('ativa', i === j));
    conteudo.replaceChildren(tabela(secoes[i]));
  };
  abrir('pokemon');

  raiz.append(
    el('main', { class: 'tela tela-database' },
      el('h1', {}, 'Database', el('small', {}, ' · informações do jogo')),
      el('nav', { class: 'abas db-abas' }, ...abas),
      conteudo,
    ),
  );
};
