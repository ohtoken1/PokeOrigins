// Banco de dados das contas (SQLite que já vem no Node, num arquivo). No beta online vira o PostgreSQL do Railway:
// só este arquivo muda, o resto do servidor fala com as funções daqui.
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const ARQUIVO = resolve(process.env.BANCO_ARQUIVO ?? fileURLToPath(new URL('../dados/pokeorigins.db', import.meta.url)));
mkdirSync(dirname(ARQUIVO), { recursive: true });

const db = new DatabaseSync(ARQUIVO);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS contas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    senha TEXT NOT NULL,
    admin INTEGER NOT NULL DEFAULT 0,
    criada_em INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessoes (
    token TEXT PRIMARY KEY,
    conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    expira_em INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS saves (
    conta_id INTEGER PRIMARY KEY REFERENCES contas(id) ON DELETE CASCADE,
    dados TEXT NOT NULL,
    versao INTEGER NOT NULL,
    atualizado_em INTEGER NOT NULL
  );
`);

export interface Conta {
  id: number;
  usuario: string;
  email: string;
  senha: string;
  admin: number;
  criada_em: number;
}

const sql = {
  contaPorLogin: db.prepare('SELECT * FROM contas WHERE usuario = ? OR email = ?'),
  contaPorId: db.prepare('SELECT * FROM contas WHERE id = ?'),
  existe: db.prepare('SELECT usuario, email FROM contas WHERE usuario = ? OR email = ?'),
  quantas: db.prepare('SELECT COUNT(*) AS n FROM contas'),
  criarConta: db.prepare('INSERT INTO contas (usuario, email, senha, admin, criada_em) VALUES (?, ?, ?, ?, ?)'),
  mudarAdmin: db.prepare('UPDATE contas SET admin = ? WHERE usuario = ?'),
  criarSessao: db.prepare('INSERT INTO sessoes (token, conta_id, expira_em) VALUES (?, ?, ?)'),
  sessao: db.prepare('SELECT conta_id, expira_em FROM sessoes WHERE token = ?'),
  apagarSessao: db.prepare('DELETE FROM sessoes WHERE token = ?'),
  limparSessoes: db.prepare('DELETE FROM sessoes WHERE expira_em < ?'),
  save: db.prepare('SELECT dados, versao FROM saves WHERE conta_id = ?'),
  inserirSave: db.prepare('INSERT INTO saves (conta_id, dados, versao, atualizado_em) VALUES (?, ?, 1, ?)'),
  atualizarSave: db.prepare('UPDATE saves SET dados = ?, versao = versao + 1, atualizado_em = ? WHERE conta_id = ? AND versao = ?'),
  apagarSave: db.prepare('DELETE FROM saves WHERE conta_id = ?'),
};

export const contaPorLogin = (login: string) => sql.contaPorLogin.get(login, login) as Conta | undefined;
export const contaPorId = (id: number) => sql.contaPorId.get(id) as Conta | undefined;
export const loginEmUso = (usuario: string, email: string) => sql.existe.all(usuario, email) as { usuario: string; email: string }[];
export const totalDeContas = () => (sql.quantas.get() as { n: number }).n;

export function criarConta(usuario: string, email: string, senhaHash: string, admin: boolean): number {
  return Number(sql.criarConta.run(usuario, email, senhaHash, admin ? 1 : 0, Date.now()).lastInsertRowid);
}
/** Devolve se achou a conta. */
export const definirAdmin = (usuario: string, admin: boolean) => sql.mudarAdmin.run(admin ? 1 : 0, usuario).changes > 0;

export const criarSessao = (tokenHash: string, contaId: number, expiraEm: number) => void sql.criarSessao.run(tokenHash, contaId, expiraEm);
export const sessao = (tokenHash: string) => sql.sessao.get(tokenHash) as { conta_id: number; expira_em: number } | undefined;
export const apagarSessao = (tokenHash: string) => void sql.apagarSessao.run(tokenHash);
export const limparSessoesVencidas = () => void sql.limparSessoes.run(Date.now());

export const lerSave = (contaId: number) => sql.save.get(contaId) as { dados: string; versao: number } | undefined;

/**
 * Grava o save só se a versão bater com a que o jogo leu (outra aba/computador pode ter salvo antes).
 * Devolve a versão nova, ou null se estava desatualizado.
 */
export function gravarSave(contaId: number, dados: string, versaoLida: number): number | null {
  const atual = lerSave(contaId);
  if (!atual) {
    if (versaoLida !== 0) return null;
    sql.inserirSave.run(contaId, dados, Date.now());
    return 1;
  }
  return sql.atualizarSave.run(dados, Date.now(), contaId, versaoLida).changes > 0 ? versaoLida + 1 : null;
}
export const apagarSave = (contaId: number) => void sql.apagarSave.run(contaId);
