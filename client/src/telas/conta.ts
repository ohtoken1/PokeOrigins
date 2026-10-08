// Aba "Minha conta": Meu perfil, Achievements e Minhas skins (Opções fica no mesmo menu, tela própria).
import type { Tela } from '../main';
import { TODOS_OS_ITENS } from '../../../shared/loja';
import { nivelTreinador } from '../../../shared/treinador';
import { carregarSave, type Save } from '../estado';
import { el } from '../ui/dom';
import { iconeItem } from '../ui/iconeItem';
import { perfilJogador } from './jogadores';

export type SecaoConta = 'perfil' | 'achievements' | 'skins';

/** Conquistas calculadas pelo save (as recompensas vêm depois). */
const ACHIEVEMENTS: { nome: string; descricao: string; meta: number; valor: (s: Save) => number }[] = [
  { nome: 'Primeira captura', descricao: 'Capture seu primeiro Pokémon em batalha.', meta: 1, valor: (s) => s.estatisticas?.capturas ?? 0 },
  { nome: 'Colecionador', descricao: 'Capture 50 Pokémon em batalha.', meta: 50, valor: (s) => s.estatisticas?.capturas ?? 0 },
  { nome: 'Mestre das capturas', descricao: 'Capture 500 Pokémon em batalha.', meta: 500, valor: (s) => s.estatisticas?.capturas ?? 0 },
  { nome: 'Brilho raro', descricao: 'Capture um Pokémon shiny.', meta: 1, valor: (s) => s.estatisticas?.capturasShiny ?? 0 },
  { nome: 'Lenda viva', descricao: 'Capture um lendário, mítico ou Ultra Beast.', meta: 1, valor: (s) => s.estatisticas?.capturasLendarios ?? 0 },
  { nome: 'Pesquisador', descricao: 'Registre 100 espécies capturadas na Pokédex.', meta: 100, valor: (s) => s.capturados.length },
  { nome: 'Time completo', descricao: 'Tenha 6 Pokémon no time.', meta: 6, valor: (s) => s.time.length },
  { nome: 'Treinador experiente', descricao: 'Chegue ao treinador Nv. 10.', meta: 10, valor: (s) => nivelTreinador(s.xpTreinador) },
  { nome: 'Treinador mestre', descricao: 'Chegue ao treinador Nv. 20.', meta: 20, valor: (s) => nivelTreinador(s.xpTreinador) },
  { nome: 'Poupança', descricao: 'Junte 100.000 silver.', meta: 100_000, valor: (s) => s.silver },
];

function achievements(save: Save): HTMLElement {
  const feitos = ACHIEVEMENTS.filter((a) => a.valor(save) >= a.meta).length;
  return el(
    'section',
    { class: 'conta-secao' },
    el('p', { class: 'sub' }, `${feitos} de ${ACHIEVEMENTS.length} concluídos · recompensas em breve`),
    el('div', { class: 'lista-achievements' },
      ...ACHIEVEMENTS.map((a) => {
        const v = Math.min(a.meta, a.valor(save));
        const feito = v >= a.meta;
        return el('div', { class: `achievement ${feito ? 'feito' : ''}` },
          el('span', { class: 'achievement-selo' }, feito ? '★' : ''),
          el('div', { class: 'achievement-texto' },
            el('strong', {}, a.nome),
            el('small', {}, a.descricao),
            el('div', { class: 'barra-exp' }, el('div', { class: 'preenchido', style: { width: `${(v / a.meta) * 100}%` } }))),
          el('span', { class: 'achievement-progresso' }, feito ? 'Concluído' : `${v.toLocaleString('pt-BR')} / ${a.meta.toLocaleString('pt-BR')}`));
      })),
  );
}

/** Minhas skins: as skins que o jogador tem (os tickets mandam as skins para cá, não para a bolsa). */
function skins(save: Save): HTMLElement {
  const minhas = TODOS_OS_ITENS.filter((i) => i.categoria === 'skins' && (save.itens[i.id] ?? 0) > 0);
  return el(
    'section',
    { class: 'conta-secao' },
    el('p', { class: 'sub' }, 'Visuais especiais dos seus Pokémon. Usar as skins vem em breve.'),
    minhas.length
      ? el('div', { class: 'grade-skins' },
          ...minhas.map((i) => el('div', { class: 'cartao-skin' }, iconeItem(i), el('strong', {}, i.nome), el('small', {}, `×${save.itens[i.id]}`))))
      : el('p', { class: 'meta' }, 'Você ainda não tem nenhuma skin. Elas saem no lendário dos tickets.'),
  );
}

export const telaConta = (secao: SecaoConta): Tela => (raiz, navegar) => {
  const save = carregarSave();
  const titulos: Record<SecaoConta, string> = { perfil: 'Meu perfil', achievements: 'Achievements', skins: 'Minhas skins' };
  const tela = el('main', { class: 'tela tela-conta' }, el('h1', {}, titulos[secao]));
  raiz.append(tela);
  if (!save) {
    tela.append(el('p', { class: 'sub' }, 'Comece um jogo para ver sua conta.'), el('button', { class: 'botao', onclick: () => navegar({ tela: 'inicial' }) }, 'Começar'));
    return;
  }
  if (secao === 'perfil')
    tela.append(perfilJogador(save), el('div', { class: 'conta-botoes' }, el('button', { class: 'botao secundario', onclick: () => navegar({ tela: 'personagem' }) }, 'Editar personagem')));
  else if (secao === 'achievements') tela.append(achievements(save));
  else tela.append(skins(save));
};
