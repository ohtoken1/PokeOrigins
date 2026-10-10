// Conversa privada com um amigo: usada na aba Amigos do chat (ao lado do mapa) e na janela aberta pela tela Amigos.
import { aoMudarAmigos, carregarConversa, conversaCom, conversaNaTela, mandarPrivado } from '../amigos';
import { conta, ErroApi } from '../conta';
import { el } from './dom';
import { abrirJanela } from './janela';

const hora = (ms: number) => {
  const d = new Date(ms);
  const hoje = d.toDateString() === new Date().toDateString();
  return hoje ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/** Lista de mensagens + campo; devolve o elemento e a função que para de ouvir. */
export function montarConversa(usuario: string, nome: string): { elemento: HTMLElement; parar: () => void } {
  const lista = el('div', { class: 'chat-lista', role: 'log', 'aria-live': 'polite' });
  const campo = el('input', { class: 'chat-campo', type: 'text', maxlength: 200, placeholder: `Mensagem para ${nome}…`, 'aria-label': `Mensagem para ${nome}` }) as HTMLInputElement;
  const formulario = el('form', { class: 'chat-formulario' }, campo, el('button', { class: 'botao chat-enviar', type: 'submit', title: 'Enviar (Enter)', 'aria-label': 'Enviar' }, '➤')) as HTMLFormElement;
  const aviso = el('p', { class: 'chat-aviso', role: 'status' });
  const elemento = el('div', { class: 'conversa' }, lista, aviso, formulario);
  let carregada = false;

  const desenhar = (ateOFim = false) => {
    const noFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 40;
    const mensagens = conversaCom(usuario);
    lista.replaceChildren(...(mensagens.length
      ? mensagens.map((m) => {
          const minha = m.de === conta()?.usuario;
          return el('p', { class: `chat-msg${minha ? ' minha' : ''}` }, el('time', {}, hora(m.em)), el('strong', { class: 'chat-nome' }, minha ? 'Você' : nome), el('span', {}, m.texto));
        })
      : [el('p', { class: 'chat-vazio' }, carregada ? `Nenhuma mensagem ainda. Diga oi para ${nome}!` : 'Carregando…')]));
    if (ateOFim || noFim) lista.scrollTop = lista.scrollHeight;
  };
  const erro = (e: unknown) => void (aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.');

  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = campo.value.trim();
    if (!texto) return;
    aviso.textContent = '';
    campo.value = '';
    mandarPrivado(usuario, texto).then(() => desenhar(true), (falha) => {
      if (!campo.value) campo.value = texto;
      erro(falha);
    });
  });
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') campo.blur();
  });

  const sairDaTela = conversaNaTela(usuario);
  const pararDeOuvir = aoMudarAmigos(() => desenhar());
  desenhar(true);
  carregarConversa(usuario).then(() => {
    carregada = true;
    desenhar(true);
  }, erro);
  return { elemento, parar: () => (sairDaTela(), pararDeOuvir()) };
}

/** Conversa numa janela (tela Amigos → Mensagem). */
export function abrirConversa(usuario: string, nome: string): void {
  const conversa = montarConversa(usuario, nome);
  abrirJanela(`Conversa com ${nome}`, () => conversa.elemento, { classe: 'janela-conversa', aoFechar: conversa.parar });
}
