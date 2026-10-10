// Selinhos dos bônus ativos: os ligados pela administração ("Shiny 2x", "XP 2x"…) e o Shiny Charm usado pelo jogador
// (com a hora em que acaba). Aparecem no cabeçalho e no mapa do bioma.
import { textoBonus, type ChaveBonus } from '../../../shared/bonificacao';
import { shinyCharmAtivo } from '../../../shared/campo';
import { bonificacao } from '../bonificacao';
import { carregarSave } from '../estado';
import { el } from './dom';

const CURTOS: Record<ChaveBonus, string> = { silver: 'Silver', xp: 'XP', shiny: 'Shiny', lendario: 'Lendário' };

/** Um selo por bônus ativo, ou null se não houver nenhum. Só informa, não é clicável. */
export function selosBonus(): HTMLElement | null {
  const b = bonificacao();
  const ativos = (Object.keys(CURTOS) as ChaveBonus[]).filter((k) => b[k] > 1);
  const save = carregarSave();
  const charm = save && shinyCharmAtivo(save) ? new Date(save.shinyCharmAte!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
  if (!ativos.length && !charm) return null;
  return el(
    'div',
    { class: 'selos-bonus' },
    ...ativos.map((k) => el('span', { class: `selo-bonus bonus-${k}`, title: 'Bônus ligado pela administração' }, `${CURTOS[k]} ${textoBonus(b[k])}`)),
    charm ? el('span', { class: 'selo-bonus bonus-charm', title: 'Shiny Charm usado: +20% de chance de shiny' }, `Shiny Charm até ${charm}`) : null,
  );
}
