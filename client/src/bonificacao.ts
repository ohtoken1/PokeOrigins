// Bonificação ativa (guardada no navegador até existir servidor) e conta de administrador.
import { BONIFICACAO_PADRAO, valorBonus, type Bonificacao, type ChaveBonus } from '../../shared/bonificacao';
import type { AjustesEncontro } from '../../shared/encontros';
import { bonusVip, vipAtivo } from '../../shared/vip';
import { carregarSave } from './estado';
import { conta } from './conta';

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

/** O que um bônus de chance afeta: shiny, lendários (+ míticos e Ultra Beasts) ou iniciais soltos. */
export type AlvoChance = 'shiny' | 'lendario' | 'inicial';

/** Uma fonte de bônus nas chances de encontro (aparece como selo na Pokédex). */
export interface FonteBonus {
  /** classe do selo: bonificacao, vip, skin… */
  id: 'bonificacao' | 'vip' | 'skin';
  nome: string;
  alvo: AlvoChance;
  /** multiplicador (1,2 = +20%) */
  mult: number;
}

/**
 * Todas as fontes de bônus de chance ativas agora. É daqui que sai a conta (comBonificacao) e os selos da Pokédex:
 * mecânica nova (ex.: skins) entra só nesta lista.
 */
export function fontesDeBonus(): FonteBonus[] {
  const fontes: FonteBonus[] = [];
  const b = bonificacao();
  if (b.shiny > 1) fontes.push({ id: 'bonificacao', nome: 'Bonificação', alvo: 'shiny', mult: b.shiny });
  if (b.lendario > 1) fontes.push({ id: 'bonificacao', nome: 'Bonificação', alvo: 'lendario', mult: b.lendario });
  const save = carregarSave();
  if (save && vipAtivo(save)) {
    fontes.push({ id: 'vip', nome: 'VIP', alvo: 'shiny', mult: bonusVip(save, 'shiny') });
    fontes.push({ id: 'vip', nome: 'VIP', alvo: 'lendario', mult: bonusVip(save, 'raros') });
    fontes.push({ id: 'vip', nome: 'VIP', alvo: 'inicial', mult: bonusVip(save, 'raros') });
  }
  // futuro: skins equipadas (id 'skin') entram aqui
  return fontes.filter((f) => f.mult !== 1);
}

/** Multiplicador total de um alvo (produto das fontes). */
export const multiplicadorDe = (alvo: AlvoChance, fontes = fontesDeBonus()) => fontes.filter((f) => f.alvo === alvo).reduce((m, f) => m * f.mult, 1);

/** "+20%", "+100%", "−50%". */
export const textoMult = (mult: number) => `${mult >= 1 ? '+' : '−'}${Math.round(Math.abs(mult - 1) * 100)}%`;

/** Ajustes de encontro (do painel Admin) com todos os bônus de chance aplicados (bonificação, VIP…). */
export function comBonificacao(a: AjustesEncontro): AjustesEncontro {
  const fontes = fontesDeBonus();
  return {
    ...a,
    chanceShiny: Math.min(1, a.chanceShiny * multiplicadorDe('shiny', fontes)),
    multLendario: a.multLendario * multiplicadorDe('lendario', fontes),
    multInicial: (a.multInicial ?? 1) * multiplicadorDe('inicial', fontes),
  };
}

/** A conta logada é de administrador? Vem do servidor (a primeira conta criada é; outras pelo `npm run admin`). */
export const ehAdministrador = (): boolean => !!conta()?.admin;
