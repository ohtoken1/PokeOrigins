import { nomeItemEquipado } from '../../../shared/usoItens';
import { itemDaLoja } from '../../../shared/loja';
import { iconeItem } from './iconeItem';
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

/** Cadeado desenhado (Pokémon trancado no PC: não pode ser solto). */
export function cadeado(classe = ''): HTMLElement {
  const s = el('span', { class: `cadeado ${classe}`, title: 'Trancado: não pode ser solto' });
  s.innerHTML = '<svg viewBox="0 0 12 14" width="11" height="13" aria-hidden="true"><path d="M3 6V4.2a3 3 0 0 1 6 0V6" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="1.2" y="6" width="9.6" height="7" rx="1.6" fill="currentColor"/><rect x="5.3" y="8.3" width="1.4" height="2.6" rx=".7" fill="#1b2433"/></svg>';
  return s;
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
    p.trancado ? cadeado('canto-trancado') : null,
    p.item ? el('span', { class: 'canto-item', title: `Segurando ${nomeItemEquipado(p.item)}` }, iconeItem(itemDaLoja(p.item) ?? { id: p.item, categoria: 'batalha' })) : null,
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
      // a imagem do Pokémon não pode ser "arrastada" pelo navegador (isso travava o clique)
      vaga.addEventListener('dragstart', (e) => e.preventDefault());
      vaga.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const [x0, y0] = [e.clientX, e.clientY];
        arrastou = false;
        let alvo: number | null = null;
        // todos os eventos seguintes vêm para esta vaga, mesmo com o mouse fora dela
        vaga.setPointerCapture(e.pointerId);
        const mover = (ev: PointerEvent) => {
          if (!arrastou && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
          if (!arrastou) {
            arrastou = true;
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
        const terminar = (ev: PointerEvent) => {
          vaga.removeEventListener('pointermove', mover);
          vaga.removeEventListener('pointerup', terminar);
          vaga.removeEventListener('pointercancel', terminar);
          if (vaga.hasPointerCapture(ev.pointerId)) vaga.releasePointerCapture(ev.pointerId);
          vaga.classList.remove('arrastando');
          vaga.style.translate = '';
          vagas.forEach((v) => v.classList.remove('alvo'));
          if (ev.type === 'pointerup' && arrastou && alvo !== null) {
            const destino = Math.min(alvo, time.length - 1);
            const [p] = time.splice(origem, 1);
            time.splice(destino, 0, p);
            aoReordenar();
          }
          // deixa o clique (que vem logo depois) saber que foi um arraste
          setTimeout(() => (arrastou = false));
        };
        vaga.addEventListener('pointermove', mover);
        vaga.addEventListener('pointerup', terminar);
        vaga.addEventListener('pointercancel', terminar);
      });
    });
  return el('div', { class: 'painel-time' }, el('h2', {}, `Seu time (${time.length}/${TAMANHO_MAXIMO_TIME})`), el('div', { class: 'vagas' }, vagas));
}
