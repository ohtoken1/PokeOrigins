// Janela do Mercado negro (NPC da cidade): comprar o que os outros anunciaram, anunciar Pokémon, itens e gold,
// e ver/tirar os próprios anúncios. O servidor faz tudo (client/src/mercado.ts); a lista se atualiza sozinha
// quando alguém anuncia, compra ou tira um anúncio.
import { Dex } from '@pkmn/sim';
import { itemDaLoja } from '../../../shared/loja';
import { MAX_ANUNCIOS_POR_JOGADOR, VALIDADE_ANUNCIO_MS, PRECO_MAXIMO_MERCADO, QUANTIDADE_MAXIMA_MERCADO, TAXA_MERCADO, taxaDaVenda, valorDoVendedor, type AnuncioMercado, type MoedaMercado, type PokemonAnunciado, type TipoAnuncio } from '../../../shared/mercado';
import { itemInegociavel } from '../../../shared/naoTrocavel';
import { quantidadeNegociavel } from '../../../shared/skins';
import { ErroApi } from '../conta';
import { pokemonPorId } from '../dados';
import type { PokemonDoJogador, Save } from '../estado';
import { anunciarNoMercado, cancelarNoMercado, comprarNoMercado, listaDoMercado, nomeDoItem, type ListaMercado, type NovoAnuncio } from '../mercado';
import { aoAvisoDoServidor } from '../online';
import { el, seloGenero, spritePokemon } from './dom';
import { iconeItem } from './iconeItem';
import { abrirJanela } from './janela';
import { nomeDaMoeda } from '../../../shared/moedas';
import { tutorialFez } from '../tutorialEventos';

type Aba = 'comprar' | 'vender' | 'meus';
const numero = (n: number) => n.toLocaleString('pt-BR');
const ATRIBUTOS: [string, string][] = [['hp', 'HP'], ['atk', 'Atk'], ['def', 'Def'], ['spa', 'SpA'], ['spd', 'SpD'], ['spe', 'Spe']];
const ROTULO_TIPO: Record<TipoAnuncio, string> = { pokemon: 'Pokémon', item: 'Itens', gold: 'Origin Coins' };

const preco = (valor: number, moeda: MoedaMercado) => el('span', { class: `mn-preco ${moeda}` }, el('span', { class: `icone-moeda moeda-${moeda}` }), el('strong', {}, numero(valor)));
const iconeDoItem = (id: string) => iconeItem(itemDaLoja(id) ?? { id, categoria: 'batalha' });
const inteiro = (campo: HTMLInputElement, minimo: number, maximo: number) => Math.max(minimo, Math.min(maximo, Math.floor(Number(campo.value) || minimo)));

function seloDoTier(tier: string): HTMLElement {
  const classe = tier === 'S+' ? 'sp' : tier.toLowerCase();
  return el('span', { class: `selo-tier tier-${classe}`, title: `Tier ${tier} (soma dos IVs)` }, el('span', { class: 'letra' }, tier.replace('+', '')), tier.endsWith('+') ? el('span', { class: 'mais' }, '+') : null);
}

function tempoQueFalta(ms: number): string {
  if (ms <= 0) return 'vencendo';
  const horas = Math.floor(ms / 3_600_000);
  return horas >= 24 ? `${Math.floor(horas / 24)} d` : horas >= 1 ? `${horas} h` : `${Math.max(1, Math.floor(ms / 60_000))} min`;
}

/** Nome para a busca e para o título do anúncio. */
function nomeDoAnuncio(a: AnuncioMercado): string {
  if (a.pokemon) return pokemonPorId(a.pokemon.especieId).nome;
  if (a.tipo === 'gold') return `${numero(a.quantidade ?? 0)} Origin Coins`;
  return nomeDoItem(a.item ?? '');
}

export function abrirMercado(save: Save, aoMudar: () => void = () => {}): void {
  tutorialFez('mercado');
  let aba: Aba = 'comprar';
  let lista: ListaMercado | null = null;
  let filtro: 'todos' | TipoAnuncio = 'todos';
  let ocupado = false;
  let aviso = '';
  /** Anúncio esperando o segundo clique (comprar ou tirar). */
  let confirmando: number | null = null;
  /** Anúncio de Pokémon com os detalhes abertos. */
  let aberto: number | null = null;
  // o que está sendo anunciado
  let vendendo: TipoAnuncio = 'pokemon';
  let uid: number | null = null;
  let item: string | null = null;
  let quantidade = 1;
  let valor = 1;
  let moeda: MoedaMercado = 'silver';

  // o campo de busca é sempre o mesmo elemento (refazer a cada letra tiraria o cursor dele)
  const busca = el('input', { type: 'search', class: 'mn-busca', placeholder: 'Buscar por nome…', 'aria-label': 'Buscar no mercado' }) as HTMLInputElement;
  const corpo = el('div', { class: 'mn-corpo' });
  const abas = el('div', { class: 'mn-abas', role: 'tablist' });
  const status = el('p', { class: 'mn-aviso', role: 'status' });
  const raiz = el('div', { class: 'mercado-negro' }, abas, status, corpo);
  busca.addEventListener('input', () => desenhar());
  // busca dos SEUS Pokémon na aba Vender (quem tem o PC cheio não precisa procurar um por um): só a grade é refeita
  const buscaVenda = el('input', { type: 'search', class: 'mn-busca', placeholder: 'Buscar seu Pokémon pelo nome…', 'aria-label': 'Buscar entre os seus Pokémon' }) as HTMLInputElement;
  const gradeVenda = el('div', { class: 'troca-seletor' });
  buscaVenda.addEventListener('input', () => desenharGradeVenda());

  const buscar = () => listaDoMercado().then((r) => {
    lista = r;
    // quem está digitando o anúncio não perde o que escreveu: só o contador das abas muda
    if (aba === 'vender' && corpo.contains(document.activeElement)) desenharAbas();
    else desenhar();
  }, () => {
    aviso = 'Sem conexão com o servidor.';
    desenhar();
  });

  const agir = async (pedir: () => Promise<ListaMercado>, deuCerto: string) => {
    if (ocupado) return;
    ocupado = true;
    aviso = '';
    desenhar();
    try {
      lista = await pedir();
      aviso = deuCerto;
      aoMudar();
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
      void buscar();
    } finally {
      ocupado = false;
      confirmando = null;
      desenhar();
    }
  };

  // ---- um anúncio na lista ----
  const detalhes = (p: PokemonAnunciado) =>
    el('div', { class: 'mn-detalhes' },
      p.avaliado
        ? el('div', { class: 'mn-ivs' }, ...ATRIBUTOS.map(([a, rotulo]) =>
            el('span', {}, el('small', {}, rotulo), p.ivs ? String(p.ivs[a] ?? '?') : p.faixas?.[a] ? `${p.faixas[a][0]}–${p.faixas[a][1]}` : '?')))
        : el('p', { class: 'meta' }, 'IVs não avaliados pelo vendedor.'),
      p.avaliado && !p.ivs ? el('p', { class: 'meta' }, 'IVs por faixa: jogadores VIP veem o valor exato.') : null,
      el('p', { class: 'meta' }, `Golpes: ${p.golpes.map((g) => Dex.moves.get(g).name).join(', ') || 'nenhum'}`));

  const cartao = (a: AnuncioMercado) => {
    const p = a.pokemon;
    const base = p ? pokemonPorId(p.especieId) : null;
    const falta = save[a.moeda] < a.preco;
    const acao = a.meu
      ? confirmando === a.id
        ? el('div', { class: 'mn-acao' },
            el('button', { class: 'botao perigo', type: 'button', disabled: ocupado, onclick: () => void agir(() => cancelarNoMercado(a.id), 'Anúncio tirado do mercado.') }, 'Tirar'),
            el('button', { class: 'botao secundario', type: 'button', disabled: ocupado, onclick: () => ((confirmando = null), desenhar()) }, 'Não'))
        : el('div', { class: 'mn-acao' }, el('button', { class: 'botao secundario', type: 'button', disabled: ocupado, onclick: () => ((confirmando = a.id), desenhar()) }, 'Tirar do mercado'))
      : confirmando === a.id
        ? el('div', { class: 'mn-acao' },
            el('button', { class: 'botao', type: 'button', disabled: ocupado, onclick: () => void agir(() => comprarNoMercado(a.id), `Você comprou ${p ? nomeDoAnuncio(a) : a.tipo === 'gold' ? nomeDoAnuncio(a) : `${numero(a.quantidade ?? 1)}x ${nomeDoAnuncio(a)}`}.`) }, 'Confirmar'),
            el('button', { class: 'botao secundario', type: 'button', disabled: ocupado, onclick: () => ((confirmando = null), desenhar()) }, 'Não'))
        : el('div', { class: 'mn-acao' },
            el('button', { class: 'botao', type: 'button', disabled: ocupado || falta, title: falta ? `Você não tem ${nomeDaMoeda(a.moeda)} suficientes` : '', onclick: () => ((confirmando = a.id), desenhar()) }, 'Comprar'));

    return el('div', { class: `mn-anuncio${p?.shiny ? ' shiny' : ''}${a.meu ? ' meu' : ''}` },
      el('div', { class: 'mn-icone' }, p && base ? spritePokemon(base, { shiny: p.shiny, animado: false }) : a.tipo === 'gold' ? el('span', { class: 'icone-moeda moeda-gold mn-gold' }) : iconeDoItem(a.item ?? '')),
      el('div', { class: 'mn-info' },
        el('strong', {}, p ? nomeDoAnuncio(a) : a.tipo === 'gold' ? nomeDoAnuncio(a) : `${nomeDoAnuncio(a)} ×${numero(a.quantidade ?? 1)}`,
          p?.shiny ? el('span', { class: 'troca-shiny', title: 'Shiny' }, ' ★') : null, p ? seloGenero(p.genero as 'M' | 'F' | 'N') : null, p?.tier ? seloDoTier(p.tier) : null),
        p ? el('small', {}, `Nv. ${p.nivel} · ${Dex.natures.get(p.natureza).name} · ${Dex.abilities.get(p.habilidade).name}${p.item ? ` · segura ${nomeDoItem(p.item)}` : ''}`) : null,
        el('small', { class: 'mn-vendedor' }, a.meu ? `Seu anúncio · vence em ${tempoQueFalta(a.expiraEm - (lista?.agora ?? Date.now()))}` : `Vendedor: ${a.vendedor}`),
        p ? el('button', { class: 'mn-ver', type: 'button', onclick: () => ((aberto = aberto === a.id ? null : a.id), desenhar()) }, aberto === a.id ? 'Esconder detalhes' : 'Ver detalhes') : null,
        p && aberto === a.id ? detalhes(p) : null),
      el('div', { class: 'mn-lado' }, preco(a.preco, a.moeda), acao));
  };

  // ---- aba Comprar ----
  const abaComprar = () => {
    const texto = busca.value.trim().toLowerCase();
    const anuncios = (lista?.anuncios ?? []).filter((a) => (filtro === 'todos' || a.tipo === filtro) && (!texto || nomeDoAnuncio(a).toLowerCase().includes(texto)));
    return [
      el('div', { class: 'mn-filtros' }, busca,
        ...(['todos', 'pokemon', 'item', 'gold'] as const).map((f) =>
          el('button', { class: `aba ${filtro === f ? 'ativa' : ''}`, type: 'button', onclick: () => ((filtro = f), desenhar()) }, f === 'todos' ? 'Tudo' : ROTULO_TIPO[f]))),
      el('div', { class: 'mn-lista' },
        !lista ? el('p', { class: 'troca-vazio' }, 'Buscando os anúncios…')
          : anuncios.length ? null
            : el('p', { class: 'troca-vazio' }, lista.anuncios.length ? 'Nenhum anúncio com esse filtro.' : 'Ninguém anunciou nada ainda. Seja o primeiro na aba Vender.'),
        ...anuncios.map(cartao)),
    ];
  };

  // ---- aba Vender ----
  function desenharGradeVenda(): void {
    const texto = buscaVenda.value.trim().toLowerCase();
    const todos: { p: PokemonDoJogador; noTime: boolean }[] = [...save.time.map((p) => ({ p, noTime: true })), ...save.caixa.map((p) => ({ p, noTime: false }))];
    const motivo = (p: PokemonDoJogador, noTime: boolean) =>
      p.inegociavel ? 'NT: não pode ser vendido' : p.trancado ? 'Trancado (destranque no PC)' : noTime && save.time.length <= 1 ? 'Precisa ficar 1 no time' : null;
    const achados = todos.filter(({ p }) => !texto || pokemonPorId(p.especieId).nome.toLowerCase().includes(texto));
    gradeVenda.replaceChildren(
      ...(achados.length ? [] : [el('p', { class: 'troca-vazio' }, 'Nenhum Pokémon seu com esse nome.')]),
      ...achados.map(({ p, noTime }) => {
        const bloqueio = motivo(p, noTime);
        const base = pokemonPorId(p.especieId);
        return el('button', {
          class: `troca-opcao${uid === p.uid ? ' escolhido' : ''}`, type: 'button', disabled: !!bloqueio, title: bloqueio ?? `Anunciar ${base.nome}`,
          onclick: () => ((uid = p.uid ?? null), desenhar()),
        }, spritePokemon(base, { shiny: p.shiny, animado: false }), el('small', {}, `${base.nome} · Nv. ${p.nivel}`), el('em', {}, bloqueio ?? (noTime ? 'Time' : `Box ${(p.box ?? 0) + 1}`)));
      }));
  }
  const seletorPokemon = () => {
    desenharGradeVenda();
    return el('div', { class: 'mn-escolher' }, buscaVenda, gradeVenda);
  };

  const abaVender = () => {
    const meus = lista?.meus.length ?? 0;
    const cheio = (lista?.meus.length ?? 0) + (lista?.pendentes ?? 0) >= MAX_ANUNCIOS_POR_JOGADOR;
    // skins: só as que o jogador levou para a bolsa
    const itens = Object.keys(save.itens).map((id): [string, number] => [id, quantidadeNegociavel(save, id)]).filter(([id, q]) => q > 0 && !itemInegociavel(id)).sort((a, b) => nomeDoItem(a[0]).localeCompare(nomeDoItem(b[0])));
    if (vendendo === 'item' && (!item || !quantidadeNegociavel(save, item))) item = itens[0]?.[0] ?? null;
    const tem = vendendo === 'item' ? (item ? quantidadeNegociavel(save, item) : 0) : vendendo === 'gold' ? save.gold : 1;
    const maximo = Math.min(tem, vendendo === 'gold' ? PRECO_MAXIMO_MERCADO : QUANTIDADE_MAXIMA_MERCADO);
    quantidade = Math.max(1, Math.min(maximo || 1, quantidade));
    if (vendendo === 'gold') moeda = 'silver';

    const campoQtd = el('input', { type: 'number', class: 'banco-campo', min: 1, max: maximo, step: 1, value: quantidade, 'aria-label': 'Quantidade' }) as HTMLInputElement;
    const campoPreco = el('input', { type: 'number', class: 'banco-campo', min: 1, max: PRECO_MAXIMO_MERCADO, step: 1, value: valor, 'aria-label': 'Preço' }) as HTMLInputElement;
    const resumo = el('p', { class: 'meta mn-resumo' });
    const escreverResumo = () => {
      const v = inteiro(campoPreco, 1, PRECO_MAXIMO_MERCADO);
      const taxa = taxaDaVenda(v);
      resumo.textContent = `Taxa do mercado: ${TAXA_MERCADO * 100}%${taxa ? ` (${numero(taxa)} ${nomeDaMoeda(moeda, taxa)})` : ' (preço abaixo de 20 não paga)'}. Se vender, você recebe ${numero(valorDoVendedor(v))} ${nomeDaMoeda(moeda, valorDoVendedor(v))}.`;
    };
    campoQtd.addEventListener('change', () => ((quantidade = inteiro(campoQtd, 1, maximo || 1)), desenhar()));
    campoPreco.addEventListener('input', escreverResumo);
    campoPreco.addEventListener('change', () => ((valor = inteiro(campoPreco, 1, PRECO_MAXIMO_MERCADO)), desenhar()));
    escreverResumo();

    const pronto = vendendo === 'pokemon' ? uid !== null && [...save.time, ...save.caixa].some((p) => p.uid === uid) : vendendo === 'item' ? !!item && tem > 0 : tem > 0;
    const anunciar = () => {
      // o que está digitado vale, mesmo sem ter saído do campo
      valor = inteiro(campoPreco, 1, PRECO_MAXIMO_MERCADO);
      quantidade = inteiro(campoQtd, 1, maximo || 1);
      const novo: NovoAnuncio = vendendo === 'pokemon' ? { tipo: 'pokemon', uid: uid!, preco: valor, moeda } : vendendo === 'item' ? { tipo: 'item', item: item!, quantidade, preco: valor, moeda } : { tipo: 'gold', quantidade, preco: valor, moeda: 'silver' };
      void agir(() => anunciarNoMercado(novo), 'Anúncio colocado no mercado.').then(() => (uid = null));
    };

    return [
      el('div', { class: 'mn-filtros' },
        ...(['pokemon', 'item', 'gold'] as const).map((t) =>
          el('button', { class: `aba ${vendendo === t ? 'ativa' : ''}`, type: 'button', onclick: () => ((vendendo = t), (quantidade = 1), desenhar()) }, ROTULO_TIPO[t]))),
      vendendo === 'pokemon' ? seletorPokemon()
        : vendendo === 'item'
          ? itens.length
            ? el('label', { class: 'banco-quantidade' }, 'Item',
                el('select', { class: 'banco-campo', onchange: (e: Event) => ((item = (e.target as HTMLSelectElement).value), (quantidade = 1), desenhar()) },
                  ...itens.map(([id, q]) => el('option', { value: id, selected: id === item }, `${nomeDoItem(id)} (tem ${numero(q)})`))))
            : el('p', { class: 'troca-vazio' }, 'Você não tem itens que possam ser vendidos.')
          : el('p', { class: 'meta' }, `Você tem ${numero(save.gold)} Origin Coins. Origin Coins são vendidos por Poké Dólares.`),
      vendendo === 'pokemon' ? null : el('label', { class: 'banco-quantidade' }, vendendo === 'gold' ? 'Quantos Origin Coins' : 'Quantidade (vendida toda junta)', campoQtd),
      el('label', { class: 'banco-quantidade' }, 'Preço total',
        el('span', { class: 'mn-preco-campo' }, campoPreco,
          vendendo === 'gold'
            ? el('span', { class: 'mn-moeda-fixa' }, 'Poké Dólares')
            : el('select', { class: 'banco-campo mn-moeda', 'aria-label': 'Moeda', onchange: (e: Event) => ((moeda = (e.target as HTMLSelectElement).value as MoedaMercado), (valor = inteiro(campoPreco, 1, PRECO_MAXIMO_MERCADO)), desenhar()) },
                el('option', { value: 'silver', selected: moeda === 'silver' }, 'Poké Dólares'), el('option', { value: 'gold', selected: moeda === 'gold' }, 'Origin Coins')))),
      resumo,
      el('p', { class: 'meta' }, `Você tem ${meus} de ${MAX_ANUNCIOS_POR_JOGADOR} anúncios. O que está anunciado sai do seu time, PC ou bolsa até vender, e volta se você tirar o anúncio ou se ninguém comprar em ${VALIDADE_ANUNCIO_MS / 3_600_000} horas.`),
      el('button', { class: 'botao mn-anunciar', type: 'button', disabled: ocupado || !pronto || cheio, title: cheio ? 'Você já tem o máximo de anúncios' : '', onclick: anunciar }, ocupado ? 'Anunciando…' : 'Anunciar'),
    ];
  };

  // ---- aba Meus anúncios ----
  const abaMeus = () => [
    el('div', { class: 'mn-lista' },
      !lista ? el('p', { class: 'troca-vazio' }, 'Buscando…') : lista.meus.length ? null : el('p', { class: 'troca-vazio' }, 'Você não tem anúncios no mercado.'),
      ...(lista?.meus ?? []).map(cartao)),
  ];

  function desenharAbas(): void {
    abas.replaceChildren(...(['comprar', 'vender', 'meus'] as const).map((a) =>
      el('button', {
        class: `aba ${aba === a ? 'ativa' : ''}`, role: 'tab', 'aria-selected': String(aba === a), type: 'button',
        onclick: () => ((aba = a), (aviso = ''), (confirmando = null), desenhar()),
      }, a === 'comprar' ? 'Comprar' : a === 'vender' ? 'Vender' : `Meus anúncios${lista ? ` (${lista.meus.length})` : ''}`)));
  }
  function desenhar(): void {
    desenharAbas();
    status.textContent = aviso;
    const foco = document.activeElement === busca ? busca : document.activeElement === buscaVenda ? buscaVenda : null;
    corpo.replaceChildren(...(aba === 'comprar' ? abaComprar() : aba === 'vender' ? abaVender() : abaMeus()).filter((n) => n !== null) as HTMLElement[]);
    foco?.focus();
  }

  // alguém anunciou, comprou ou tirou um anúncio: a lista aberta se atualiza
  const pararDeOuvir = aoAvisoDoServidor((msg) => {
    if (msg.t === 'mercado' && !ocupado) void buscar();
  });
  abrirJanela('Mercado negro', () => raiz, { classe: 'janela-mercado-negro', aoFechar: () => pararDeOuvir() });
  desenhar();
  void buscar();
}
