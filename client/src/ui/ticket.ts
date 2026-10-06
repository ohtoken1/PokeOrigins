// Janela de abrir ticket: mostra as raridades com a chance de cada uma, gira um destaque entre elas
// e para na sorteada; depois mostra e entrega o prêmio.
import { RARIDADES, abrirTicket, ticketPorId, type Premio, type ResultadoTicket } from '../../../shared/tickets';
import { itemDaLoja } from '../../../shared/loja';
import { pokemonPorId } from '../dados';
import { TAMANHO_MAXIMO_TIME, guardarNoPC, novoPokemon, registrarCapturado, salvar, type Save } from '../estado';
import { abrirJanela } from './janela';
import { el, spritePokemon } from './dom';
import { iconeItem } from './iconeItem';

/** Entrega os prêmios no save; devolve uma frase por prêmio. */
function entregar(save: Save, r: ResultadoTicket): string[] {
  return r.pacote.map((premio, i) => {
    if (premio.tipo === 'item') {
      save.itens[premio.id] = (save.itens[premio.id] ?? 0) + premio.quantidade;
      return `${itemDaLoja(premio.id)?.nome ?? premio.id} ×${premio.quantidade} foi para a bolsa.`;
    }
    if (premio.tipo === 'silver') {
      save.silver += premio.quantidade;
      return `+${premio.quantidade} silver.`;
    }
    const p = novoPokemon(premio.especie, premio.nivel, r.shiny[i]);
    registrarCapturado(save, premio.especie);
    const nome = `${pokemonPorId(premio.especie).nome}${r.shiny[i] ? ' ✨' : ''}`;
    if (save.time.length < TAMANHO_MAXIMO_TIME) {
      save.time.push(p);
      return `${nome} entrou no seu time.`;
    }
    return `${nome} foi enviado para o PC (Box ${guardarNoPC(save, p) + 1}).`;
  });
}

function cartaoPremio(premio: Premio, shiny: boolean): HTMLElement {
  if (premio.tipo === 'pokemon') {
    const dados = pokemonPorId(premio.especie);
    return el('div', { class: 'premio' }, spritePokemon(dados, { shiny, animado: false }), el('strong', {}, `${dados.nome}${shiny ? ' ✨' : ''}`), el('small', {}, `Nv. ${premio.nivel}`));
  }
  if (premio.tipo === 'silver') return el('div', { class: 'premio' }, el('div', { class: 'premio-silver' }, '🪙'), el('strong', {}, `${premio.quantidade} silver`));
  const item = itemDaLoja(premio.id);
  return el('div', { class: 'premio' }, item ? iconeItem(item) : null, el('strong', {}, item?.nome ?? premio.id), el('small', {}, `×${premio.quantidade}`));
}

export function abrirJanelaTicket(save: Save, ticketId: string, aoMudar: () => void): void {
  const ticket = ticketPorId(ticketId);
  if (!ticket) return;
  let girando = false;

  abrirJanela(ticket.nome, (janela) => {
    const qtd = save.itens[ticketId] ?? 0;
    const cartoes = RARIDADES.map((r) =>
      el('div', { class: `raridade raridade-${r.id}` }, el('strong', {}, r.nome), el('small', {}, `${(r.chance * 100).toLocaleString('pt-BR')}%`)),
    );
    const resultado = el('div', { class: 'ticket-resultado' });
    const botao = el('button', { class: 'botao grande', disabled: qtd <= 0 }, qtd > 0 ? `🎟️ Abrir ticket (você tem ${qtd})` : 'Você não tem este ticket') as HTMLButtonElement;

    botao.addEventListener('click', () => {
      if (girando || (save.itens[ticketId] ?? 0) <= 0) return;
      girando = true;
      botao.disabled = true;
      resultado.replaceChildren();
      cartoes.forEach((c) => c.classList.remove('sorteada', 'destaque'));
      // gasta o ticket e entrega o prêmio já no começo (fechar a janela no meio não perde nada)
      save.itens[ticketId] -= 1;
      if (save.itens[ticketId] <= 0) delete save.itens[ticketId];
      const r = abrirTicket(ticket);
      const frases = entregar(save, r);
      salvar(save);
      aoMudar();

      // destaque passa pelas raridades, cada vez mais devagar, e para na sorteada
      const alvo = RARIDADES.findIndex((x) => x.id === r.raridade);
      const passos = RARIDADES.length * 4 + alvo;
      let i = 0;
      const passo = () => {
        cartoes.forEach((c, j) => c.classList.toggle('destaque', j === i % RARIDADES.length));
        if (i < passos) {
          i++;
          setTimeout(passo, 60 + (i / passos) ** 3 * 380);
          return;
        }
        cartoes[alvo].classList.add('sorteada');
        resultado.replaceChildren(
          el('p', { class: `ticket-raridade raridade-${r.raridade}` }, RARIDADES[alvo].nome, '!'),
          el('div', { class: 'premios' }, ...r.pacote.map((p, k) => cartaoPremio(p, r.shiny[k]))),
          ...frases.map((f) => el('small', {}, f)),
        );
        girando = false;
        botao.disabled = (save.itens[ticketId] ?? 0) <= 0;
        botao.textContent = botao.disabled ? 'Sem mais tickets' : `🎟️ Abrir outro (você tem ${save.itens[ticketId]})`;
      };
      passo();
    });

    // o que pode sair em cada raridade
    const lista = el(
      'details',
      { class: 'ticket-lista' },
      el('summary', {}, 'Prêmios possíveis'),
      ...RARIDADES.filter((r) => ticket.premios[r.id].length).map((r) =>
        el(
          'div',
          { class: 'ticket-linha' },
          el('span', { class: `ticket-raridade raridade-${r.id}` }, r.nome),
          el('div', { class: 'premios' }, ...ticket.premios[r.id].flatMap((pacote) => pacote.map((p) => cartaoPremio(p, false)))),
        ),
      ),
    );

    void janela;
    return el('div', { class: 'ticket' }, el('p', { class: 'meta' }, ticket.descricao), el('div', { class: 'raridades' }, ...cartoes), botao, resultado, lista);
  }, { classe: 'janela-ticket' });
}
