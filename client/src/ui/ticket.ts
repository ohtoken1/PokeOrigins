// Janela de abrir ticket: uma roleta (como a do inicial) com os prêmios enfileirados, cada casa na cor da
// raridade (branco comum, azul raro, roxo épico, laranja lendário), que para no prêmio sorteado.
import { RARIDADES, abrirTicket, ticketPorId, type Pacote, type Premio, type Raridade, type ResultadoTicket } from '../../../shared/tickets';
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

function cartaoPremio(premio: Premio, shiny: boolean, raridade: Raridade): HTMLElement {
  // fundo neutro (só a roleta é colorida); a raridade aparece na bolinha do título
  const classe = `premio premio-${raridade}`;
  if (premio.tipo === 'pokemon') {
    const dados = pokemonPorId(premio.especie);
    return el('div', { class: classe }, spritePokemon(dados, { shiny, animado: false }), el('strong', {}, `${dados.nome}${shiny ? ' ✨' : ''}`), el('small', {}, `Nv. ${premio.nivel}`));
  }
  if (premio.tipo === 'silver') return el('div', { class: classe }, el('div', { class: 'premio-silver' }, '🪙'), el('strong', {}, `${premio.quantidade} silver`));
  const item = itemDaLoja(premio.id);
  return el('div', { class: classe }, item ? iconeItem(item) : null, el('strong', {}, item?.nome ?? premio.id), el('small', {}, `×${premio.quantidade}`));
}

/** Casinha da roleta: a imagem do prêmio principal do pacote (o Pokémon, se tiver) no fundo da cor da raridade. */
function casaRoleta(pacote: Pacote, raridade: Raridade): HTMLElement {
  const principal = pacote.find((p) => p.tipo === 'pokemon') ?? pacote[0];
  let imagem: HTMLElement;
  let qtd = '';
  if (principal.tipo === 'pokemon') {
    imagem = spritePokemon(pokemonPorId(principal.especie), { animado: false });
    if (pacote.length > 1) qtd = `+${pacote.length - 1}`;
  } else if (principal.tipo === 'silver') {
    imagem = el('div', { class: 'premio-silver' }, '🪙');
    qtd = String(principal.quantidade);
  } else {
    const item = itemDaLoja(principal.id);
    imagem = item ? iconeItem(item) : el('span', {}, principal.id);
    qtd = `×${principal.quantidade}`;
  }
  return el('div', { class: `casa-roleta fundo-${raridade}` }, imagem, qtd ? el('small', {}, qtd) : null);
}

/** Raridade das casas "de enfeite" da roleta: mais variada que a real, para os prêmios raros passarem na tela. */
const ENFEITE: [Raridade, number][] = [
  ['comum', 0.5],
  ['raro', 0.28],
  ['epico', 0.15],
  ['lendario', 0.07],
];
const LARGURA_CASA = 92;
const CASAS = 44;
const ALVO = 38;

export function abrirJanelaTicket(save: Save, ticketId: string, aoMudar: () => void): void {
  const ticket = ticketPorId(ticketId);
  if (!ticket) return;
  let girando = false;
  const possiveis = ENFEITE.filter(([r]) => ticket.premios[r].length);
  const enfeite = (): [Pacote, Raridade] => {
    let sorteio = Math.random() * possiveis.reduce((s, [, c]) => s + c, 0);
    let raridade = possiveis[possiveis.length - 1][0];
    for (const [r, c] of possiveis) {
      sorteio -= c;
      if (sorteio < 0) {
        raridade = r;
        break;
      }
    }
    const pacotes = ticket.premios[raridade];
    return [pacotes[Math.floor(Math.random() * pacotes.length)], raridade];
  };

  abrirJanela(
    ticket.nome,
    () => {
      const qtd = save.itens[ticketId] ?? 0;
      const raridades = RARIDADES.filter((r) => ticket.premios[r.id].length);
      const bolinha = (r: Raridade) => el('span', { class: `bolinha fundo-${r}` });
      // chances: fechado; a setinha abre a lista
      const chances = el(
        'details',
        { class: 'ticket-secao' },
        el('summary', {}, 'Chances'),
        ...raridades.map((r) => el('div', { class: 'ticket-chance' }, el('span', {}, bolinha(r.id), r.nome), el('span', {}, `${(r.chance * 100).toLocaleString('pt-BR')}%`))),
      );
      const faixa = el('div', { class: 'roleta-faixa' });
      const roleta = el('div', { class: 'roleta roleta-ticket' }, el('div', { class: 'roleta-marcador' }), faixa);
      const encher = (fim?: [Pacote, Raridade]) => {
        const casas = Array.from({ length: CASAS }, (_, i) => (i === ALVO && fim ? fim : enfeite()));
        faixa.style.transition = 'none';
        faixa.style.transform = 'translateX(0)';
        faixa.replaceChildren(...casas.map(([p, r]) => casaRoleta(p, r)));
      };
      encher();
      const resultado = el('div', { class: 'ticket-resultado' });
      const botao = el('button', { class: 'botao grande', disabled: qtd <= 0 }, qtd > 0 ? `🎟️ Abrir ticket (você tem ${qtd})` : 'Você não tem este ticket') as HTMLButtonElement;

      botao.addEventListener('click', () => {
        if (girando || (save.itens[ticketId] ?? 0) <= 0) return;
        girando = true;
        botao.disabled = true;
        resultado.replaceChildren();
        // gasta o ticket e entrega o prêmio já no começo (fechar a janela no meio não perde nada)
        save.itens[ticketId] -= 1;
        if (save.itens[ticketId] <= 0) delete save.itens[ticketId];
        const r = abrirTicket(ticket);
        const frases = entregar(save, r);
        salvar(save);
        aoMudar();

        // as casas passam e param no prêmio sorteado (posição ALVO), com um leve desvio dentro da casa
        encher([r.pacote, r.raridade]);
        void faixa.offsetWidth;
        const desvio = (Math.random() - 0.5) * LARGURA_CASA * 0.4;
        const deslocamento = ALVO * LARGURA_CASA - (roleta.clientWidth / 2 - LARGURA_CASA / 2) + desvio;
        faixa.style.transition = 'transform 5s cubic-bezier(0.12, 0.7, 0.15, 1)';
        faixa.style.transform = `translateX(${-deslocamento}px)`;
        setTimeout(() => {
          faixa.children[ALVO]?.classList.add('sorteado');
          const nome = RARIDADES.find((x) => x.id === r.raridade)!.nome;
          resultado.replaceChildren(
            el('p', { class: 'ticket-raridade' }, bolinha(r.raridade), `${nome}!`),
            el('div', { class: 'premios' }, ...r.pacote.map((p, k) => cartaoPremio(p, r.shiny[k], r.raridade))),
            ...frases.map((f) => el('small', {}, f)),
          );
          girando = false;
          botao.disabled = (save.itens[ticketId] ?? 0) <= 0;
          botao.textContent = botao.disabled ? 'Sem mais tickets' : `🎟️ Abrir outro (você tem ${save.itens[ticketId]})`;
        }, 5100);
      });

      // o que pode sair em cada raridade
      // prêmios possíveis: fechado; dentro, uma setinha por raridade
      const lista = el(
        'details',
        { class: 'ticket-secao' },
        el('summary', {}, 'Prêmios possíveis'),
        ...raridades.map((r) =>
          el(
            'details',
            { class: 'ticket-secao ticket-sub' },
            el('summary', {}, bolinha(r.id), r.nome),
            el('div', { class: 'premios' }, ...ticket.premios[r.id].flatMap((pacote) => pacote.map((p) => cartaoPremio(p, false, r.id)))),
          ),
        ),
      );

      return el('div', { class: 'ticket' }, el('p', { class: 'meta' }, ticket.descricao), chances, roleta, botao, resultado, lista);
    },
    { classe: 'janela-ticket' },
  );
}
