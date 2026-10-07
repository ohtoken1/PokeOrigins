// Telas "em breve": Amigos e Clã (Comunidade), Duelos com treinadores e Ginásios (Jogar).
// Ainda sem funcionar; por enquanto as telas mostram o que vai existir.
import type { Tela } from '../main';
import { el } from '../ui/dom';

export type SecaoComunidade = 'amigos' | 'cla' | 'duelos' | 'ginasios';

const SECOES: Record<SecaoComunidade, { titulo: string; icone: string; texto: string; itens: string[] }> = {
  amigos: {
    titulo: 'Amigos',
    icone: '👥',
    texto: 'Sua lista de amigos ficará aqui.',
    itens: ['Adicionar amigos pelo nome de treinador', 'Ver quem está online e em qual bioma', 'Convidar para batalhas e trocas'],
  },
  cla: {
    titulo: 'Clã',
    icone: '🛡️',
    texto: 'Crie ou entre num clã para jogar em grupo.',
    itens: ['Criar um clã com nome e emblema', 'Membros, cargos e chat do clã', 'Torneios e ranking entre clãs'],
  },
  duelos: {
    titulo: 'Duelos com treinadores',
    icone: '',
    texto: 'Batalhas contra treinadores NPC, com times próprios.',
    itens: ['Treinadores com times e níveis diferentes', 'Recompensas em silver e XP', 'Ganham amizade como nas batalhas selvagens'],
  },
  ginasios: {
    titulo: 'Ginásios',
    icone: '',
    texto: 'Desafie os líderes de ginásio de cada região.',
    itens: ['Líderes com times temáticos por tipo', 'Insígnias ao vencer', 'Recompensas especiais'],
  },
};

export const telaComunidade = (secao: SecaoComunidade): Tela => (raiz) => {
  const s = SECOES[secao];
  raiz.append(
    el(
      'main',
      { class: 'tela tela-comunidade' },
      el('h1', {}, s.titulo),
      el(
        'section',
        { class: 'em-breve' },
        el('span', { class: 'selo-em-breve' }, 'Em breve'),
        el('p', {}, s.texto),
        el('ul', {}, ...s.itens.map((i) => el('li', {}, i))),
        el('small', {}, secao === 'amigos' || secao === 'cla' ? 'Esta parte precisa de contas e do servidor online, que ainda vão ser feitos.' : 'Esta parte ainda vai ser feita.'),
      ),
    ),
  );
};
