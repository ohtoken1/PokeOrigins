import { Dex } from '@pkmn/sim';
import { ATRIBUTOS, EV_MAX_TOTAL, atributos, especie, expParaNivel, hpMaximo, ppMaximo, type Atributo, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { nomeItemEquipado } from '../../../shared/usoItens';
import { traduzir } from '../../../shared/traducao';
import { pokemonPorId } from '../dados';
import { abrirJanela } from './janela';
import { el, seloGenero, seloTipo, selosTipos, spritePokemon } from './dom';
import { barraHp } from './time';

const NOMES: Record<Atributo, string> = { hp: 'HP', atk: 'Ataque', def: 'Defesa', spa: 'At. Esp.', spd: 'Def. Esp.', spe: 'Velocidade' };
const CATEGORIAS: Record<string, string> = { Physical: 'Físico', Special: 'Especial', Status: 'Status' };
const STATUS: Record<string, string> = { brn: 'Queimado', par: 'Paralisado', slp: 'Dormindo', frz: 'Congelado', psn: 'Envenenado', tox: 'Gravemente envenenado' };

/** Ficha completa do Pokémon: atributos (base, IV, EV, valor final), natureza, habilidade e golpes. */
export function abrirDetalhes(p: PokemonIndividual): void {
  abrirJanela(pokemonPorId(p.especieId).nome, () => fichaPokemon(p), { classe: 'janela-detalhes' });
}

export function fichaPokemon(p: PokemonIndividual): HTMLElement {
  const dados = pokemonPorId(p.especieId);
  const natureza = Dex.natures.get(p.natureza);
  const habilidade = Dex.abilities.get(p.habilidade);
  const base = especie(p.especieId).baseStats;
  const valores = atributos(p);
  const max = hpMaximo(p);
  const atual = expParaNivel(dados.crescimento, p.nivel);
  const proximo = expParaNivel(dados.crescimento, p.nivel + 1);
  const totalEvs = ATRIBUTOS.reduce((s, a) => s + p.evs[a], 0);
  const totalBase = ATRIBUTOS.reduce((s, a) => s + base[a], 0);

  const marca = (a: Atributo) => (natureza.plus === a ? el('span', { class: 'sobe', title: 'Natureza aumenta' }, '▲') : natureza.minus === a ? el('span', { class: 'desce', title: 'Natureza diminui' }, '▼') : null);

  const tabela = el(
    'table',
    { class: 'tabela-atributos' },
    el('thead', {}, el('tr', {}, el('th', {}, 'Atributo'), el('th', {}, 'Base'), el('th', {}, 'IV'), el('th', {}, 'EV'), el('th', {}, 'Valor'))),
    el(
      'tbody',
      {},
      ATRIBUTOS.map((a) =>
        el(
          'tr',
          {},
          el('th', {}, NOMES[a], ' ', marca(a)),
          el('td', {}, el('span', { class: 'barrinha', style: { '--v': String(Math.min(1, base[a] / 180)) } }), String(base[a])),
          el('td', { class: p.ivs[a] === 31 ? 'perfeito' : '' }, `${p.ivs[a]}/31`),
          el('td', {}, String(p.evs[a])),
          el('td', { class: 'valor' }, a === 'hp' ? `${p.hp}/${max}` : String(valores[a])),
        ),
      ),
    ),
    el('tfoot', {}, el('tr', {}, el('th', {}, 'Total'), el('td', {}, String(totalBase)), el('td', {}, `${ATRIBUTOS.reduce((s, a) => s + p.ivs[a], 0)}/186`), el('td', {}, `${totalEvs}/${EV_MAX_TOTAL}`), el('td'))),
  );

  const golpes = el(
    'div',
    { class: 'lista-golpes' },
    p.golpes.map((g) => {
      const m = Dex.moves.get(g.id);
      return el(
        'div',
        { class: 'linha-golpe' },
        el('div', { class: 'topo' }, el('strong', {}, m.name), seloTipo(m.type), el('span', { class: 'categoria' }, CATEGORIAS[m.category] ?? m.category)),
        el(
          'div',
          { class: 'numeros' },
          `Poder ${m.basePower || '—'} · Precisão ${m.accuracy === true ? '—' : `${m.accuracy}%`} · PP ${g.pp}/${ppMaximo(g.id)}`,
        ),
        m.shortDesc && el('p', {}, traduzir(m.shortDesc)),
      );
    }),
  );

  return el(
    'div',
    { class: 'ficha' },
    el(
      'section',
      { class: 'ficha-topo' },
      el('div', { class: 'palco' }, spritePokemon(dados, { shiny: p.shiny, palco: true })),
      el(
        'div',
        { class: 'resumo' },
        el('h3', {}, dados.nome, seloGenero(p.genero), p.shiny ? ' ✨' : '', el('small', {}, ` Nv. ${p.nivel} · #${dados.id}`)),
        selosTipos(dados),
        el('div', { class: 'hp' }, barraHp(p.hp, max), el('small', {}, `HP ${p.hp}/${max}${p.status ? ` · ${STATUS[p.status] ?? p.status}` : ''}`)),
        el('dl', {},
          el('dt', {}, 'Natureza'),
          el('dd', {}, natureza.name, natureza.plus ? el('small', {}, ` (+${NOMES[natureza.plus as Atributo]}, −${NOMES[natureza.minus as Atributo]})`) : el('small', {}, ' (neutra)')),
          el('dt', {}, 'Ability'),
          el('dd', {}, habilidade.name, habilidade.shortDesc ? el('small', {}, ` — ${traduzir(habilidade.shortDesc)}`) : null),
          el('dt', {}, 'Item'),
          el('dd', {}, p.item ? nomeItemEquipado(p.item) : '—'),
          el('dt', {}, 'Experiência'),
          el('dd', {}, `${p.exp}`, p.nivel < 100 ? el('small', {}, ` (faltam ${proximo - p.exp} para o Nv. ${p.nivel + 1})`) : null),
        ),
        el('div', { class: 'barra-exp' }, el('div', { class: 'preenchido', style: { width: `${p.nivel >= 100 ? 100 : ((p.exp - atual) / Math.max(1, proximo - atual)) * 100}%` } })),
      ),
    ),
    el('section', {}, el('h4', {}, 'Atributos'), tabela),
    el('section', {}, el('h4', {}, 'Golpes'), golpes),
  );
}
