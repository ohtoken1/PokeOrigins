import { Dex } from '@pkmn/sim';
import { ATRIBUTOS, EV_MAX_TOTAL, atributos, especie, expParaNivel, hpMaximo, ppMaximo, type Atributo, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { nomeItemEquipado } from '../../../shared/usoItens';
import { traduzir } from '../../../shared/traducao';
import { pokemonPorId } from '../dados';
import { abrirJanela } from './janela';
import { irPara } from './navegacao';
import { el, seloGenero, seloNT, seloTier, seloTipo, selosTipos, spritePokemon } from './dom';
import { barraHp } from './time';
import { PRECO_REVELAR_IVS, faixaDoIv, itemDaLoja } from '../../../shared/loja';
import { AMIZADE_MAXIMA, amizadeDe, textoAmizade } from '../../../shared/amizade';
import { iconeItem } from './iconeItem';
import { formatarId, saveDoPokemon, salvar } from '../estado';

const NOMES: Record<Atributo, string> = { hp: 'HP', atk: 'Ataque', def: 'Defesa', spa: 'At. Esp.', spd: 'Def. Esp.', spe: 'Velocidade' };
const CATEGORIAS: Record<string, string> = { Physical: 'Físico', Special: 'Especial', Status: 'Status' };
const STATUS: Record<string, string> = { brn: 'Queimado', par: 'Paralisado', slp: 'Dormindo', frz: 'Congelado', psn: 'Envenenado', tox: 'Gravemente envenenado' };

/** Medidor de amizade: barrinha rosa + frase como a do "medidor de amizade" dos jogos. */
export function medidorAmizade(valor: number): HTMLElement {
  return el('span', { class: 'amizade', title: `${valor}/${AMIZADE_MAXIMA}` },
    el('span', { class: 'amizade-barra' }, el('span', { style: { width: `${(valor / AMIZADE_MAXIMA) * 100}%` } })),
    el('small', {}, `${valor}/${AMIZADE_MAXIMA} · ${textoAmizade(valor)}`));
}

/** Ficha completa do Pokémon: atributos (base, IV, EV, valor final), natureza, habilidade e golpes. */
export function abrirDetalhes(p: PokemonIndividual): void {
  abrirJanela(pokemonPorId(p.especieId).nome, () => fichaPokemon(p), { classe: 'janela-detalhes' });
}

/** Caixa "IVs ocultos": silver revela a faixa de cada IV, gold (preparado para depois) o valor exato. */
function revelarIvs(p: PokemonIndividual, aoRevelar: () => void): HTMLElement | null {
  if (p.ivsRevelados) return null;
  const save = saveDoPokemon(p);
  const aviso = el('small', { class: 'aviso' }, '');
  const pagar = (moeda: 'silver' | 'gold') => {
    if (!save) return;
    const preco = PRECO_REVELAR_IVS[moeda];
    if (save[moeda] < preco) {
      aviso.textContent = `${moeda === 'gold' ? 'Gold' : 'Silver'} insuficiente (você tem ${save[moeda]}).`;
      return;
    }
    save[moeda] -= preco;
    if (moeda === 'gold') p.ivsRevelados = true;
    else p.ivsFaixa = true;
    salvar(save);
    aoRevelar();
  };
  return el(
    'div',
    { class: 'revelar-ivs' },
    el(
      'div',
      {},
      el('strong', {}, p.ivsFaixa ? '🔓 IVs por faixa' : '🔒 IVs ocultos'),
      el('small', {}, p.ivsFaixa ? 'Pague com gold para ver o valor exato.' : 'Silver mostra a faixa de cada IV (0–5, 6–10… 26–31); gold mostra o valor exato.'),
    ),
    el(
      'div',
      { class: 'botoes' },
      !p.ivsFaixa && el('button', { class: 'botao', disabled: !save, onclick: () => pagar('silver') }, `Ver faixas · ${PRECO_REVELAR_IVS.silver} silver`),
      el('button', { class: 'botao botao-gold', disabled: !save, onclick: () => pagar('gold') }, `Ver exatos · ${PRECO_REVELAR_IVS.gold} gold`),
    ),
    aviso,
  );
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
          p.ivsRevelados
            ? el('td', { class: p.ivs[a] === 31 ? 'perfeito' : '' }, String(p.ivs[a]))
            : p.ivsFaixa
              ? el('td', { class: `faixa ${faixaDoIv(p.ivs[a])[0] >= 26 ? 'perfeito' : ''}`, title: 'Faixa do IV' }, faixaDoIv(p.ivs[a]).join('–'))
              : el('td', { class: 'oculto', title: 'IV oculto' }, '?'),
          el('td', {}, String(p.evs[a])),
          el('td', { class: 'valor' }, a === 'hp' ? `${p.hp}/${max}` : String(valores[a])),
        ),
      ),
    ),
    el('tfoot', {}, el('tr', {}, el('th', {}, 'Total'), el('td', {}, String(totalBase)), el('td', {}, p.ivsRevelados
          ? String(ATRIBUTOS.reduce((s, a) => s + p.ivs[a], 0))
          : p.ivsFaixa
            ? ATRIBUTOS.map((a) => faixaDoIv(p.ivs[a])).reduce(([x, y], [a, b]) => [x + a, y + b], [0, 0]).join('–')
            : '?'), el('td', {}, `${totalEvs}/${EV_MAX_TOTAL}`), el('td'))),
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

  const ficha: HTMLElement = el(
    'div',
    { class: 'ficha' },
    el(
      'section',
      { class: 'ficha-topo' },
      el(
        'div',
        { class: 'ficha-coluna-sprite' },
        el('div', { class: 'palco' }, spritePokemon(dados, { shiny: p.shiny, palco: true })),
        // atalho para a página da espécie na Pokédex
        el('button', { class: 'botao secundario botao-pokedex', onclick: () => irPara({ tela: 'pokedex', id: dados.id }) }, '📖 Ver na Pokédex'),
      ),
      el(
        'div',
        { class: 'resumo' },
        el('h3', {}, dados.nome, seloGenero(p.genero), p.shiny ? ' ✨' : '', el('small', {}, ` Nv. ${p.nivel} · #${dados.id}`), seloTier(p), seloNT(p)),
        selosTipos(dados),
        el('div', { class: 'hp' }, barraHp(p.hp, max), el('small', {}, `HP ${p.hp}/${max}${p.status ? ` · ${STATUS[p.status] ?? p.status}` : ''}`)),
        el('dl', {},
          el('dt', {}, 'ID'),
          el('dd', {}, p.uid ? formatarId(p.uid) : '—', el('small', {}, ' (ordem de captura)'), p.trancado ? el('small', {}, ' · trancado no PC') : null),
          el('dt', {}, 'Natureza'),
          el('dd', {}, natureza.name, natureza.plus ? el('small', {}, ` (+${NOMES[natureza.plus as Atributo]}, −${NOMES[natureza.minus as Atributo]})`) : el('small', {}, ' (neutra)')),
          el('dt', {}, 'Ability'),
          el('dd', {}, habilidade.name, habilidade.shortDesc ? el('small', {}, ` — ${traduzir(habilidade.shortDesc)}`) : null),
          el('dt', {}, 'Item'),
          el('dd', { class: 'dd-item' }, ...(p.item ? [iconeItem(itemDaLoja(p.item) ?? { id: p.item, categoria: 'batalha' }), nomeItemEquipado(p.item)] : ['—', el('small', {}, ' (equipe pela Bolsa)')])),
          el('dt', {}, 'Amizade'),
          el('dd', {}, medidorAmizade(amizadeDe(p))),
          el('dt', {}, 'Tera Type'),
          el('dd', {}, seloTipo(p.teraTipo ?? especie(p.especieId).types[0])),
          el('dt', {}, 'Experiência'),
          el('dd', {}, `${p.exp}`, p.nivel < 100 ? el('small', {}, ` (faltam ${proximo - p.exp} para o Nv. ${p.nivel + 1})`) : null),
        ),
        el('div', { class: 'barra-exp' }, el('div', { class: 'preenchido', style: { width: `${p.nivel >= 100 ? 100 : ((p.exp - atual) / Math.max(1, proximo - atual)) * 100}%` } })),
      ),
    ),
    el('section', {}, el('h4', {}, 'Atributos'), tabela, revelarIvs(p, () => ficha.replaceWith(fichaPokemon(p)))),
    el('section', {}, el('h4', {}, 'Golpes'), golpes),
  );
  return ficha;
}
