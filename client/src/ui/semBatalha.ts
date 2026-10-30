// Nada aparece por cima de uma batalha (pedido do dono, 29/10/2026): avisos, prêmios de login, conquistas e o
// Professor esperam a batalha acabar e aparecem logo depois. Sem imports (qualquer arquivo pode usar).

/** Há uma batalha aberta na tela agora? */
export const emBatalha = (): boolean => !!document.querySelector('.batalha-fundo');

/** Roda `fn` agora ou, com uma batalha aberta, assim que ela fechar (na ordem em que foram pedidas). */
export function depoisDaBatalha(fn: () => void): void {
  if (!emBatalha()) return fn();
  esperando.push(fn);
  if (relogio) return;
  relogio = setInterval(() => {
    if (emBatalha()) return;
    clearInterval(relogio);
    relogio = undefined;
    for (const f of esperando.splice(0)) f();
  }, 400);
}
const esperando: (() => void)[] = [];
let relogio: ReturnType<typeof setInterval> | undefined;

// As janelas que aparecem sozinhas (pedido do dono): o Professor, os "Prêmios de hoje" e o aviso de conquista abrem
// uma de cada vez, nunca uma em cima da outra. Cada uma espera as outras (e a batalha) saírem da tela.
export const PROFESSOR_NA_TELA = '.tutorial-fundo';
export const PREMIOS_NA_TELA = '.janela-login-diario';
export const CONQUISTA_NA_TELA = '.aviso-conquista:not([hidden])';

/** Roda `fn` assim que não houver batalha nem nada que case com `seletor` na tela. */
export function quandoLivre(seletor: string, fn: () => void): void {
  const livre = () => !emBatalha() && !document.querySelector(seletor);
  if (livre()) return fn();
  const r = setInterval(() => {
    if (!livre()) return;
    clearInterval(r);
    fn();
  }, 400);
}
