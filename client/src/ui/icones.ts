// Ícones simples de traço (preto e branco, seguem a cor do texto), 24×24.
const TRACOS: Record<string, string> = {
  coracao: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  computador: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  mochila:
    '<path d="M6 10a6 6 0 0 1 12 0v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/><path d="M9 4.8V4a3 3 0 0 1 6 0v.8"/><path d="M9 14h6v3H9z"/>',
  loja: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 9z"/><path d="M5.5 12v8h13v-8M10 20v-5h4v5"/>',
};

export type NomeIcone = keyof typeof TRACOS;

export function icone(nome: NomeIcone): HTMLElement {
  const span = document.createElement('span');
  span.className = 'icone';
  span.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRACOS[nome]}</svg>`;
  return span;
}
