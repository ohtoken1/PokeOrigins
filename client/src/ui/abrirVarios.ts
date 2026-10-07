// Abrir/chocar várias vezes de uma vez (1, 3 ou 5): uma roleta por tentativa, uma em cima da outra.
import { el } from './dom';

export const QUANTIDADES_ROLETA = [1, 3, 5];

const LARGURA_CASA = 92;
const CASAS = 44;
const ALVO = 38;

/** Linha de botões "Abrir 1 / ×3 / ×5"; os que passam do que o jogador tem ficam desligados. */
export function botoesQuantidade(verbo: string, tem: number, aoEscolher: (n: number) => void): { raiz: HTMLElement; travar: (sim: boolean) => void } {
  const botoes = QUANTIDADES_ROLETA.map(
    (n) => el('button', { class: `botao ${n === 1 ? 'grande' : 'secundario'}`, disabled: tem < n, onclick: () => aoEscolher(n) }, n === 1 ? `${verbo} 1` : `×${n}`) as HTMLButtonElement,
  );
  return {
    raiz: el('div', { class: 'botoes-quantidade' }, ...botoes, el('small', { class: 'meta' }, tem > 0 ? `Você tem ${tem}` : 'Você não tem nenhum')),
    travar: (sim) => botoes.forEach((b, i) => (b.disabled = sim || tem < QUANTIDADES_ROLETA[i])),
  };
}

/** Uma roleta parada, cheia de casas de enfeite (enquanto ninguém gira). */
function roleta(casas: HTMLElement[]): { raiz: HTMLElement; faixa: HTMLElement } {
  const faixa = el('div', { class: 'roleta-faixa' }, ...casas);
  return { raiz: el('div', { class: 'roleta roleta-ticket' }, el('div', { class: 'roleta-marcador' }), faixa), faixa };
}

/** Área das roletas: começa com uma parada; `girar` troca por uma por resultado e chama `aoParar` quando a última para. */
export function areaRoletas(enfeite: () => HTMLElement) {
  const raiz = el('div', { class: 'area-roletas' }, roleta(Array.from({ length: CASAS }, enfeite)).raiz);
  /** `alvos`: a casa de cada resultado. Cada roleta para um pouco depois da anterior. */
  const girar = (alvos: HTMLElement[], duracao: number, aoParar: () => void) => {
    const roletas = alvos.map((alvo) => roleta(Array.from({ length: CASAS }, (_, i) => (i === ALVO ? alvo : enfeite()))));
    raiz.classList.toggle('varias', alvos.length > 1);
    raiz.replaceChildren(...roletas.map((r) => r.raiz));
    void raiz.offsetWidth;
    const atraso = 350;
    roletas.forEach((r, k) => {
      const desvio = (Math.random() - 0.5) * LARGURA_CASA * 0.4;
      const deslocamento = ALVO * LARGURA_CASA - (r.raiz.clientWidth / 2 - LARGURA_CASA / 2) + desvio;
      r.faixa.style.transition = `transform ${duracao + k * atraso}ms cubic-bezier(0.12, 0.7, 0.15, 1)`;
      r.faixa.style.transform = `translateX(${-deslocamento}px)`;
      setTimeout(() => r.faixa.children[ALVO]?.classList.add('sorteado'), duracao + k * atraso + 50);
    });
    setTimeout(aoParar, duracao + (alvos.length - 1) * atraso + 150);
  };
  return { raiz, girar };
}
