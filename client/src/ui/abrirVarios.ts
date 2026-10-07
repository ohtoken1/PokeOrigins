// Botões para abrir/chocar várias vezes de uma vez (1, 3, 5 ou 10), para quem tem muitos tickets/ovos.
import { el } from './dom';

export const QUANTIDADES_ROLETA = [1, 3, 5, 10];

/** Linha de botões "×1 ×3 ×5 ×10"; os que passam do que o jogador tem ficam desligados. */
export function botoesQuantidade(verbo: string, tem: number, aoEscolher: (n: number) => void): { raiz: HTMLElement; travar: (sim: boolean) => void } {
  const botoes = QUANTIDADES_ROLETA.map(
    (n) => el('button', { class: `botao ${n === 1 ? 'grande' : 'secundario'}`, disabled: tem < n, onclick: () => aoEscolher(n) }, n === 1 ? `${verbo} 1` : `×${n}`) as HTMLButtonElement,
  );
  return {
    raiz: el('div', { class: 'botoes-quantidade' }, ...botoes, el('small', { class: 'meta' }, tem > 0 ? `Você tem ${tem}` : 'Você não tem nenhum')),
    travar: (sim) => botoes.forEach((b, i) => (b.disabled = sim || tem < QUANTIDADES_ROLETA[i])),
  };
}
