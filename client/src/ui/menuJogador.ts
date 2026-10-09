// Menu que abre ao clicar no boneco de outro jogador no mapa: Ver perfil, Trocar e Desafiar para duelo.
import { ErroApi } from '../conta';
import type { JogadorOnline } from '../online';
import { abrirPerfilDe } from '../telas/jogadores';
import { convidarParaTroca, trocasDisponiveis } from '../trocas';
import { el } from './dom';
import { abrirTroca } from './troca';

let aberto: HTMLElement | null = null;

function fechar(): void {
  aberto?.remove();
  aberto = null;
  document.removeEventListener('pointerdown', foraDoMenu, true);
  document.removeEventListener('keydown', teclaEsc, true);
}
const foraDoMenu = (e: Event) => aberto && !aberto.contains(e.target as Node) && fechar();
const teclaEsc = (e: KeyboardEvent) => e.key === 'Escape' && fechar();

export function abrirMenuJogador(j: JogadorOnline, evento: MouseEvent): void {
  fechar();
  const aviso = el('small', { class: 'menu-jogador-aviso', role: 'status' });
  const opcao = (texto: string, acao: (() => void) | null, dica?: string) =>
    el('button', { class: 'menu-jogador-opcao', disabled: !acao, title: dica ?? '', onclick: () => acao?.() }, texto, !acao && dica ? el('small', {}, dica) : null);
  const trocar = async () => {
    aviso.textContent = 'Enviando convite…';
    try {
      const troca = await convidarParaTroca(j.usuario);
      fechar();
      abrirTroca(troca);
    } catch (e) {
      aviso.textContent = e instanceof ErroApi ? e.message : 'Não foi possível convidar.';
    }
  };
  const menu = el('div', { class: 'menu-jogador', role: 'menu' },
    el('header', {}, el('strong', {}, j.nome), el('small', {}, `@${j.usuario}`)),
    opcao('Ver perfil', () => (fechar(), void abrirPerfilDe(j.usuario))),
    opcao('Trocar', trocasDisponiveis() ? () => void trocar() : null, 'Em breve'),
    opcao('Desafiar para duelo', null, 'Em breve'),
    aviso);
  document.body.append(menu);
  aberto = menu;
  // perto do clique, sem sair da tela
  const { innerWidth: w, innerHeight: h } = window;
  const r = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(evento.clientX + 8, w - r.width - 8)}px`;
  menu.style.top = `${Math.min(evento.clientY + 8, h - r.height - 8)}px`;
  // o clique que abriu não fecha o menu
  setTimeout(() => {
    document.addEventListener('pointerdown', foraDoMenu, true);
    document.addEventListener('keydown', teclaEsc, true);
  });
}
