// Bonificação ativa (guardada no navegador até existir servidor) e conta de administrador.
import { BONIFICACAO_PADRAO, valorBonus, type Bonificacao, type ChaveBonus } from '../../shared/bonificacao';
import type { AjustesEncontro } from '../../shared/encontros';

const CHAVE = 'jogo-claude:bonificacao';

export function bonificacao(): Bonificacao {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? '{}');
    return { silver: valorBonus(salvo.silver), xp: valorBonus(salvo.xp), shiny: valorBonus(salvo.shiny), lendario: valorBonus(salvo.lendario) };
  } catch {
    return { ...BONIFICACAO_PADRAO };
  }
}

export function definirBonus(chave: ChaveBonus, valor: number): void {
  const atual = { ...bonificacao(), [chave]: valorBonus(valor) };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    /* sem armazenamento: não guarda */
  }
}

/** Ajustes de encontro com a bonificação de shiny e de lendário aplicada. */
export function comBonificacao(a: AjustesEncontro): AjustesEncontro {
  const b = bonificacao();
  return { ...a, chanceShiny: Math.min(1, a.chanceShiny * b.shiny), multLendario: a.multLendario * b.lendario };
}

/**
 * A conta é de administrador? Sem sistema de contas ainda, todo mundo é (pedido do dono, para testar).
 * Quando houver contas, isto vem do servidor.
 */
export const ehAdministrador = (): boolean => true;
