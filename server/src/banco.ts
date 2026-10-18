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
  CREATE TABLE IF NOT EXISTS amizades (
    de INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    para INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    aceita INTEGER NOT NULL DEFAULT 0,
    criada_em INTEGER NOT NULL,
    PRIMARY KEY (de, para)
  );
  CREATE TABLE IF NOT EXISTS recados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    de INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    para INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    em INTEGER NOT NULL,
    lida INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS recados_par ON recados (de, para, id);
  CREATE INDEX IF NOT EXISTS recados_nao_lidas ON recados (para, lida);
  CREATE INDEX IF NOT EXISTS amizades_para ON amizades (para);
  CREATE TABLE IF NOT EXISTS clas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    -- nome sem acentos e em minúsculas: "Ação", "ACAO" e "acao" são o mesmo clã
    chave TEXT NOT NULL UNIQUE,
    bandeira TEXT NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    aberto INTEGER NOT NULL DEFAULT 1,
    lider INTEGER NOT NULL,
    nivel INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    criado_em INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cla_membros (
    conta_id INTEGER PRIMARY KEY REFERENCES contas(id) ON DELETE CASCADE,
    cla_id INTEGER NOT NULL REFERENCES clas(id) ON DELETE CASCADE,
    xp_dado INTEGER NOT NULL DEFAULT 0,
    vice INTEGER NOT NULL DEFAULT 0,
    entrou_em INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cla_pedidos (
    cla_id INTEGER NOT NULL REFERENCES clas(id) ON DELETE CASCADE,
    conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    criado_em INTEGER NOT NULL,
    PRIMARY KEY (cla_id, conta_id)
  );
  CREATE TABLE IF NOT EXISTS anuncios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    texto TEXT NOT NULL,
    autor INTEGER REFERENCES contas(id) ON DELETE SET NULL,
    autor_nome TEXT NOT NULL,
    criado_em INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS cla_membros_cla ON cla_membros (cla_id);
  CREATE INDEX IF NOT EXISTS cla_pedidos_conta ON cla_pedidos (conta_id);
`);

/**
 * Roda várias mudanças como uma só: ou todas ficam, ou nenhuma (se der erro no meio, volta tudo).
 * Pode ser chamada dentro de outra (a de fora é quem fecha).
 */
let emTransacao = false;
export function transacao<T>(mudancas: () => T): T {
  if (emTransacao) return mudancas();
  db.exec('BEGIN IMMEDIATE');
  emTransacao = true;
  try {
    const resultado = mudancas();
    db.exec('COMMIT');
    return resultado;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    emTransacao = false;
  }
}

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
  contaPorUsuario: db.prepare('SELECT * FROM contas WHERE usuario = ?'),
  ranking: db.prepare(`SELECT c.usuario, json_extract(s.dados, '$.aparencia.nome') AS nome, json_extract(s.dados, '$.xpTreinador') AS xp,
    json_extract(s.dados, '$.estatisticas.capturas') AS capturas, json_extract(s.dados, '$.estatisticas.capturasShiny') AS shiny,
    json_extract(s.dados, '$.estatisticas.capturasLendarios') AS lendarios, json_extract(s.dados, '$.estatisticas.medalhas') AS medalhas,
    json_extract(s.dados, '$.estatisticas.missoesQuadro') AS missoes, json_extract(s.dados, '$.silver') AS silver, json_extract(s.dados, '$.gold') AS gold
    FROM contas c JOIN saves s ON s.conta_id = c.id LIMIT 5000`),
  buscar: db.prepare(`SELECT c.id, c.usuario, json_extract(s.dados, '$.aparencia.nome') AS nome FROM contas c JOIN saves s ON s.conta_id = c.id
    WHERE c.usuario LIKE ? ESCAPE '!' OR json_extract(s.dados, '$.aparencia.nome') LIKE ? ESCAPE '!' ORDER BY c.usuario LIMIT 20`),
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
  regravarSave: db.prepare('UPDATE saves SET dados = ?, versao = versao + 1, atualizado_em = ? WHERE conta_id = ?'),
  amizade: db.prepare('SELECT de, para, aceita FROM amizades WHERE (de = ? AND para = ?) OR (de = ? AND para = ?)'),
  amizades: db.prepare(`SELECT a.de, a.aceita, c.id, c.usuario, json_extract(s.dados, '$.aparencia.nome') AS nome
    FROM amizades a JOIN contas c ON c.id = CASE WHEN a.de = ? THEN a.para ELSE a.de END LEFT JOIN saves s ON s.conta_id = c.id
    WHERE a.de = ? OR a.para = ? ORDER BY c.usuario`),
  criarAmizade: db.prepare('INSERT INTO amizades (de, para, aceita, criada_em) VALUES (?, ?, 0, ?)'),
  aceitarAmizade: db.prepare('UPDATE amizades SET aceita = 1 WHERE de = ? AND para = ?'),
  apagarAmizade: db.prepare('DELETE FROM amizades WHERE (de = ? AND para = ?) OR (de = ? AND para = ?)'),
  gravarRecado: db.prepare('INSERT INTO recados (de, para, texto, em) VALUES (?, ?, ?, ?)'),
  conversa: db.prepare(`SELECT * FROM (SELECT id, de, para, texto, em FROM recados
    WHERE (de = ? AND para = ?) OR (de = ? AND para = ?) ORDER BY id DESC LIMIT ?) ORDER BY id`),
  marcarLidas: db.prepare('UPDATE recados SET lida = 1 WHERE de = ? AND para = ? AND lida = 0'),
  naoLidas: db.prepare('SELECT de, COUNT(*) AS n FROM recados WHERE para = ? AND lida = 0 GROUP BY de'),
  contarAmigos: db.prepare('SELECT COUNT(*) AS n FROM amizades WHERE aceita = 1 AND (de = ? OR para = ?)'),
  podarConversa: db.prepare(`DELETE FROM recados WHERE ((de = ? AND para = ?) OR (de = ? AND para = ?)) AND id <=
    (SELECT id FROM recados WHERE (de = ? AND para = ?) OR (de = ? AND para = ?) ORDER BY id DESC LIMIT 1 OFFSET ?)`),
  apagarConversa: db.prepare('DELETE FROM recados WHERE (de = ? AND para = ?) OR (de = ? AND para = ?)'),
};

// ---- amigos e mensagens privadas (server/src/amigos.ts) ----
export interface Amizade {
  de: number;
  para: number;
  aceita: number;
}
export interface Recado {
  id: number;
  de: number;
  para: number;
  texto: string;
  em: number;
}
export const amizade = (a: number, b: number) => sql.amizade.get(a, b, b, a) as Amizade | undefined;
/** Todas as ligações da conta (aceitas e pedidos): `de` diz quem pediu; id/usuario/nome são do OUTRO. */
export const amizadesDe = (id: number) => sql.amizades.all(id, id, id) as { de: number; aceita: number; id: number; usuario: string; nome: string | null }[];
export const criarAmizade = (de: number, para: number) => void sql.criarAmizade.run(de, para, Date.now());
export const aceitarAmizade = (de: number, para: number) => void sql.aceitarAmizade.run(de, para);
/** Desfaz a amizade (ou o pedido) e apaga a conversa dos dois. */
export function apagarAmizade(a: number, b: number): void {
  sql.apagarAmizade.run(a, b, b, a);
  sql.apagarConversa.run(a, b, b, a);
}
export const contarAmigos = (id: number) => (sql.contarAmigos.get(id, id) as { n: number }).n;
/** Guarda a mensagem e apaga as mais antigas da conversa além das `manter` últimas. */
export function gravarRecado(de: number, para: number, texto: string, em: number, manter: number): number {
  const id = Number(sql.gravarRecado.run(de, para, texto, em).lastInsertRowid);
  sql.podarConversa.run(de, para, para, de, de, para, para, de, manter);
  return id;
}
export const conversa = (a: number, b: number, limite: number) => sql.conversa.all(a, b, b, a, limite) as unknown as Recado[];
export const marcarLidas = (de: number, para: number) => void sql.marcarLidas.run(de, para);
export const naoLidasDe = (para: number) => sql.naoLidas.all(para) as { de: number; n: number }[];

export const contaPorLogin = (login: string) => sql.contaPorLogin.get(login, login) as Conta | undefined;
export const contaPorId = (id: number) => sql.contaPorId.get(id) as Conta | undefined;
/** Jogadores (com save) cujo usuário ou nome de treinador contém o termo. */
export function buscarJogadores(termo: string): { id: number; usuario: string; nome: string | null }[] {
  const t = termo.trim().slice(0, 30);
  if (!t) return [];
  // ! é o caractere de escape do LIKE (para % e _ digitados valerem como texto)
  const padrao = `%${t.replace(/[!%_]/g, (c) => `!${c}`)}%`;
  return sql.buscar.all(padrao, padrao) as { id: number; usuario: string; nome: string | null }[];
}
/** Os números de cada jogador com save, para o ranking (server/src/ranking.ts). */
export const linhasDoRanking = () => sql.ranking.all() as Record<'usuario' | 'nome' | 'xp' | 'capturas' | 'shiny' | 'lendarios' | 'medalhas' | 'missoes' | 'silver' | 'gold', unknown>[] as (Record<string, unknown> & { usuario: string })[];
export const contaPorUsuario = (usuario: string) => sql.contaPorUsuario.get(usuario) as Conta | undefined;
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

/**
 * Mudança feita pelo SERVIDOR em vários saves de uma vez (ex.: troca entre jogadores): tudo ou nada.
 * `mudar` recebe os saves já lidos (objetos) e altera no lugar; devolve a versão nova de cada um.
 */
export function mudarSaves(contaIds: number[], mudar: (saves: Record<string, unknown>[]) => void): number[] {
  return transacao(() => {
    const lidos = contaIds.map((id) => {
      const s = lerSave(id);
      if (!s) throw new Error(`Conta ${id} sem save.`);
      return { id, dados: JSON.parse(s.dados) as Record<string, unknown>, versao: s.versao };
    });
    mudar(lidos.map((l) => l.dados));
    const agora = Date.now();
    for (const l of lidos) sql.regravarSave.run(JSON.stringify(l.dados), agora, l.id);
    return lidos.map((l) => l.versao + 1);
  });
}

// ---- clãs (server/src/cla.ts) ----
export interface Cla {
  id: number;
  nome: string;
  chave: string;
  bandeira: string;
  descricao: string;
  aberto: number;
  lider: number;
  nivel: number;
  xp: number;
  criado_em: number;
}
export interface MembroCla {
  id: number;
  usuario: string;
  nome: string | null;
  xp_dado: number;
  vice: number;
  entrou_em: number;
}
const NOME_TREINADOR = `json_extract(s.dados, '$.aparencia.nome')`;
const sqlCla = {
  porId: db.prepare('SELECT * FROM clas WHERE id = ?'),
  porChave: db.prepare('SELECT * FROM clas WHERE chave = ?'),
  daConta: db.prepare('SELECT c.* FROM clas c JOIN cla_membros m ON m.cla_id = c.id WHERE m.conta_id = ?'),
  membros: db.prepare(`SELECT c.id, c.usuario, ${NOME_TREINADOR} AS nome, m.xp_dado, m.vice, m.entrou_em FROM cla_membros m
    JOIN contas c ON c.id = m.conta_id LEFT JOIN saves s ON s.conta_id = c.id WHERE m.cla_id = ? ORDER BY m.entrou_em, c.id`),
  listar: db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM cla_membros m WHERE m.cla_id = c.id) AS membros FROM clas c
    WHERE c.chave LIKE ? ESCAPE '!' ORDER BY c.nivel DESC, c.xp DESC, c.id LIMIT 30`),
  criar: db.prepare('INSERT INTO clas (nome, chave, bandeira, descricao, aberto, lider, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  semLider: db.prepare('SELECT c.* FROM clas c WHERE NOT EXISTS (SELECT 1 FROM cla_membros m WHERE m.cla_id = c.id AND m.conta_id = c.lider)'),
  editar: db.prepare('UPDATE clas SET bandeira = ?, descricao = ?, aberto = ? WHERE id = ?'),
  lider: db.prepare('UPDATE clas SET lider = ? WHERE id = ?'),
  progresso: db.prepare('UPDATE clas SET nivel = ?, xp = ? WHERE id = ?'),
  apagar: db.prepare('DELETE FROM clas WHERE id = ?'),
  entrar: db.prepare('INSERT INTO cla_membros (conta_id, cla_id, entrou_em) VALUES (?, ?, ?)'),
  sair: db.prepare('DELETE FROM cla_membros WHERE conta_id = ?'),
  vice: db.prepare('UPDATE cla_membros SET vice = ? WHERE conta_id = ?'),
  xpMembro: db.prepare('UPDATE cla_membros SET xp_dado = xp_dado + ? WHERE conta_id = ?'),
  pedir: db.prepare('INSERT OR IGNORE INTO cla_pedidos (cla_id, conta_id, criado_em) VALUES (?, ?, ?)'),
  tirarPedido: db.prepare('DELETE FROM cla_pedidos WHERE cla_id = ? AND conta_id = ?'),
  tirarPedidos: db.prepare('DELETE FROM cla_pedidos WHERE conta_id = ?'),
  pedidosDoCla: db.prepare(`SELECT c.id, c.usuario, ${NOME_TREINADOR} AS nome FROM cla_pedidos p JOIN contas c ON c.id = p.conta_id
    LEFT JOIN saves s ON s.conta_id = c.id WHERE p.cla_id = ? ORDER BY p.criado_em`),
  pedidosDaConta: db.prepare('SELECT cla_id FROM cla_pedidos WHERE conta_id = ?'),
};
export const claPorId = (id: number) => sqlCla.porId.get(id) as Cla | undefined;
export const claPorChave = (chave: string) => sqlCla.porChave.get(chave) as Cla | undefined;
/** Clãs cujo líder não é mais membro (conta apagada, por exemplo): o servidor conserta (server/src/cla.ts). */
export const clasSemLider = () => sqlCla.semLider.all() as unknown as Cla[];
export const claDaConta = (contaId: number) => sqlCla.daConta.get(contaId) as Cla | undefined;
export const membrosDoCla = (claId: number) => sqlCla.membros.all(claId) as unknown as MembroCla[];
/** Clãs cuja chave (nome sem acentos, em minúsculas) contém o termo, os de nível mais alto primeiro. */
export function listarClas(chave: string): (Cla & { membros: number })[] {
  const padrao = `%${chave.slice(0, 30).replace(/[!%_]/g, (c) => `!${c}`)}%`;
  return sqlCla.listar.all(padrao) as unknown as (Cla & { membros: number })[];
}
export function criarCla(nome: string, chave: string, bandeira: string, descricao: string, aberto: boolean, lider: number): number {
  const id = Number(sqlCla.criar.run(nome, chave, bandeira, descricao, aberto ? 1 : 0, lider, Date.now()).lastInsertRowid);
  entrarNoCla(lider, id);
  return id;
}
export const editarCla = (id: number, bandeira: string, descricao: string, aberto: boolean) => void sqlCla.editar.run(bandeira, descricao, aberto ? 1 : 0, id);
export const mudarLiderDoCla = (id: number, lider: number) => void sqlCla.lider.run(lider, id);
export const mudarProgressoDoCla = (id: number, nivel: number, xp: number) => void sqlCla.progresso.run(nivel, xp, id);
/** Apaga o clã (membros e pedidos vão junto). */
export const apagarCla = (id: number) => void sqlCla.apagar.run(id);
/** Entra no clã e desfaz os pedidos que a conta tinha em outros. */
export function entrarNoCla(contaId: number, claId: number): void {
  sqlCla.entrar.run(contaId, claId, Date.now());
  sqlCla.tirarPedidos.run(contaId);
}
export const sairDoCla = (contaId: number) => void sqlCla.sair.run(contaId);
export const mudarViceDoCla = (contaId: number, vice: boolean) => void sqlCla.vice.run(vice ? 1 : 0, contaId);
export const somarXpDoMembro = (contaId: number, xp: number) => void sqlCla.xpMembro.run(xp, contaId);
export const pedirEntradaNoCla = (claId: number, contaId: number) => void sqlCla.pedir.run(claId, contaId, Date.now());
export const tirarPedidoDoCla = (claId: number, contaId: number) => void sqlCla.tirarPedido.run(claId, contaId);
export const pedidosDoCla = (claId: number) => sqlCla.pedidosDoCla.all(claId) as { id: number; usuario: string; nome: string | null }[];
export const pedidosDeClaDaConta = (contaId: number) => (sqlCla.pedidosDaConta.all(contaId) as { cla_id: number }[]).map((p) => p.cla_id);

// ---- anúncios da staff (server/src/anuncios.ts) ----
export interface AnuncioGuardado {
  id: number;
  titulo: string;
  texto: string;
  autor_nome: string;
  criado_em: number;
}
const sqlAnuncio = {
  listar: db.prepare('SELECT id, titulo, texto, autor_nome, criado_em FROM anuncios ORDER BY id DESC LIMIT ?'),
  criar: db.prepare('INSERT INTO anuncios (titulo, texto, autor, autor_nome, criado_em) VALUES (?, ?, ?, ?, ?)'),
  podar: db.prepare('DELETE FROM anuncios WHERE id <= (SELECT id FROM anuncios ORDER BY id DESC LIMIT 1 OFFSET ?)'),
  apagar: db.prepare('DELETE FROM anuncios WHERE id = ?'),
};
/** Os mais novos primeiro. */
export const listarAnuncios = (limite: number) => sqlAnuncio.listar.all(limite) as unknown as AnuncioGuardado[];
/** Guarda o anúncio e apaga os mais antigos além dos `manter` últimos. */
export function criarAnuncio(titulo: string, texto: string, autor: number, autorNome: string, manter: number): number {
  const id = Number(sqlAnuncio.criar.run(titulo, texto, autor, autorNome, Date.now()).lastInsertRowid);
  sqlAnuncio.podar.run(manter);
  return id;
}
/** Devolve se achou o anúncio. */
export const apagarAnuncio = (id: number) => sqlAnuncio.apagar.run(id).changes > 0;

// ---- itens dados pela administração, esperando o jogo do jogador buscar (server/src/entregas.ts) ----
db.exec(`
  CREATE TABLE IF NOT EXISTS entregas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    nome TEXT NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    de TEXT NOT NULL,
    criado_em INTEGER NOT NULL
  );
`);
export interface Entrega {
  id: number;
  item: string;
  nome: string;
  quantidade: number;
}
const sqlEntrega = {
  criar: db.prepare('INSERT INTO entregas (conta_id, item, nome, quantidade, de, criado_em) VALUES (?, ?, ?, ?, ?, ?)'),
  daConta: db.prepare('SELECT id, item, nome, quantidade FROM entregas WHERE conta_id = ? ORDER BY id'),
  apagar: db.prepare('DELETE FROM entregas WHERE id = ?'),
};
export const criarEntrega = (contaId: number, item: string, nome: string, quantidade: number, de: string) => void sqlEntrega.criar.run(contaId, item, nome, quantidade, de, Date.now());
export const entregasDaConta = (contaId: number) => sqlEntrega.daConta.all(contaId) as unknown as Entrega[];
export const apagarEntrega = (id: number) => void sqlEntrega.apagar.run(id);

// ---- cofre do banco da cidade (server/src/cambio.ts): uma linha só, nunca negativa ----
db.exec(`
  CREATE TABLE IF NOT EXISTS cofre (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    silver INTEGER NOT NULL CHECK (silver >= 0),
    gold INTEGER NOT NULL CHECK (gold >= 0)
  );
`);
const sqlCofre = {
  criar: db.prepare('INSERT OR IGNORE INTO cofre (id, silver, gold) VALUES (1, ?, ?)'),
  ler: db.prepare('SELECT silver, gold FROM cofre WHERE id = 1'),
  mudar: db.prepare('UPDATE cofre SET silver = ?, gold = ? WHERE id = 1'),
};
/** Cria o cofre com os valores iniciais se ele ainda não existe (não mexe num cofre que já existe). */
export const garantirCofre = (silver: number, gold: number) => void sqlCofre.criar.run(silver, gold);
export const lerCofre = () => sqlCofre.ler.get() as { silver: number; gold: number };
export const mudarCofre = (silver: number, gold: number) => void sqlCofre.mudar.run(silver, gold);

// ---- mercado negro (server/src/mercado.ts): o que está à venda fica GUARDADO aqui, fora do save do vendedor ----
db.exec(`
  CREATE TABLE IF NOT EXISTS mercado (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendedor INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    dados TEXT NOT NULL,
    preco INTEGER NOT NULL CHECK (preco > 0),
    moeda TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ativo',
    criado_em INTEGER NOT NULL,
    expira_em INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS mercado_status ON mercado (status, id);
  CREATE INDEX IF NOT EXISTS mercado_vendedor ON mercado (vendedor);
`);
export interface LinhaMercado {
  id: number;
  vendedor: number;
  vendedor_nome: string;
  tipo: string;
  dados: string;
  preco: number;
  moeda: string;
  /** ativo = à venda (ou vencido, esperando o dono buscar); vendido = esperando o vendedor buscar o pagamento. */
  status: string;
  criado_em: number;
  expira_em: number;
}
const COLUNAS_MERCADO = 'm.id, m.vendedor, c.usuario AS vendedor_nome, m.tipo, m.dados, m.preco, m.moeda, m.status, m.criado_em, m.expira_em';
const sqlMercado = {
  criar: db.prepare('INSERT INTO mercado (vendedor, tipo, dados, preco, moeda, criado_em, expira_em) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  ativos: db.prepare(`SELECT ${COLUNAS_MERCADO} FROM mercado m JOIN contas c ON c.id = m.vendedor WHERE m.status = 'ativo' AND m.expira_em > ? ORDER BY m.id DESC LIMIT ?`),
  porId: db.prepare(`SELECT ${COLUNAS_MERCADO} FROM mercado m JOIN contas c ON c.id = m.vendedor WHERE m.id = ?`),
  doVendedor: db.prepare(`SELECT ${COLUNAS_MERCADO} FROM mercado m JOIN contas c ON c.id = m.vendedor WHERE m.vendedor = ? ORDER BY m.id`),
  vender: db.prepare("UPDATE mercado SET status = 'vendido' WHERE id = ? AND status = 'ativo'"),
  apagar: db.prepare('DELETE FROM mercado WHERE id = ?'),
};
export const criarAnuncioMercado = (vendedor: number, tipo: string, dados: string, preco: number, moeda: string, expiraEm: number) =>
  Number(sqlMercado.criar.run(vendedor, tipo, dados, preco, moeda, Date.now(), expiraEm).lastInsertRowid);
export const anunciosAtivosMercado = (agora: number, limite: number) => sqlMercado.ativos.all(agora, limite) as unknown as LinhaMercado[];
export const anuncioMercado = (id: number) => sqlMercado.porId.get(id) as unknown as LinhaMercado | undefined;
export const anunciosDoVendedor = (contaId: number) => sqlMercado.doVendedor.all(contaId) as unknown as LinhaMercado[];
/** Devolve se o anúncio ainda estava à venda (falso = outro comprou antes). */
export const venderAnuncioMercado = (id: number) => sqlMercado.vender.run(id).changes > 0;
export const apagarAnuncioMercado = (id: number) => void sqlMercado.apagar.run(id);

// ---- Pokémon dados pela administração, esperando o jogo do jogador buscar (server/src/entregas.ts) ----
db.exec(`
  CREATE TABLE IF NOT EXISTS entregas_pokemon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    dados TEXT NOT NULL,
    nome TEXT NOT NULL,
    de TEXT NOT NULL,
    criado_em INTEGER NOT NULL
  );
`);
export interface EntregaPokemon {
  id: number;
  dados: string;
  nome: string;
}
const sqlEntregaPokemon = {
  criar: db.prepare('INSERT INTO entregas_pokemon (conta_id, dados, nome, de, criado_em) VALUES (?, ?, ?, ?, ?)'),
  daConta: db.prepare('SELECT id, dados, nome FROM entregas_pokemon WHERE conta_id = ? ORDER BY id'),
  apagar: db.prepare('DELETE FROM entregas_pokemon WHERE id = ?'),
};
export const criarEntregaPokemon = (contaId: number, dados: string, nome: string, de: string) => void sqlEntregaPokemon.criar.run(contaId, dados, nome, de, Date.now());
export const entregasPokemonDaConta = (contaId: number) => sqlEntregaPokemon.daConta.all(contaId) as unknown as EntregaPokemon[];
export const apagarEntregaPokemon = (id: number) => void sqlEntregaPokemon.apagar.run(id);

// ---- quadro de missões: quem concluiu cada missão (o quadro é do servidor inteiro; server/src/missoes.ts) ----
db.exec(`
  CREATE TABLE IF NOT EXISTS missoes_quadro (
    id TEXT PRIMARY KEY,
    conta_id INTEGER NOT NULL,
    por TEXT NOT NULL,
    quando INTEGER NOT NULL
  );
`);
const sqlMissoes = {
  recentes: db.prepare('SELECT id, por, quando FROM missoes_quadro WHERE quando > ? ORDER BY quando DESC'),
  uma: db.prepare('SELECT id, por, quando FROM missoes_quadro WHERE id = ?'),
  criar: db.prepare('INSERT INTO missoes_quadro (id, conta_id, por, quando) VALUES (?, ?, ?, ?)'),
  limpar: db.prepare('DELETE FROM missoes_quadro WHERE quando < ?'),
};
type MissaoGuardada = { id: string; por: string; quando: number };
/** Concluídas no último dia (as missões ficam 12 horas no quadro). */
export const missoesConcluidas = () => sqlMissoes.recentes.all(Date.now() - 24 * 60 * 60 * 1000) as unknown as MissaoGuardada[];
export const missaoConcluida = (id: string) => sqlMissoes.uma.get(id) as unknown as MissaoGuardada | undefined;
export function concluirMissao(id: string, contaId: number, por: string, quando: number): void {
  sqlMissoes.criar.run(id, contaId, por, quando);
  sqlMissoes.limpar.run(quando - 7 * 24 * 60 * 60 * 1000);
}

// ---- banimentos (server/src/banimentos.ts): cada linha fica guardada para sempre, é o registro de quem baniu e por quê ----
db.exec(`
  CREATE TABLE IF NOT EXISTS banimentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    usuario TEXT NOT NULL,
    motivo TEXT NOT NULL,
    por TEXT NOT NULL,
    criado_em INTEGER NOT NULL,
    ate INTEGER,
    revogado_em INTEGER,
    revogado_por TEXT
  );
  CREATE INDEX IF NOT EXISTS banimentos_conta ON banimentos (conta_id);
`);
export interface Banimento {
  id: number;
  conta_id: number;
  usuario: string;
  motivo: string;
  por: string;
  criado_em: number;
  /** null = para sempre */
  ate: number | null;
  revogado_em: number | null;
  revogado_por: string | null;
}
const sqlBanimento = {
  ativo: db.prepare('SELECT * FROM banimentos WHERE conta_id = ? AND revogado_em IS NULL AND (ate IS NULL OR ate > ?) ORDER BY ate IS NULL DESC, ate DESC LIMIT 1'),
  criar: db.prepare('INSERT INTO banimentos (conta_id, usuario, motivo, por, criado_em, ate) VALUES (?, ?, ?, ?, ?, ?)'),
  revogar: db.prepare('UPDATE banimentos SET revogado_em = ?, revogado_por = ? WHERE conta_id = ? AND revogado_em IS NULL AND (ate IS NULL OR ate > ?)'),
  listar: db.prepare('SELECT * FROM banimentos ORDER BY id DESC LIMIT ?'),
  apagarSessoes: db.prepare('DELETE FROM sessoes WHERE conta_id = ?'),
};
export const banimentoAtivo = (contaId: number, agora = Date.now()) => sqlBanimento.ativo.get(contaId, agora) as unknown as Banimento | undefined;
export const criarBanimento = (contaId: number, usuario: string, motivo: string, por: string, ate: number | null) =>
  void sqlBanimento.criar.run(contaId, usuario, motivo, por, Date.now(), ate);
export const revogarBanimentos = (contaId: number, por: string) => sqlBanimento.revogar.run(Date.now(), por, contaId, Date.now()).changes > 0;
export const listarBanimentos = (limite: number) => sqlBanimento.listar.all(limite) as unknown as Banimento[];
/** Derruba todas as sessões da conta (ela tem de entrar de novo). */
export const apagarSessoesDaConta = (contaId: number) => void sqlBanimento.apagarSessoes.run(contaId);

// ---- mudanças feitas uma vez só no banco (o número fica em PRAGMA user_version) ----
{
  const versao = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  if (versao < 1) {
    // o XP da guilda mudou de escala (era o XP de treinador, agora são pontos por ação): todas recomeçam do nível 1
    db.exec('UPDATE clas SET nivel = 1, xp = 0; UPDATE cla_membros SET xp_dado = 0; PRAGMA user_version = 1;');
  }
}

// ---- eventos (server/src/cofre.ts, server/src/loteria.ts): estado de cada evento em JSON + bilhetes da loteria ----
db.exec(`
  CREATE TABLE IF NOT EXISTS eventos_estado (
    chave TEXT PRIMARY KEY,
    dados TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS loteria_bilhetes (
    dia TEXT NOT NULL,
    numero INTEGER NOT NULL,
    conta_id INTEGER NOT NULL,
    comprado_em INTEGER NOT NULL,
    PRIMARY KEY (dia, numero)
  );
`);
const sqlEventos = {
  ler: db.prepare('SELECT dados FROM eventos_estado WHERE chave = ?'),
  gravar: db.prepare('INSERT INTO eventos_estado (chave, dados) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET dados = excluded.dados'),
  bilhetesDaConta: db.prepare('SELECT numero FROM loteria_bilhetes WHERE dia = ? AND conta_id = ? ORDER BY comprado_em'),
  bilhete: db.prepare('SELECT conta_id FROM loteria_bilhetes WHERE dia = ? AND numero = ?'),
  vendidos: db.prepare('SELECT COUNT(*) AS n FROM loteria_bilhetes WHERE dia = ?'),
  criarBilhete: db.prepare('INSERT INTO loteria_bilhetes (dia, numero, conta_id, comprado_em) VALUES (?, ?, ?, ?)'),
};
export function lerEvento<T>(chave: string): T | null {
  const linha = sqlEventos.ler.get(chave) as { dados: string } | undefined;
  return linha ? (JSON.parse(linha.dados) as T) : null;
}
export const gravarEvento = (chave: string, valor: unknown) => void sqlEventos.gravar.run(chave, JSON.stringify(valor));
export const bilhetesDaConta = (dia: string, contaId: number) => (sqlEventos.bilhetesDaConta.all(dia, contaId) as { numero: number }[]).map((b) => b.numero);
export const donoDoBilhete = (dia: string, numero: number) => (sqlEventos.bilhete.get(dia, numero) as { conta_id: number } | undefined)?.conta_id ?? null;
export const bilhetesVendidos = (dia: string) => (sqlEventos.vendidos.get(dia) as { n: number }).n;
export const criarBilhete = (dia: string, numero: number, contaId: number) => void sqlEventos.criarBilhete.run(dia, numero, contaId, Date.now());

// ---- correio: uma caixa por conta (server/src/correio.ts) ----
// Cada carta pode trazer anexos (itens, moedas, Pokémon) em JSON; o jogador resgata quando quiser.
db.exec(`
  CREATE TABLE IF NOT EXISTS correio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    texto TEXT NOT NULL,
    de TEXT NOT NULL,
    anexos TEXT NOT NULL DEFAULT '[]',
    criado_em INTEGER NOT NULL,
    lida INTEGER NOT NULL DEFAULT 0,
    resgatada INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS correio_conta ON correio (conta_id, id);
`);
export interface Carta {
  id: number;
  titulo: string;
  texto: string;
  de: string;
  anexos: string;
  criado_em: number;
  lida: number;
  resgatada: number;
}
const sqlCorreio = {
  criar: db.prepare('INSERT INTO correio (conta_id, titulo, texto, de, anexos, criado_em) VALUES (?, ?, ?, ?, ?, ?)'),
  daConta: db.prepare('SELECT id, titulo, texto, de, anexos, criado_em, lida, resgatada FROM correio WHERE conta_id = ? ORDER BY id DESC'),
  uma: db.prepare('SELECT id, titulo, texto, de, anexos, criado_em, lida, resgatada FROM correio WHERE id = ? AND conta_id = ?'),
  lida: db.prepare('UPDATE correio SET lida = 1 WHERE id = ? AND conta_id = ?'),
  resgatada: db.prepare('UPDATE correio SET resgatada = 1, lida = 1 WHERE id = ? AND conta_id = ?'),
  apagar: db.prepare('DELETE FROM correio WHERE id = ? AND conta_id = ?'),
  contar: db.prepare('SELECT COUNT(*) AS n FROM correio WHERE conta_id = ?'),
  // as mais velhas que já não guardam nada (lidas, sem anexo esperando)
  apagarVelhas: db.prepare("DELETE FROM correio WHERE id IN (SELECT id FROM correio WHERE conta_id = ? AND lida = 1 AND (resgatada = 1 OR anexos = '[]') ORDER BY id LIMIT ?)"),
  contasComSave: db.prepare('SELECT conta_id AS id FROM saves'),
};
export const criarCarta = (contaId: number, titulo: string, texto: string, de: string, anexos: string) => void sqlCorreio.criar.run(contaId, titulo, texto, de, anexos, Date.now());
export const cartasDaConta = (contaId: number) => sqlCorreio.daConta.all(contaId) as unknown as Carta[];
export const cartaDaConta = (id: number, contaId: number) => sqlCorreio.uma.get(id, contaId) as Carta | undefined;
export const marcarCartaLida = (id: number, contaId: number) => void sqlCorreio.lida.run(id, contaId);
export const marcarCartaResgatada = (id: number, contaId: number) => void sqlCorreio.resgatada.run(id, contaId);
export const apagarCarta = (id: number, contaId: number) => sqlCorreio.apagar.run(id, contaId).changes > 0;
export const quantasCartas = (contaId: number) => (sqlCorreio.contar.get(contaId) as { n: number }).n;
export const apagarCartasVelhas = (contaId: number, quantas: number) => void sqlCorreio.apagarVelhas.run(contaId, quantas);
export const contasComSave = () => (sqlCorreio.contasComSave.all() as { id: number }[]).map((c) => c.id);
