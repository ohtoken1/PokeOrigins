// Amigos: pedido de amizade (aceitar/recusar), lista com quem está online e mensagens privadas entre amigos.
// As mensagens ficam guardadas no banco (o amigo lê quando entrar); quem está online recebe na hora pelo /ws.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { aoMudarPresenca, avisar, estaOnline, limparTexto } from './mundo.ts';

const MAX_AMIGOS = 100;
const MAX_PEDIDOS_ENVIADOS = 20;
const TAMANHO_CONVERSA = 60;
/** Mensagens guardadas por conversa (as mais antigas são apagadas). */
const MAX_GUARDADAS_POR_CONVERSA = 200;
/** Pedidos de amizade por conta: no máximo 10 a cada 10 minutos (contra quem fica pedindo de novo depois de recusado). */
const MAX_PEDIDOS_NA_JANELA = 10;
const JANELA_PEDIDOS_MS = 10 * 60 * 1000;
const pedidosFeitos = new Map<number, number[]>();
/** Anti-spam das mensagens privadas: no máximo 5 a cada 5 s. */
const RAJADA = 5;
const JANELA_MS = 5000;
const envios = new Map<number, number[]>();

interface Pessoa {
  id: number;
  usuario: string;
  nome: string;
  online: boolean;
}

function outraConta(conta: banco.Conta, usuario: unknown): banco.Conta {
  const outra = typeof usuario === 'string' ? banco.contaPorUsuario(usuario.trim()) : undefined;
  if (!outra) throw new ErroConta('Jogador não encontrado.', 404);
  if (outra.id === conta.id) throw new ErroConta('Este é você.');
  return outra;
}

/** Avisa o jogo do outro (se estiver aberto) para buscar a lista de amigos de novo. */
const atualizar = (...ids: number[]) => ids.forEach((id) => avisar(id, { t: 'amigos' }));

export function lista(conta: banco.Conta) {
  const naoLidas = new Map(banco.naoLidasDe(conta.id).map((n) => [n.de, n.n]));
  const amigos: (Pessoa & { naoLidas: number })[] = [];
  const recebidos: Pessoa[] = [];
  const enviados: Pessoa[] = [];
  for (const a of banco.amizadesDe(conta.id)) {
    // quem ainda não é amigo não fica sabendo se o outro está online
    const pessoa = { id: a.id, usuario: a.usuario, nome: a.nome || a.usuario, online: !!a.aceita && estaOnline(a.id) };
    if (a.aceita) amigos.push({ ...pessoa, naoLidas: naoLidas.get(a.id) ?? 0 });
    else (a.de === conta.id ? enviados : recebidos).push(pessoa);
  }
  amigos.sort((x, y) => Number(y.online) - Number(x.online) || x.nome.localeCompare(y.nome));
  return { amigos, recebidos, enviados };
}

export function convidar(conta: banco.Conta, usuario: unknown) {
  const outra = outraConta(conta, usuario);
  const ja = banco.amizade(conta.id, outra.id);
  if (ja?.aceita) throw new ErroConta('Vocês já são amigos.');
  if (ja?.de === conta.id) throw new ErroConta('Você já enviou um pedido para este jogador.');
  if (banco.contarAmigos(conta.id) >= MAX_AMIGOS) throw new ErroConta(`Sua lista de amigos está cheia (${MAX_AMIGOS}).`);
  // o outro já tinha me pedido: vira amizade direto
  if (ja) {
    if (banco.contarAmigos(outra.id) >= MAX_AMIGOS) throw new ErroConta('A lista de amigos deste jogador está cheia.');
    banco.aceitarAmizade(outra.id, conta.id);
  } else {
    const agora = Date.now();
    const recentes = (pedidosFeitos.get(conta.id) ?? []).filter((t) => agora - t < JANELA_PEDIDOS_MS);
    if (recentes.length >= MAX_PEDIDOS_NA_JANELA) throw new ErroConta('Você enviou pedidos demais. Espere alguns minutos.', 429);
    if (banco.amizadesDe(conta.id).filter((a) => !a.aceita && a.de === conta.id).length >= MAX_PEDIDOS_ENVIADOS) throw new ErroConta('Você tem pedidos demais esperando resposta.');
    banco.criarAmizade(conta.id, outra.id);
    pedidosFeitos.set(conta.id, [...recentes, agora]);
  }
  atualizar(outra.id);
  return lista(conta);
}

/** Responde um pedido recebido. */
export function responder(conta: banco.Conta, usuario: unknown, aceitar: boolean) {
  const outra = outraConta(conta, usuario);
  const pedido = banco.amizade(conta.id, outra.id);
  if (!pedido || pedido.aceita || pedido.de !== outra.id) throw new ErroConta('Este pedido não existe mais.', 404);
  if (!aceitar) banco.apagarAmizade(conta.id, outra.id);
  else {
    if (banco.contarAmigos(conta.id) >= MAX_AMIGOS) throw new ErroConta(`Sua lista de amigos está cheia (${MAX_AMIGOS}).`);
    if (banco.contarAmigos(outra.id) >= MAX_AMIGOS) throw new ErroConta('A lista de amigos deste jogador está cheia.');
    banco.aceitarAmizade(outra.id, conta.id);
  }
  atualizar(outra.id);
  return lista(conta);
}

/** Desfaz a amizade ou cancela um pedido enviado (a conversa é apagada junto). */
export function remover(conta: banco.Conta, usuario: unknown) {
  const outra = outraConta(conta, usuario);
  banco.transacao(() => banco.apagarAmizade(conta.id, outra.id));
  atualizar(outra.id);
  return lista(conta);
}

function amigoDe(conta: banco.Conta, usuario: unknown): banco.Conta {
  const outra = outraConta(conta, usuario);
  if (!banco.amizade(conta.id, outra.id)?.aceita) throw new ErroConta('Vocês não são amigos.', 403);
  return outra;
}
const paraFora = (r: banco.Recado, eu: banco.Conta, outra: banco.Conta) => ({
  id: r.id, de: r.de === eu.id ? eu.usuario : outra.usuario, para: r.de === eu.id ? outra.usuario : eu.usuario, texto: r.texto, em: r.em,
});

/** As últimas mensagens com um amigo (e marca como lidas as que ele mandou). */
export function conversa(conta: banco.Conta, usuario: unknown) {
  const outra = amigoDe(conta, usuario);
  banco.marcarLidas(outra.id, conta.id);
  return { mensagens: banco.conversa(conta.id, outra.id, TAMANHO_CONVERSA).map((r) => paraFora(r, conta, outra)) };
}

export function mandar(conta: banco.Conta, usuario: unknown, bruto: unknown) {
  const outra = amigoDe(conta, usuario);
  const texto = limparTexto(bruto);
  if (!texto) throw new ErroConta('Mensagem vazia.');
  const agora = Date.now();
  const recentes = (envios.get(conta.id) ?? []).filter((t) => agora - t < JANELA_MS);
  if (recentes.length >= RAJADA) throw new ErroConta('Calma! Espere um pouco para mandar outra mensagem.', 429);
  envios.set(conta.id, [...recentes, agora]);
  const id = banco.transacao(() => banco.gravarRecado(conta.id, outra.id, texto, agora, MAX_GUARDADAS_POR_CONVERSA));
  const mensagem = { id, de: conta.usuario, para: outra.usuario, texto, em: agora };
  avisar(outra.id, { t: 'privado', mensagem });
  return mensagem;
}

// alguém entrou ou saiu do jogo: os amigos online atualizam a lista (bolinha de online)
aoMudarPresenca((contaId) => {
  for (const a of banco.amizadesDe(contaId)) if (a.aceita) avisar(a.id, { t: 'amigos' });
});

/** Limpeza de tempos em tempos (index.ts): esquece os contadores de quem já pode pedir de novo. */
export function limpar(): void {
  const agora = Date.now();
  for (const [id, tempos] of pedidosFeitos) if (tempos.every((t) => agora - t >= JANELA_PEDIDOS_MS)) pedidosFeitos.delete(id);
  // o limite das mensagens privadas é por conta (sair e entrar de novo não zera): só esquece quem já pode mandar
  for (const [id, tempos] of envios) if (tempos.every((t) => agora - t >= JANELA_MS)) envios.delete(id);
}
