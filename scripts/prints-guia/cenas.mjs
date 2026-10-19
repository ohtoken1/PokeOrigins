// Cenas das prints do Guia do jogo (uma por arquivo em client/public/guia/<nome>.webp). `alvo` = recorte (janela); sem alvo = tela inteira.
export const PREPARO = `
  window.__imp = (p) => { const u = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.split('?')[0].endsWith(p)); return import(u ?? p); };
  window.__save = async () => (await __imp('/src/estado.ts')).carregarSave();
  window.__ir = async (texto) => { const b = [...document.querySelectorAll('.barra-topo button')].find((x) => x.textContent.trim().endsWith(texto)); b.click(); await new Promise((r) => setTimeout(r, 1500)); };
  const st = document.createElement('style'); st.textContent = '.admin-aba, .aviso-conquista, .avisos-eventos, .aviso-sincronia { display: none !important; }'; document.head.append(st);
  [...document.querySelectorAll('.barra-topo button')].filter((b) => b.textContent.includes('Administração')).forEach((b) => (b.style.display = 'none'));
  const sv = await __save(); sv.aparencia.nome = 'Treinador';
  await __ir('Início');
  return 1`;
const j = (mod, chamada) => `const m = await __imp('${mod}'); const s = await __save(); ${chamada}; return 1`;
export const CENAS = [
  { nome: 'cidade', abrir: `await __ir('Cidade'); return 1`, espera: 6000 },
  { nome: 'regiao', abrir: `await __ir('Mapas'); return 1`, espera: 3000 },
  { nome: 'ficha', abrir: j('/src/ui/detalhes.ts', 'm.abrirDetalhes(s.time[0])'), alvo: '.janela' },
  { nome: 'cura', abrir: j('/src/ui/cura.ts', 'm.abrirCura(s, () => {})'), alvo: '.cura-fundo > *' },
  { nome: 'trem', abrir: j('/src/ui/trem.ts', 'm.abrirEstacao(s)'), alvo: '.janela' },
  { nome: 'ginasios', abrir: `await __ir('Ginásios'); return 1`, espera: 2500 },
  { nome: 'duelos', abrir: `await __ir('Duelos com treinadores'); return 1`, espera: 2500 },
  { nome: 'arena', abrir: `const m = await __imp('/src/ui/arena.ts'); m.abrirArena(() => {}); return 1`, alvo: '.janela' },
  { nome: 'loja', abrir: j('/src/ui/loja.ts', 'm.abrirLoja(s, () => {})'), alvo: '.janela' },
  { nome: 'bolsa', abrir: j('/src/ui/bolsa.ts', 'm.abrirBolsa(s, () => {})'), alvo: '.janela' },
  { nome: 'pc', abrir: j('/src/ui/pc.ts', 'm.abrirPC(s, () => {})'), alvo: '.janela' },
  { nome: 'professores', abrir: j('/src/telas/golpes.ts', "m.abrirProfessores(s, 'relembrar', () => {})"), alvo: '.janela' },
  { nome: 'mercado', abrir: j('/src/ui/mercado.ts', 'm.abrirMercado(s)'), alvo: '.janela', espera: 2500 },
  { nome: 'guilda', abrir: `await __ir('Guilda'); return 1`, espera: 2500 },
  { nome: 'amigos', abrir: `await __ir('Amigos'); return 1`, espera: 2500 },
  { nome: 'correio', abrir: `(await __imp('/src/ui/correio.ts')).abrirCorreio(); return 1`, alvo: '.janela', espera: 2500 },
  { nome: 'quadro', abrir: j('/src/ui/quadroMissoes.ts', 'm.abrirQuadroDeMissoes(s)'), alvo: '.janela', espera: 2500 },
  { nome: 'daycare', abrir: j('/src/ui/creche.ts', 'm.abrirCreche(s)'), alvo: '.janela' },
  { nome: 'craft', abrir: j('/src/ui/craft.ts', 'm.abrirCraft(s)'), alvo: '.janela' },
  { nome: 'suspeito', abrir: j('/src/ui/suspeito.ts', 'm.abrirSuspeito(s)'), alvo: '.janela' },
  { nome: 'viajante', abrir: j('/src/ui/lojaTemporal.ts', 'm.abrirLojaTemporal(s)'), alvo: '.janela' },
  { nome: 'inicio', abrir: `await __ir('Início'); return 1`, espera: 3000 },
  { nome: 'conquistas', abrir: `await __ir('Conquistas'); return 1`, espera: 2500 },
  { nome: 'ranking', abrir: `await __ir('Ranking'); return 1`, espera: 3000 },
  { nome: 'eventos-info', abrir: `await __ir('Eventos'); return 1`, espera: 3000 },
  ...['expedicao', 'ninho', 'captura', 'cofre', 'loteria'].map((aba) => ({ nome: `ev-${aba}`, abrir: j('/src/ui/eventos.ts', `m.abrirEventos(s, () => {}, '${aba}')`), alvo: '.janela', espera: 2500 })),
  { nome: 'safari', abrir: j('/src/ui/safari.ts', 'm.abrirSafari(s, () => {})'), alvo: '.janela', espera: 2500 },
  { nome: 'torneio', abrir: `(await __imp('/src/ui/torneio.ts')).abrirTorneio(); return 1`, alvo: '.janela', espera: 2500 },
  { nome: 'liga', abrir: j('/src/ui/liga.ts', 'm.abrirLiga(s, () => {})'), alvo: '.janela', espera: 2500 },
  { nome: 'skins', abrir: `await __ir('Minhas skins'); return 1`, espera: 2500 },
  { nome: 'perfil', abrir: `await __ir('Meu perfil'); return 1`, espera: 2500 },
  { nome: 'orb', abrir: j('/src/ui/ticket.ts', "m.abrirJanelaTicket(s, 'ticket-palkia', () => {})"), alvo: '.janela' },
  { nome: 'ovo', abrir: j('/src/ui/ovo.ts', "m.abrirJanelaOvo(s, 'ovo-lendario', () => {})"), alvo: '.janela' },
  { nome: 'chave', abrir: j('/src/ui/ticket.ts', "m.abrirJanelaTicket(s, 'chave-temporal', () => {})"), alvo: '.janela' },
  { nome: 'doacao', abrir: `await __ir('Doação'); return 1`, espera: 2500 },
];
