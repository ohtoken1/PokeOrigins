// "Lugares da cidade" (pedido do dono, 24/10/2026): uma setinha na beira do mapa da cidade abre uma aba por cima do
// jogo com o nome de cada lugar e NPC; passar o mouse mostra, resumido, o que ele faz (a dica do jogo, pelo `title`).
// Clicar no nome faz o personagem andar até lá (o mesmo do minimapa). Aberta/fechada fica guardado no navegador.
import { NIVEL_MINIMO, type ConteudoTrancado } from '../../../shared/trancas';
import { conteudoLiberado } from '../trancas';
import { el } from './dom';
import { icone, type NomeIcone } from './icones';

interface Lugar {
  acao: string;
  icone: NomeIcone;
  nome: string;
  texto: string;
  tranca?: ConteudoTrancado;
  /** false = não dá para andar até lá pelo nome (a gaiola do Boss só tem alvo quando há Boss) */
  andar?: boolean;
}

const LUGARES: Lugar[] = [
  { acao: 'centro', icone: 'coracao', nome: 'Centro Pokémon', texto: 'Cura o seu time de graça.' },
  { acao: 'loja', icone: 'loja', nome: 'Pokémarket', texto: 'Compra Pokébolas, remédios, itens de batalha e TMs. Tem também a Loja do dia e a aba Premium.' },
  { acao: 'arena', icone: 'estadio', nome: 'Arena', texto: 'Ginásios, Duelos com treinadores, Torneio, PvP Ranqueado e Liga Pokémon.' },
  { acao: 'mapas', icone: 'mapa', nome: 'Saída para os mapas', texto: 'Leva aos biomas da região, onde você caça e captura Pokémon.' },
  { acao: 'estacao', icone: 'trem', nome: 'Estação de trem', texto: 'Viaja para as outras regiões. Com um Pokémon que sabe Fly ou Surf, a viagem é de graça.' },
  { acao: 'banco', icone: 'banco', nome: 'Banco', texto: 'Troca Poké Dólares por Origin Coins e Origin Coins por Poké Dólares.' },
  { acao: 'reminder', icone: 'livro', nome: 'Move Reminder', texto: 'Ensina de novo os golpes que o Pokémon já aprendeu.' },
  { acao: 'tutor', icone: 'livros', nome: 'Move Tutor', texto: 'Ensina golpes de tutor que o Pokémon não aprende subindo de nível.' },
  { acao: 'mural', icone: 'jornal', nome: 'Mural de anúncios', texto: 'Novidades e avisos da equipe do jogo.' },
  { acao: 'missoes', icone: 'prancheta', nome: 'Quadro de missões', texto: 'Missões novas a cada 2 horas: mostre um Pokémon com o que a missão pede e ganhe Origin Coins. Cada missão vale para um jogador só.' },
  { acao: 'eventos', icone: 'tenda', nome: 'Eventos', texto: 'Expedição, Ninho, Evento de captura, Cofre e Loteria.' },
  { acao: 'viajante', icone: 'ampulheta', nome: 'Viajante do tempo', texto: 'Vende Cubos de Pokémon do passado e do futuro e a Chave Temporal, pagos em Fragmentos Temporais.' },
  { acao: 'craft', icone: 'martelo', nome: 'Artesã', texto: 'Canteiros para plantar Berries e Apricorns, e craft de Pokébolas especiais e Charms.', tranca: 'canteiros' },
  { acao: 'mercadonegro', icone: 'oculos', nome: 'Mercado negro', texto: 'Compra e venda de Pokémon, itens e Origin Coins entre os jogadores.', tranca: 'mercadoNegro' },
  { acao: 'creche', icone: 'ovo', nome: 'Daycare', texto: 'Deixe um casal de Pokémon e, com o tempo, pode sair um ovo. Também choca ovos para você.', tranca: 'creche' },
  { acao: 'suspeito', icone: 'chapeu', nome: 'Homem Suspeito', texto: 'Reseta EVs, nível e evolução dos seus Pokémon e separa fusões, por um preço.', tranca: 'suspeito' },
  { acao: 'guildas', icone: 'guilda', nome: 'Guildas', texto: 'Entre numa guilda ou crie a sua: a guilda sobe de nível e dá bônus para todos os membros.', tranca: 'guilda' },
  { acao: 'safari', icone: 'folha', nome: 'Safari', texto: 'Escolha um tipo e passe por três salas de Pokémon com IVs altos; shiny e raros aparecem muito mais.', tranca: 'safari' },
  { acao: 'boss', icone: 'caveira', nome: 'Gaiola do Boss', texto: 'Quando a equipe solta um Boss, ele fica aqui por 2 horas. Cada treinador luta uma vez.', tranca: 'boss', andar: false },
  { acao: 'sazonal', icone: 'floco', nome: 'Evento sazonal', texto: 'Abre nos eventos de época, como Natal e Halloween.' },
];

const CHAVE = 'jogo-claude:lugares-cidade';
const lerAberta = (): boolean => {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
};
const guardarAberta = (aberta: boolean) => {
  try {
    localStorage.setItem(CHAVE, aberta ? '1' : '0');
  } catch {
    // sem armazenamento: só não lembra
  }
};

/** Põe a setinha e a aba dentro da área do jogo da cidade. `irAte` = andar até o lugar (o mesmo do minimapa). */
export function montarLugaresCidade(area: HTMLElement, irAte: (acao: string) => void): void {
  const lista = el('ul', { class: 'lugares-lista' });
  const desenhar = () =>
    lista.replaceChildren(...LUGARES.map((l) => {
      const trancado = l.tranca && !conteudoLiberado(l.tranca);
      const dica = trancado ? `${l.texto} (requer treinador nível ${NIVEL_MINIMO[l.tranca!]})` : l.texto;
      return el('li', {},
        el('button', {
          type: 'button', class: `lugares-item ${trancado ? 'trancado' : ''}`, title: dica,
          onclick: () => l.andar !== false && irAte(l.acao),
        }, el('span', { class: 'lugares-emoji' }, icone(l.icone)), el('span', {}, l.nome), trancado ? el('span', { class: 'lugares-cadeado' }, icone('cadeado')) : ''));
    }));
  const aba = el('aside', { class: 'lugares-cidade', 'aria-label': 'Lugares da cidade' },
    el('strong', { class: 'lugares-titulo' }, icone('pino'), 'Lugares da cidade'),
    el('small', { class: 'lugares-sub' }, 'Passe o mouse para ver o que cada um faz. Clique para ir até lá.'),
    lista);
  const seta = el('button', { type: 'button', class: 'lugares-seta', title: 'Lugares da cidade' }) as HTMLButtonElement;
  const mudar = (aberta: boolean) => {
    aba.classList.toggle('aberta', aberta);
    seta.classList.toggle('aberta', aberta);
    seta.replaceChildren(icone('pino'), el('span', {}, aberta ? '◀' : '▶'));
    seta.setAttribute('aria-expanded', String(aberta));
    if (aberta) desenhar();
    guardarAberta(aberta);
  };
  seta.addEventListener('click', () => mudar(!aba.classList.contains('aberta')));
  mudar(lerAberta());
  area.append(aba, seta);
}
