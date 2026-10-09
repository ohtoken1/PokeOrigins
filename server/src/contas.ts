// Cadastro, login e sessões. A senha nunca é guardada: só o "hash" scrypt com sal (não dá para voltar à senha).
// O token da sessão vai para o navegador; no banco fica só o hash dele (vazou o banco, não vazam as sessões).
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import * as banco from './banco.ts';

const scryptAsync = promisify(scrypt) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;

export const USUARIO_VALIDO = /^[A-Za-z0-9_]{3,16}$/;
export const EMAIL_VALIDO = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
export const SENHA_MIN = 6;
export const SENHA_MAX = 128;
/** "Manter conectado": 30 dias. Sem: 1 dia (o navegador também esquece ao fechar). */
const DURACAO_LONGA = 30 * 24 * 3600 * 1000;
const DURACAO_CURTA = 24 * 3600 * 1000;

export class ErroConta extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

async function hashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scryptAsync(senha, sal, 64);
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`;
}

async function senhaConfere(senha: string, guardada: string): Promise<boolean> {
  const [tipo, sal, hash] = guardada.split('$');
  if (tipo !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64');
  const calculado = await scryptAsync(senha, Buffer.from(sal, 'base64'), esperado.length);
  return timingSafeEqual(esperado, calculado);
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// hash qualquer, para o login de conta inexistente demorar o mesmo que o de senha errada
let hashFalso: Promise<string> | undefined;

export interface ContaPublica {
  id: number;
  usuario: string;
  email: string;
  admin: boolean;
  criadaEm: number;
}
const publica = (c: banco.Conta): ContaPublica => ({ id: c.id, usuario: c.usuario, email: c.email, admin: !!c.admin, criadaEm: c.criada_em });

function abrirSessao(conta: banco.Conta, manter: boolean): { token: string; conta: ContaPublica } {
  const token = randomBytes(32).toString('base64url');
  banco.criarSessao(hashToken(token), conta.id, Date.now() + (manter ? DURACAO_LONGA : DURACAO_CURTA));
  return { token, conta: publica(conta) };
}

export async function cadastrar(usuario: unknown, email: unknown, senha: unknown, manter: boolean) {
  if (typeof usuario !== 'string' || !USUARIO_VALIDO.test(usuario)) throw new ErroConta('Nome de usuário: 3 a 16 letras, números ou _.');
  if (typeof email !== 'string' || !EMAIL_VALIDO.test(email.trim()) || email.length > 254) throw new ErroConta('E-mail inválido.');
  if (typeof senha !== 'string' || senha.length < SENHA_MIN) throw new ErroConta(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
  if (senha.length > SENHA_MAX) throw new ErroConta('Senha longa demais.');
  const emailLimpo = email.trim().toLowerCase();
  const usados = banco.loginEmUso(usuario, emailLimpo);
  if (usados.some((u) => u.usuario.toLowerCase() === usuario.toLowerCase())) throw new ErroConta('Esse nome de usuário já existe.', 409);
  if (usados.length) throw new ErroConta('Já existe uma conta com esse e-mail.', 409);
  const hash = await hashSenha(senha);
  // a primeira conta criada é a do dono: nasce administradora
  const id = banco.criarConta(usuario, emailLimpo, hash, banco.totalDeContas() === 0);
  return abrirSessao(banco.contaPorId(id)!, manter);
}

export async function entrar(login: unknown, senha: unknown, manter: boolean) {
  if (typeof login !== 'string' || typeof senha !== 'string' || !login.trim() || senha.length > SENHA_MAX) throw new ErroConta('Usuário ou senha incorretos.', 401);
  const conta = banco.contaPorLogin(login.trim());
  if (!conta) {
    hashFalso ??= hashSenha('x');
    await senhaConfere(senha, await hashFalso);
    throw new ErroConta('Usuário ou senha incorretos.', 401);
  }
  if (!(await senhaConfere(senha, conta.senha))) throw new ErroConta('Usuário ou senha incorretos.', 401);
  return abrirSessao(conta, manter);
}

/** A conta dona do token (null se não existe ou venceu). */
export function contaDoToken(token: string | undefined): banco.Conta | null {
  if (!token) return null;
  const s = banco.sessao(hashToken(token));
  if (!s) return null;
  if (s.expira_em < Date.now()) {
    banco.apagarSessao(hashToken(token));
    return null;
  }
  return banco.contaPorId(s.conta_id) ?? null;
}

export const sair = (token: string) => banco.apagarSessao(hashToken(token));
export { publica };
