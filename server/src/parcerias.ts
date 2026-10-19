// Parcerias com criadores de conteúdo (pedido do dono): a administração cadastra os códigos, o valor das doações
// feitas com cada código fica somado, e no fim do mês a equipe faz o repasse ao criador à mão e marca aqui.
// As doações só entram quando o pagamento for ligado: quem chama `registrarDoacao` é o servidor, ao confirmar o
// pagamento (nunca o navegador). Nada é apagado: descadastrar só deixa o código inativo.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { CRIADOR_MAX, lerCodigoParceria, type ParceriaPublica } from '../../shared/parcerias.ts';

function exigirStaff(conta: banco.Conta): void {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
}

/** Meia-noite do dia 1º deste mês, no horário de Brasília (UTC−3). */
function inicioDoMes(agora = Date.now()): number {
  const br = new Date(agora - 3 * 60 * 60 * 1000);
  return Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), 1) + 3 * 60 * 60 * 1000;
}

export function listar(conta: banco.Conta): { parcerias: ParceriaPublica[] } {
  exigirStaff(conta);
  return {
    parcerias: banco.listarParcerias(inicioDoMes()).map((p) => ({
      codigo: p.codigo, criador: p.criador, ativo: !!p.ativo, criadoEm: p.criado_em, usos: p.usos,
      doado: p.doado, doadoNoMes: p.doadoNoPeriodo, repassado: p.repassado, pendente: p.doado - p.repassado, ultimoRepasse: p.ultimoRepasse,
    })),
  };
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
