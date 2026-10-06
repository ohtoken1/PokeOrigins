import { expParaNivel, hpMaximo } from '../../../shared/batalha/pokemon';
import { pokemonPorId } from '../dados';
import { TAMANHO_MAXIMO_TIME, type PokemonDoJogador } from '../estado';
import { abrirDetalhes } from './detalhes';
import { resumoAoPassar } from './resumo';
import { el, spritePokemon } from './dom';

export function barraHp(hp: number, hpMax: number): HTMLElement {
  const fracao = hpMax > 0 ? hp / hpMax : 0;
  const cor = fracao > 0.5 ? 'verde' : fracao > 0.2 ? 'amarela' : 'vermelha';
  return el('div', { class: 'barra-hp' }, el('div', { class: `preenchido ${cor}`, style: { width: `${fracao * 100}%` } }));
}

/** Cartãozinho de um Pokémon (time, PC, escolha de alvo de item). */
export function cartaoPokemon(p: PokemonDoJogador, atributos: Record<string, unknown> = {}): HTMLElement {
  const dados = pokemonPorId(p.especieId);
  const max = hpMaximo(p);
  const cartao = el(
    'button',
    {
      class: `vaga ${p.shiny ? 'shiny' : ''} ${p.hp <= 0 ? 'desmaiado' : ''}`,
      ...atributos,
    },
    spritePokemon(dados, { shiny: p.shiny, animado: false }),
    p.inegociavel ? el('span', { class: 'canto-nt', title: 'NT · Inegociável' }, 'NT') : null,
    el('span', {}, `${dados.nome}${p.shiny ? ' ✨' : ''}`),
    el('small', {}, `Nv. ${p.nivel}`),
    barraHp(p.hp, max),
    barraXp(p),
  );
  // informações ao passar o mouse (natureza, ability, atributos, golpes…)
  resumoAoPassar(cartao, () => p);
  return cartao;
}

/** Barrinha azul do XP que falta para o próximo nível. */
export function barraXp(p: PokemonDoJogador): HTMLElement {
  const crescimento = pokemonPorId(p.especieId).crescimento;
  const atual = expParaNivel(crescimento, p.nivel);
  const proximo = expParaNivel(crescimento, p.nivel + 1);
  const fracao = p.nivel >= 100 ? 1 : Math.max(0, Math.min(1, (p.exp - atual) / Math.max(1, proximo - atual)));
  return el(
    'div',
    { class: 'barra-xp', title: p.nivel >= 100 ? 'Nível máximo' : `XP: faltam ${Math.max(0, proximo - p.exp)} para o Nv. ${p.nivel + 1}` },
    el('div', { style: { width: `${fracao * 100}%` } }),
  );
}

/**
 * Painel do time. Com `aoReordenar`, dá para arrastar um Pokémon para outra vaga e mudar a ordem
 * (o primeiro é quem entra na batalha e anda atrás do jogador); a lista `time` é alterada no lugar.
 */
export function painelTime(time: PokemonDoJogador[], aoReordenar?: () => void): HTMLElement {
  // arrastou de verdade (não foi só um clique): o clique seguinte não abre a ficha
  let arrastou = false;
  const vagas: HTMLElement[] = Array.from({ length: TAMANHO_MAXIMO_TIME }, (_, i) =>
    time[i] ? cartaoPokemon(time[i], { onclick: () => !arrastou && abrirDetalhes(time[i]) }) : el('div', { class: 'vaga vazia' }),
  );
  if (aoReordenar)
    vagas.forEach((vaga, origem) => {
      if (!time[origem]) return;
      vaga.classList.add('arrastavel');
      vaga.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const [x0, y0] = [e.clientX, e.clientY];
        arrastou = false;
        let alvo: number | null = null;
        const mover = (ev: PointerEvent) => {
          if (!arrastou && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
          if (!arrastou) {
            arrastou = true;
            vaga.setPointerCapture(ev.pointerId);
            vaga.classList.add('arrastando');
          }
          vaga.style.translate = `${ev.clientX - x0}px ${ev.clientY - y0}px`;
          // vaga embaixo do ponteiro (ignorando a que está sendo arrastada)
          alvo = vagas.findIndex((v, j) => {
            if (j === origem) return false;
            const r = v.getBoundingClientRect();
            return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
          });
          if (alvo < 0) alvo = null;
          vagas.forEach((v, j) => v.classList.toggle('alvo', j === alvo));
        };
        const soltar = () => {
          window.removeEventListener('pointermove', mover);
          vaga.classList.remove('arrastando');
          vaga.style.translate = '';
          vagas.forEach((v) => v.classList.remove('alvo'));
          if (arrastou && alvo !== null) {
            const destino = Math.min(alvo, time.length - 1);
            const [p] = time.splice(origem, 1);
            time.splice(destino, 0, p);
            aoReordenar();
          }
          // deixa o clique (que vem logo depois) saber que foi um arraste
          setTimeout(() => (arrastou = false));
        };
        window.addEventListener('pointermove', mover);
        window.addEventListener('pointerup', soltar, { once: true });
      });
    });
  return el('div', { class: 'painel-time' }, el('h2', {}, `Seu time (${time.length}/${TAMANHO_MAXIMO_TIME})`), el('div', { class: 'vagas' }, vagas));
}
