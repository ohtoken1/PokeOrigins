// Balão do título (perfil e lista de títulos): cada título tem a cor do tema dele e um acabamento pelo grau.
// Pedido do dono: título mais difícil = balão mais bonito ("Líder de guilda" mais que "Membro de guilda").
import { TITULOS } from '../../../shared/conquistas';
import { el } from './dom';

/** Tema = a cor; grau = o acabamento (1 liso, 2 degradê, 3 com brilho em volta, 4 com reflexo passando). */
interface VisualTitulo {
  tema: 'guilda' | 'riqueza' | 'shiny' | 'mitico';
  grau: 1 | 2 | 3 | 4;
  simbolo: string;
}

/** Por id da conquista que libera o título. Título novo: acrescentar aqui (sem entrada = balão dourado simples). */
const VISUAIS: Record<string, VisualTitulo> = {
  'guilda-entrar': { tema: 'guilda', grau: 1, simbolo: '🛡️' },
  'guilda-criar': { tema: 'guilda', grau: 3, simbolo: '👑' },
  'gold-500': { tema: 'riqueza', grau: 1, simbolo: '💼' },
  'gold-1000': { tema: 'riqueza', grau: 2, simbolo: '🎩' },
  'gold-10000': { tema: 'riqueza', grau: 4, simbolo: '💎' },
  'lendario-shiny': { tema: 'shiny', grau: 4, simbolo: '✨' },
  'ticket-mitico': { tema: 'mitico', grau: 4, simbolo: '🎰' },
};
const PADRAO: VisualTitulo = { tema: 'riqueza', grau: 2, simbolo: '🏅' };

/** O balão de um título, pelo nome (é o que o servidor manda no perfil dos outros) ou pelo id da conquista. */
export function balaoTitulo(nomeOuId: string): HTMLElement {
  const t = TITULOS.find((x) => x.id === nomeOuId || x.nome === nomeOuId);
  const v = (t && VISUAIS[t.id]) ?? PADRAO;
  return el('span', { class: `balao-titulo tema-${v.tema} grau-${v.grau}`, title: 'Título' },
    el('span', { class: 'balao-simbolo', 'aria-hidden': 'true' }, v.simbolo),
    el('span', { class: 'balao-nome' }, t?.nome ?? nomeOuId));
}
