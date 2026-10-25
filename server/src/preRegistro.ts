// Pré-registro e whitelist (pedido do dono, 24/10/2026). Com o pré-registro LIGADO, toda conta nova entra na lista
// de pré-registro sem acesso ao jogo: só vê a tela de pré-registro (client/src/telas/preRegistro.ts). A staff libera
// conta por conta em Administração → Whitelist (Closed Beta, parceiros, Founders) ou abre o jogo para todos
// (Open Beta). Contas de antes (sem linha em `pre_registro`) e administradores têm acesso sempre.
// Quando a conta ganha acesso, o Kit de pré-registro chega pelo Correio (uma vez).
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import * as correio from './correio.ts';
import { avisar, derrubar } from './mundo.ts';
import { conferir as conferirCodigo } from './parcerias.ts';
import { KIT_PRE_REGISTRO } from '../../shared/kitPreRegistro.ts';
import { conteudoKitPreRegistro } from '../../shared/premiosEventos.ts';

interface Config { ligado: boolean; aberto: boolean }
/** Padrão: pré-registro ligado e jogo ainda fechado para quem é novo. */
const config = (): Config => ({ ligado: true, aberto: false, ...(banco.lerEvento<Partial<Config>>('pre-registro') ?? {}) });

/** A conta pode jogar? */
export function temAcesso(conta: banco.Conta): boolean {
  if (conta.admin) return true;
  const linha = banco.preRegistroDe(conta.id);
  return !linha || linha.liberada === 1 || config().aberto;
}

/** Rotas que uma conta sem acesso ainda pode chamar (o resto da API responde 403). */
export const ROTAS_SEM_ACESSO = new Set(['/api/eu', '/api/sair', '/api/pre-registro', '/api/pre-registro/eu']);

/** Lê o código de criador do cadastro (opcional). Código digitado errado = erro, para a pessoa corrigir; o que veio
 *  do link de um criador que foi descadastrado depois é só ignorado (a conta é criada sem criador). */
export function lerCodigo(v: unknown, via: 'link' | 'codigo' = 'codigo'): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  if (via === 'link') {
    try {
      return conferirCodigo(v).codigo;
    } catch {
      return null;
    }
  }
  return conferirCodigo(v).codigo;
}

/** Depois de criar a conta: com o pré-registro ligado, ela entra na lista (sem acesso). A primeira conta (dono) não. */
export function aoCadastrar(contaId: number, codigo: string | null): void {
  const conta = banco.contaPorId(contaId);
  if (!conta || conta.admin || !config().ligado) return;
  banco.criarPreRegistro(contaId, codigo);
}

/** Números para a tela pública. */
export const publico = () => ({ total: banco.totalPreRegistro(), ligado: config().ligado, aberto: config().aberto, kit: conteudoKitPreRegistro() });

/** A situação da própria conta (tela de pré-registro). */
export function meu(conta: banco.Conta) {
  const linha = banco.preRegistroDe(conta.id);
  return { preRegistrado: !!linha, acesso: temAcesso(conta), desde: linha?.criada_em ?? conta.criada_em, codigo: linha?.codigo ?? null, ...publico() };
}

/** Manda o Kit de pré-registro (uma vez) a quem já tem acesso e ainda não recebeu. */
function enviarPremios(ids: number[]): void {
  for (const id of ids) {
    const conta = banco.contaPorId(id);
    if (!conta || !temAcesso(conta) || banco.preRegistroDe(id)?.premio_enviado === 1) continue;
    banco.marcarPremioPreRegistro(id);
    correio.enviar(id, 'Recompensa de pré-registro', 'Obrigado por se pré-registrar no PokeOrigins! Aqui está o seu Kit de pré-registro. Abra pela Bolsa.',
      [correio.anexoItem(KIT_PRE_REGISTRO, 'Kit de pré-registro', 1)], 'eventos');
    // quem está com a tela de pré-registro aberta entra no jogo
    avisar(id, { t: 'pre-registro' });
  }
}

// ---------- Administração → Whitelist ----------
const exigirStaff = (conta: banco.Conta) => {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
};

export function listar(conta: banco.Conta) {
  exigirStaff(conta);
  return {
    ...config(),
    contas: banco.listaPreRegistro().map((l) => ({
      usuario: l.usuario, email: l.email, criadaEm: l.criada_em, liberada: l.liberada === 1, codigo: l.codigo, nota: l.nota,
      liberadaEm: l.liberada_em, liberadaPor: l.liberada_por, premio: l.premio_enviado === 1,
    })),
  };
}

const alvo = (usuario: unknown) => {
  const c = typeof usuario === 'string' ? banco.contaPorUsuario(usuario.trim()) : undefined;
  if (!c || !banco.preRegistroDe(c.id)) throw new ErroConta('Conta não está na lista de pré-registro.', 404);
  return c;
};

/** Libera (ou tira) o acesso de uma conta; a anotação e o código de criador também podem mudar. */
export function mudar(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const c = alvo(dados.usuario);
  if (typeof dados.liberada === 'boolean') {
    banco.liberarPreRegistro(c.id, dados.liberada, conta.usuario);
    if (dados.liberada) enviarPremios([c.id]);
    else {
      // tirou o acesso: sai do jogo (entra de novo e cai na tela de pré-registro)
      banco.apagarSessoesDaConta(c.id);
      derrubar(c.id, 4005, 'Pré-registro');
    }
  }
  if (typeof dados.nota === 'string' || dados.codigo !== undefined) {
    const linha = banco.preRegistroDe(c.id)!;
    const nota = typeof dados.nota === 'string' ? dados.nota.trim().slice(0, 200) : linha.nota;
    const codigo = dados.codigo === undefined ? linha.codigo : dados.codigo === null || dados.codigo === '' ? null : conferirCodigo(String(dados.codigo)).codigo;
    banco.anotarPreRegistro(c.id, nota, codigo);
    // o criador da conta também muda nas estatísticas da Parceria
    if (codigo !== linha.codigo) banco.trocarCriadorDaConta(c.id, codigo);
  }
  return listar(conta);
}

/** Liga/desliga o pré-registro (contas novas sem acesso) e abre/fecha o jogo para todos (Open Beta). */
export function configurar(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const c = config();
  if (typeof dados.ligado === 'boolean') c.ligado = dados.ligado;
  if (typeof dados.aberto === 'boolean') c.aberto = dados.aberto;
  banco.gravarEvento('pre-registro', c);
  if (c.aberto) enviarPremios(banco.preRegistrosSemPremio());
  return listar(conta);
}

/** Libera de uma vez todas as contas da lista (ex.: Open Beta sem abrir o cadastro novo). */
export function liberarTodas(conta: banco.Conta) {
  exigirStaff(conta);
  const pendentes = banco.listaPreRegistro().filter((l) => l.liberada !== 1);
  for (const l of pendentes) banco.liberarPreRegistro(l.conta_id, true, conta.usuario);
  enviarPremios(pendentes.map((l) => l.conta_id));
  return listar(conta);
}
