// App instalado (PWA, pedido do dono): o jogo pode ir para a tela inicial do celular/computador e abrir em tela
// cheia. Aqui fica o assistente de fundo (public/sw.js) e o pedido de instalação que o navegador oferece.

interface PedidoDeInstalacao extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let pedido: PedidoDeInstalacao | null = null;
const ouvintes = new Set<() => void>();
const avisarMudanca = () => ouvintes.forEach((f) => f());

/** Já está aberto como app instalado (sem a barra do navegador)? */
export const abertoComoApp = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone/iPad: lá não existe o botão do navegador; o jogador usa Compartilhar → Adicionar à Tela de Início. */
export const ehIos = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** O navegador já ofereceu a instalação (Android, Chrome/Edge no PC)? */
export const podeInstalar = (): boolean => !!pedido;

/** Mostra a janela de instalação do navegador. Devolve true se o jogador aceitou. */
export async function instalar(): Promise<boolean> {
  if (!pedido) return false;
  const p = pedido;
  pedido = null;
  await p.prompt();
  const { outcome } = await p.userChoice;
  avisarMudanca();
  return outcome === 'accepted';
}

export function aoMudarInstalacao(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Uma vez, no começo: guarda o pedido de instalação e liga o assistente de fundo (só no site montado). */
export function prepararApp(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // o navegador mostraria o aviso dele na hora; guardamos para o botão "Instalar o jogo" de Opções
    e.preventDefault();
    pedido = e as PedidoDeInstalacao;
    avisarMudanca();
  });
  window.addEventListener('appinstalled', () => ((pedido = null), avisarMudanca()));
  // no desenvolvimento (Vite) o assistente atrapalharia as atualizações do código: só no site de verdade
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const registrar = () => void navigator.serviceWorker.register('/sw.js').catch(() => {});
    // o jogo pode chegar aqui depois da página já ter carregado
    if (document.readyState === 'complete') registrar();
    else window.addEventListener('load', registrar);
  }
}
