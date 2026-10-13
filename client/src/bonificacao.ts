// Bonificação ativa (guardada no navegador até existir servidor) e conta de administrador.
import { BONIFICACAO_PADRAO, valorBonus, type Bonificacao, type ChaveBonus } from '../../shared/bonificacao';
import type { AjustesEncontro } from '../../shared/encontros';
import { bonusVip, vipAtivo } from '../../shared/vip';
import { bonusAtivoDaSkin } from '../../shared/skins';
import { MULT_CHARM, charmsAtivos, multShinyDosCharms, nomeCharm } from '../../shared/charms';
import { bonusDasConquistas, multTitulo } from '../../shared/conquistas';
import { carregarSave } from './estado';
import { conta } from './conta';
import { bonusDaMinhaGuilda } from './cla';

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
  id: 'bonificacao' | 'vip' | 'skin' | 'charm' | 'conquistas' | 'guilda' | 'titulo';
  nome: string;
  alvo: AlvoChance;
  /** multiplicador (1,2 = +20%) */
  mult: number;
}

/**
 * Todas as fontes de bônus de chance ativas agora. É daqui que sai a conta (comBonificacao) e os selos da Pokédex:
 * mecânica nova (ex.: skins) entra só nesta lista. Com `tipos` (os de um Pokémon), entra também o charm ativo de
 * um dos tipos dele (o charm só vale para o tipo; a conta fica em `multShinyPorTipo`).
 */
export function fontesDeBonus(tipos?: string[]): FonteBonus[] {
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
  // skin escolhida como bônus
  if (save) {
    const skins = bonusAtivoDaSkin(save);
    fontes.push({ id: 'skin', nome: 'Skin', alvo: 'shiny', mult: 1 + skins.shiny });
    fontes.push({ id: 'skin', nome: 'Skin', alvo: 'lendario', mult: 1 + skins.raros });
    fontes.push({ id: 'skin', nome: 'Skin', alvo: 'inicial', mult: 1 + skins.raros });
  }
  // bônus permanentes das conquistas concluídas
  if (save) {
    const mult = 1 + bonusDasConquistas(save).raros;
    for (const alvo of ['shiny', 'lendario', 'inicial'] as const) fontes.push({ id: 'conquistas', nome: 'Conquistas', alvo, mult });
  }
  // título em uso: o mesmo bônus em tudo
  if (save) for (const alvo of ['shiny', 'lendario', 'inicial'] as const) fontes.push({ id: 'titulo', nome: 'Título', alvo, mult: multTitulo(save) });
  // nível da guilda: vale para todos os membros
  const guilda = bonusDaMinhaGuilda();
  fontes.push({ id: 'guilda', nome: 'Guilda', alvo: 'shiny', mult: 1 + guilda.shiny });
  fontes.push({ id: 'guilda', nome: 'Guilda', alvo: 'lendario', mult: 1 + guilda.raros });
  fontes.push({ id: 'guilda', nome: 'Guilda', alvo: 'inicial', mult: 1 + guilda.raros });
  // charm do tipo deste Pokémon (30 minutos); com dois tipos e dois charms, vale um só
  const charm = save && tipos ? charmsAtivos(save).find((t) => tipos.includes(t)) : undefined;
  if (charm) fontes.push({ id: 'charm', nome: nomeCharm(charm), alvo: 'shiny', mult: MULT_CHARM });
  return fontes.filter((f) => f.mult !== 1);
}

/** Multiplicador total de um alvo (produto das fontes). */
export const multiplicadorDe = (alvo: AlvoChance, fontes = fontesDeBonus()) => fontes.filter((f) => f.alvo === alvo).reduce((m, f) => m * f.mult, 1);

/** Soma dos bônus de shiny do jogador (0,59 = +59%), sem a Bonificação da staff e sem o charm. */
export const somaDoShiny = (fontes = fontesDeBonus()) => fontes.filter((f) => f.alvo === 'shiny' && f.id !== 'bonificacao' && f.id !== 'charm').reduce((s, f) => s + (f.mult - 1), 0);

/** "+20%", "+100%", "−50%". */
export const textoMult = (mult: number) => `${mult >= 1 ? '+' : '−'}${Math.round(Math.abs(mult - 1) * 100)}%`;

/** Ajustes de encontro (do painel Admin) com todos os bônus de chance aplicados (bonificação, VIP…). */
export function comBonificacao(a: AjustesEncontro): AjustesEncontro {
  const fontes = fontesDeBonus();
  const save = carregarSave();
  // SHINY (regra do dono): os bônus do jogador SOMAM entre si (VIP 20% + skin 10% + … = 59%, não 73%); o charm do
  // tipo entra na mesma soma (por isso o multiplicador por tipo é "quanto falta" para chegar em soma + charm);
  // só a Bonificação da staff multiplica por cima. Lendários, iniciais, silver e XP continuam multiplicando.
  const daStaff = fontes.filter((f) => f.id === 'bonificacao');
  const somaShiny = somaDoShiny(fontes);
  return {
    ...a,
    multShinyPorTipo: Object.fromEntries(Object.entries(save ? multShinyDosCharms(save) : {}).map(([tipo, mult]) => [tipo, (1 + somaShiny + (mult - 1)) / (1 + somaShiny)])),
    chanceShiny: Math.min(1, a.chanceShiny * (1 + somaShiny) * multiplicadorDe('shiny', daStaff)),
    multLendario: a.multLendario * multiplicadorDe('lendario', fontes),
    multInicial: (a.multInicial ?? 1) * multiplicadorDe('inicial', fontes),
  };
}

/** Total de cada bônus do jogador AGORA, como multiplicador (1,59 = +59%). As mesmas contas da batalha e dos encontros. */
export interface BonusAtuais {
  shiny: number;
  lendario: number;
  inicial: number;
  silver: number;
  xp: number;
  captura: number;
}
/**
 * `comMais` = como ficaria com mais um bônus de conquista (a recompensa de uma conquista ainda não concluída): os
 * bônus das conquistas somam entre si, então o novo entra na soma delas (e, no shiny, na soma geral).
 */
export function bonusAtuais(comMais?: { alvo: 'silver' | 'raros' | 'captura'; valor: number }): BonusAtuais {
  const mais = (alvo: 'silver' | 'raros' | 'captura') => (comMais?.alvo === alvo ? comMais.valor : 0);
  const fontes = fontesDeBonus();
  const save = carregarSave();
  const staff = bonificacao();
  const guilda = bonusDaMinhaGuilda();
  const titulo = save ? multTitulo(save) : 1;
  const skin = save ? bonusAtivoDaSkin(save) : { silver: 0, xp: 0, captura: 0 };
  const conquistas = save ? bonusDasConquistas(save) : { silver: 0, raros: 0, captura: 0 };
  // troca a parte das conquistas pela parte "com mais um"
  const comMaisRaros = (mult: number) => (mult / (1 + conquistas.raros)) * (1 + conquistas.raros + mais('raros'));
  const vip = (chave: 'silver' | 'xpPokemon' | 'captura') => (save ? bonusVip(save, chave) : 1);
  return {
    // shiny: os bônus do jogador somam e só a Bonificação da staff multiplica (ver comBonificacao)
    shiny: (1 + somaDoShiny(fontes) + mais('raros')) * multiplicadorDe('shiny', fontes.filter((f) => f.id === 'bonificacao')),
    lendario: comMaisRaros(multiplicadorDe('lendario', fontes)),
    inicial: comMaisRaros(multiplicadorDe('inicial', fontes)),
    silver: vip('silver') * staff.silver * (1 + skin.silver) * (1 + conquistas.silver + mais('silver')) * titulo * (1 + guilda.silver),
    xp: vip('xpPokemon') * staff.xp * (1 + skin.xp) * titulo * (1 + guilda.xp),
    captura: vip('captura') * (1 + skin.captura) * (1 + conquistas.captura + mais('captura')),
  };
}

/** A conta logada é de administrador? Vem do servidor (a primeira conta criada é; outras pelo `npm run admin`). */
export const ehAdministrador = (): boolean => !!conta()?.admin;
