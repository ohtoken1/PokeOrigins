// Assistente de fundo do app instalado (PWA, pedido do dono). Deixa o jogo instalável e guarda no aparelho os
// arquivos do próprio site (código, imagens, mapas, sons) para abrir mais rápido. NUNCA guarda /api nem /ws: tudo o
// que é do servidor (save, conta, batalhas) continua indo direto para ele. Mudou a estratégia? Suba a VERSAO.
const VERSAO = 'v1';
const CACHE = `pokeorigins-${VERSAO}`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  // apaga os caches de versões antigas
  e.waitUntil(caches.keys().then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('pokeorigins-') && n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // só os arquivos do próprio site; servidor do jogo e sites de fora seguem normais
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) return;

  // a página: sempre a mais nova (atualização chega na hora); sem internet, a última guardada
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => guardar(req, r)).catch(() => caches.match(req).then((r) => r ?? caches.match('/'))));
    return;
  }
  // código montado (/assets/ tem o "carimbo" no nome, nunca muda): do aparelho primeiro
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(req).then((r) => r ?? fetch(req).then((n) => guardar(req, n))));
    return;
  }
  // imagens, mapas e sons: mostra o guardado na hora e atualiza por trás
  e.respondWith(caches.match(req).then((guardado) => {
    const novo = fetch(req).then((n) => guardar(req, n)).catch(() => guardado);
    return guardado ?? novo;
  }));
});

function guardar(req, resposta) {
  if (resposta && resposta.ok && resposta.type === 'basic') {
    const copia = resposta.clone();
    caches.open(CACHE).then((c) => c.put(req, copia));
  }
  return resposta;
}
