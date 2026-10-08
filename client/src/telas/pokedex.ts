// Pokédex: lista de todos os Pokémon da região com busca/filtro e a ficha completa da espécie
// (dados da PokéAPI + Pokémon Showdown: atributos, habilidades, fraquezas, evolução, golpes, onde achar).
import { Dex } from '@pkmn/sim';
import type { Tela } from '../main';
import { BIOMAS } from '../../../shared/biomas';
import { NIVEL_LENDARIO, ajustarTabela, biomaDoPokemon, ehLendario, faixaDosEncontros, montarTabela, probabilidades, type EntradaTabela } from '../../../shared/encontros';
import { nivelTreinador } from '../../../shared/treinador';
import { comBonificacao } from '../bonificacao';
import { ajustesAdmin } from '../ui/admin';
import { comoEvolui } from '../../../shared/evolucoes';
import { especie, golpesPorNivel } from '../../../shared/batalha/pokemon';
import maquinas from '../../../shared/data/maquinas.json';
import { golpesDeTutorDaEspecie } from '../../../shared/professores';
import { REGIOES } from '../../../shared/regioes';
import { CATEGORIAS_POKEMON, categoriasDoPokemon } from '../../../shared/categorias';
import { nomeCategoria, nomeTipo, traduzir } from '../../../shared/traducao';
import type { PokemonBase } from '../../../shared/tipos';
import { pokemonsDaRegiao, todosOsPokemons } from '../dados';
import { carregarSave } from '../estado';
import { pokedexRevelada } from '../ui/admin';
import { corTipo, el, seloGenero, seloTipo, selosTipos, spritePokemon } from '../ui/dom';
import { megasDaEspecie, tierDaMega, type Mega } from '../../../shared/megas';
import { itemDaLoja, textoPreco } from '../../../shared/loja';
import { megaComoPokemon } from '../ui/formas';
import { iconeItem } from '../ui/iconeItem';


const CRESCIMENTO: Record<string, string> = { fast: 'Rápido', medium: 'Médio', 'medium-slow': 'Médio-lento', slow: 'Lento' };
const ATRIBUTOS: [keyof PokemonBase['stats'], string][] = [
  ['hp', 'HP'], ['ataque', 'Attack'], ['defesa', 'Defense'], ['ataqueEspecial', 'Sp. Atk'], ['defesaEspecial', 'Sp. Def'], ['velocidade', 'Speed'],
];

/** Onde cada espécie aparece solta (bioma + faixa de nível). */
type Encontro = { bioma: string; entrada: EntradaTabela; tabela: EntradaTabela[]; biomaObj: (typeof BIOMAS)[number] };
function mapaDeEncontros(todos: PokemonBase[]): Map<number, Encontro> {
  const mapa = new Map<number, Encontro>();
  for (const r of REGIOES.filter((x) => x.disponivel))
    for (const b of BIOMAS) {
      const tabela = montarTabela(b, pokemonsDaRegiao(r.id), [], todos);
      for (const entrada of tabela) mapa.set(entrada.pokemon.id, { bioma: `${r.nome} · ${b.nome}`, entrada, tabela, biomaObj: b });
    }
  return mapa;
}

/** "0,25%" (com mais casas quando a chance é muito pequena) e "1 em 400". */
const porcentagem = (c: number) => `${(c * 100).toLocaleString('pt-BR', { maximumFractionDigits: c * 100 < 0.01 ? 4 : c * 100 < 1 ? 3 : 2 })}%`;
const umEm = (c: number) => `1 em ${Math.round(1 / c).toLocaleString('pt-BR')}`;

/** Região de origem pelo número da Pokédex nacional. */
export const regiaoDoNumero = (numero: number) => REGIOES.find((r) => numero >= r.pokedex[0] && numero <= r.pokedex[1]);

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

/** Golpes de ovo (fonte "E" no learnset do Showdown), da espécie e das formas anteriores. */
function golpesDeOvo(p: PokemonBase): string[] {
  const ids = new Set<string>();
  let s: ReturnType<typeof Dex.species.get> | undefined = especie(p.id);
  while (s?.exists) {
    const ls = Dex.species.getLearnsetData(s.id).learnset ?? {};
    for (const [id, fontes] of Object.entries(ls)) if (fontes.some((f) => /^\dE/.test(f)) && Dex.moves.get(id).exists) ids.add(id);
    s = s.prevo ? Dex.species.get(s.prevo) : undefined;
  }
  return [...ids].sort((a, b) => Dex.moves.get(a).name.localeCompare(Dex.moves.get(b).name));
}

function podeAprenderTM(p: PokemonBase, golpe: string): boolean {
  const fontes = Dex.species.getLearnsetData(especie(p.id).id).learnset?.[golpe] ?? [];
  return fontes.some((f) => /^\dM$/.test(f));
}

const linha = (rotulo: string, valor: Node | string) => el('div', { class: 'dex-linha' }, el('span', {}, rotulo), el('strong', {}, valor));

/** Pokémon ainda não visto: só a silhueta e o número (pedido do dono). */
function fichaOculta(p: PokemonBase): HTMLElement {
  return el(
    'article',
    { class: 'dex-ficha' },
    el('div', { class: 'dex-topo dex-oculto' },
      el('div', { class: 'dex-palco' }, spritePokemon(p, { animado: false, palco: true, chao: 0.88 })),
      el('div', { class: 'dex-resumo' },
        el('div', { class: 'dex-titulo' }, el('span', { class: 'dex-numero' }, `#${String(p.id).padStart(4, '0')}`), el('h2', {}, '???')),
        el('p', { class: 'dica' }, 'Você ainda não viu este Pokémon. Encontre-o em algum bioma para liberar as informações.'),
      ),
    ),
  );
}

type Abrir = (id: number, mega?: string) => void;

function ficha(p: PokemonBase, todos: PokemonBase[], encontros: ReturnType<typeof mapaDeEncontros>, abrir: Abrir, visto: (id: number) => boolean): HTMLElement {
  if (!visto(p.id)) return fichaOculta(p);
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
  // Megas da linha: entram como o último estágio (Charizard → Mega Charizard X / Y)
  const megas = cadeia.flatMap((q) => megasDaEspecie(q.id).map((m) => ({ m, base: q })));
  const evolucao = el(
    'div',
    { class: 'dex-evolucao' },
    ...porEstagio.flatMap((grupo, i) => [
      i > 0 ? el('span', { class: 'dex-seta' }, '→') : null,
      el('div', { class: 'dex-estagio' },
        ...grupo.map((q) =>
          el('button', { class: `dex-evo ${q.id === p.id ? 'atual' : ''} ${visto(q.id) ? '' : 'oculto'}`, onclick: () => abrir(q.id) },
            spritePokemon(q, { animado: false }),
            el('span', {}, visto(q.id) ? q.nome : '???'),
            i > 0 ? el('small', {}, comoEvolui(q)) : null,
          ),
        ),
      ),
    ]),
    ...(megas.length
      ? [
          el('span', { class: 'dex-seta dex-seta-mega' }, el('img', { src: 'batalha/mega-evolucao.svg', alt: 'Mega Evolução' })),
          el('div', { class: 'dex-estagio' },
            ...megas.map(({ m, base }) =>
              el('button', { class: `dex-evo dex-evo-mega ${visto(base.id) ? '' : 'oculto'}`, onclick: () => abrir(base.id, m.forma) },
                spritePokemon(megaComoPokemon(m, base), { animado: false }),
                el('span', {}, visto(base.id) ? m.nome : '???'),
                el('small', {}, textoRequisitoMega(m)),
              ),
            ),
          ),
        ]
      : []),
  );

  // onde encontrar
  // onde encontrar: região + bioma (pelo tipo) e como aparece
  const onde = encontros.get(p.id);
  const regiaoP = regiaoDoNumero(p.id);
  const biomaP = BIOMAS.find((b) => b.id === biomaDoPokemon(p));
  const comoAparece = onde
    ? `Solto · Nv. ${p.lendario || p.mitico ? `${Math.max(NIVEL_LENDARIO, onde.entrada.nivelMin)}+ (raro)` : `${onde.entrada.nivelMin}–${onde.entrada.nivelMax}`}`
    : `Só evoluindo · ${comoEvolui(p)}`;
  // chances com o nível de treinador atual (e os bônus/ajustes que valem no jogo agora)
  const saveAtual = carregarSave();
  const ajustes = comBonificacao(ajustesAdmin());
  let textoChance = 'Não aparece solto';
  if (onde) {
    const faixa = faixaDosEncontros(onde.biomaObj, nivelTreinador(saveAtual?.xpTreinador ?? 0), saveAtual?.nivelEncontro ?? null);
    const tabela = ajustarTabela(onde.tabela, ajustes);
    const i = tabela.findIndex((e) => e.pokemon.id === p.id);
    const c = i >= 0 ? probabilidades(tabela, faixa)[i] : 0;
    textoChance = c > 0 ? `${porcentagem(c)} (${umEm(c)}) por encontro` : `0% na sua faixa atual (Nv. ${faixa[0]}–${faixa[1]})`;
  }
  const textoShiny = `${porcentagem(ajustes.chanceShiny)} (${umEm(ajustes.chanceShiny)})`;
  const textoOnde = el('span', { class: 'dex-onde' },
    el('span', { class: 'dex-chip' }, regiaoP?.nome ?? '—'),
    el('span', { class: 'dex-chip' }, biomaP?.nome ?? '—'),
    el('small', {}, comoAparece),
  );

  // gênero
  // símbolos coloridos (♂ azul, ♀ rosa)
  const pct = (v: number) => `${(v * 100).toFixed(1).replace('.0', '')}%`;
  const genero = el('span', {},
    ...(s.gender === 'N' ? ['Sem gênero']
      : s.gender === 'M' ? ['100%', seloGenero('M')]
      : s.gender === 'F' ? ['100%', seloGenero('F')]
      : [pct(s.genderRatio.M), seloGenero('M'), ' · ', pct(s.genderRatio.F), seloGenero('F')]).filter((x): x is string | HTMLElement => x !== null),
  );
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
  const chipGolpe = (id: string, rotulo?: string) => {
    const g = Dex.moves.get(id);
    return el('span', { class: 'dex-tm', title: `${nomeTipo(g.type)} · ${nomeCategoria(g.category)} · Poder ${g.basePower || '—'}
${traduzir(g.shortDesc || g.desc)}`, style: { borderLeftColor: corTipo(g.type) } },
      rotulo ? el('small', {}, rotulo) : null, rotulo ? ' ' : '', g.name);
  };
  const listaTms = el('div', { class: 'dex-tms' }, ...tms.map((m) => {
    const tr = m.id.startsWith('tr');
    return chipGolpe(m.golpe, `${tr ? 'TR' : 'TM'}${m.id.slice(2).padStart(tr ? 2 : 3, '0')}`);
  }));
  const ovos = golpesDeOvo(p);
  const listaOvos = el('div', { class: 'dex-tms' }, ...ovos.map((id) => chipGolpe(id)));
  const tutor = golpesDeTutorDaEspecie(p.id);
  const listaTutor = el('div', { class: 'dex-tms' }, ...tutor.map((id) => chipGolpe(id)));

  // TMs/TRs, Egg Moves e Move Tutor ficam guardados em botões (abre um de cada vez)
  const conteudoGolpesExtras = el('div', { class: 'dex-extras' });
  const botoesExtras: HTMLButtonElement[] = [];
  const botaoExtra = (texto: string, lista: HTMLElement, quantidade: number) => {
    const b = el('button', { class: 'botao secundario', disabled: !quantidade }, `${texto} (${quantidade})`) as HTMLButtonElement;
    b.addEventListener('click', () => {
      const abrir = !b.classList.contains('ligado');
      botoesExtras.forEach((x) => x.classList.remove('ligado'));
      b.classList.toggle('ligado', abrir);
      conteudoGolpesExtras.replaceChildren(...(abrir ? [lista] : []));
    });
    botoesExtras.push(b);
    return b;
  };

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
        // nomes de ability e egg group ficam em inglês (regra do dono)
        linha('Egg Groups', s.eggGroups.join(', ')),
        linha('Onde encontrar', textoOnde),
        linha(ehLendario(p) ? 'Chance do lendário' : 'Chance de aparição', textoChance),
        linha('Chance de shiny', textoShiny),
        linha('Captura base', `${capturaBase(p.taxaCaptura)} (Poké Ball, HP cheio)`),
      ),
    ),
    el('section', {}, el('h3', {}, 'Atributos base'), atributos),
    el('section', {}, el('h3', {}, 'Abilities'), habilidades),
    el('section', {}, el('h3', {}, 'Dano recebido por tipo'), efetividade),
    el('section', {}, el('h3', {}, 'Evolução'), cadeia.length > 1 || megas.length ? evolucao : el('p', { class: 'dica' }, 'Não evolui.')),
    el('section', {}, el('h3', {}, 'Golpes por nível'), golpes),
    el(
      'section',
      {},
      el('h3', {}, 'Outros golpes'),
      el('div', { class: 'dex-botoes-extras' }, botaoExtra('TMs e TRs', listaTms, tms.length), botaoExtra('Egg Moves', listaOvos, ovos.length), botaoExtra('Move Tutor', listaTutor, tutor.length)),
      conteudoGolpesExtras,
    ),
  );
}

/** Como a Mega acontece ("Segurando Charizardite X" / "Sabendo Dragon Ascent"). */
function textoRequisitoMega(m: Mega): string {
  if (m.pedra) return `Segurando ${itemDaLoja(m.pedra)?.nome ?? Dex.items.get(m.pedra).name}`;
  return `Sabendo ${Dex.moves.get(m.golpe ?? '').name}`;
}

/** Ficha da Mega: tipos, atributos (com a diferença para a forma normal), ability, tier, fraquezas e a Mega Stone. */
function fichaMega(m: Mega, base: PokemonBase, abrir: Abrir): HTMLElement {
  const p = megaComoPokemon(m, base);
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
  const total = (q: PokemonBase) => ATRIBUTOS.reduce((soma, [a]) => soma + q.stats[a], 0);
  const diferenca = (d: number) => (d ? el('small', { class: `dex-dif ${d > 0 ? 'mais' : 'menos'}` }, d > 0 ? `+${d}` : String(d)) : null);
  const atributos = el('div', { class: 'dex-atributos' },
    ...ATRIBUTOS.map(([a, nome]) =>
      el('div', { class: 'dex-atributo' },
        el('span', {}, nome),
        el('strong', {}, String(p.stats[a]), ' ', diferenca(p.stats[a] - base.stats[a])),
        el('span', { class: 'dex-barra' }, el('span', { style: { width: `${Math.min(100, (p.stats[a] / 200) * 100)}%`, background: `hsl(${Math.min(140, p.stats[a])} 70% 50%)` } })),
      ),
    ),
    el('div', { class: 'dex-atributo total' }, el('span', {}, 'Total'), el('strong', {}, String(total(p)), ' ', diferenca(total(p) - total(base))), el('span')),
  );
  const habilidade = Dex.abilities.get(m.habilidade);
  const grupos = fraquezas(p.tipos);
  const ROTULOS: [number, string][] = [[4, '4×'], [2, '2×'], [0.5, '½×'], [0.25, '¼×'], [0, 'Imune']];
  const efetividade = el('div', { class: 'dex-efetividade' },
    ...ROTULOS.filter(([mult]) => grupos.has(mult)).map(([mult, rotulo]) =>
      el('div', { class: 'dex-ef-linha' }, el('span', { class: 'dex-ef-mult' }, rotulo), el('div', { class: 'tipos' }, grupos.get(mult)!.map((t) => seloTipo(t)))),
    ),
  );
  const pedra = m.pedra ? itemDaLoja(m.pedra) : undefined;
  const outras = megasDaEspecie(base.id).filter((x) => x.forma !== m.forma);
  return el('article', { class: 'dex-ficha dex-ficha-mega' },
    el('div', { class: 'dex-topo' },
      el('div', {}, palco, el('div', { class: 'dex-botoes' }, alternar('shiny', '✨ Shiny'), alternar('costas', 'Costas'))),
      el('div', { class: 'dex-resumo' },
        el('div', { class: 'dex-titulo' },
          el('span', { class: 'dex-numero' }, `#${String(base.id).padStart(4, '0')}`),
          el('h2', {}, m.nome),
          el('span', { class: 'dex-selo mega' }, el('img', { src: 'batalha/mega-evolucao.svg', alt: '' }), 'Mega'),
          m.nova ? el('span', { class: 'dex-selo' }, 'Legends: Z-A') : null,
        ),
        selosTipos(p),
        linha('Forma normal', el('button', { class: 'botao secundario dex-voltar-base', onclick: () => abrir(base.id) }, `← ${base.nome}`)),
        linha('Como megaevoluir', textoRequisitoMega(m)),
        pedra ? linha('Mega Stone', el('span', { class: 'dex-pedra' }, iconeItem(pedra), pedra.nome, el('small', {}, ` · loja: ${textoPreco(pedra)}`))) : null,
        linha('Tier', tierDaMega(m)),
        linha('Na batalha', 'Uma vez por batalha, pelo botão Mega Evolução; volta ao normal no fim da batalha.'),
        outras.length ? linha('Outras Megas', el('span', {}, ...outras.map((o) => el('button', { class: 'botao secundario', onclick: () => abrir(base.id, o.forma) }, o.nome)))) : null,
      ),
    ),
    el('section', {}, el('h3', {}, 'Atributos base'), atributos),
    el('section', {}, el('h3', {}, 'Ability'), el('div', { class: 'dex-habilidades' }, el('div', {}, el('strong', {}, habilidade.name), el('p', {}, traduzir(habilidade.shortDesc || habilidade.desc))))),
    el('section', {}, el('h3', {}, 'Dano recebido por tipo'), efetividade),
  );
}

/** Pokébola pequena desenhada em SVG (marca de "capturado" na lista). */
/** Chance de captura com Poké Ball, HP cheio e sem status (fórmula da 3ª/4ª geração ≈ taxa/3 ÷ 255, a mesma da batalha). */
function capturaBase(taxa: number): string {
  const a = Math.floor(taxa / 3);
  if (a >= 255) return '100%';
  const b = Math.floor(1048560 / (16711680 / Math.max(1, a)) ** 0.25);
  const chance = Math.pow(b / 65536, 4) * 100;
  return `${chance < 1 ? chance.toFixed(2) : chance.toFixed(1)}%`;
}

function pokebolinha(): HTMLElement {
  const marca = el('span', { class: 'dex-marca capturado', title: 'Capturado' });
  marca.innerHTML =
    '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">' +
    '<path d="M1.5 8a6.5 6.5 0 0 1 13 0z" fill="#ef4444"/><path d="M1.5 8a6.5 6.5 0 0 0 13 0z" fill="#f8fafc"/>' +
    '<circle cx="8" cy="8" r="6.5" fill="none" stroke="#1f2937" stroke-width="1.2"/><path d="M1.5 8h13" stroke="#1f2937" stroke-width="1.2"/>' +
    '<circle cx="8" cy="8" r="2.1" fill="#f8fafc" stroke="#1f2937" stroke-width="1.2"/></svg>';
  return marca;
}

export const telaPokedex = (inicial?: number, megaInicial?: string): Tela => (raiz) => {
  const todos = todosOsPokemons();
  const encontros = mapaDeEncontros(todos);
  const save = carregarSave();
  const vistos = new Set(save?.vistos ?? []);
  const capturados = new Set(save?.capturados ?? []);
  // só os vistos mostram nome, imagem e dados (o painel de admin pode revelar tudo para testes)
  const visto = (id: number) => pokedexRevelada() || vistos.has(id) || capturados.has(id);

  let selecionado = inicial ?? todos[0]?.id ?? 1;
  const busca = el('input', { type: 'search', placeholder: 'Buscar por nome ou número…', class: 'dex-busca' }) as HTMLInputElement;
  const tipos = [...new Set(todos.flatMap((p) => p.tipos))].sort((a, b) => nomeTipo(a[0].toUpperCase() + a.slice(1)).localeCompare(nomeTipo(b[0].toUpperCase() + b.slice(1))));
  const filtroCategoria = el('select', { class: 'dex-filtro' },
    el('option', { value: '' }, 'Categorias'),
    ...CATEGORIAS_POKEMON.map(([id, nome]) => el('option', { value: id }, nome)),
  ) as HTMLSelectElement;
  const filtroRegiao = el('select', { class: 'dex-filtro' },
    el('option', { value: '' }, 'Regiões'),
    ...REGIOES.filter((r) => r.disponivel).map((r) => el('option', { value: r.id }, r.nome)),
  ) as HTMLSelectElement;
  const filtroTipo = el('select', { class: 'dex-filtro' },
    el('option', { value: '' }, 'Tipagens'),
    ...tipos.map((t) => el('option', { value: t }, nomeTipo(t[0].toUpperCase() + t.slice(1)))),
  ) as HTMLSelectElement;
  const lista = el('ol', { class: 'dex-lista' });
  const painel = el('div', { class: 'dex-painel' });

  const abrir: Abrir = (id, mega) => {
    selecionado = id;
    const p = todos.find((q) => q.id === id);
    const m = mega && visto(id) ? megasDaEspecie(id).find((x) => x.forma === mega) : undefined;
    if (p) painel.replaceChildren(m ? fichaMega(m, p, abrir) : ficha(p, todos, encontros, abrir, visto));
    for (const item of lista.children) item.classList.toggle('ativo', (item as HTMLElement).dataset.id === String(id));
    painel.scrollTop = 0;
  };

  const desenharLista = () => {
    const termo = busca.value.trim().toLowerCase();
    const filtrados = todos.filter(
      (p) =>
        // nome, tipagem e categoria só filtram quem já foi visto (senão a busca entregaria quem é)
        (!termo || (visto(p.id) && p.nome.toLowerCase().includes(termo)) || String(p.id) === termo.replace('#', '')) &&
        (!filtroTipo.value || (visto(p.id) && p.tipos.includes(filtroTipo.value))) &&
        (!filtroRegiao.value || regiaoDoNumero(p.id)?.id === filtroRegiao.value) &&
        (!filtroCategoria.value || (visto(p.id) && categoriasDoPokemon(p).includes(filtroCategoria.value))),
    );
    lista.replaceChildren(
      ...filtrados.map((p) =>
        el('li', { 'data-id': p.id, class: `${p.id === selecionado ? 'ativo' : ''} ${visto(p.id) ? '' : 'oculto'}`, onclick: () => abrir(p.id) },
          spritePokemon(p, { animado: false }),
          el('span', { class: 'dex-num' }, `#${String(p.id).padStart(3, '0')}`),
          el('span', { class: 'dex-nome' }, visto(p.id) ? p.nome : '???'),
          capturados.has(p.id) ? pokebolinha() : vistos.has(p.id) ? el('span', { class: 'dex-marca', title: 'Visto' }, '○') : null,
        ),
      ),
    );
  };
  busca.addEventListener('input', desenharLista);
  filtroTipo.addEventListener('change', desenharLista);
  filtroRegiao.addEventListener('change', desenharLista);
  filtroCategoria.addEventListener('change', desenharLista);
  desenharLista();
  abrir(selecionado, megaInicial);

  raiz.append(
    el('main', { class: 'tela tela-pokedex' },
      el('header', { class: 'dex-cabecalho' },
        el('h1', {}, 'Pokédex', el('small', {}, ' · Nacional')),
        el('span', { class: 'meta' }, `${vistos.size} vistos · ${capturados.size} capturados · ${todos.length} no total`),
      ),
      el('div', { class: 'layout-pokedex' },
        el('aside', { class: 'dex-coluna' }, busca, el('div', { class: 'dex-filtros' }, filtroRegiao, filtroTipo, filtroCategoria), lista),
        painel,
      ),
    ),
  );
  // aberto pela Database: rola a lista até o Pokémon escolhido
  const ativo = lista.querySelector<HTMLElement>('.ativo');
  if (ativo) lista.scrollTop = ativo.offsetTop - lista.clientHeight / 2;
};
