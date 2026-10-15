// Janela de abrir ticket: uma roleta (como a do inicial) com os prêmios enfileirados, cada casa na cor da
// raridade (branco comum, azul raro, roxo épico, laranja lendário), que para no prêmio sorteado.
import {
  abrirTicket,
  CHAVE_TEMPORAL,
  chancesDasRaridades,
  ticketPorId,
  type LinhaPremio,
  type Premio,
  type Raridade,
  type ResultadoTicket,
} from '../../../shared/tickets';
import { itemDaLoja } from '../../../shared/loja';
import { TITULOS } from '../../../shared/conquistas';
import { sortearIvs } from '../../../shared/ovos';
import { IV_MIN_SHINY, hpMaximo } from '../../../shared/batalha/pokemon';
import { adicionarVip } from '../../../shared/vip';
import { pokemonPorId } from '../dados';
import { TAMANHO_MAXIMO_TIME, guardarNoPC, novoPokemon, registrarCapturado, salvar, type Save } from '../estado';
import { abrirJanela } from './janela';
import { el, spritePokemon } from './dom';
import { iconeItem } from './iconeItem';
import { areaRoletas, botoesQuantidade } from './abrirVarios';
import { marcarConquista } from '../conquistas';
import { avisarPremioRaro } from '../online';

/** Ordem para escolher em qual prêmio a roleta para quando abre vários (o mais raro). */
const PESO_RARIDADE: Record<Raridade, number> = { comum: 0, raro: 1, epico: 2, passado: 2, futuro: 2, lendario: 3, mitico: 4 };

const numero = (n: number) => n.toLocaleString('pt-BR');
const porcentagem = (c: number) => `${numero(Math.round(c * 10000) / 100)}%`;

/** Entrega os prêmios no save; devolve uma frase por prêmio (também usada pelo passe de batalha). */
export function entregar(save: Save, r: ResultadoTicket, opcoes: { nt?: boolean } = {}): string[] {
  return r.pacote.map((premio, i) => {
    if (premio.tipo === 'item') {
      // NT (trilha grátis do passe): a versão "-nt" do item, se existir; senão conta em `itensNt`
      const id = opcoes.nt && itemDaLoja(`${premio.id}-nt`) ? `${premio.id}-nt` : premio.id;
      save.itens[id] = (save.itens[id] ?? 0) + premio.quantidade;
      if (opcoes.nt && id === premio.id) (save.itensNt ??= {})[id] = (save.itensNt[id] ?? 0) + premio.quantidade;
      const item = itemDaLoja(id);
      // skins vão para Minha conta → Minhas skins
      return `${item?.nome ?? id} ×${premio.quantidade}${opcoes.nt && id === premio.id ? ' (NT)' : ''} foi para ${item?.categoria === 'skins' ? 'Minhas skins' : 'a bolsa'}.`;
    }
    if (premio.tipo === 'silver') {
      save.silver += premio.quantidade;
      return `+${numero(premio.quantidade)} Poké Dólares.`;
    }
    if (premio.tipo === 'gold') {
      save.gold += premio.quantidade;
      return `+${numero(premio.quantidade)} Origin Coins.`;
    }
    if (premio.tipo === 'vip') {
      adicionarVip(save, premio.dias);
      return `+${premio.dias} dia${premio.dias > 1 ? 's' : ''} de VIP na sua conta.`;
    }
    if (premio.tipo === 'titulo') {
      save.titulosGanhos = [...new Set([...(save.titulosGanhos ?? []), premio.id])];
      return `Título "${TITULOS.find((t) => t.id === premio.id)?.nome ?? premio.id}" liberado (Minha conta → Meu perfil).`;
    }
    const p = novoPokemon(premio.especie, premio.nivel, r.shiny[i]);
    // IVs mínimos do ticket (ex.: 15+); shiny continua com 15+ no mínimo
    p.ivs = sortearIvs(0, Math.max(premio.ivMinimo, r.shiny[i] ? IV_MIN_SHINY : 0));
    p.hp = hpMaximo(p);
    p.origem = 'ticket';
    if (opcoes.nt) p.inegociavel = true;
    registrarCapturado(save, premio.especie, r.shiny[i]);
    const nome = `${pokemonPorId(premio.especie).nome}${r.shiny[i] ? ' ✨' : ''}`;
    if (save.time.length < TAMANHO_MAXIMO_TIME) {
      save.time.push(p);
      return `${nome} entrou no seu time.`;
    }
    return `${nome} foi enviado para o PC (Box ${guardarNoPC(save, p) + 1}).`;
  });
}

/** Imagem e textos de um prêmio (serve para a roleta, os cartões e o passe de batalha). */
export function visualPremio(premio: Premio, shiny = false): { imagem: HTMLElement; nome: string; qtd: string } {
  if (premio.tipo === 'pokemon') {
    const dados = pokemonPorId(premio.especie);
    return { imagem: spritePokemon(dados, { shiny, animado: false }), nome: `${dados.nome}${shiny ? ' ✨' : ''}`, qtd: `Nv. ${premio.nivel} · IVs ${premio.ivMinimo}+` };
  }
  if (premio.tipo === 'silver' || premio.tipo === 'gold')
    return { imagem: el('span', { class: `icone-moeda moeda-${premio.tipo}` }), nome: premio.tipo === 'silver' ? 'Poké Dólar' : 'Origin Coin', qtd: numero(premio.quantidade) };
  if (premio.tipo === 'vip') return { imagem: el('span', { class: 'icone-vip' }, 'VIP'), nome: 'VIP', qtd: `${premio.dias} dia${premio.dias > 1 ? 's' : ''}` };
  if (premio.tipo === 'titulo') return { imagem: el('span', { class: 'icone-titulo', 'aria-hidden': 'true' }, '🏷️'), nome: `Título ${TITULOS.find((t) => t.id === premio.id)?.nome ?? premio.id}`, qtd: 'Título' };
  if (premio.tipo === 'aleatorio') {
    const [exemplo, nome] = (
      {
        terashard: ['terashard-stellar', 'Tera Shard aleatória'],
        bola: ['pokeball', 'Pokébola aleatória'],
        placa: ['flameplate', 'Plate aleatória'],
        fruta: ['oranberry', 'Berry aleatória'],
        apricorn: ['apricorn-red', 'Apricorn aleatório'],
        energia: ['energy-normal', 'Energy aleatória'],
        charm: ['charm-fire', 'Charm aleatório'],
      } as const
    )[premio.grupo];
    const item = itemDaLoja(exemplo);
    const exemploDoGrupo = item ? iconeItem(item) : null;
    // é só um exemplo do grupo (com o "?"): não mostra o cartão daquele item
    if (exemploDoGrupo) delete exemploDoGrupo.dataset.item;
    return { imagem: el('div', { class: 'icone-aleatorio', title: 'O item é sorteado na hora de abrir, e você recebe a quantidade toda dele.' }, exemploDoGrupo ?? '', el('b', {}, '?')), nome, qtd: `×${premio.quantidade}` };
  }
  const item = itemDaLoja(premio.id);
  return { imagem: item ? iconeItem(item) : el('span', {}, premio.id), nome: item?.nome ?? premio.id, qtd: `×${premio.quantidade}` };
}

function cartaoPremio(premio: Premio, shiny: boolean, raridade: Raridade, chance?: number): HTMLElement {
  // fundo neutro (só a roleta é colorida); a raridade aparece na bolinha do título
  const v = visualPremio(premio, shiny);
  // o cartão inteiro do prêmio mostra a descrição do item, não só o ícone
  return el('div', { class: `premio premio-${raridade}`, ...(premio.tipo === 'item' ? { 'data-item': premio.id } : {}) }, v.imagem, el('strong', {}, v.nome), el('small', {}, v.qtd), chance !== undefined ? el('small', { class: 'premio-chance' }, porcentagem(chance)) : null);
}

/** Casinha da roleta: a imagem do prêmio no fundo da cor da raridade. */
function casaRoleta(pacote: Premio[], raridade: Raridade): HTMLElement {
  const principal = pacote.find((p) => p.tipo === 'pokemon') ?? pacote[0];
  const v = visualPremio(principal);
  const qtd = principal.tipo === 'pokemon' ? (pacote.length > 1 ? `+${pacote.length - 1}` : '') : v.qtd;
  return el('div', { class: `casa-roleta fundo-${raridade}` }, v.imagem, qtd ? el('small', {}, qtd) : null);
}

/** Raridade das casas "de enfeite" da roleta: mais variada que a real, para os prêmios raros passarem na tela. */
const ENFEITE: [Raridade, number][] = [
  ['comum', 0.5],
  ['raro', 0.28],
  ['epico', 0.15],
  ['passado', 0.45],
  ['futuro', 0.45],
  ['lendario', 0.05],
  ['mitico', 0.02],
];

export function abrirJanelaTicket(save: Save, ticketId: string, aoMudar: () => void): void {
  const ticket = ticketPorId(ticketId);
  if (!ticket) return;
  let girando = false;
  const ehChave = ticketId === CHAVE_TEMPORAL.id;
  const verbo = ehChave ? 'Usar' : 'Abrir';
  const linhasDe = (r: Raridade) => ticket.premios.filter((l) => l.raridade === r);
  const possiveis = ENFEITE.filter(([r]) => linhasDe(r).length);
  const enfeite = (): [Premio[], Raridade] => {
    let sorteio = Math.random() * possiveis.reduce((s, [, c]) => s + c, 0);
    let raridade = possiveis[possiveis.length - 1][0];
    for (const [r, c] of possiveis) {
      sorteio -= c;
      if (sorteio < 0) {
        raridade = r;
        break;
      }
    }
    const linhas = linhasDe(raridade);
    return [linhas[Math.floor(Math.random() * linhas.length)].pacote, raridade];
  };

  abrirJanela(
    ticket.nome,
    () => {
      const qtd = save.itens[ticketId] ?? 0;
      const raridades = chancesDasRaridades(ticket);
      const bolinha = (r: Raridade) => el('span', { class: `bolinha fundo-${r}` });
      // uma roleta por ticket aberto (uma em cima da outra)
      const roletas = areaRoletas(() => casaRoleta(...enfeite()));
      const resultado = el('div', { class: 'ticket-resultado' });
      const abrirVarios = (n: number) => {
        if (girando || (save.itens[ticketId] ?? 0) < n) return;
        girando = true;
        botoes.travar(true);
        resultado.replaceChildren();
        // gasta os tickets e entrega os prêmios já no começo (fechar a janela no meio não perde nada)
        save.itens[ticketId] -= n;
        if (save.itens[ticketId] <= 0) delete save.itens[ticketId];
        const todos = Array.from({ length: n }, () => abrirTicket(ticket));
        const frases = todos.flatMap((x) => entregar(save, x));
        // conquistas dos prêmios raros
        for (const x of todos) {
          if (x.raridade === 'epico') marcarConquista(save, 'ticketEpico');
          else if (x.raridade === 'lendario') marcarConquista(save, 'ticketLendario');
          else if (x.raridade === 'mitico') marcarConquista(save, 'ticketMitico');
        }
        salvar(save);
        aoMudar();
        // o título mostra o prêmio mais raro; embaixo aparecem todos
        const r = todos.reduce((a, b) => (PESO_RARIDADE[b.raridade] > PESO_RARIDADE[a.raridade] ? b : a));

        // cada roleta passa as casas e para no seu prêmio (posição ALVO)
        roletas.girar(todos.map((x) => casaRoleta(x.pacote, x.raridade)), 5000, () => {
          const nome = raridades.find((x) => x.id === r.raridade)?.nome ?? '';
          resultado.replaceChildren(
            el('p', { class: 'ticket-raridade' }, bolinha(r.raridade), n > 1 ? `${n} ${ehChave ? 'chaves usadas' : 'Orbs abertas'} · o melhor: ${nome}!` : `${nome}!`),
            el('div', { class: 'premios' }, ...todos.flatMap((x) => x.pacote.map((p, k) => cartaoPremio(p, x.shiny[k], x.raridade)))),
            el('div', { class: 'frases-premio' }, ...frases.map((f) => el('small', {}, f))),
          );
          girando = false;
          // letreiro de todos os jogadores: prêmio lendário ou mítico (só depois de a roleta parar)
          if (r.raridade === 'lendario' || r.raridade === 'mitico') avisarPremioRaro(r.raridade, ticket.nome);
          botoes = botoesQuantidade(verbo, save.itens[ticketId] ?? 0, abrirVarios);
          areaBotoes.replaceChildren(botoes.raiz);
        });
      };
      let botoes = botoesQuantidade(verbo, qtd, abrirVarios);
      const areaBotoes = el('div', {}, botoes.raiz);

      // prêmios possíveis: fechado; dentro, uma setinha por raridade, cada prêmio com a sua chance
      const cartoesDa = (linhas: LinhaPremio[], r: Raridade) => linhas.flatMap((l) => l.pacote.map((p) => cartaoPremio(p, false, r, l.chance)));
      const lista = el(
        'details',
        { class: 'ticket-secao' },
        el('summary', {}, 'Prêmios possíveis'),
        ...raridades.map((r) =>
          el(
            'details',
            { class: 'ticket-secao ticket-sub' },
            el('summary', {}, bolinha(r.id), `${r.nome} · ${porcentagem(r.chance)}`),
            el('div', { class: 'premios' }, ...cartoesDa(linhasDe(r.id), r.id)),
          ),
        ),
      );

      return el('div', { class: 'ticket' }, el('p', { class: 'meta' }, ticket.descricao), roletas.raiz, areaBotoes, resultado, lista);
    },
    { classe: 'janela-ticket' },
  );
}
