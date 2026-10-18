// Comunidade → Amigos: adicionar pelo nome (busca no servidor), pedidos recebidos e enviados, e a lista de amigos
// com quem está online, perfil, mensagem privada e desfazer amizade.
import { amigos, aoMudarAmigos, carregarAmigos, pedirAmizade, removerAmigo, responderPedido, type Pessoa } from '../amigos';
import { api, conta, ErroApi } from '../conta';
import type { Tela } from '../main';
import { abrirConversa } from '../ui/conversa';
import { el } from '../ui/dom';
import { abrirPerfilDe } from './jogadores';
import { confirmar } from '../ui/confirmar';

const bolinha = (online: boolean) => el('span', { class: `perfil-bolinha ${online ? 'online' : 'offline'}`, title: online ? 'Online' : 'Offline' });
const quem = (p: { nome: string | null; usuario: string }) => el('span', { class: 'amigo-quem' }, el('strong', {}, p.nome || p.usuario), el('small', {}, `@${p.usuario}`));

export const telaAmigos: Tela = (raiz) => {
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  const campo = el('input', { type: 'search', class: 'db-busca', placeholder: 'Nome do treinador…', 'aria-label': 'Buscar treinador para adicionar' }) as HTMLInputElement;
  const achados = el('div', { class: 'amigos-lista' });
  const pedidos = el('div', {});
  const lista = el('div', {});
  raiz.append(el('main', { class: 'tela tela-amigos' },
    el('h1', {}, 'Amigos'),
    el('section', { class: 'amigos-secao' }, el('h2', {}, 'Adicionar amigo'), el('div', { class: 'jogadores-busca' }, campo), achados, aviso),
    pedidos, lista));

  /** Roda a ação mostrando o erro do servidor (ou a mensagem de sucesso). */
  const fazer = (acao: Promise<unknown>, sucesso = '') => {
    aviso.textContent = '';
    acao.then(() => void (aviso.textContent = sucesso), (e) => void (aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.'));
  };
  const linha = (p: Pessoa, online: boolean | null, ...botoes: (HTMLElement | null)[]) =>
    el('div', { class: 'amigo-linha' }, online === null ? null : bolinha(online), quem(p), el('span', { class: 'amigo-botoes' }, ...botoes));
  const botao = (texto: string, acao: () => void, classe = 'secundario') => el('button', { class: `botao ${classe}`, onclick: acao }, texto);

  const desenhar = () => {
    const { amigos: meus, recebidos, enviados } = amigos();
    pedidos.replaceChildren(...[
      recebidos.length ? el('section', { class: 'amigos-secao' }, el('h2', {}, `Pedidos recebidos (${recebidos.length})`),
        el('div', { class: 'amigos-lista' }, ...recebidos.map((p) => linha(p, null,
          botao('Aceitar', () => fazer(responderPedido(p.usuario, true), `${p.nome} agora é seu amigo.`), ''),
          botao('Recusar', () => fazer(responderPedido(p.usuario, false))))))) : null,
      enviados.length ? el('section', { class: 'amigos-secao' }, el('h2', {}, `Pedidos enviados (${enviados.length})`),
        el('div', { class: 'amigos-lista' }, ...enviados.map((p) => linha(p, null, botao('Cancelar', () => fazer(removerAmigo(p.usuario))))))) : null,
    ].filter((x): x is HTMLElement => !!x));
    const online = meus.filter((a) => a.online).length;
    lista.replaceChildren(el('section', { class: 'amigos-secao' },
      el('h2', {}, `Meus amigos (${meus.length})`, meus.length ? el('small', {}, ` · ${online} online`) : null),
      meus.length
        ? el('div', { class: 'amigos-lista' }, ...meus.map((a) => linha(a, a.online,
            botao('Perfil', () => void abrirPerfilDe(a.usuario)),
            el('button', { class: 'botao', onclick: () => abrirConversa(a.usuario, a.nome) }, 'Mensagem', a.naoLidas ? el('span', { class: 'amigo-nao-lidas' }, String(a.naoLidas)) : null),
            botao('Remover', async () => (await confirmar('Confirmar', `Desfazer a amizade com ${a.nome}? A conversa de vocês também é apagada.`)) && fazer(removerAmigo(a.usuario)), 'perigo'))))
        : el('p', { class: 'meta' }, 'Você ainda não tem amigos. Busque um treinador pelo nome aqui em cima e envie um pedido.')));
    buscar(true);
  };

  // busca no servidor (usuário ou nome de treinador), esperando a pessoa parar de digitar
  let relogio = 0;
  let pedido = 0;
  let ultimos: { usuario: string; nome: string | null; online: boolean }[] = [];
  const mostrarAchados = () => {
    const { amigos: meus, recebidos, enviados } = amigos();
    const outros = ultimos.filter((j) => j.usuario !== conta()?.usuario);
    achados.replaceChildren(...(outros.length
      ? outros.map((j) => {
          const estado = meus.some((a) => a.usuario === j.usuario) ? el('small', { class: 'amigo-estado' }, 'Já é seu amigo')
            : enviados.some((a) => a.usuario === j.usuario) ? el('small', { class: 'amigo-estado' }, 'Pedido enviado')
            : recebidos.some((a) => a.usuario === j.usuario) ? botao('Aceitar pedido', () => fazer(responderPedido(j.usuario, true), `${j.nome || j.usuario} agora é seu amigo.`), '')
            : botao('Adicionar', () => fazer(pedirAmizade(j.usuario), `Pedido enviado para ${j.nome || j.usuario}.`), '');
          return el('div', { class: 'amigo-linha' }, quem(j), el('span', { class: 'amigo-botoes' }, botao('Perfil', () => void abrirPerfilDe(j.usuario)), estado));
        })
      : campo.value.trim() ? [el('p', { class: 'meta' }, `Nenhum treinador encontrado com "${campo.value.trim()}".`)] : []));
  };
  const buscar = (jaTenho = false) => {
    const termo = campo.value.trim();
    clearTimeout(relogio);
    if (!termo) return void ((ultimos = []), mostrarAchados());
    if (jaTenho) return mostrarAchados();
    relogio = window.setTimeout(async () => {
      const este = ++pedido;
      try {
        const r = await api<typeof ultimos>('GET', `/jogadores?busca=${encodeURIComponent(termo)}`);
        if (este !== pedido) return;
        ultimos = r;
        mostrarAchados();
      } catch (e) {
        if (este === pedido) achados.replaceChildren(el('p', { class: 'meta' }, e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.'));
      }
    }, 250);
  };
  campo.addEventListener('input', () => buscar());

  const parar = aoMudarAmigos(desenhar);
  desenhar();
  void carregarAmigos().catch(() => void (aviso.textContent = 'Sem conexão com o servidor.'));
  return () => (parar(), clearTimeout(relogio));
};
