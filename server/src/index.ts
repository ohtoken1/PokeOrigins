// Servidor do PokeOrigins: contas, login e save na nuvem. Em produção (Railway) também entrega o site já montado
// (client/dist); no desenvolvimento o Vite manda as chamadas /api para cá.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as banco from './banco.ts';
import { cadastrar, contaDoToken, entrar, ErroConta, publica, sair } from './contas.ts';
import * as trocas from './trocas.ts';
import * as amigos from './amigos.ts';
import * as cla from './cla.ts';
import * as cambio from './cambio.ts';
import * as anuncios from './anuncios.ts';
import * as viagem from './viagem.ts';
import * as safari from './safari.ts';
import * as missoes from './missoes.ts';
import * as ranking from './ranking.ts';
import * as correio from './correio.ts';
import * as entregas from './entregas.ts';
import * as mercado from './mercado.ts';
import * as banimentos from './banimentos.ts';
import * as parcerias from './parcerias.ts';
import * as recompensas from './recompensas.ts';
import * as eventos from './eventos.ts';
import * as liga from './liga.ts';
import * as pvp from './pvp.ts';
import * as torneio from './torneio.ts';
import * as ranqueado from './ranqueado.ts';
import * as lojas from './lojas.ts';
import * as dashboard from './dashboard.ts';
import { avisarDaStaff, estaOnline, ligarMundo } from './mundo.ts';
import { tituloAtivo } from '../../shared/conquistas.ts';
import { temSkin, type ComSkins } from '../../shared/skins.ts';

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
  amigos.limpar();
  cla.consertar();
  dashboard.contarMinuto();
}, 60 * 1000).unref();

// ---- utilidades de HTTP ----
function responder(res: ServerResponse, status: number, corpo: unknown): void {
  const texto = JSON.stringify(corpo);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(texto);
}

/** Pedidos que não levam o save (login, amigos, clã, trocas…) são pequenos: acima disso é erro ou abuso. */
const TAMANHO_MAX_PEDIDO_PEQUENO = 16 * 1024;

async function lerCorpo(req: IncomingMessage, limite = TAMANHO_MAX_PEDIDO_PEQUENO): Promise<Record<string, unknown>> {
  const partes: Buffer[] = [];
  let tamanho = 0;
  for await (const parte of req) {
    tamanho += (parte as Buffer).length;
    if (tamanho > limite) throw new ErroConta('Pedido grande demais.', 413);
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
  // banir já derruba as sessões; isto cobre qualquer sessão que tenha sobrado
  banimentos.exigirSemBanimento(conta.id);
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
    const sessao = await entrar(c.login, c.senha, c.manter === true);
    // conta banida: a senha confere, mas não entra (e lê o motivo e o prazo)
    try {
      banimentos.exigirSemBanimento(sessao.conta.id);
    } catch (e) {
      sair(sessao.token);
      throw e;
    }
    return responder(res, 200, sessao);
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
    const c = await lerCorpo(req, TAMANHO_MAX_PEDIDO);
    if (!c.save || typeof c.save !== 'object' || typeof c.versao !== 'number') throw new ErroConta('Save inválido.');
    // conta comum: região e viagem só mudam pelo trem (server/src/viagem.ts)
    const guardado = banco.lerSave(conta.id);
    const antes = guardado ? (JSON.parse(guardado.dados) as Record<string, unknown>) : null;
    viagem.protegerRegiao(conta, c.save as Record<string, unknown>, antes);
    // entradas do Safari: valem as guardadas (server/src/safari.ts)
    safari.proteger(c.save as Record<string, unknown>, antes);
    lojas.proteger(c.save as Record<string, unknown>, antes);
    const texto = JSON.stringify(c.save);
    if (texto.length > TAMANHO_MAX_SAVE) throw new ErroConta('Save grande demais.', 413);
    const versao = banco.gravarSave(conta.id, texto, c.versao);
    if (versao === null) throw new ErroConta('Seu progresso foi salvo em outra aba ou computador. Recarregue a página.', 409);
    return responder(res, 200, { versao });
  }
  if (metodo === 'DELETE' && caminho === '/api/save') {
    const conta = exigirConta(req);
    // Recomeçar é só para a staff (testes; pedido do dono)
    if (!conta.admin) return responder(res, 403, { erro: 'Só a equipe pode recomeçar a jornada.' });
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

  // ---- amigos e mensagens privadas (server/src/amigos.ts) ----
  if (caminho === '/api/amigos' && metodo === 'GET') return responder(res, 200, amigos.lista(exigirConta(req)));
  if (caminho === '/api/amigos' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 201, amigos.convidar(conta, (await lerCorpo(req)).usuario));
  }
  const rotaAmigo = caminho.match(/^\/api\/amigos\/([A-Za-z0-9_]{3,16})\/(aceitar|recusar|remover|mensagens)$/);
  if (rotaAmigo) {
    const conta = exigirConta(req);
    const [, usuario, acao] = rotaAmigo;
    if (acao === 'mensagens' && metodo === 'GET') return responder(res, 200, amigos.conversa(conta, usuario));
    if (metodo === 'POST') {
      if (acao === 'mensagens') return responder(res, 201, amigos.mandar(conta, usuario, (await lerCorpo(req)).texto));
      if (acao === 'remover') return responder(res, 200, amigos.remover(conta, usuario));
      return responder(res, 200, amigos.responder(conta, usuario, acao === 'aceitar'));
    }
  }

  // ---- clãs (server/src/cla.ts) ----
  if (caminho === '/api/cla' && metodo === 'GET') return responder(res, 200, cla.meu(exigirConta(req)));
  if (caminho === '/api/clas' && metodo === 'GET') {
    exigirConta(req);
    return responder(res, 200, cla.listar(new URL(req.url ?? '/', 'http://x').searchParams.get('busca') ?? ''));
  }
  const rotaClas = caminho.match(/^\/api\/clas\/(\d{1,9})(?:\/(entrar|cancelar))?$/);
  if (rotaClas) {
    const conta = exigirConta(req);
    const id = Number(rotaClas[1]);
    if (!rotaClas[2] && metodo === 'GET') return responder(res, 200, cla.ver(conta, id));
    if (rotaClas[2] && metodo === 'POST') return responder(res, 200, rotaClas[2] === 'entrar' ? cla.entrar(conta, id) : cla.cancelarPedido(conta, id));
  }
  if (metodo === 'POST' && caminho.startsWith('/api/cla')) {
    const rotaCla = caminho.match(/^\/api\/cla(?:\/(sair|editar|xp)|\/(pedidos|membros)\/([A-Za-z0-9_]{3,16})\/(aceitar|recusar|expulsar|cargo))?$/);
    if (rotaCla) {
      const conta = exigirConta(req);
      const corpo = await lerCorpo(req);
      const [, simples, grupo, usuario, acao] = rotaCla;
      if (!simples && !grupo) return responder(res, 201, cla.criar(conta, corpo));
      if (simples === 'sair') return responder(res, 200, cla.sair(conta));
      if (simples === 'editar') return responder(res, 200, cla.editar(conta, corpo));
      if (simples === 'xp') return responder(res, 200, cla.darXp(conta, corpo.xp));
      if (grupo === 'pedidos' && (acao === 'aceitar' || acao === 'recusar')) return responder(res, 200, cla.responderPedido(conta, usuario, acao === 'aceitar'));
      if (grupo === 'membros' && acao === 'expulsar') return responder(res, 200, cla.expulsar(conta, usuario));
      if (grupo === 'membros' && acao === 'cargo') return responder(res, 200, cla.mudarCargo(conta, usuario, corpo.cargo));
    }
  }

  // ---- banco da cidade: silver ↔ gold (server/src/cambio.ts) ----
  if (caminho === '/api/cambio' && metodo === 'GET') {
    exigirConta(req);
    return responder(res, 200, { cofre: cambio.cofre() });
  }
  if (caminho === '/api/cambio' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, cambio.trocar(conta, await lerCorpo(req)));
  }

  // ---- trem entre as regiões (server/src/viagem.ts) ----
  if (caminho === '/api/viagem' && metodo === 'GET') {
    exigirConta(req);
    return responder(res, 200, viagem.agora());
  }
  if (caminho === '/api/viagem' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, viagem.comprar(conta, await lerCorpo(req)));
  }
  if (caminho === '/api/viagem/chegar' && metodo === 'POST') return responder(res, 200, viagem.chegar(exigirConta(req)));

  // ---- quadro de missões do servidor inteiro (server/src/missoes.ts) ----
  if (caminho === '/api/missoes' && metodo === 'GET') {
    exigirConta(req);
    return responder(res, 200, missoes.listar());
  }
  if (caminho === '/api/missoes/concluir' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, missoes.concluir(conta, await lerCorpo(req)));
  }

  // ---- Safari: entradas do dia (server/src/safari.ts) ----
  if (caminho === '/api/safari/comprar' && metodo === 'POST') return responder(res, 200, safari.comprar(exigirConta(req)));
  if (caminho === '/api/safari/entrar' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, safari.entrar(conta, await lerCorpo(req)));
  }

  // ---- Torneio (server/src/torneio.ts) ----
  if (caminho === '/api/torneio' && metodo === 'GET') return responder(res, 200, torneio.estado(exigirConta(req)));
  if (caminho === '/api/admin/torneio' && metodo === 'GET') return responder(res, 200, torneio.regrasDaStaffParaFora(exigirConta(req)));
  for (const [rota, f] of [['/api/torneio/inscrever', torneio.inscrever], ['/api/torneio/sair', torneio.sair], ['/api/admin/torneio/cancelar', torneio.cancelar]] as const)
    if (caminho === rota && metodo === 'POST') return responder(res, 200, f(exigirConta(req)));
  for (const [rota, f] of [['/api/admin/torneio', torneio.salvarRegras], ['/api/admin/torneio/abrir', torneio.abrirAgora]] as const)
    if (caminho === rota && metodo === 'POST') {
      const conta = exigirConta(req);
      return responder(res, 200, f(conta, await lerCorpo(req)));
    }

  // ---- lojas especiais (server/src/lojas.ts): Loja do dia e Lojas da Liga ----
  if (caminho === '/api/lojas' && metodo === 'GET') {
    exigirConta(req);
    return responder(res, 200, lojas.estado());
  }
  if (caminho === '/api/lojas/guilda' && metodo === 'GET') return responder(res, 200, lojas.estadoGuilda(exigirConta(req)));
  if (caminho === '/api/lojas/guilda/comprar' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, lojas.comprarGuilda(conta, await lerCorpo(req)));
  }
  if (caminho === '/api/lojas/comprar' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, lojas.comprar(conta, await lerCorpo(req)));
  }

  // ---- PvP ranqueado (server/src/ranqueado.ts): fila por formato, pontos e elos ----
  if (caminho === '/api/ranqueado' && metodo === 'GET') return responder(res, 200, ranqueado.estado(exigirConta(req)));
  if (caminho === '/api/ranqueado/ranking' && metodo === 'GET') {
    exigirConta(req);
    return responder(res, 200, ranqueado.ranking(new URL(req.url ?? '/', 'http://x').searchParams.get('formato')));
  }
  if (caminho === '/api/ranqueado/fila' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, ranqueado.entrar(conta, await lerCorpo(req)));
  }
  if (caminho === '/api/ranqueado/sair' && metodo === 'POST') return responder(res, 200, ranqueado.sair(exigirConta(req)));

  // ---- PvP (server/src/pvp.ts): batalhas calculadas no servidor ----
  if (caminho === '/api/pvp/atual' && metodo === 'GET') return responder(res, 200, pvp.atual(exigirConta(req)));
  for (const [rota, f] of [['/api/pvp/desafiar', pvp.desafiar], ['/api/pvp/responder', pvp.responder], ['/api/pvp/escolha', pvp.escolher], ['/api/pvp/desistir', pvp.desistir]] as const)
    if (caminho === rota && metodo === 'POST') {
      const conta = exigirConta(req);
      return responder(res, 200, f(conta, await lerCorpo(req)));
    }

  // ---- Liga Pokémon (server/src/liga.ts) ----
  if (caminho === '/api/liga' && metodo === 'GET') return responder(res, 200, liga.estado(exigirConta(req)));
  if (caminho === '/api/admin/liga' && metodo === 'GET') return responder(res, 200, liga.timesDaStaff(exigirConta(req)));
  for (const [rota, f] of [['/api/liga/entrar', liga.entrar], ['/api/liga/item', liga.usarItem], ['/api/admin/liga', liga.gravarTime]] as const)
    if (caminho === rota && metodo === 'POST') {
      const conta = exigirConta(req);
      return responder(res, 200, f(conta, await lerCorpo(req)));
    }

  // ---- eventos: Cofre e Loteria (server/src/eventos.ts) ----
  if (caminho === '/api/eventos' && metodo === 'GET') return responder(res, 200, eventos.estado(exigirConta(req)));
  if (caminho === '/api/eventos/cofre/tentar' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, eventos.tentarCofre(conta, await lerCorpo(req)));
  }
  if (caminho === '/api/eventos/cofre/abrir' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, eventos.abrirCofre(conta, await lerCorpo(req)));
  }
  if (caminho === '/api/eventos/cofre/fechar' && metodo === 'POST') return responder(res, 200, eventos.fecharCofre(exigirConta(req)));
  if (caminho === '/api/eventos/loteria/comprar' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, eventos.comprarBilhetes(conta, await lerCorpo(req)));
  }
  for (const [rota, f] of [['/api/eventos/ninho/entrar', eventos.entrarNoNinho], ['/api/eventos/ninho/resultado', eventos.resultadoDoNinho], ['/api/eventos/captura/iniciar', eventos.iniciarCaptura], ['/api/eventos/captura/registrar', eventos.registrarCaptura], ['/api/eventos/ligar', eventos.ligarEvento], ['/api/eventos/boss/iniciar', eventos.iniciarBoss], ['/api/eventos/boss/encerrar', eventos.encerrarBoss], ['/api/eventos/boss/entrar', eventos.entrarNoBoss], ['/api/eventos/boss/resultado', eventos.resultadoDoBoss]] as const)
    if (caminho === rota && metodo === 'POST') {
      const conta = exigirConta(req);
      return responder(res, 200, f(conta, await lerCorpo(req)));
    }
  if (caminho === '/api/eventos/loteria/abastecer' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, eventos.abastecerLoteria(conta, await lerCorpo(req)));
  }

  // ---- anúncios da staff, lidos no mural da cidade (server/src/anuncios.ts) ----
  if (caminho === '/api/anuncios' && metodo === 'GET') {
    exigirConta(req);
    return responder(res, 200, anuncios.listar());
  }
  if (caminho === '/api/anuncios' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 201, anuncios.publicar(conta, await lerCorpo(req)));
  }
  // aviso da staff: não vai para o mural, passa na barrinha de avisos de todos (letreiro)
  if (caminho === '/api/avisos' && metodo === 'POST') {
    const conta = exigirConta(req);
    if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
    const texto = avisarDaStaff((await lerCorpo(req)).texto);
    if (!texto) throw new ErroConta('Escreva o texto do aviso.');
    return responder(res, 201, { texto });
  }
  const rotaAnuncio = caminho.match(/^\/api\/anuncios\/(\d{1,9})$/);
  if (rotaAnuncio && metodo === 'DELETE') return responder(res, 200, anuncios.apagar(exigirConta(req), Number(rotaAnuncio[1])));

  // ---- mercado negro: anúncios de Pokémon, itens e gold entre jogadores (server/src/mercado.ts) ----
  if (caminho === '/api/mercado' && metodo === 'GET') return responder(res, 200, mercado.listar(exigirConta(req)));
  if (caminho === '/api/mercado' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 201, mercado.anunciar(conta, await lerCorpo(req)));
  }
  if (caminho === '/api/mercado/pendentes' && metodo === 'GET') return responder(res, 200, mercado.pendentes(exigirConta(req)));
  if (caminho === '/api/mercado/receber' && metodo === 'POST') return responder(res, 200, mercado.receber(exigirConta(req)));
  const anuncioDoMercado = /^\/api\/mercado\/(\d{1,15})\/(comprar|cancelar)$/.exec(caminho);
  if (anuncioDoMercado && metodo === 'POST') {
    const conta = exigirConta(req);
    const id = Number(anuncioDoMercado[1]);
    return responder(res, 200, anuncioDoMercado[2] === 'comprar' ? mercado.comprar(conta, id) : mercado.cancelar(conta, id));
  }

  // ---- itens dados pela administração (server/src/entregas.ts) ----
  if (caminho === '/api/admin/itens' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 201, entregas.darItem(conta, await lerCorpo(req)));
  }
  if (caminho === '/api/admin/pokemon' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 201, entregas.darPokemon(conta, await lerCorpo(req)));
  }
  // ---- correio: uma caixa por conta (server/src/correio.ts) ----
  if (caminho === '/api/correio' && metodo === 'GET') return responder(res, 200, correio.listar(exigirConta(req)));
  for (const [rota, f] of [['/api/correio/ler', correio.ler], ['/api/correio/resgatar', correio.resgatar], ['/api/correio/apagar', correio.apagar], ['/api/admin/correio', correio.enviarDaStaff]] as const)
    if (caminho === rota && metodo === 'POST') {
      const conta = exigirConta(req);
      return responder(res, 200, f(conta, await lerCorpo(req)));
    }
  if (caminho === '/api/entregas' && metodo === 'GET') return responder(res, 200, entregas.pendentes(exigirConta(req)));
  if (caminho === '/api/entregas/receber' && metodo === 'POST') return responder(res, 200, entregas.receber(exigirConta(req)));

  // ---- parcerias com criadores de conteúdo (server/src/parcerias.ts) ----
  // ---- Dashboard da Administração (server/src/dashboard.ts) ----
  if (caminho === '/api/admin/dashboard' && metodo === 'GET') return responder(res, 200, dashboard.painel(exigirConta(req)));
  if (caminho === '/api/admin/parcerias' && metodo === 'GET') return responder(res, 200, parcerias.listar(exigirConta(req)));
  if (caminho === '/api/admin/parcerias' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 201, parcerias.cadastrar(conta, await lerCorpo(req)));
  }
  const rotaParceria = caminho.match(/^\/api\/admin\/parcerias\/([A-Za-z0-9]{3,20})\/(descadastrar|recadastrar|repasse)$/);
  if (rotaParceria && metodo === 'POST') {
    const conta = exigirConta(req);
    const [, codigo, acao] = rotaParceria;
    return responder(res, 200, acao === 'repasse' ? parcerias.repassar(conta, codigo) : parcerias.ativar(conta, codigo, acao === 'recadastrar'));
  }
  const rotaCodigo = caminho.match(/^\/api\/parcerias\/([A-Za-z0-9]{1,30})$/);
  if (rotaCodigo && metodo === 'GET') {
    exigirConta(req);
    return responder(res, 200, parcerias.conferir(rotaCodigo[1]));
  }
  // ---- recompensas de login e doação acumulada (server/src/recompensas.ts) ----
  if (caminho === '/api/recompensas' && metodo === 'GET') return responder(res, 200, recompensas.estado(exigirConta(req)));
  if (caminho === '/api/recompensas/login' && metodo === 'POST') return responder(res, 200, recompensas.registrarLogin(exigirConta(req)));
  if (caminho === '/api/recompensas/recuperar' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, recompensas.recuperar(conta, await lerCorpo(req)));
  }
  if (caminho === '/api/admin/recompensas/doacao' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 200, recompensas.doacaoManual(conta, await lerCorpo(req)));
  }
  // ---- banimentos (server/src/banimentos.ts) ----
  if (caminho === '/api/admin/banimentos' && metodo === 'GET') return responder(res, 200, banimentos.listar(exigirConta(req)));
  if (caminho === '/api/admin/banimentos' && metodo === 'POST') {
    const conta = exigirConta(req);
    return responder(res, 201, banimentos.banir(conta, await lerCorpo(req)));
  }
  const rotaDesbanir = caminho.match(/^\/api\/admin\/banimentos\/([A-Za-z0-9_]{3,16})\/desbanir$/);
  if (rotaDesbanir && metodo === 'POST') return responder(res, 200, banimentos.desbanir(exigirConta(req), rotaDesbanir[1]));

  // ---- ranking com todos os jogadores (server/src/ranking.ts) ----
  if (caminho === '/api/ranking' && metodo === 'GET') {
    exigirConta(req);
    return responder(res, 200, ranking.listar());
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
    return responder(res, 200, { usuario: conta.usuario, online: estaOnline(conta.id), perfil: perfilPublico(JSON.parse(save.dados)), cla: cla.resumoDaConta(conta.id), ranqueado: ranqueado.elosDaConta(conta.id) });
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
    titulo: tituloAtivo(save),
    // selos sazonais (itens de coleção): só os ids que o jogador tem
    selos: save.itens && typeof save.itens === 'object' ? Object.entries(save.itens as Record<string, unknown>).filter(([id, qtd]) => id.startsWith('selo-') && typeof qtd === 'number' && qtd > 0).map(([id]) => id) : [],
    // skin vestida (só se o item ainda está na bolsa); o jogo desenha o retrato com ela
    skinVisual: save.itens && typeof save.itens === 'object' && temSkin(save as unknown as ComSkins, save.skinVisual as string | null) ? save.skinVisual : null,
    mostrarTime,
    time: mostrarTime ? time.map((p) => ({ especieId: p.especieId, nivel: p.nivel, shiny: !!p.shiny })) : [],
  };
}

// ---- site (só em produção, depois de `npm run build`) ----
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
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
cla.consertar();
ligarMundo(servidor);
servidor.listen(PORTA, () => console.log(`Servidor do PokeOrigins em http://localhost:${PORTA}`));
