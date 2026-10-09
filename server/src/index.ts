// Servidor do PokeOrigins: contas, login e save na nuvem. Em produção (Railway) também entrega o site já montado
// (client/dist); no desenvolvimento o Vite manda as chamadas /api para cá.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as banco from './banco.ts';
import { cadastrar, contaDoToken, entrar, ErroConta, publica, sair } from './contas.ts';
import * as trocas from './trocas.ts';
import { estaOnline, ligarMundo } from './mundo.ts';

const PORTA = Number(process.env.PORT ?? 3001);
const SITE = resolve(fileURLToPath(new URL('../../client/dist', import.meta.url)));
/** O save fica grande com o PC cheio; acima disso é erro (ou abuso). */
const TAMANHO_MAX_SAVE = 5 * 1024 * 1024;
const TAMANHO_MAX_PEDIDO = TAMANHO_MAX_SAVE + 64 * 1024;

// ---- limite de tentativas de login/cadastro por IP (contra robôs adivinhando senha) ----
const tentativas = new Map<string, { n: number; desde: number }>();
const JANELA_TENTATIVAS = 10 * 60 * 1000;
const MAX_TENTATIVAS = 20;
function limitar(ip: string): void {
  const agora = Date.now();
  const t = tentativas.get(ip);
  if (!t || agora - t.desde > JANELA_TENTATIVAS) return void tentativas.set(ip, { n: 1, desde: agora });
  if (++t.n > MAX_TENTATIVAS) throw new ErroConta('Muitas tentativas. Espere alguns minutos.', 429);
}
setInterval(() => {
  const agora = Date.now();
  for (const [ip, t] of tentativas) if (agora - t.desde > JANELA_TENTATIVAS) tentativas.delete(ip);
  banco.limparSessoesVencidas();
}, 60 * 1000).unref();

// ---- utilidades de HTTP ----
function responder(res: ServerResponse, status: number, corpo: unknown): void {
  const texto = JSON.stringify(corpo);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(texto);
}

async function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  const partes: Buffer[] = [];
  let tamanho = 0;
  for await (const parte of req) {
    tamanho += (parte as Buffer).length;
    if (tamanho > TAMANHO_MAX_PEDIDO) throw new ErroConta('Pedido grande demais.', 413);
    partes.push(parte as Buffer);
  }
  if (!tamanho) return {};
  try {
    const dados = JSON.parse(Buffer.concat(partes).toString('utf8'));
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error();
    return dados;
  } catch {
    throw new ErroConta('Pedido inválido.');
  }
}

const tokenDe = (req: IncomingMessage) => req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
const ipDe = (req: IncomingMessage) => String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket.remoteAddress || '?';

function exigirConta(req: IncomingMessage): banco.Conta {
  const conta = contaDoToken(tokenDe(req));
  if (!conta) throw new ErroConta('Sessão expirada. Entre de novo.', 401);
  return conta;
}

// ---- rotas da API ----
async function api(req: IncomingMessage, res: ServerResponse, caminho: string): Promise<void> {
  const metodo = req.method ?? 'GET';

  if (metodo === 'POST' && caminho === '/api/cadastro') {
    limitar(ipDe(req));
    const c = await lerCorpo(req);
    return responder(res, 201, await cadastrar(c.usuario, c.email, c.senha, c.manter === true));
  }
  if (metodo === 'POST' && caminho === '/api/entrar') {
    limitar(ipDe(req));
    const c = await lerCorpo(req);
    return responder(res, 200, await entrar(c.login, c.senha, c.manter === true));
  }
  if (metodo === 'POST' && caminho === '/api/sair') {
    const token = tokenDe(req);
    if (token) sair(token);
    return responder(res, 200, { ok: true });
  }
  if (metodo === 'GET' && caminho === '/api/eu') {
    const conta = exigirConta(req);
    const save = banco.lerSave(conta.id);
    return responder(res, 200, { conta: publica(conta), save: save ? JSON.parse(save.dados) : null, versao: save?.versao ?? 0 });
  }
  if (metodo === 'PUT' && caminho === '/api/save') {
    const conta = exigirConta(req);
    const c = await lerCorpo(req);
    if (!c.save || typeof c.save !== 'object' || typeof c.versao !== 'number') throw new ErroConta('Save inválido.');
    const texto = JSON.stringify(c.save);
    if (texto.length > TAMANHO_MAX_SAVE) throw new ErroConta('Save grande demais.', 413);
    const versao = banco.gravarSave(conta.id, texto, c.versao);
    if (versao === null) throw new ErroConta('Seu progresso foi salvo em outra aba ou computador. Recarregue a página.', 409);
    return responder(res, 200, { versao });
  }
  if (metodo === 'DELETE' && caminho === '/api/save') {
    const conta = exigirConta(req);
    banco.apagarSave(conta.id);
    return responder(res, 200, { versao: 0 });
  }

  // ---- trocas entre jogadores (server/src/trocas.ts) ----
  if (caminho === '/api/trocas/atual' && metodo === 'GET') return responder(res, 200, trocas.atual(exigirConta(req)));
  if (caminho === '/api/trocas' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 201, trocas.convidar(conta, (await lerCorpo(req)).usuario));
  }
  const rotaTroca = caminho.match(/^\/api\/trocas\/([A-Za-z0-9_-]{1,40})\/(aceitar|recusar|oferta|confirmar|trocar|cancelar)$/);
  if (rotaTroca && (metodo === 'POST' || metodo === 'PUT')) {
    const conta = exigirConta(req);
    const [, id, acao] = rotaTroca;
    const corpo = await lerCorpo(req);
    if (acao === 'aceitar' || acao === 'recusar') return responder(res, 200, trocas.responderConvite(conta, id, acao === 'aceitar'));
    if (acao === 'oferta') return responder(res, 200, trocas.mudarOferta(conta, id, corpo));
    if (acao === 'confirmar') return responder(res, 200, trocas.confirmar(conta, id, corpo.confirmado !== false));
    if (acao === 'trocar') return responder(res, 200, trocas.trocar(conta, id));
    return responder(res, 200, trocas.cancelar(conta, id));
  }

  // ---- outros jogadores: busca e perfil público ----
  if (caminho === '/api/jogadores' && metodo === 'GET') {
    exigirConta(req);
    const busca = new URL(req.url ?? '/', 'http://x').searchParams.get('busca') ?? '';
    return responder(res, 200, banco.buscarJogadores(busca).map((j) => ({ ...j, online: estaOnline(j.id) })));
  }
  const rotaPerfil = caminho.match(/^\/api\/jogadores\/([A-Za-z0-9_]{3,16})$/);
  if (rotaPerfil && metodo === 'GET') {
    exigirConta(req);
    const conta = banco.contaPorUsuario(rotaPerfil[1]);
    const save = conta && banco.lerSave(conta.id);
    if (!conta || !save) throw new ErroConta('Jogador não encontrado.', 404);
    return responder(res, 200, { usuario: conta.usuario, online: estaOnline(conta.id), perfil: perfilPublico(JSON.parse(save.dados)) });
  }
  throw new ErroConta('Não encontrado.', 404);
}

/**
 * O que os outros podem ver de um save: o necessário para o perfil. Nada de IVs, EVs, bolsa, moedas ou PC;
 * o time só com espécie, nível e shiny, e só se o dono deixou "Mostrar minha equipe" ligado.
 */
function perfilPublico(save: Record<string, unknown>) {
  const time = Array.isArray(save.time) ? (save.time as Record<string, unknown>[]) : [];
  const mostrarTime = save.mostrarTime !== false;
  return {
    aparencia: save.aparencia ?? null,
    regiao: save.regiao,
    xpTreinador: save.xpTreinador ?? 0,
    criadoEm: save.criadoEm ?? null,
    insignias: save.insignias ?? [],
    vistos: save.vistos ?? [],
    capturados: save.capturados ?? [],
    estatisticas: save.estatisticas ?? null,
    mostrarTime,
    time: mostrarTime ? time.map((p) => ({ especieId: p.especieId, nivel: p.nivel, shiny: !!p.shiny })) : [],
  };
}

// ---- site (só em produção, depois de `npm run build`) ----
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};
function entregarSite(res: ServerResponse, caminho: string): void {
  let arquivo = normalize(join(SITE, decodeURIComponent(caminho)));
  // nada fora da pasta do site
  if (arquivo !== SITE && !arquivo.startsWith(SITE + sep)) return void responder(res, 403, { erro: 'Proibido.' });
  if (!existsSync(arquivo) || statSync(arquivo).isDirectory()) arquivo = join(SITE, 'index.html');
  if (!existsSync(arquivo)) return void responder(res, 404, { erro: 'Site não montado (rode npm run build).' });
  const imutavel = arquivo.includes(`${join(SITE, 'assets')}`);
  res.writeHead(200, {
    'Content-Type': TIPOS[extname(arquivo).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': imutavel ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(arquivo).pipe(res);
}

const servidor = createServer(async (req, res) => {
  const caminho = new URL(req.url ?? '/', 'http://x').pathname;
  try {
    if (caminho.startsWith('/api/')) await api(req, res, caminho);
    else if (req.method === 'GET' || req.method === 'HEAD') entregarSite(res, caminho);
    else responder(res, 405, { erro: 'Método não permitido.' });
  } catch (e) {
    if (e instanceof ErroConta) responder(res, e.status, { erro: e.message });
    else {
      console.error(e);
      if (!res.headersSent) responder(res, 500, { erro: 'Erro no servidor.' });
    }
  }
});
ligarMundo(servidor);
servidor.listen(PORTA, () => console.log(`Servidor do PokeOrigins em http://localhost:${PORTA}`));
