// Resumo rápido de um Pokémon (natureza, gênero, ability, Speed…): na batalha (selvagem) e
// ao passar o mouse nos cartões do time e do PC (com HP, item, atributos e golpes).
import { Dex } from '@pkmn/sim';
import { atributos, especie, faixaVelocidade, hpMaximo, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { nomeItemEquipado } from '../../../shared/usoItens';
import { AMIZADE_MAXIMA, amizadeDe } from '../../../shared/amizade';
import { pokemonPorId } from '../dados';
import { el, seloGenero, seloNT, seloTipo, selosTipos, seloTier } from './dom';

const NOMES_ATRIBUTOS: Record<string, string> = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };

const linha = (rotulo: string, ...valor: (Node | string)[]) => el('div', { class: 'resumo-linha' }, el('span', {}, rotulo), el('strong', {}, ...valor));

export function resumoPokemon(p: PokemonIndividual, opcoes: { abilityConhecida: boolean; completo?: boolean }): HTMLElement[] {
  const dados = pokemonPorId(p.especieId);
  const natureza = Dex.natures.get(p.natureza);
  const efeito = natureza.plus && natureza.minus ? `+${NOMES_ATRIBUTOS[natureza.plus]} −${NOMES_ATRIBUTOS[natureza.minus]}` : 'neutra';
  const [min, max] = faixaVelocidade(p);
  const linhas: HTMLElement[] = [
    el('div', { class: 'resumo-titulo' }, el('strong', {}, dados.nome), seloGenero(p.genero), p.shiny ? ' ✨' : '', el('small', {}, ` Nv. ${p.nivel}`), opcoes.completo ? seloTier(p) : null, seloNT(p)),
    selosTipos(dados),
    linha('Gênero', p.genero === 'M' ? 'Macho' : p.genero === 'F' ? 'Fêmea' : 'Sem gênero'),
    linha('Nature', `${natureza.name} (${efeito})`),
    // ability do selvagem fica escondida (mostra as possíveis) até ela agir na batalha
    opcoes.abilityConhecida
      ? linha('Ability', Dex.abilities.get(p.habilidade).name)
      : linha('Abilities possíveis', [...new Set(Object.values(especie(p.especieId).abilities))].join(' / ')),
  ];
  // selvagem na batalha: nada que dependa dos IVs (pedido do dono); a Speed aparece como faixa (IV 0 a 31)
  if (!opcoes.completo) return [...linhas, linha('Speed', `${min}–${max}`, el('small', {}, ' (mín.–máx.)'))];
  const valores = atributos(p);
  linhas.push(
    linha('HP', `${p.hp}/${hpMaximo(p)}`),
    linha('Item', p.item ? nomeItemEquipado(p.item) : '—'),
    linha('Amizade', `${amizadeDe(p)}/${AMIZADE_MAXIMA}`),
    linha('Tera Type', seloTipo(p.teraTipo ?? especie(p.especieId).types[0])),
    // atributos um embaixo do outro, com barrinha (▲/▼ = o que a Nature aumenta/diminui)
    el(
      'div',
      { class: 'resumo-atributos' },
      ...(['atk', 'def', 'spa', 'spd', 'spe'] as const).map((a) => {
        const marca = natureza.plus === a ? 'sobe' : natureza.minus === a ? 'desce' : '';
        return el(
          'div',
          { class: `resumo-atributo ${marca}` },
          el('span', {}, NOMES_ATRIBUTOS[a], marca === 'sobe' ? ' ▲' : marca === 'desce' ? ' ▼' : ''),
          el('span', { class: 'resumo-barra' }, el('span', { style: { width: `${Math.min(100, (valores[a] / Math.max(60, p.nivel * 3)) * 100)}%` } })),
          el('strong', {}, String(valores[a])),
        );
      }),
    ),
    el(
      'div',
      { class: 'resumo-golpes' },
      el('h5', {}, 'Golpes'),
      ...p.golpes.map((g) => {
        const m = Dex.moves.get(g.id);
        return el('div', { class: 'resumo-golpe' }, seloTipo(m.type), el('span', {}, m.name), el('small', {}, `PP ${g.pp}/${m.pp}`));
      }),
    ),
  );
  return linhas;
}

let flutuante: HTMLElement | null = null;
let atual: HTMLElement | null = null;
// o cartão pode sumir sem "mouseleave" (a tela redesenhou): esconde quando o mouse sai dele
document.addEventListener('mousemove', (e) => {
  if (flutuante && !flutuante.hidden && (!atual?.isConnected || !atual.contains(e.target as Node))) flutuante.hidden = true;
});

/** Mostra o resumo completo ao lado do elemento enquanto o mouse estiver em cima. */
export function resumoAoPassar(alvo: HTMLElement, pokemon: () => PokemonIndividual) {
  alvo.addEventListener('mouseenter', () => {
    if (alvo.classList.contains('arrastando')) return;
    atual = alvo;
    flutuante ??= el('div', { class: 'resumo-pokemon resumo-flutuante' });
    // sempre por cima de tudo (inclusive das janelas do PC e da bolsa)
    document.body.appendChild(flutuante);
    Object.assign(flutuante.style, { position: 'fixed', zIndex: '100000' });
    flutuante.replaceChildren(...resumoPokemon(pokemon(), { abilityConhecida: true, completo: true }));
    flutuante.hidden = false;
    const r = alvo.getBoundingClientRect();
    const largura = flutuante.offsetWidth;
    const altura = flutuante.offsetHeight;
    // à direita do cartão; se não couber, à esquerda
    const x = r.right + 8 + largura < window.innerWidth ? r.right + 8 : Math.max(8, r.left - 8 - largura);
    const y = Math.max(8, Math.min(window.innerHeight - altura - 8, r.top));
    Object.assign(flutuante.style, { left: `${x}px`, top: `${y}px` });
  });
  const esconder = () => flutuante && (flutuante.hidden = true);
  alvo.addEventListener('mouseleave', esconder);
  alvo.addEventListener('pointerdown', esconder);
}
