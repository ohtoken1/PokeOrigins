// Barras deslizantes (volume, nível…): o CSS pinta a parte cheia pela variável --cheio. Vale para todo
// input range do jogo: um observador marca os que aparecem e o evento input atualiza enquanto arrasta.
export function pintarDeslizante(barra: HTMLInputElement): void {
  const min = Number(barra.min || 0);
  const max = Number(barra.max || 100);
  const cheio = max > min ? ((Number(barra.value) - min) / (max - min)) * 100 : 0;
  barra.style.setProperty('--cheio', `${cheio}%`);
}

const ehDeslizante = (n: unknown): n is HTMLInputElement => n instanceof HTMLInputElement && n.type === 'range';

export function ativarDeslizantes(): void {
  document.addEventListener('input', (e) => ehDeslizante(e.target) && pintarDeslizante(e.target), true);
  new MutationObserver((mudancas) => {
    for (const m of mudancas)
      for (const n of m.addedNodes) {
        if (ehDeslizante(n)) pintarDeslizante(n);
        else if (n instanceof Element) n.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(pintarDeslizante);
      }
  }).observe(document.body, { childList: true, subtree: true });
}
