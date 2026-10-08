// Selinhos dos bônus ligados pela administração ("Shiny 2x", "XP 2x"…): no cabeçalho e no mapa do bioma.
import { textoBonus, type ChaveBonus } from '../../../shared/bonificacao';
import { bonificacao } from '../bonificacao';
import { el } from './dom';

const CURTOS: Record<ChaveBonus, string> = { silver: 'Silver', xp: 'XP', shiny: 'Shiny', lendario: 'Lendário' };

/** Um selo por bônus ativo (acima de 1x), ou null se não houver nenhum. Só informa, não é clicável. */
export function selosBonus(): HTMLElement | null {
  const b = bonificacao();
  const ativos = (Object.keys(CURTOS) as ChaveBonus[]).filter((k) => b[k] > 1);
  if (!ativos.length) return null;
  return el(
    'div',
    { class: 'selos-bonus', title: 'Bônus ativos (ligados pela administração)' },
    ...ativos.map((k) => el('span', { class: `selo-bonus bonus-${k}` }, `${CURTOS[k]} ${textoBonus(b[k])}`)),
  );
}
