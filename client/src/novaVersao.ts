// Avisa quem está jogando que saiu uma versão nova (deploy no Railway): a página aberta continua com o código
// antigo até recarregar. Compara o arquivo principal do jogo (nome com hash, ex. /assets/index-AbC123.js) com o
// da página publicada agora; mudou = aviso com "Atualizar agora" (salva antes). Não força: quem está em batalha
// termina e clica depois. Só no site montado (no Vite o arquivo não tem hash).
import { salvarAgora } from './estado';
import { el } from './ui/dom';

const INTERVALO_MS = 2 * 60 * 1000;

const meuArquivo = () => document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')?.src.split('/').pop() ?? null;

async function arquivoPublicado(): Promise<string | null> {
  const r = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) return null;
  return /\/assets\/(index-[^"']+\.js)/.exec(await r.text())?.[1] ?? null;
}

let avisado = false;
function mostrarAviso(): void {
  if (avisado) return;
  avisado = true;
  const atualizar = async () => {
    botao.disabled = true;
    botao.textContent = 'Salvando…';
    try {
      await salvarAgora();
    } catch {
      // recarrega mesmo assim: a cópia do navegador sobe no próximo login
    }
    location.reload();
  };
  const botao = el('button', { class: 'botao', onclick: () => void atualizar() }, 'Atualizar agora') as HTMLButtonElement;
  document.body.append(el('div', { class: 'aviso-nova-versao', role: 'status' },
    el('strong', {}, '✨ Saiu uma atualização do jogo!'),
    el('span', {}, 'Atualize para receber as novidades e correções (seu progresso é salvo antes).'),
    botao));
}

export function vigiarNovaVersao(): void {
  if (!import.meta.env.PROD) return;
  const meu = meuArquivo();
  if (!meu) return;
  const conferir = async () => {
    if (avisado || document.visibilityState !== 'visible') return;
    try {
      const publicado = await arquivoPublicado();
      if (publicado && publicado !== meu) mostrarAviso();
    } catch {
      // sem conexão (servidor reiniciando no deploy): tenta na próxima
    }
  };
  setInterval(() => void conferir(), INTERVALO_MS);
  document.addEventListener('visibilitychange', () => void conferir());
  // a conexão do mundo cai e volta quando o servidor reinicia no deploy: confere logo depois
  window.addEventListener('online', () => void conferir());
}
