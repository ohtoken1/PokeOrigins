// Administração → Administradores: dar ou tirar o ADM de outras contas pelo jogo (pedido do dono), protegido por uma
// SENHA DA ADMINISTRAÇÃO, separada da senha da conta. A primeira senha digitada ali vira a senha permanente (guardada
// só como hash scrypt em eventos_estado, como as senhas das contas) e não muda mais pelo jogo.
// Regras: ninguém mexe no próprio ADM nem no da primeira conta administradora (a do dono); senha errada 5 vezes
// trava a conta por 15 min; toda mudança fica no histórico (nunca apagado, só os 200 últimos aparecem).
import * as banco from './banco.ts';
import { ErroConta, hashSenha, senhaConfere } from './contas.ts';

const CHAVE_SENHA = 'senha-administracao';
const CHAVE_HISTORICO = 'historico-administradores';
const SENHA_MIN = 8;
const SENHA_MAX = 100;
const ERROS_MAX = 5;
const TRAVA_MS = 15 * 60 * 1000;
const NO_HISTORICO = 200;

type SenhaGuardada = { hash: string; definidaEm: number; por: string };
type Registro = { quando: number; por: string; usuario: string; admin: boolean };

/** Senhas erradas por conta (memória: zera se o servidor reiniciar). */
const erros = new Map<number, { n: number; desde: number }>();

function exigirStaff(conta: banco.Conta): void {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
}

/** A conta do dono: a primeira administradora (menor id). Ninguém tira o ADM dela pelo jogo. */
const contaDoDono = () => banco.listarAdmins()[0]?.id ?? null;

export function listar(conta: banco.Conta) {
  exigirStaff(conta);
  const dono = contaDoDono();
  return {
    senhaDefinida: !!banco.lerEvento<SenhaGuardada>(CHAVE_SENHA),
    administradores: banco.listarAdmins().map((a) => ({ usuario: a.usuario, criadaEm: a.criada_em, dono: a.id === dono, eu: a.id === conta.id })),
    historico: (banco.lerEvento<Registro[]>(CHAVE_HISTORICO) ?? []).slice(-NO_HISTORICO).reverse(),
  };
}

export async function mudar(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const travada = erros.get(conta.id);
  if (travada && travada.n >= ERROS_MAX && Date.now() - travada.desde < TRAVA_MS)
    throw new ErroConta('Senha da administração errada muitas vezes. Espere 15 minutos.', 429);

  const senha = typeof dados.senha === 'string' ? dados.senha : '';
  if (senha.length < SENHA_MIN || senha.length > SENHA_MAX) throw new ErroConta(`A senha da administração precisa ter de ${SENHA_MIN} a ${SENHA_MAX} letras.`);
  const alvo = typeof dados.usuario === 'string' ? banco.contaPorUsuario(dados.usuario.trim()) : undefined;
  if (!alvo) throw new ErroConta('Conta não encontrada.', 404);
  const admin = dados.admin === true;
  if (alvo.id === conta.id) throw new ErroConta('Você não pode mudar o seu próprio ADM.', 403);
  if (!admin && alvo.id === contaDoDono()) throw new ErroConta('A conta do dono não pode perder o ADM pelo jogo.', 403);
  if (!!alvo.admin === admin) throw new ErroConta(admin ? `${alvo.usuario} já é administrador.` : `${alvo.usuario} não é administrador.`, 409);

  const guardada = banco.lerEvento<SenhaGuardada>(CHAVE_SENHA);
  if (guardada) {
    if (!(await senhaConfere(senha, guardada.hash))) {
      const e = travada && Date.now() - travada.desde < TRAVA_MS ? travada : { n: 0, desde: Date.now() };
      e.n++;
      erros.set(conta.id, e);
      throw new ErroConta(`Senha da administração errada (${e.n} de ${ERROS_MAX}).`, 403);
    }
  } else {
    // primeira vez: esta senha passa a ser a senha permanente da administração
    banco.gravarEvento(CHAVE_SENHA, { hash: await hashSenha(senha), definidaEm: Date.now(), por: conta.usuario } satisfies SenhaGuardada);
  }
  erros.delete(conta.id);

  banco.definirAdmin(alvo.usuario, admin);
  // quem perdeu o ADM sai das sessões abertas (entra de novo já como conta comum)
  if (!admin) banco.apagarSessoesDaConta(alvo.id);
  const historico = banco.lerEvento<Registro[]>(CHAVE_HISTORICO) ?? [];
  historico.push({ quando: Date.now(), por: conta.usuario, usuario: alvo.usuario, admin });
  banco.gravarEvento(CHAVE_HISTORICO, historico);
  return { ...listar(conta), senhaCriada: !guardada };
}
