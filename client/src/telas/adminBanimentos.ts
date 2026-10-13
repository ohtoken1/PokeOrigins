// Administração → Banimentos: tirar um jogador do jogo por um tempo (ou para sempre), com o motivo registrado.
// O servidor é quem bane (server/src/banimentos.ts); aqui é só o formulário e o histórico.
import { DURACOES_DE_BANIMENTO, MOTIVO_BANIMENTO_MAX, MOTIVO_BANIMENTO_MIN, type BanimentoPublico } from '../../../shared/banimentos';
import { api, ErroApi } from '../conta';
import { confirmar } from '../ui/confirmar';
import { el } from '../ui/dom';

type Resposta = { agora: number; banimentos: BanimentoPublico[] };

const data = (ms: number) => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function secaoBanimentos(): { elemento: HTMLElement; parar: () => void } {
  const listaJogadores = el('datalist', { id: 'adm-ban-jogadores' });
  const campoJogador = el('input', { type: 'text', class: 'db-busca', list: 'adm-ban-jogadores', placeholder: 'Usuário do jogador', 'aria-label': 'Usuário do jogador', autocomplete: 'off' }) as HTMLInputElement;
  const campoTempo = el('select', { class: 'db-busca', 'aria-label': 'Tempo do banimento' }, ...DURACOES_DE_BANIMENTO.map((d) => el('option', { value: d.id }, d.nome))) as HTMLSelectElement;
  const campoMotivo = el('textarea', { class: 'db-busca anuncio-campo', maxlength: MOTIVO_BANIMENTO_MAX, rows: 3, placeholder: 'Por que o jogador está sendo banido', 'aria-label': 'Motivo do banimento' }) as HTMLTextAreaElement;
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  const ativos = el('div', { class: 'ban-lista' });
  const historico = el('div', { class: 'ban-lista' });
  const erro = (e: unknown) => void (aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.');

  // sugestões de jogadores enquanto digita (usuário ou nome de treinador)
  let relogio = 0;
  campoJogador.addEventListener('input', () => {
    clearTimeout(relogio);
    const termo = campoJogador.value.trim();
    if (termo.length < 2) return;
    relogio = window.setTimeout(async () => {
      try {
        const achados = await api<{ usuario: string; nome: string | null }[]>('GET', `/jogadores?busca=${encodeURIComponent(termo)}`);
        listaJogadores.replaceChildren(...achados.map((j) => el('option', { value: j.usuario }, j.nome ?? '')));
      } catch {
        // sem sugestões: o envio ainda confere o usuário
      }
    }, 250);
  });

  const cartao = (b: BanimentoPublico, agora: number) => {
    const ativo = b.revogadoEm === null && (b.ate === null || b.ate > agora);
    const situacao = b.revogadoEm !== null ? `Tirado por ${b.revogadoPor} em ${data(b.revogadoEm)}` : b.ate === null ? 'Permanente' : ativo ? `Até ${data(b.ate)}` : `Acabou em ${data(b.ate)}`;
    return el('div', { class: `ban-cartao ${ativo ? 'ativo' : ''}`, 'data-sem-traducao': '' },
      el('div', { class: 'ban-topo' }, el('strong', {}, b.usuario), el('span', { class: 'meta' }, situacao)),
      el('p', { class: 'ban-motivo' }, b.motivo),
      el('small', { class: 'meta' }, `Banido por ${b.por} em ${data(b.criadoEm)}`),
      ativo
        ? el('button', {
            class: 'botao secundario',
            onclick: async () => {
              if (!(await confirmar('Tirar banimento', `Tirar o banimento de ${b.usuario}? Ele volta a poder entrar no jogo.`))) return;
              try {
                desenhar(await api<Resposta>('POST', `/admin/banimentos/${encodeURIComponent(b.usuario)}/desbanir`));
                aviso.textContent = `O banimento de ${b.usuario} foi tirado.`;
              } catch (e) {
                erro(e);
              }
            },
          }, 'Tirar banimento')
        : null);
  };

  function desenhar(r: Resposta) {
    const valendo = r.banimentos.filter((b) => b.revogadoEm === null && (b.ate === null || b.ate > r.agora));
    const passados = r.banimentos.filter((b) => !valendo.includes(b));
    ativos.replaceChildren(...(valendo.length ? valendo.map((b) => cartao(b, r.agora)) : [el('p', { class: 'meta' }, 'Nenhum jogador banido agora.')]));
    historico.replaceChildren(...(passados.length ? passados.map((b) => cartao(b, r.agora)) : [el('p', { class: 'meta' }, 'Nenhum banimento antigo.')]));
  }

  let enviando = false;
  const banir = async () => {
    if (enviando) return;
    const usuario = campoJogador.value.trim();
    const motivo = campoMotivo.value.replace(/\s+/g, ' ').trim();
    const duracao = DURACOES_DE_BANIMENTO.find((d) => d.id === campoTempo.value)!;
    if (!usuario) return void (aviso.textContent = 'Diga qual jogador vai ser banido.');
    if (motivo.length < MOTIVO_BANIMENTO_MIN) return void (aviso.textContent = 'Escreva o motivo do banimento.');
    if (!(await confirmar('Banir jogador', `Banir ${usuario} (${duracao.nome})? Ele sai do jogo na hora e não consegue entrar até o prazo acabar.`))) return;
    enviando = true;
    aviso.textContent = '';
    try {
      desenhar(await api<Resposta>('POST', '/admin/banimentos', { usuario, duracao: duracao.id, motivo }));
      aviso.textContent = `${usuario} foi banido (${duracao.nome}).`;
      campoJogador.value = campoMotivo.value = '';
    } catch (e) {
      erro(e);
    }
    enviando = false;
  };

  void api<Resposta>('GET', '/admin/banimentos').then(desenhar, erro);
  return {
    parar: () => clearTimeout(relogio),
    elemento: el('section', { class: 'bonus-secao' },
      el('p', { class: 'sub' }, 'Tira um jogador do jogo por um tempo ou para sempre. Ele sai na hora, não consegue entrar até o prazo acabar e lê o motivo ao tentar. Todos veem o aviso na barrinha. Administradores não podem ser banidos.'),
      listaJogadores,
      el('div', { class: 'cla-formulario admin-dar-item' },
        el('label', { class: 'cla-campo' }, 'Jogador', campoJogador),
        el('label', { class: 'cla-campo' }, 'Tempo', campoTempo),
        el('label', { class: 'cla-campo' }, 'Motivo', campoMotivo),
        el('button', { class: 'botao perigo cla-botao-criar', onclick: () => void banir() }, 'Banir jogador')),
      aviso,
      el('h2', { class: 'anuncios-titulo' }, 'Banidos agora'),
      ativos,
      el('h2', { class: 'anuncios-titulo' }, 'Histórico'),
      el('p', { class: 'meta' }, 'Nada daqui é apagado: fica o registro de quem baniu, quem, quando e por quê.'),
      historico),
  };
}
