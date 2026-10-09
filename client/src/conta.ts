// Conta do jogador: sessão (token do servidor) e chamadas da API. "Manter conectado" guarda o token no
// localStorage; sem ele, no sessionStorage (o navegador esquece ao fechar).
const CHAVE_SESSAO = 'jogo-claude:sessao';

export interface Conta {
  id: number;
  usuario: string;
  email: string;
  admin: boolean;
  criadaEm: number;
}

let contaAtual: Conta | null = null;
export const conta = () => contaAtual;
export const definirConta = (c: Conta | null) => void (contaAtual = c);

export class ErroApi extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
  }
}

function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_SESSAO) ?? sessionStorage.getItem(CHAVE_SESSAO);
  } catch {
    return null;
  }
}

function guardarToken(token: string | null, manter = false): void {
  try {
    localStorage.removeItem(CHAVE_SESSAO);
    sessionStorage.removeItem(CHAVE_SESSAO);
    if (token) (manter ? localStorage : sessionStorage).setItem(CHAVE_SESSAO, token);
  } catch {
    // sem armazenamento: a sessão dura até recarregar a página
  }
  tokenEmMemoria = token;
}
let tokenEmMemoria = lerToken();
export const temSessao = () => !!tokenEmMemoria;
/** Token da sessão (para a conexão em tempo real, que manda o token na primeira mensagem). */
export const tokenAtual = () => tokenEmMemoria;

/** Chamada à API do servidor; erros viram ErroApi com a mensagem em português que o servidor mandou. */
export async function api<T>(metodo: string, caminho: string, corpo?: unknown, opcoes: { keepalive?: boolean } = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: { ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }), ...(tokenEmMemoria ? { Authorization: `Bearer ${tokenEmMemoria}` } : {}) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      keepalive: opcoes.keepalive,
    });
  } catch {
    throw new ErroApi('Sem conexão com o servidor.', 0);
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new ErroApi(dados.erro ?? 'Erro no servidor.', resposta.status);
  return dados as T;
}

type RespostaLogin = { token: string; conta: Conta };

export async function cadastrar(usuario: string, email: string, senha: string, manter: boolean): Promise<Conta> {
  const r = await api<RespostaLogin>('POST', '/cadastro', { usuario, email, senha, manter });
  guardarToken(r.token, manter);
  return (contaAtual = r.conta);
}

export async function entrar(login: string, senha: string, manter: boolean): Promise<Conta> {
  const r = await api<RespostaLogin>('POST', '/entrar', { login, senha, manter });
  guardarToken(r.token, manter);
  return (contaAtual = r.conta);
}

/** Dados da conta logada e o save dela (null = sessão inválida ou vencida). */
export async function buscarConta(): Promise<{ conta: Conta; save: unknown; versao: number } | null> {
  if (!tokenEmMemoria) return null;
  try {
    const r = await api<{ conta: Conta; save: unknown; versao: number }>('GET', '/eu');
    contaAtual = r.conta;
    return r;
  } catch (e) {
    if (e instanceof ErroApi && e.status === 401) {
      guardarToken(null);
      return null;
    }
    throw e;
  }
}

export async function sairDaConta(): Promise<void> {
  try {
    await api('POST', '/sair');
  } catch {
    // mesmo sem servidor, esquece a sessão aqui
  }
  guardarToken(null);
  location.reload();
}
