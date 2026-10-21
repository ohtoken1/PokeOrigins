// Janela do Correio (envelope no cabeçalho): lista de cartas à esquerda, a carta aberta à direita, com os anexos e o
// botão Resgatar. Pedido do dono: prêmios de eventos e presentes da staff chegam aqui, e também avisos (atualização…).
import { pokemonPorId } from '../dados';
import { itemDaLoja } from '../../../shared/loja';
import { aoMudarCorreio, apagarCarta, cartasDoCorreio, esperaResgate, marcarLida, resgatar, type AnexoCarta, type Carta } from '../correio';
import { avisar, avisarErro } from './avisos';
import { confirmar } from './confirmar';
import { el, spritePokemon } from './dom';
import { iconeItem } from './iconeItem';
import { abrirJanela } from './janela';

/** Quem mandou (coluna `de` da carta). */
const REMETENTE: Record<string, string> = {
  staff: 'Staff PokeOrigins', liga: 'Liga Pokémon', torneio: 'Torneio', cofre: 'Cofre PokeOrigins', loteria: 'Loteria PokeOrigins',
  captura: 'Evento de captura', boss: 'Boss', sistema: 'PokeOrigins',
};
/** Saldos e medalhas não são itens da bolsa: imagem ou símbolo próprio. */
const IMAGENS: Record<string, string> = { silver: 'itens/pokedolar.svg', gold: 'itens/origincoin.svg', fragmentos: 'itens/fragmento-temporal.svg' };
const SIMBOLOS: Record<string, string> = { 'league-coins': '🏅', 'league-coins-nightmare': '🎖️', 'pontos-guilda': '🛡️', 'vip-dias': '💎', 'medalha-ouro': '🥇', 'medalha-prata': '🥈', 'medalha-bronze': '🥉' };

function iconeAnexo(a: AnexoCarta): HTMLElement {
  if (a.tipo === 'pokemon') return spritePokemon(pokemonPorId(a.especieId), { shiny: a.shiny, animado: false });
  if (IMAGENS[a.item]) return el('div', { class: 'icone-caixa' }, el('img', { class: 'icone-png', src: IMAGENS[a.item], alt: '' }));
  const item = itemDaLoja(a.item);
  return item ? iconeItem(item) : el('span', { class: 'correio-simbolo' }, SIMBOLOS[a.item] ?? '🎁');
}

const quando = (ms: number) => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

let aberta: number | null = null;

export function abrirCorreio(): void {
  let ocupado = false;
  const agir = async (acao: () => Promise<void>) => {
    if (ocupado) return;
    ocupado = true;
    try {
      await acao();
    } catch (e) {
      avisarErro(e);
    } finally {
      ocupado = false;
      janela.redesenhar();
    }
  };
  const resgatarAgora = (alvo: { id: number } | { todas: true }) =>
    agir(async () => {
      if (document.querySelector('.batalha-fundo')) return avisar('Termine a batalha antes de resgatar.', 'erro');
      const recebidos = await resgatar(alvo);
      avisar(`Você resgatou: ${recebidos.map((r) => (r.quantidade > 1 ? `${r.quantidade.toLocaleString('pt-BR')}x ${r.nome}` : r.nome)).join(', ')}.`, 'ok');
    });

  function linha(c: Carta): HTMLElement {
    return el('button', { class: `correio-linha ${c.id === aberta ? 'ativa' : ''} ${c.lida ? '' : 'nao-lida'}`, type: 'button', onclick: () => abrir(c) },
      el('span', { class: 'correio-linha-topo' }, el('strong', {}, c.titulo), esperaResgate(c) ? el('span', { class: 'correio-presente', title: 'Tem anexo para resgatar' }, '🎁') : ''),
      el('small', {}, `${REMETENTE[c.de] ?? c.de} · ${quando(c.criadoEm)}`));
  }

  function abrir(c: Carta) {
    aberta = c.id;
    if (!c.lida) void marcarLida(c.id).catch(() => undefined);
    janela.redesenhar();
  }

  function cartaAberta(c: Carta | undefined): HTMLElement {
    if (!c) return el('div', { class: 'correio-carta vazia' }, el('p', {}, 'Escolha uma carta na lista.'));
    const anexos = c.anexos.length
      ? el('div', { class: 'correio-anexos' },
          el('h4', {}, c.resgatada ? 'Anexos (já resgatados)' : 'Anexos'),
          el('div', { class: `correio-anexos-lista ${c.resgatada ? 'resgatados' : ''}` },
            ...c.anexos.map((a) => el('div', { class: 'correio-anexo', title: a.nome },
              iconeAnexo(a),
              el('span', {}, a.tipo === 'pokemon' ? `${a.nome} Nv. ${a.nivel}${a.shiny ? ' ✨' : ''}` : a.nome),
              a.tipo === 'item' ? el('strong', {}, `×${a.quantidade.toLocaleString('pt-BR')}`) : ''))))
      : '';
    return el('div', { class: 'correio-carta' },
      el('h3', {}, c.titulo),
      el('small', { class: 'correio-de' }, `De: ${REMETENTE[c.de] ?? c.de} · ${quando(c.criadoEm)}`),
      c.texto ? el('p', { class: 'correio-texto' }, c.texto) : '',
      anexos,
      el('div', { class: 'correio-botoes' },
        esperaResgate(c) ? el('button', { class: 'botao', onclick: () => void resgatarAgora({ id: c.id }) }, '🎁 Resgatar') : '',
        !esperaResgate(c)
          ? el('button', { class: 'botao secundario', onclick: () => void agir(async () => {
              if (!(await confirmar('Apagar carta', 'Apagar esta carta?'))) return;
              await apagarCarta({ id: c.id });
              aberta = null;
            }) }, '🗑️ Apagar')
          : ''));
  }

  const janela = abrirJanela('✉️ Correio', () => {
    const cartas = cartasDoCorreio();
    const comAnexo = cartas.filter(esperaResgate).length;
    const lidas = cartas.filter((c) => c.lida && !esperaResgate(c)).length;
    return el('div', { class: 'correio' },
      el('div', { class: 'correio-lado' },
        el('div', { class: 'correio-acoes' },
          el('button', { class: 'botao', disabled: !comAnexo, onclick: () => void resgatarAgora({ todas: true }) }, `Resgatar tudo (${comAnexo})`),
          el('button', { class: 'botao secundario', disabled: !lidas, onclick: () => void agir(async () => {
            if (!(await confirmar('Apagar lidas', `Apagar ${lidas} carta(s) lida(s)? Cartas com anexo para resgatar ficam.`))) return;
            await apagarCarta({ lidas: true });
            aberta = null;
          }) }, 'Apagar lidas')),
        cartas.length ? el('div', { class: 'correio-lista' }, ...cartas.map(linha)) : el('p', { class: 'correio-vazio' }, 'Nenhuma carta por enquanto.')),
      cartaAberta(cartas.find((c) => c.id === aberta)));
  }, { classe: 'janela-correio', aoFechar: () => parar() });
  // carta nova chegando com a janela aberta
  const parar = aoMudarCorreio(() => janela.redesenhar());
}
