// Atalhos de teclado (pedido do dono, lista aprovada em 17/10/2026; as teclas o jogador troca no F1 ou em Opções,
// guardadas por teclas.ts). Padrão fora da batalha: I Bolsa, P PC, X Pokédex, C Correio, E Eventos, H Centro Pokémon,
// M voltar ao jogo, T chat, Espaço lutar com o selvagem (ui/popupEncontro.ts), F1 lista. Os da batalha ficam em batalha/telaBatalha.ts. W, A, S, D e setas continuam sendo para
// andar; nada funciona enquanto o jogador digita num campo. Apertar de novo a tecla da janela aberta fecha ela.
import { ultimoLugar } from './lugar';
import type { Destino, Navegar } from './main';
import { ehAdministrador } from './bonificacao';
import { carregarSave } from './estado';
import { abrirBolsa } from './ui/bolsa';
import { abrirCorreio } from './ui/correio';
import { abrirCuraPeloAtalho } from './ui/cura';
import { digitando } from './ui/digitando';
import { el } from './ui/dom';
import { abrirJanela, fecharTodasJanelas } from './ui/janela';
import { abrirPC } from './ui/pc';
import { ACOES_TECLA, acaoDaTecla, escolhendoTecla, marcarEscolhendo, mudarTecla, nomeDaTecla, restaurarTeclas, teclaDe, teclaDoEvento } from './teclas';

/**
 * Janela dos atalhos (F1 e Opções → Atalhos): cada ação com a sua tecla; clicar na tecla e apertar outra troca
 * (teclas.ts guarda no navegador). Esc cancela a escolha.
 */
export function abrirListaDeAtalhos(): void {
  let escolhendo: string | null = null;
  let erro = '';
  const janela = abrirJanela('⌨️ Atalhos de teclado', () => {
    const tabela = (titulo: string, grupo: 'jogo' | 'batalha') =>
      el('section', {}, el('h3', {}, titulo), el('dl', { class: 'atalhos-lista' },
        ...ACOES_TECLA.filter((a) => a.grupo === grupo).flatMap((a) => [
          el('dt', {}, el('button', {
            class: `tecla-atalho ${escolhendo === a.id ? 'escolhendo' : ''}`,
            title: 'Clique e aperte a tecla nova',
            onclick: () => ((escolhendo = escolhendo === a.id ? null : a.id), (erro = ''), marcarEscolhendo(!!escolhendo), janela.redesenhar()),
          }, el('kbd', {}, escolhendo === a.id ? 'Aperte…' : nomeDaTecla(teclaDe(a.id))))),
          el('dd', {}, a.nome),
        ]),
        ...(grupo === 'jogo' ? [el('dt', {}, el('kbd', {}, 'Esc')), el('dd', {}, 'Fechar janela'), el('dt', {}, el('kbd', {}, 'F1')), el('dd', {}, 'Esta lista de atalhos')] : [])));
    return el('div', { class: 'atalhos' },
      el('p', { class: 'meta' }, 'Clique numa tecla e aperte a nova para trocar. Se outra ação usava essa tecla, as duas trocam.'),
      erro ? el('p', { class: 'erro-atalho' }, erro) : null,
      tabela('No jogo', 'jogo'),
      tabela('Na batalha', 'batalha'),
      el('p', { class: 'meta' }, 'W, A, S, D e as setas andam com o personagem. Os atalhos não funcionam enquanto você escreve num campo.'),
      el('button', { class: 'botao secundario', onclick: () => (restaurarTeclas(), (escolhendo = null), marcarEscolhendo(false), janela.redesenhar()) }, 'Restaurar padrão'));
  }, { classe: 'janela-atalhos', aoFechar: () => {
    escolhendo = null;
    marcarEscolhendo(false);
    window.removeEventListener('keydown', pegarTecla, true);
  } });
  // pega a tecla antes de todo mundo (atalhos do jogo, Esc da janela)
  function pegarTecla(e: KeyboardEvent) {
    if (!escolhendo) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key !== 'Escape') erro = mudarTecla(escolhendo, teclaDoEvento(e)) ?? '';
    escolhendo = null;
    marcarEscolhendo(false);
    janela.redesenhar();
  }
  window.addEventListener('keydown', pegarTecla, true);
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
    if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || digitando() || escolhendoTecla) return;
    const save = carregarSave();
    if (!save || SEM_ATALHOS.includes(destinoAtual().tela)) return;
    // na batalha valem os atalhos dela (telaBatalha.ts)
    if (document.querySelector('.batalha-fundo')) return;
    const tecla = e.key === 'F1' ? 'F1' : acaoDaTecla(teclaDoEvento(e), 'jogo');
    if (!tecla) return;
    const acoes: Record<string, () => void> = {
      bolsa: () => abrirBolsa(save, aoMudar),
      pc: () => abrirPC(save, aoMudar),
      pokedex: () => navegar({ tela: 'pokedex' }),
      correio: () => abrirCorreio(),
      eventos: () => navegar({ tela: 'comunidade', secao: 'eventos' }),
      cura: () => abrirCuraPeloAtalho(save, aoMudar),
      mapas: () => navegar(ehAdministrador() ? { tela: 'regiao' } : ultimoLugar()),
      chat: () => {
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
