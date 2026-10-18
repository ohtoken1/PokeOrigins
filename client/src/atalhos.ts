// Atalhos de teclado (pedido do dono, lista aprovada em 17/10/2026). Fora da batalha: I Bolsa, P PC, X Pokédex,
// C Correio, E Comunidade → Eventos, H Centro Pokémon, M Mapas (jogador comum: Cidade), T escrever no chat, F1 lista.
// Os da batalha (F, 1–4, B, Q, R, Espaço) ficam em batalha/telaBatalha.ts. W, A, S, D e setas continuam sendo para
// andar; nada funciona enquanto o jogador digita num campo. Apertar de novo a tecla da janela aberta fecha ela.
import type { Destino, Navegar } from './main';
import { ehAdministrador } from './bonificacao';
import { carregarSave } from './estado';
import { abrirBolsa } from './ui/bolsa';
import { abrirCorreio } from './ui/correio';
import { abrirCura } from './ui/cura';
import { digitando } from './ui/digitando';
import { el } from './ui/dom';
import { abrirJanela, fecharTodasJanelas } from './ui/janela';
import { abrirPC } from './ui/pc';

/** Lista mostrada no F1 (e no guia, mais tarde). */
export const ATALHOS: { tecla: string; acao: string }[] = [
  { tecla: 'I', acao: 'Bolsa' },
  { tecla: 'P', acao: 'PC' },
  { tecla: 'X', acao: 'Pokédex' },
  { tecla: 'C', acao: 'Correio' },
  { tecla: 'E', acao: 'Comunidade → Eventos' },
  { tecla: 'H', acao: 'Centro Pokémon (cura)' },
  { tecla: 'M', acao: 'Mapas (jogador: Cidade)' },
  { tecla: 'T', acao: 'Escrever no chat' },
  { tecla: 'Esc', acao: 'Fechar janela' },
  { tecla: 'F1', acao: 'Esta lista de atalhos' },
];
export const ATALHOS_BATALHA: { tecla: string; acao: string }[] = [
  { tecla: 'F', acao: 'Lutar' },
  { tecla: '1 a 4', acao: 'Escolher o golpe' },
  { tecla: 'B', acao: 'Bolsa' },
  { tecla: 'Q', acao: 'Trocar de Pokémon' },
  { tecla: 'R', acao: 'Fugir' },
  { tecla: 'Espaço', acao: 'Passar a mensagem' },
];

function abrirListaDeAtalhos(): void {
  const tabela = (titulo: string, lista: typeof ATALHOS) =>
    el('section', {}, el('h3', {}, titulo), el('dl', { class: 'atalhos-lista' }, ...lista.flatMap((a) => [el('dt', {}, el('kbd', {}, a.tecla)), el('dd', {}, a.acao)])));
  abrirJanela('⌨️ Atalhos de teclado', () =>
    el('div', { class: 'atalhos' },
      tabela('No jogo', ATALHOS),
      tabela('Na batalha', ATALHOS_BATALHA),
      el('p', { class: 'meta' }, 'W, A, S, D e as setas andam com o personagem. Os atalhos não funcionam enquanto você escreve num campo.')),
  { classe: 'janela-atalhos' });
}

/** Telas em que ainda não há jogo (criação do personagem, roleta do inicial). */
const SEM_ATALHOS: Destino['tela'][] = ['inicial', 'personagem'];

export function ativarAtalhos(navegar: Navegar, destinoAtual: () => Destino): void {
  /** Tecla que abriu a janela que está aberta agora (apertar de novo fecha). */
  let ultima: string | null = null;
  // depois de usar a bolsa/PC/cura: Início e a tela da região mostram o time e se redesenham (como o cabeçalho faz)
  const aoMudar = () => {
    const d = destinoAtual();
    if (d.tela === 'regiao' || d.tela === 'inicio') navegar(d);
  };

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || digitando()) return;
    const save = carregarSave();
    if (!save || SEM_ATALHOS.includes(destinoAtual().tela)) return;
    // na batalha valem os atalhos dela (telaBatalha.ts)
    if (document.querySelector('.batalha-fundo')) return;
    const tecla = e.key === 'F1' ? 'F1' : e.key.length === 1 ? e.key.toLowerCase() : '';
    const acoes: Record<string, () => void> = {
      i: () => abrirBolsa(save, aoMudar),
      p: () => abrirPC(save, aoMudar),
      x: () => navegar({ tela: 'pokedex' }),
      c: () => abrirCorreio(),
      e: () => navegar({ tela: 'comunidade', secao: 'eventos' }),
      h: () => abrirCura(save, aoMudar),
      m: () => navegar(ehAdministrador() ? { tela: 'regiao' } : { tela: 'cidade' }),
      t: () => {
        const campo = document.querySelector<HTMLInputElement>('.chat-campo:not(:disabled)');
        if (campo) setTimeout(() => campo.focus());
      },
      F1: abrirListaDeAtalhos,
    };
    const acao = acoes[tecla];
    if (!acao) return;
    e.preventDefault();
    const algumaAberta = !!document.querySelector('.janela-fundo, .cura-fundo');
    if (algumaAberta) {
      // a mesma tecla fecha a janela que ela abriu; outra tecla não abre nada por cima
      if (tecla === ultima) {
        fecharTodasJanelas();
        document.querySelector<HTMLElement>('.cura-fundo .cura-sair')?.click();
        ultima = null;
      }
      return;
    }
    ultima = tecla;
    acao();
  });
}
