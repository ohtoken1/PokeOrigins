// Arrastar e soltar com o ponteiro (mouse, toque ou caneta). Alvos são elementos com `data-alvo`.
// Um toque sem arrastar conta como clique.

export interface OpcoesArrastar {
  aoClicar(): void;
  /** `alvo` = elemento com data-alvo embaixo do ponteiro ao soltar (ou null). */
  aoSoltar(alvo: HTMLElement | null): void;
  /** Segurar parado por meio segundo (sem arrastar): ex. marcar para soltar vários no PC. */
  aoSegurar?(): void;
}

/** Tempo segurando parado para contar como "segurar" (ms). */
const TEMPO_SEGURAR = 450;

export function tornarArrastavel(elemento: HTMLElement, { aoClicar, aoSoltar, aoSegurar }: OpcoesArrastar): void {
  elemento.classList.add('arrastavel');
  elemento.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const [x0, y0] = [e.clientX, e.clientY];
    let arrastando = false;
    let segurou = false;
    let alvo: HTMLElement | null = null;
    const relogio = aoSegurar
      ? window.setTimeout(() => {
          if (arrastando) return;
          segurou = true;
          aoSegurar();
        }, TEMPO_SEGURAR)
      : 0;

    const acharAlvo = (x: number, y: number) =>
      (document
        .elementsFromPoint(x, y)
        .map((el) => el.closest<HTMLElement>('[data-alvo]'))
        .find((a) => a && a !== elemento) as HTMLElement | undefined) ?? null;

    const mover = (ev: PointerEvent) => {
      if (!arrastando && (segurou || Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6)) return;
      arrastando = true;
      clearTimeout(relogio);
      elemento.classList.add('arrastando');
      elemento.style.translate = `${ev.clientX - x0}px ${ev.clientY - y0}px`;
      const novo = acharAlvo(ev.clientX, ev.clientY);
      if (novo !== alvo) {
        alvo?.classList.remove('alvo');
        novo?.classList.add('alvo');
        alvo = novo;
      }
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      elemento.classList.remove('arrastando');
      elemento.style.translate = '';
      alvo?.classList.remove('alvo');
      clearTimeout(relogio);
      if (arrastando) aoSoltar(alvo);
      else if (!segurou) aoClicar();
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  });
}
