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
  alvo: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  brilho: '<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M19 15.5v4M17 17.5h4"/>',
  coroa: '<path d="M4 17l-1-9 5 4 4-6 4 6 5-4-1 9z"/><path d="M4 20h16"/>',
  estrela: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  prancheta: '<rect x="5" y="5" width="14" height="16" rx="1.5"/><path d="M9 3.5h6v3H9z"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/>',
  medalha: '<path d="M8 3l2.5 6M16 3l-2.5 6"/><circle cx="12" cy="15" r="5.5"/><path d="M12 12.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z"/>',
  trem: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 10h12"/><path d="M9.5 13.5h.01M14.5 13.5h.01"/><path d="M8 21l2-4M16 21l-2-4"/>',
  banco: '<path d="M3 9l9-5 9 5z"/><path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9"/><path d="M3 20.5h18"/>',
  livro: '<path d="M4 5.5A2 2 0 0 1 6 4h6v16H6a2 2 0 0 0-2 1.5z"/><path d="M20 5.5A2 2 0 0 0 18 4h-6v16h6a2 2 0 0 1 2 1.5z"/>',
  livros: '<rect x="4" y="4" width="4" height="16" rx="0.8"/><rect x="9.5" y="6" width="4" height="14" rx="0.8"/><path d="M15.5 7.5l3.8-1 3.2 13.3-3.8 1z"/>',
  jornal: '<rect x="3" y="5" width="15" height="15" rx="1.5"/><path d="M18 9h3v9.5a1.5 1.5 0 0 1-3 0"/><path d="M6.5 9h8M6.5 12.5h8M6.5 16h5"/>',
  tenda: '<path d="M12 3v3"/><path d="M12 6L3 19h18z"/><path d="M12 6l-3 13M12 6l3 13"/>',
  ampulheta: '<path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
  martelo: '<path d="M14 5l5 5-2.5 2.5-5-5z"/><path d="M11.5 7.5L9 5l3-2 4 2"/><path d="M14 10L5 19a1.5 1.5 0 0 0 2 2l9-9"/>',
  oculos: '<circle cx="7" cy="14" r="3.5"/><circle cx="17" cy="14" r="3.5"/><path d="M10.5 14h3"/><path d="M3.5 14L5 7h2M20.5 14L19 7h-2"/>',
  ovo: '<path d="M12 3c-3.9 0-7 6-7 10.5a7 7 0 0 0 14 0C19 9 15.9 3 12 3z"/><path d="M8 13l2 1.5 2-1.5 2 1.5 2-1.5"/>',
  chapeu: '<path d="M7 15l1.5-8 3.5 1.5L15.5 7 17 15"/><path d="M2.5 15.5c3 2 16 2 19 0"/><path d="M7.5 12.5h9"/>',
  folha: '<path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15z"/><path d="M5 19l8-8"/>',
  caveira: '<path d="M12 3a7.5 7.5 0 0 0-5 13.1V19h10v-2.9A7.5 7.5 0 0 0 12 3z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 19v2M14 19v2"/>',
  floco: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5L12 6.5l2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
  cadeado: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2.5"/>',
  pino: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  grafico: '<path d="M4 4v16h16"/><path d="M7.5 15l4-4.5 3 3L20 7"/>',
  lapis: '<path d="M4 20l1-4.5L16 4.5 19.5 8 8.5 19z"/><path d="M14 7l3 3"/><path d="M4 20h7"/>',
  pata: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="15.5" cy="7" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M8.5 18.5c-2-1.5-.5-6 3.5-6s5.5 4 3.5 6c-1.5 1.2-2.5.5-3.5.5s-2 .7-3.5-.5z"/>',
  proibido: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  escudoOk: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  estadio: '<ellipse cx="12" cy="9" rx="9" ry="3.5"/><path d="M3 9v6c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5V9"/><path d="M8 12.2v6M16 12.2v6"/>',
  megafone: '<path d="M4 10v4h3l9 5V5L7 10z"/><path d="M7 14l1.5 5h2.5L10 15"/><path d="M19 9.5a3.5 3.5 0 0 1 0 5"/>',
  pergaminho: '<path d="M7 4h11a2 2 0 0 1 2 2v1h-4"/><path d="M16 7v11a2.5 2.5 0 0 1-5 0v-1H4v1a2.5 2.5 0 0 0 2.5 2.5H13.5"/><path d="M7 4a2 2 0 0 0-2 2v11"/><path d="M8.5 9h4.5M8.5 12.5h4.5"/>',
  parceria: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
  trocar: '<path d="M4 9h13l-3.5-3.5"/><path d="M20 15H7l3.5 3.5"/>',
  fogo: '<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4-3-6-4-10-2 1.5-3 3.5-3 5.5-1-1-1.5-2-1.7-3C7.5 9 5.5 11.5 5.5 14.5A6.5 6.5 0 0 0 12 21z"/><path d="M12 21a2.8 2.8 0 0 1-2.8-2.8c0-1.8 1.4-2.6 2.8-4.7 1.4 2.1 2.8 2.9 2.8 4.7A2.8 2.8 0 0 1 12 21z"/>',
  ninho: '<path d="M3 13c0 4 4 7 9 7s9-3 9-7"/><path d="M3 13h18"/><path d="M5 16.5h14M7.5 19h9"/><ellipse cx="9.5" cy="10" rx="2.3" ry="3"/><ellipse cx="14.5" cy="10" rx="2.3" ry="3"/>',
  roleta: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M12 3.5V10M12 14v6.5M3.5 12H10M14 12h6.5M6 6l4.6 4.6M13.4 13.4L18 18M18 6l-4.6 4.6M10.6 13.4L6 18"/>',
  bussola: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  diamante: '<path d="M6.5 4h11L21 9l-9 11L3 9z"/><path d="M3 9h18M9.5 4L8 9l4 11 4-11-1.5-5"/>',
  etiqueta: '<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.5"/>',
  orb: '<circle cx="12" cy="10.5" r="6.5"/><path d="M9 8.5a3.2 3.2 0 0 1 3-2"/><path d="M7 17.5l-1.5 3h13l-1.5-3"/>',
  chave: '<circle cx="7.5" cy="12" r="3.5"/><path d="M11 12h10M17.5 12v3.5M20.5 12v2.5"/>',
  ingresso: '<path d="M3 7.5h18v3a1.5 1.5 0 0 0 0 3v3H3v-3a1.5 1.5 0 0 0 0-3z"/><path d="M14.5 7.5v9" stroke-dasharray="1.6 1.8"/>',
  moeda: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9.5v5"/>',
  camera: '<rect x="3" y="7" width="13" height="10" rx="1.5"/><path d="M16 10.5l5-3v9l-5-3z"/>',
  celular: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  confirmado: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.7 2.7L16 9.5"/>',
  conversa: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  lixeira: '<path d="M4 7h16M9.5 7V4.5h5V7"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5.5M14 11v5.5"/>',
  bandeira: '<path d="M5 21V4"/><path d="M5 4.5c4-2 7 2 13 0v9c-6 2-9-2-13 0"/>',
  correr: '<circle cx="15" cy="4.5" r="2"/><path d="M8 9l4-2 3 3 3 1"/><path d="M12 7l-2 6 4 3v5"/><path d="M10 13l-3 7M6 11l-3 1"/>',
  database: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
};

export type NomeIcone = keyof typeof TRACOS;

export function icone(nome: NomeIcone): HTMLElement {
  const span = document.createElement('span');
  span.className = 'icone';
  span.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRACOS[nome]}</svg>`;
  return span;
}

/** Ícone no meio de um texto (título, botão, parágrafo): segue o tamanho da letra. */
export function iconeNoTexto(nome: NomeIcone): HTMLElement {
  const s = icone(nome);
  s.classList.add('icone-inline');
  return s;
}

/** Ícone dos itens dos menus do topo: o desenho dentro da Pokébola preta e dourada. */
export function iconeMenu(nome: NomeIcone): HTMLElement {
  const bola = icone(nome);
  bola.className = 'icone icone-menu';
  return bola;
}
