// Administração → Administradores: dar ou tirar o ADM de outras contas (pedido do dono). Pede a SENHA DA
// ADMINISTRAÇÃO; a primeira senha digitada aqui vira a senha permanente. Quem confere tudo é o servidor
// (server/src/administradores.ts); aqui é só o aviso, o formulário, a lista e o histórico.
import { api, ErroApi } from '../conta';
import { confirmar } from '../ui/confirmar';
import { el } from '../ui/dom';

type Resposta = {
  senhaDefinida: boolean;
  administradores: { usuario: string; criadaEm: number; dono: boolean; eu: boolean }[];
  historico: { quando: number; por: string; usuario: string; admin: boolean }[];
  senhaCriada?: boolean;
};

const data = (ms: number) => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function secaoAdministradores(): { elemento: HTMLElement; parar: () => void } {
  const listaJogadores = el('datalist', { id: 'adm-adm-jogadores' });
  const campoJogador = el('input', { type: 'text', class: 'db-busca', list: 'adm-adm-jogadores', placeholder: 'Usuário da conta', 'aria-label': 'Usuário da conta', autocomplete: 'off' }) as HTMLInputElement;
  const campoSenha = el('input', { type: 'password', class: 'db-busca', placeholder: 'Senha da administração', 'aria-label': 'Senha da administração', autocomplete: 'new-password', maxlength: 100 }) as HTMLInputElement;
  const explicaSenha = el('p', { class: 'meta' });
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  const lista = el('div', { class: 'ban-lista' });
  const historico = el('div', { class: 'ban-lista' });
  let senhaDefinida = true;
  const erro = (e: unknown) => void (aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.');

  // sugestões de contas enquanto digita (usuário ou nome de treinador)
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

  function desenhar(r: Resposta) {
    senhaDefinida = r.senhaDefinida;
    explicaSenha.textContent = r.senhaDefinida
      ? 'Digite a senha da administração para confirmar.'
      : '⚠️ Ainda não existe senha da administração: a senha que você digitar agora vira a senha PERMANENTE. Ela não pode ser trocada pelo jogo. Guarde-a num lugar seguro.';
    lista.replaceChildren(...r.administradores.map((a) =>
      el('div', { class: 'ban-cartao', 'data-sem-traducao': '' },
        el('div', { class: 'ban-topo' }, el('strong', {}, a.usuario), el('span', { class: 'meta' }, a.dono ? '👑 Dono (não pode perder o ADM)' : a.eu ? 'Você' : `Conta criada em ${data(a.criadaEm)}`)),
        a.dono || a.eu ? null : el('button', { class: 'botao secundario', onclick: () => void mudar(a.usuario, false) }, 'Tirar ADM'))));
    historico.replaceChildren(...(r.historico.length
      ? r.historico.map((h) => el('div', { class: 'ban-cartao', 'data-sem-traducao': '' },
          el('div', { class: 'ban-topo' }, el('strong', {}, h.usuario), el('span', { class: 'meta' }, h.admin ? '✅ Recebeu o ADM' : '⛔ Perdeu o ADM')),
          el('small', { class: 'meta' }, `Por ${h.por} em ${data(h.quando)}`)))
      : [el('p', { class: 'meta' }, 'Nenhuma mudança ainda.')]));
  }

  let enviando = false;
  async function mudar(usuario: string, admin: boolean) {
    if (enviando) return;
    if (!usuario) return void (aviso.textContent = 'Diga qual conta.');
    if (!campoSenha.value) return void (aviso.textContent = 'Digite a senha da administração (no campo acima).');
    const pergunta = admin
      ? `Dar o ADM para ${usuario}? A conta vai poder fazer TUDO o que a sua faz: dar itens, Pokémon e moedas, banir jogadores, mandar cartas para todos e ver o Dashboard.${senhaDefinida ? '' : ' A senha digitada vai virar a senha PERMANENTE da administração.'}`
      : `Tirar o ADM de ${usuario}? A conta vira uma conta comum e sai do jogo para entrar de novo.`;
    if (!(await confirmar(admin ? 'Dar ADM' : 'Tirar ADM', pergunta))) return;
    enviando = true;
    aviso.textContent = '';
    try {
      const r = await api<Resposta>('POST', '/admin/administradores', { usuario, admin, senha: campoSenha.value });
      desenhar(r);
      aviso.textContent = `${r.senhaCriada ? 'Senha da administração criada. ' : ''}${admin ? `${usuario} agora é administrador.` : `${usuario} não é mais administrador.`}`;
      if (admin) campoJogador.value = '';
    } catch (e) {
      erro(e);
    }
    campoSenha.value = '';
    enviando = false;
  }

  void api<Resposta>('GET', '/admin/administradores').then(desenhar, erro);
  return {
    parar: () => clearTimeout(relogio),
    elemento: el('section', { class: 'bonus-secao' },
      el('div', { class: 'aviso-perigo-adm' },
        el('strong', {}, '⚠️ ATENÇÃO: PODER TOTAL'),
        el('p', {}, 'Quem recebe o ADM pode fazer TUDO o que a sua conta faz: dar itens, Pokémon, Origin Coins e Poké Dólares, banir jogadores, mandar cartas para todos, mexer nos eventos e ver o Dashboard. Só dê para pessoas de total confiança da equipe.'),
        el('p', {}, 'Toda mudança fica registrada no histórico abaixo, com quem fez e quando.')),
      listaJogadores,
      el('div', { class: 'cla-formulario admin-dar-item' },
        el('label', { class: 'cla-campo' }, 'Conta', campoJogador),
        el('label', { class: 'cla-campo' }, 'Senha da administração', campoSenha),
        explicaSenha,
        el('button', { class: 'botao perigo cla-botao-criar', onclick: () => void mudar(campoJogador.value.trim(), true) }, 'Dar ADM')),
      aviso,
      el('h2', { class: 'anuncios-titulo' }, 'Administradores'),
      lista,
      el('h2', { class: 'anuncios-titulo' }, 'Histórico'),
      historico),
  };
}
