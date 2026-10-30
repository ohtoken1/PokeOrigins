// Banco da cidade: compra e venda de gold com silver. O SERVIDOR faz a conta no save guardado (o jogo salva antes
// de pedir): confere o saldo, tira de uma moeda e põe na outra na mesma mudança, para um clique duplo ou duas
// abas nunca trocarem o mesmo saldo duas vezes.
//
// O banco tem um COFRE próprio e não cria moeda (pedido do dono): só entrega o que tem guardado, e o que o jogador
// paga fica no cofre. Vender 100 gold com o cofre em 1000 silver / 0 gold → cofre com 900 silver / 100 gold.
// Sem a moeda pedida no cofre, a troca não acontece. O saldo do jogador e o do cofre mudam juntos (tudo ou nada).
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisarTodos } from './mundo.ts';
import { contar } from './dashboard.ts';
import { CAMBIO_MAX_POR_VEZ, COFRE_GOLD_INICIAL, COFRE_MAXIMO, COFRE_SILVER_INICIAL, silverDaOperacao } from '../../shared/cambio.ts';

banco.garantirCofre(COFRE_SILVER_INICIAL, COFRE_GOLD_INICIAL);

/** Saldo como está no save: número inteiro, nunca negativo (qualquer outra coisa vale 0). */
const saldo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/** O que o banco tem guardado agora (todos os jogadores veem). */
export const cofre = () => banco.lerCofre();

export function trocar(conta: banco.Conta, dados: Record<string, unknown>) {
  // banco fechado para jogadores comuns até a economia abrir (decisão do dono)
  const { operacao, quantidade } = dados;
  if (operacao !== 'comprar' && operacao !== 'vender') throw new ErroConta('Operação inválida.');
  if (!Number.isSafeInteger(quantidade) || (quantidade as number) < 1) throw new ErroConta('Quantidade inválida.');
  const gold = quantidade as number;
  if (gold > CAMBIO_MAX_POR_VEZ) throw new ErroConta(`No máximo ${CAMBIO_MAX_POR_VEZ.toLocaleString('pt-BR')} Origin Coins por vez.`);
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada antes de usar o banco.');
  const silver = silverDaOperacao(operacao, gold);
  // sinal de cada moeda para o JOGADOR; o cofre recebe o contrário
  const mudaSilver = operacao === 'comprar' ? -silver : silver;
  const mudaGold = operacao === 'comprar' ? gold : -gold;
  banco.mudarSaves([conta.id], ([save]) => {
    const novoSilver = saldo(save.silver) + mudaSilver;
    const novoGold = saldo(save.gold) + mudaGold;
    if (novoSilver < 0) throw new ErroConta('Você não tem Poké Dólares suficientes.');
    if (novoGold < 0) throw new ErroConta('Você não tem Origin Coins suficientes.');
    const guardado = banco.lerCofre();
    const cofreSilver = guardado.silver - mudaSilver;
    const cofreGold = guardado.gold - mudaGold;
    if (cofreGold < 0) throw new ErroConta(guardado.gold ? `O banco só tem ${guardado.gold.toLocaleString('pt-BR')} Origin Coins agora.` : 'O banco está sem Origin Coins agora. Ele só tem os Origin Coins que os jogadores venderam para ele.', 409);
    if (cofreSilver < 0) throw new ErroConta(guardado.silver ? `O banco só tem ${guardado.silver.toLocaleString('pt-BR')} Poké Dólares agora.` : 'O banco está sem Poké Dólares agora.', 409);
    if (![novoSilver, novoGold, cofreSilver, cofreGold].every(Number.isSafeInteger)) throw new ErroConta('Valor grande demais.');
    save.silver = novoSilver;
    save.gold = novoGold;
    banco.mudarCofre(cofreSilver, cofreGold);
  });
  contar('cambio-trocas', 1, conta);
  const agora = banco.lerCofre();
  // quem está com o banco aberto vê o cofre mudar
  avisarTodos({ t: 'cofre', cofre: agora });
  // devolve o save já mudado (o jogo troca o dele por este)
  const guardado = banco.lerSave(conta.id)!;
  return { save: JSON.parse(guardado.dados), versao: guardado.versao, cofre: agora };
}

// ---- Administração → Banco (pedido do dono): a staff vê e muda o que o cofre tem; cada mudança fica no histórico ----
const CHAVE_HISTORICO = 'historico-cofre';
const NO_HISTORICO = 100;
type RegistroCofre = { quando: number; por: string; antes: { silver: number; gold: number }; depois: { silver: number; gold: number } };

function exigirStaff(conta: banco.Conta): void {
  if (!conta.admin) throw new ErroConta('Só administradores.', 403);
}

export function verCofreStaff(conta: banco.Conta) {
  exigirStaff(conta);
  return { cofre: banco.lerCofre(), historico: (banco.lerEvento<RegistroCofre[]>(CHAVE_HISTORICO) ?? []).slice(-NO_HISTORICO).reverse() };
}

export function definirCofre(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const { silver, gold } = dados;
  const valido = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= COFRE_MAXIMO;
  if (!valido(silver) || !valido(gold)) throw new ErroConta(`Valores inválidos: números inteiros de 0 a ${COFRE_MAXIMO.toLocaleString('pt-BR')}.`);
  const antes = banco.lerCofre();
  banco.mudarCofre(silver as number, gold as number);
  const historico = banco.lerEvento<RegistroCofre[]>(CHAVE_HISTORICO) ?? [];
  historico.push({ quando: Date.now(), por: conta.usuario, antes, depois: banco.lerCofre() });
  banco.gravarEvento(CHAVE_HISTORICO, historico.slice(-NO_HISTORICO));
  avisarTodos({ t: 'cofre', cofre: banco.lerCofre() });
  return verCofreStaff(conta);
}
