// Ícones simples de traço (seguem a cor do texto), 24×24. Atalhos do cabeçalho e itens dos menus do topo usam a
// Pokébola preta e dourada (opção 2 escolhida pelo dono, 25/10/2026; `.atalho-hex` e `.icone-menu` no CSS).
const TRACOS: Record<string, string> = {
  coracao: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  computador: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  mochila:
    '<path d="M6 10a6 6 0 0 1 12 0v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/><path d="M9 4.8V4a3 3 0 0 1 6 0v.8"/><path d="M9 14h6v3H9z"/>',
  carta: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6l8.5 7 8.5-7"/>',
  calendario: '<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  mapa: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  loja: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 9z"/><path d="M5.5 12v8h13v-8M10 20v-5h4v5"/>',
  // itens dos menus do topo (ui/barraTopo.ts)
  cidade: '<path d="M3 21h18"/><path d="M5 21V11l4-3v13"/><path d="M9 21V4h7v17"/><path d="M16 21v-9h3v9"/><path d="M11.5 8h2M11.5 11h2M11.5 14h2"/>',
  duelos: '<path d="M5 5l11 11M19 5L8 16"/><path d="M14 18l4-4M6 14l4 4"/><path d="M17 17l3 3M7 17l-3 3"/>',
  ginasios: '<circle cx="12" cy="15" r="5"/><path d="M8.6 11.4L6 3h4l2 5 2-5h4l-2.6 8.4"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  conquistas: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8 21h8M10 17h4"/>',
  skins: '<path d="M9 4L4 7l2 4 2-1v10h8V10l2 1 2-4-5-3a3 3 0 0 1-6 0z"/>',
  recompensas: '<rect x="4" y="10" width="16" height="10" rx="1"/><path d="M3 7h18v3H3zM12 7v13"/><path d="M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0"/>',
  doacao: '<path d="M12 16s-6-3.6-6-8a3.4 3.4 0 0 1 6-2.2A3.4 3.4 0 0 1 18 8c0 4.4-6 8-6 8z"/><path d="M3 21h5l2-1.5h5"/>',
  opcoes: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  sair: '<path d="M14 4H6v16h8"/><path d="M10 12h10M17 9l3 3-3 3"/>',
  buscar: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  amigos: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.8"/><path d="M16.5 14.2A5.5 5.5 0 0 1 21.5 20"/>',
  guilda: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 7v10M8 11h8"/>',
  eventos: '<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 10h16M8 3v4M16 3v4"/><path d="M8 14h2M12 14h2M8 17h2"/>',
  ranking: '<path d="M3 20h18"/><path d="M5 20v-6h4v6M10 20V8h4v12M15 20v-8h4v8"/>',
  database: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
};

export type NomeIcone = keyof typeof TRACOS;

export function icone(nome: NomeIcone): HTMLElement {
  const span = document.createElement('span');
  span.className = 'icone';
  span.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRACOS[nome]}</svg>`;
  return span;
}

/** Ícone dos itens dos menus do topo: o desenho dentro da Pokébola preta e dourada. */
export function iconeMenu(nome: NomeIcone): HTMLElement {
  const bola = icone(nome);
  bola.className = 'icone icone-menu';
  return bola;
}
