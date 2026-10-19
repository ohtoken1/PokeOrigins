// Menu que abre ao clicar no boneco de outro jogador no mapa: Ver perfil, Trocar e Desafiar para duelo.
import { amigos, pedirAmizade, responderPedido } from '../amigos';
import { ErroApi } from '../conta';
import type { JogadorOnline } from '../online';
import { abrirPerfilDe } from '../telas/jogadores';
import { convidarParaTroca, trocasDisponiveis } from '../trocas';
import { conteudoLiberado } from '../trancas';
import { textoTranca } from '../../../shared/trancas';
import { el } from './dom';
import { abrirTroca } from './troca';
import { desafiarParaDuelo } from '../pvp';

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
  // amizade: adicionar, aceitar o pedido dele, ou só mostrar como está
  const { amigos: meus, enviados, recebidos } = amigos();
  const tem = (lista: { usuario: string }[]) => lista.some((a) => a.usuario === j.usuario);
  const amizade = (acao: Promise<unknown>, feito: string) => {
    aviso.textContent = '';
    acao.then(() => void (aviso.textContent = feito), (e) => void (aviso.textContent = e instanceof ErroApi ? e.message : 'Não foi possível.'));
  };
  const opcaoAmigo = tem(meus) ? opcao('Amigo', null, 'Já é seu amigo')
    : tem(enviados) ? opcao('Adicionar amigo', null, 'Pedido enviado')
    : tem(recebidos) ? opcao('Aceitar pedido de amizade', () => amizade(responderPedido(j.usuario, true), 'Agora vocês são amigos.'))
    : opcao('Adicionar amigo', () => amizade(pedirAmizade(j.usuario), 'Pedido de amizade enviado.'));
  const menu = el('div', { class: 'menu-jogador', role: 'menu' },
    el('header', {}, el('strong', {}, j.nome), el('small', {}, `@${j.usuario}`)),
    opcao('Ver perfil', () => (fechar(), void abrirPerfilDe(j.usuario))),
    opcaoAmigo,
    opcao('Trocar', trocasDisponiveis() && conteudoLiberado('troca') ? () => void trocar() : null, trocasDisponiveis() ? textoTranca('troca') : 'Em breve'),
    opcao('Desafiar para duelo', () => {
      aviso.textContent = 'Enviando desafio…';
      desafiarParaDuelo(j.usuario).then(() => void (aviso.textContent = 'Desafio enviado! Esperando a resposta.'), (e) => void (aviso.textContent = e instanceof ErroApi ? e.message : 'Não foi possível desafiar.'));
    }),
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
