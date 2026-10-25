// Parcerias com criadores de conteúdo (pedido do dono): a administração cadastra os códigos, o valor das doações
// feitas com cada código fica somado, e no fim do mês a equipe faz o repasse ao criador à mão e marca aqui.
// As doações só entram quando o pagamento for ligado: quem chama `registrarDoacao` é o servidor, ao confirmar o
// pagamento (nunca o navegador). Nada é apagado: descadastrar só deixa o código inativo.
// Links (24/10/2026): cada código tem o link /c/CODIGO; o servidor conta os cliques e liga cada conta nova ao criador
// de onde ela veio (`parceria_contas`), para a staff ver quem traz mais jogadores.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { CRIADOR_MAX, lerCodigoParceria, NIVEL_JOGADOR_PARCERIA, type ContaDoCriador, type ParceriaPublica } from '../../shared/parcerias.ts';
import { nivelTreinador, xpTotalParaNivel } from '../../shared/treinador.ts';

function exigirStaff(conta: banco.Conta): void {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
}

/** Meia-noite do dia 1º deste mês, no horário de Brasília (UTC−3). */
function inicioDoMes(agora = Date.now()): number {
  const br = new Date(agora - 3 * 60 * 60 * 1000);
  return Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), 1) + 3 * 60 * 60 * 1000;
}

/** Dia de Brasília ("2026-10-24"). */
const diaDe = (ms = Date.now()) => new Date(ms - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function listar(conta: banco.Conta): { parcerias: ParceriaPublica[] } {
  exigirStaff(conta);
  const mes = inicioDoMes();
  const cliques = new Map(banco.cliquesParcerias(diaDe(mes)).map((c) => [c.codigo, c]));
  const contas = new Map(banco.contasParcerias(mes, xpTotalParaNivel(NIVEL_JOGADOR_PARCERIA)).map((c) => [c.codigo, c]));
  return {
    parcerias: banco.listarParcerias(mes).map((p) => {
      const k = cliques.get(p.codigo);
      const c = contas.get(p.codigo);
      return {
        codigo: p.codigo, criador: p.criador, ativo: !!p.ativo, criadoEm: p.criado_em, usos: p.usos,
        doado: p.doado, doadoNoMes: p.doadoNoPeriodo, repassado: p.repassado, pendente: p.doado - p.repassado, ultimoRepasse: p.ultimoRepasse,
        cliques: k?.total ?? 0, cliquesNoMes: k?.mes ?? 0, contas: c?.total ?? 0, contasNoMes: c?.mes ?? 0, peloLink: c?.peloLink ?? 0, jogadores: c?.jogadores ?? 0,
      };
    }),
  };
}

/** As contas que vieram de um criador, com o nível de treinador de cada uma. */
export function contasDoCodigo(conta: banco.Conta, codigo: string): { contas: ContaDoCriador[] } {
  exigirStaff(conta);
  const c = lerCodigoParceria(codigo);
  if (!c || !banco.parceriaPorCodigo(c)) throw new ErroConta('Código não encontrado.', 404);
  return { contas: banco.contasDoCriador(c).map((x) => ({ usuario: x.usuario, via: x.via, criadaEm: x.criadaEm, nivel: nivelTreinador(Math.max(0, Number(x.xp) || 0)) })) };
}

// cliques: cada pessoa (IP) conta uma vez por dia em cada link
const jaContados = new Set<string>();
let diaContado = '';

/** Alguém abriu o link /c/CODIGO. Devolve o criador (o jogo mostra "Você veio pelo link de…"); código inativo = 404. */
export function clique(codigo: unknown, ip: string): { codigo: string; criador: string } {
  const p = conferir(String(codigo ?? ''));
  const dia = diaDe();
  if (dia !== diaContado) (jaContados.clear(), (diaContado = dia));
  const chave = `${p.codigo}|${ip}`;
  if (!jaContados.has(chave) && jaContados.size < 200_000) {
    jaContados.add(chave);
    banco.contarCliqueParceria(p.codigo, dia);
  }
  return p;
}

/** Conta nova que veio de um criador: fica ligada a ele para sempre (a staff pode mudar pela Whitelist). */
export function ligarConta(contaId: number, codigo: string | null, via: 'link' | 'codigo'): void {
  if (codigo) banco.ligarContaAoCriador(contaId, codigo, via);
}

export function cadastrar(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const codigo = lerCodigoParceria(dados.codigo);
  if (!codigo) throw new ErroConta('O código precisa ter de 3 a 20 letras ou números, sem espaços.');
  const criador = typeof dados.criador === 'string' ? dados.criador.replace(/\p{Cc}|\p{Cf}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, CRIADOR_MAX) : '';
  if (criador.length < 2) throw new ErroConta('Escreva o nome do criador de conteúdo.');
  const existe = banco.parceriaPorCodigo(codigo);
  if (existe) throw new ErroConta(existe.ativo ? `O código ${codigo} já está cadastrado.` : `O código ${codigo} já existe e está descadastrado: use "Recadastrar".`, 409);
  banco.criarParceria(codigo, criador, conta.usuario);
  return listar(conta);
}

/** Descadastrar (inativo) ou recadastrar um código. O histórico continua. */
export function ativar(conta: banco.Conta, codigo: string, ativo: boolean) {
  exigirStaff(conta);
  const c = lerCodigoParceria(codigo);
  if (!c || !banco.ativarParceria(c, ativo)) throw new ErroConta('Código não encontrado.', 404);
  return listar(conta);
}

/** Marca como repassado ao criador tudo o que estava pendente no código. */
export function repassar(conta: banco.Conta, codigo: string) {
  exigirStaff(conta);
  const c = lerCodigoParceria(codigo);
  const p = c ? listar(conta).parcerias.find((x) => x.codigo === c) : undefined;
  if (!p) throw new ErroConta('Código não encontrado.', 404);
  if (p.pendente <= 0) throw new ErroConta('Não há valor pendente de repasse neste código.', 409);
  banco.registrarRepasseParceria(p.codigo, p.pendente, conta.usuario);
  return listar(conta);
}

/** O jogador confere se o código existe antes de doar (só diz se é válido e de quem é). */
export function conferir(codigo: string): { codigo: string; criador: string } {
  const c = lerCodigoParceria(codigo);
  const p = c ? banco.parceriaPorCodigo(c) : undefined;
  if (!p || !p.ativo) throw new ErroConta('Código de criador não encontrado.', 404);
  return { codigo: p.codigo, criador: p.criador };
}

/**
 * Soma uma doação ao código (chamar SÓ quando o pagamento for confirmado pelo serviço de pagamento).
 * Código inválido ou inativo é ignorado: a doação vale do mesmo jeito, só não conta para ninguém.
 */
export function registrarDoacao(codigo: unknown, contaId: number | null, centavos: number): void {
  const c = lerCodigoParceria(codigo);
  const p = c ? banco.parceriaPorCodigo(c) : undefined;
  if (p?.ativo && Number.isInteger(centavos) && centavos > 0) banco.registrarDoacaoParceria(p.codigo, contaId, centavos);
}
