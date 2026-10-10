// Chat dos jogadores (ao lado do mapa): abas Local (quem está no mesmo mapa), Global (todos online), Clã e Amigos
// (lista de amigos com pedidos; clicar num amigo abre a conversa privada ali mesmo).
// As mensagens ficam guardadas aqui enquanto o jogo está aberto (trocar de tela não apaga); o chat Local troca
// para o histórico do mapa novo ao entrar nele. Mandar: Enter; Esc sai do campo e volta a andar.
import { amigo, amigos, aoMudarAmigos, pendenciasDeAmigos, responderPedido } from '../amigos';
import { aoMudarCla, meuCla } from '../cla';
import { conta } from '../conta';
import { aoChat, enviarChat, onlineConectado, type CanalChat, type MensagemChat } from '../online';
import { abrirPerfilDe } from '../telas/jogadores';
import { montarConversa } from './conversa';
import { el } from './dom';

const MAX_GUARDADAS = 100;
type Aba = CanalChat | 'amigos';
const CANAIS: { id: Aba; nome: string }[] = [
  { id: 'local', nome: 'Local' },
  { id: 'global', nome: 'Global' },
  { id: 'cla', nome: 'Clã' },
  { id: 'amigos', nome: 'Amigos' },
];
type Linha = MensagemChat | { canal: CanalChat; aviso: string; em: number };

const guardadas: Record<CanalChat, Linha[]> = { local: [], global: [], cla: [] };
const naoLidas: Record<CanalChat, number> = { local: 0, global: 0, cla: 0 };
let canalAberto: Aba = 'local';
/** Amigo com a conversa aberta na aba Amigos (null = a lista). */
let amigoAberto: string | null = null;
const telas = new Set<() => void>();
const redesenhar = () => telas.forEach((f) => f());
const guardar = (canal: CanalChat, l: Linha) => {
  const lista = guardadas[canal];
  lista.push(l);
  if (lista.length > MAX_GUARDADAS) lista.splice(0, lista.length - MAX_GUARDADAS);
};

// ouve o servidor desde o começo (mesmo sem nenhum chat na tela)
aoChat({
  mensagem(m) {
    guardar(m.canal, m);
    if (m.canal !== canalAberto || !telas.size) naoLidas[m.canal]++;
    redesenhar();
  },
  historico(canal, lista) {
    guardadas[canal] = lista.slice(-MAX_GUARDADAS);
    // saiu do clã (histórico vazio): nada mais para ler ali
    if (canal === 'cla' && !lista.length) naoLidas.cla = 0;
    redesenhar();
  },
  erro(canal, texto) {
    guardar(canal, { canal, aviso: texto, em: Date.now() });
    redesenhar();
  },
});

const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Painel do chat; devolve o elemento e a função que o tira (para de ouvir). */
export function montarChat(): { elemento: HTMLElement; parar: () => void } {
  const abas = el('div', { class: 'chat-abas', role: 'tablist' });
  const lista = el('div', { class: 'chat-lista', role: 'log', 'aria-live': 'polite' });
  const campo = el('input', { class: 'chat-campo', type: 'text', maxlength: 200, placeholder: 'Escreva uma mensagem…', 'aria-label': 'Mensagem' }) as HTMLInputElement;
  const enviar = el('button', { class: 'botao chat-enviar', type: 'submit', title: 'Enviar (Enter)', 'aria-label': 'Enviar' }, '➤');
  const formulario = el('form', { class: 'chat-formulario' }, campo, enviar) as HTMLFormElement;
  const painelAmigos = el('div', { class: 'chat-amigos' });
  const elemento = el('section', { class: 'chat' }, el('h2', {}, 'Chat'), abas, lista, formulario, painelAmigos);
  let pararConversa: (() => void) | null = null;
  let conversaDe: string | null = null;

  const pendentes = (id: Aba) => (id === 'amigos' ? pendenciasDeAmigos() : naoLidas[id]);
  const desenharAbas = () =>
    abas.replaceChildren(...CANAIS.map((c) =>
      el('button', {
        class: `chat-aba${c.id === canalAberto ? ' ativa' : ''}`, role: 'tab', 'aria-selected': String(c.id === canalAberto), type: 'button',
        onclick: () => {
          canalAberto = c.id;
          desenhar(true);
        },
      }, c.nome, pendentes(c.id) && c.id !== canalAberto ? el('span', { class: 'chat-nao-lidas' }, pendentes(c.id) > 99 ? '99+' : String(pendentes(c.id))) : null)));

  const linha = (l: Linha) => {
    if ('aviso' in l) return el('p', { class: 'chat-aviso' }, l.aviso);
    const meu = l.id === conta()?.id;
    return el('p', { class: `chat-msg${meu ? ' minha' : ''}` },
      el('time', {}, hora(l.em)),
      el('button', { class: 'chat-nome', type: 'button', title: `Ver o perfil de ${l.nome}`, onclick: () => void abrirPerfilDe(l.usuario) }, l.nome),
      el('span', {}, l.texto));
  };

  const fecharConversa = () => {
    pararConversa?.();
    pararConversa = conversaDe = null;
  };
  /** Aba Amigos: pedidos recebidos e a lista (online primeiro); com um amigo aberto, a conversa privada. */
  const desenharAmigos = () => {
    const aberto = amigoAberto ? amigo(amigoAberto) : undefined;
    if (!aberto) amigoAberto = null;
    if (aberto) {
      // a conversa já está montada (ela se atualiza sozinha): só a bolinha de online muda
      if (conversaDe === aberto.usuario) {
        const bolinha = painelAmigos.querySelector('.chat-amigo-topo .perfil-bolinha');
        if (bolinha) {
          bolinha.className = `perfil-bolinha ${aberto.online ? 'online' : 'offline'}`;
          bolinha.setAttribute('title', aberto.online ? 'Online' : 'Offline');
        }
        return;
      }
      fecharConversa();
      const conversa = montarConversa(aberto.usuario, aberto.nome);
      pararConversa = conversa.parar;
      conversaDe = aberto.usuario;
      return painelAmigos.replaceChildren(
        el('header', { class: 'chat-amigo-topo' },
          el('button', { class: 'chat-voltar', type: 'button', title: 'Voltar para a lista de amigos', onclick: () => ((amigoAberto = null), desenhar()) }, '‹ Amigos'),
          el('button', { class: 'chat-nome', type: 'button', title: `Ver o perfil de ${aberto.nome}`, onclick: () => void abrirPerfilDe(aberto.usuario) }, aberto.nome),
          el('span', { class: `perfil-bolinha ${aberto.online ? 'online' : 'offline'}`, title: aberto.online ? 'Online' : 'Offline' })),
        conversa.elemento);
    }
    fecharConversa();
    const { amigos: meus, recebidos } = amigos();
    painelAmigos.replaceChildren(el('div', { class: 'chat-lista' },
      ...recebidos.map((p) => el('div', { class: 'chat-pedido' },
        el('span', {}, el('strong', {}, p.nome), ' quer ser seu amigo.'),
        el('span', { class: 'chat-pedido-botoes' },
          el('button', { class: 'botao', type: 'button', onclick: () => void responderPedido(p.usuario, true).catch(() => {}) }, 'Aceitar'),
          el('button', { class: 'botao secundario', type: 'button', onclick: () => void responderPedido(p.usuario, false).catch(() => {}) }, 'Recusar')))),
      ...meus.map((a) => el('button', { class: 'chat-amigo', type: 'button', title: `Conversar com ${a.nome}`, onclick: () => ((amigoAberto = a.usuario), desenhar()) },
        el('span', { class: `perfil-bolinha ${a.online ? 'online' : 'offline'}` }),
        el('strong', {}, a.nome), el('small', {}, a.online ? 'online' : 'offline'),
        a.naoLidas ? el('span', { class: 'amigo-nao-lidas' }, String(a.naoLidas)) : null)),
      meus.length || recebidos.length ? null : el('p', { class: 'chat-vazio' }, 'Você ainda não tem amigos. Adicione em Comunidade → Amigos ou clicando num jogador no mapa.')));
  };

  const desenhar = (rolarAteOFim = false) => {
    const naAbaAmigos = canalAberto === 'amigos';
    lista.hidden = formulario.hidden = naAbaAmigos;
    painelAmigos.hidden = !naAbaAmigos;
    if (canalAberto === 'amigos') {
      desenharAmigos();
      return desenharAbas();
    }
    fecharConversa();
    naoLidas[canalAberto] = 0;
    // só desce sozinho se a pessoa já estava vendo as últimas (não puxa quem está lendo mensagens antigas)
    const noFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 40;
    const linhas = guardadas[canalAberto];
    const semCla = canalAberto === 'cla' && !meuCla();
    lista.replaceChildren(
      ...(linhas.length ? linhas.map(linha) : [el('p', { class: 'chat-vazio' }, semCla ? 'Você ainda não está em um clã.' : canalAberto === 'cla' ? 'Ninguém do clã falou ainda.' : canalAberto === 'local' ? 'Ninguém falou neste mapa ainda.' : 'Ninguém falou ainda. Diga oi!')]),
    );
    campo.disabled = semCla;
    enviar.toggleAttribute('disabled', semCla);
    campo.placeholder = semCla ? 'Entre num clã para usar este chat' : canalAberto === 'cla' ? `Falar com o clã ${meuCla()?.nome ?? ''}…` : canalAberto === 'local' ? 'Falar com quem está neste mapa…' : 'Falar com todos online…';
    desenharAbas();
    if (rolarAteOFim || noFim) lista.scrollTop = lista.scrollHeight;
  };

  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = campo.value.trim();
    if (!texto || canalAberto === 'amigos') return;
    if (!onlineConectado() || !enviarChat(canalAberto, texto)) {
      guardar(canalAberto, { canal: canalAberto, aviso: 'Sem conexão com o servidor. Tente de novo em instantes.', em: Date.now() });
      return desenhar(true);
    }
    campo.value = '';
  });
  // Esc: sai do campo (o personagem volta a andar com as setas/WASD)
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') campo.blur();
  });

  const atualizar = () => desenhar();
  telas.add(atualizar);
  desenhar(true);
  const pararAmigos = aoMudarAmigos(atualizar);
  const pararCla = aoMudarCla(atualizar);
  return { elemento, parar: () => (telas.delete(atualizar), pararAmigos(), pararCla(), fecharConversa()) };
}
