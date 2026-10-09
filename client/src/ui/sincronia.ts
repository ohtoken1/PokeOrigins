// Aviso no canto da tela quando o progresso não chega ao servidor (sem conexão, outra aba salvou, sessão venceu).
// Salvando normalmente não mostra nada.
import { aoMudarSincronia } from '../estado';
import { el } from './dom';

export function montarAvisoSincronia(): void {
  const texto = el('span', {});
  const botao = el('button', { class: 'botao', onclick: () => location.reload() }, 'Recarregar');
  const aviso = el('div', { class: 'aviso-sincronia', role: 'status', hidden: true }, texto, botao);
  document.body.append(aviso);
  aoMudarSincronia((estado, mensagem) => {
    aviso.dataset.estado = estado;
    if (estado === 'salvo' || estado === 'salvando') {
      // "salvando" só aparece se já estava com problema (mostra que voltou a tentar)
      if (estado === 'salvo' || aviso.hidden) aviso.hidden = true;
      return;
    }
    aviso.hidden = false;
    botao.hidden = estado === 'sem-conexao';
    texto.textContent =
      estado === 'sem-conexao'
        ? (mensagem ?? 'Sem conexão com o servidor. Seu progresso fica guardado aqui e é enviado quando voltar.')
        : estado === 'sessao'
          ? 'Sua sessão expirou. Recarregue para entrar de novo (o progresso fica guardado aqui).'
          : (mensagem ?? 'Seu progresso foi salvo em outra aba ou computador. Recarregue a página.');
  });
}
