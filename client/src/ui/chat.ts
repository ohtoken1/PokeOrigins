// Chat dos jogadores (ao lado do mapa): abas Local (quem está no mesmo mapa), Global (todos online) e Clã.
// As mensagens ficam guardadas aqui enquanto o jogo está aberto (trocar de tela não apaga); o chat Local troca
// para o histórico do mapa novo ao entrar nele. Mandar: Enter; Esc sai do campo e volta a andar.
import { conta } from '../conta';
import { aoChat, enviarChat, onlineConectado, type CanalChat, type MensagemChat } from '../online';
import { abrirPerfilDe } from '../telas/jogadores';
import { el } from './dom';

const MAX_GUARDADAS = 100;
const CANAIS: { id: CanalChat; nome: string }[] = [
  { id: 'local', nome: 'Local' },
  { id: 'global', nome: 'Global' },
  { id: 'cla', nome: 'Clã' },
];
type Linha = MensagemChat | { canal: CanalChat; aviso: string; em: number };

const guardadas: Record<CanalChat, Linha[]> = { local: [], global: [], cla: [] };
const naoLidas: Record<CanalChat, number> = { local: 0, global: 0, cla: 0 };
let canalAberto: CanalChat = 'local';
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
  const elemento = el('section', { class: 'chat' }, el('h2', {}, 'Chat'), abas, lista, formulario);

  const desenharAbas = () =>
    abas.replaceChildren(...CANAIS.map((c) =>
      el('button', {
        class: `chat-aba${c.id === canalAberto ? ' ativa' : ''}`, role: 'tab', 'aria-selected': String(c.id === canalAberto), type: 'button',
        onclick: () => {
          canalAberto = c.id;
          naoLidas[c.id] = 0;
          desenhar(true);
        },
      }, c.nome, naoLidas[c.id] && c.id !== canalAberto ? el('span', { class: 'chat-nao-lidas' }, naoLidas[c.id] > 99 ? '99+' : String(naoLidas[c.id])) : null)));

  const linha = (l: Linha) => {
    if ('aviso' in l) return el('p', { class: 'chat-aviso' }, l.aviso);
    const meu = l.id === conta()?.id;
    return el('p', { class: `chat-msg${meu ? ' minha' : ''}` },
      el('time', {}, hora(l.em)),
      el('button', { class: 'chat-nome', type: 'button', title: `Ver o perfil de ${l.nome}`, onclick: () => void abrirPerfilDe(l.usuario) }, l.nome),
      el('span', {}, l.texto));
  };

  const desenhar = (rolarAteOFim = false) => {
    naoLidas[canalAberto] = 0;
    // só desce sozinho se a pessoa já estava vendo as últimas (não puxa quem está lendo mensagens antigas)
    const noFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 40;
    const linhas = guardadas[canalAberto];
    const semCla = canalAberto === 'cla';
    lista.replaceChildren(
      ...(linhas.length ? linhas.map(linha) : [el('p', { class: 'chat-vazio' }, semCla ? 'Você ainda não está em um clã.' : canalAberto === 'local' ? 'Ninguém falou neste mapa ainda.' : 'Ninguém falou ainda. Diga oi!')]),
    );
    campo.disabled = semCla;
    enviar.toggleAttribute('disabled', semCla);
    campo.placeholder = semCla ? 'Entre num clã para usar este chat' : canalAberto === 'local' ? 'Falar com quem está neste mapa…' : 'Falar com todos online…';
    desenharAbas();
    if (rolarAteOFim || noFim) lista.scrollTop = lista.scrollHeight;
  };

  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = campo.value.trim();
    if (!texto) return;
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
  return { elemento, parar: () => telas.delete(atualizar) };
}
