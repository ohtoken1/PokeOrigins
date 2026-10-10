// Telas "em breve": Amigos e Clã (Comunidade), Duelos com treinadores e Ginásios (Jogar).
// Ainda sem funcionar; por enquanto as telas mostram o que vai existir.
import type { Tela } from '../main';
import { el } from '../ui/dom';
import { telaAmigos } from './amigos';
import { telaCla } from './cla';

export type SecaoComunidade = 'amigos' | 'cla' | 'continentes' | 'duelos' | 'ginasios';

const SECOES: Record<SecaoComunidade, { titulo: string; icone: string; texto: string; itens: string[] }> = {
  amigos: {
    titulo: 'Amigos',
    icone: '👥',
    texto: 'Sua lista de amigos ficará aqui.',
    itens: ['Adicionar amigos pelo nome de treinador', 'Ver quem está online e em qual bioma', 'Convidar para batalhas e trocas'],
  },
  cla: {
    titulo: 'Guilda',
    icone: '🛡️',
    texto: 'Crie ou entre numa guilda para jogar em grupo.',
    itens: ['Criar uma guilda com nome e emblema', 'Membros, cargos e chat da guilda', 'Torneios e ranking entre guildas'],
  },
  continentes: {
    titulo: 'Continentes',
    icone: '',
    texto: 'Os continentes do mundo do jogo.',
    itens: ['Viajar entre continentes', 'Regiões e biomas de cada continente', 'Pokémon próprios de cada lugar'],
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

export const telaComunidade = (secao: SecaoComunidade): Tela => secao === 'amigos' ? telaAmigos : secao === 'cla' ? telaCla : (raiz) => {
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
        el('small', {}, 'Esta parte ainda vai ser feita.'),
      ),
    ),
  );
};
