// Selinhos dos bônus ativos: os ligados pela administração ("Shiny 2x", "XP 2x"…) e os charms usados pelo jogador
// (com a hora em que cada um acaba). Aparecem no cabeçalho e no mapa do bioma.
import { textoBonus, type ChaveBonus } from '../../../shared/bonificacao';
import { charmAte, charmsAtivos, nomeCharm } from '../../../shared/charms';
import { bonificacao } from '../bonificacao';
import { carregarSave } from '../estado';
import { corTipo, el } from './dom';

const CURTOS: Record<ChaveBonus, string> = { silver: 'Poké Dólar', xp: 'XP', shiny: 'Shiny', lendario: 'Lendário' };

/** Um selo por bônus ativo, ou null se não houver nenhum. Só informa, não é clicável. */
export function selosBonus(): HTMLElement | null {
  const b = bonificacao();
  const ativos = (Object.keys(CURTOS) as ChaveBonus[]).filter((k) => b[k] > 1);
  const save = carregarSave();
  const charms = save ? charmsAtivos(save) : [];
  const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const incenso = save?.incensoAte && save.incensoAte > Date.now() ? save.incensoAte : 0;
  if (!ativos.length && !charms.length && !incenso) return null;
  return el(
    'div',
    { class: 'selos-bonus' },
    ...ativos.map((k) => el('span', { class: `selo-bonus bonus-${k}`, title: 'Bônus ligado pela administração' }, `${CURTOS[k]} ${textoBonus(b[k])}`)),
    incenso ? el('span', { class: 'selo-bonus bonus-silver', title: 'Luck Incense usado: +20% de Poké Dólares nas batalhas contra treinadores e ginásios' }, `Luck Incense até ${hora(incenso)}`) : '',
    ...charms.map((t) => el('span', { class: 'selo-bonus bonus-charm', style: { '--cor-tipo': corTipo(t) }, title: `${nomeCharm(t)} usado: +20% de chance de shiny nos Pokémon desse tipo` }, `${nomeCharm(t)} até ${hora(charmAte(save!, t))}`)),
  );
}
