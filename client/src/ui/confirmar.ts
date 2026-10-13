// Janela "Tem certeza?" com Não e Sim (pedido do dono: às vezes o jogador clica sem querer). Usada antes de gastar
// algo que não volta: ensinar golpe no Move Tutor, TM/TR, pedra de evolução, Mint, Ability Capsule, charm…
import { abrirJanela } from './janela';
import { el } from './dom';

/** Pergunta e devolve true só se o jogador clicar em Sim (fechar a janela = Não). */
export function confirmar(titulo: string, ...texto: (Node | string)[]): Promise<boolean> {
  return new Promise((responder) => {
    let resposta = false;
    const janela = abrirJanela(
      titulo,
      () =>
        el(
          'div',
          { class: 'soltar confirmar' },
          el('p', {}, ...texto),
          el(
            'div',
            { class: 'soltar-botoes' },
            el('button', { class: 'botao secundario', onclick: () => janela.fechar() }, 'Não'),
            el('button', { class: 'botao', onclick: () => ((resposta = true), janela.fechar()) }, 'Sim'),
          ),
        ),
      { aoFechar: () => responder(resposta) },
    );
  });
}
