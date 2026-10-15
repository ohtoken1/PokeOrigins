// Letreiro: barrinha embaixo do cabeçalho onde passam os avisos de TODOS os jogadores (pedido do dono): captura
// de shiny, lendário, mítico, Ultra Beast ou inicial, prêmio lendário ou mítico de ticket, avisos da staff e banimentos. O servidor guarda os últimos e manda para
// quem entra (server/src/mundo.ts); aqui eles passam em fila, da direita para a esquerda, e somem depois de um tempo.
import { pokemonPorId } from '../dados';
import { aoAvisoDoServidor } from '../online';
import { el } from './dom';

type Aviso =
  | { id: number; quando: number; tipo: 'captura'; jogador: string; especieId: number; shiny: boolean; categoria: string | null }
  | { id: number; quando: number; tipo: 'premio'; jogador: string; raridade: string; ticket: string }
  | { id: number; quando: number; tipo: 'staff'; texto: string }
  | { id: number; quando: number; tipo: 'banido'; jogador: string }
  | { id: number; quando: number; tipo: 'evento'; texto: string };

/** Quanto tempo um aviso continua passando. */
const DURACAO_AVISO_MS = 30 * 60 * 1000;
const MAXIMO_NA_TELA = 12;
const NOME_CATEGORIA: Record<string, string> = { lendario: 'lendário', mitico: 'mítico', ultra: 'Ultra Beast', inicial: 'inicial' };

let avisos: Aviso[] = [];
let redesenhar = () => {};

// ouve desde que o jogo abre: a lista guardada chega logo que a conexão é feita, antes de o cabeçalho existir
aoAvisoDoServidor((msg) => {
  if (msg.t === 'letreiro-historico' && Array.isArray(msg.lista)) avisos = msg.lista as Aviso[];
  else if (msg.t === 'letreiro' && msg.aviso) avisos = [...avisos.filter((a) => a.id !== (msg.aviso as Aviso).id), msg.aviso as Aviso].slice(-MAXIMO_NA_TELA);
  else return;
  redesenhar();
});

function nomeDaEspecie(id: number): string {
  try {
    return pokemonPorId(id).nome;
  } catch {
    return 'Pokémon';
  }
}

function item(a: Aviso): HTMLElement {
  if (a.tipo === 'banido') return el('span', { class: 'letreiro-item banido' }, '⛔ ', el('strong', {}, a.jogador), ' foi banido.');
  if (a.tipo === 'evento') return el('span', { class: 'letreiro-item staff' }, a.texto);
  if (a.tipo === 'staff') return el('span', { class: 'letreiro-item staff' }, el('strong', {}, 'Staff: '), a.texto);
  if (a.tipo === 'premio')
    return el('span', { class: `letreiro-item ${a.raridade}` }, '🎟️ ', el('strong', {}, a.jogador), ' tirou um prêmio ',
      el('strong', { class: 'letreiro-pokemon' }, a.raridade === 'mitico' ? 'mítico' : 'lendário'), ` na ${a.ticket}!`);
  const categoria = a.categoria ? NOME_CATEGORIA[a.categoria] : null;
  return el('span', { class: `letreiro-item ${a.shiny ? 'shiny' : a.categoria ?? ''}` },
    a.shiny ? '★ ' : '◆ ', el('strong', {}, a.jogador), ' capturou ', el('strong', { class: 'letreiro-pokemon' }, nomeDaEspecie(a.especieId)),
    a.shiny ? ' shiny' : '', categoria ? ` (${categoria})` : '', '!');
}

export function montarLetreiro(): HTMLElement {
  const trilho = el('div', { class: 'letreiro-trilho' });
  const raiz = el('div', { class: 'letreiro', role: 'log', 'aria-label': 'Avisos do jogo' }, el('span', { class: 'letreiro-rotulo', 'aria-hidden': 'true' }, '📣'), trilho);
  let mostrados = '';
  redesenhar = () => {
    const agora = Date.now();
    // o mais novo passa primeiro
    const lista = avisos.filter((a) => agora - a.quando < DURACAO_AVISO_MS).reverse();
    const chave = lista.map((a) => a.id).join(',');
    if (chave === mostrados && trilho.firstChild) return;
    mostrados = chave;
    if (!lista.length) return trilho.replaceChildren(el('span', { class: 'letreiro-vazio' }, 'Capturas raras e avisos de todos os jogadores passam aqui.'));
    // faixa nova a cada mudança: a animação recomeça e o aviso novo entra pela direita
    const faixa = el('div', { class: 'letreiro-faixa' }, ...lista.map(item));
    faixa.style.setProperty('--tempo', `${Math.max(16, Math.round(faixa.textContent!.length * 0.2) + 10)}s`);
    trilho.replaceChildren(faixa);
  };
  redesenhar();
  // aviso velho sai sozinho
  window.setInterval(() => redesenhar(), 60 * 1000);
  return raiz;
}
