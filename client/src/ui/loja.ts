import { CATALOGO, CATEGORIAS, itemDaLoja, type CategoriaLoja, type ItemLoja, ehUsoUnico } from '../../../shared/loja';
import { somarCompra } from '../../../shared/metricas';
import { adotarSaveDoServidor, salvar, salvarAgora, type Save } from '../estado';
import { api, ErroApi } from '../conta';
import { bonusVip, vipAtivo } from '../../../shared/vip';
import { abrirJanela } from './janela';
import { el } from './dom';
import { iconeItem } from './iconeItem';
import { nomeDaMoeda } from '../../../shared/moedas';
import type { ProdutoPremium } from '../../../shared/lojasEspeciais';

const LIMITE_LISTA = 120;
const MAXIMO_POR_COMPRA = 999;

/**
 * Loja em três colunas (modelo aprovado pelo dono): seções à esquerda, vitrine no meio (só imagem, nome e preço) e,
 * à direita, o painel do item clicado, com a descrição, a caixa de quantidade, o total e o Comprar. Com busca.
 * Paga em silver. A aba "Loja do dia" (pedido do dono) mostra a rotação sorteada pelo servidor à meia-noite
 * (4 Mega Stones + 1 Z-Crystal, em Origin Coins) e a compra dela é feita NO SERVIDOR (server/src/lojas.ts).
 */
/** Dados da Loja do dia (GET /api/lojas). */
interface LojaDoDia { doDia: { id: string; preco: number }[]; premium: ProdutoPremium[]; trocaEm: number; agora: number }
const MAXIMO_DO_DIA = 99;
/** `doDia` = comprado no servidor; `lojaServidor` diz qual loja (Loja do dia ou a aba Premium) */
type ItemDoDia = ItemLoja & { doDia?: true; lojaServidor?: 'dia' | 'premium' };
export function abrirLoja(save: Save, aoMudar: () => void): void {
  let categoria: CategoriaLoja | 'dia' | 'premium' = 'dia';
  let doDia: LojaDoDia | null = null;
  let erroDoDia = '';
  let busca = '';
  let escolhido: ItemLoja | null = null;
  let quantidade = 1;

  const numero = (n: number) => n.toLocaleString('pt-BR');
  const saldoSilver = el('span', {}, '');
  const saldoGold = el('span', {}, '');
  const aviso = el('p', { class: 'aviso-bolsa', hidden: true }, '');
  const vitrine = el('div', { class: 'mercado-vitrine' });
  const painel = el('aside', { class: 'mercado-painel' });
  const abas = el('nav', { class: 'mercado-secoes' });
  const campoBusca = el('input', { type: 'search', placeholder: 'Buscar item ou golpe…', class: 'busca' });

  const moeda = (item?: Pick<ItemLoja, 'moeda'>) => el('span', { class: `mercado-moeda ${item?.moeda === 'gold' ? 'gold' : ''}`, title: item?.moeda === 'gold' ? 'Origin Coin' : 'Poké Dólar' });
  const atualizarSaldo = () => {
    saldoSilver.textContent = numero(save.silver);
    saldoGold.textContent = numero(save.gold);
  };
  const carteira = (item: ItemLoja) => (item.moeda === 'gold' ? save.gold : save.silver);

  // VIP: 20% de desconto nas compras em silver (no total da compra, arredondado; Mega Stones em gold sem desconto)
  const precoFinal = (item: ItemLoja, quantos: number) =>
    item.moeda === 'gold' ? item.preco * quantos : Math.max(1, Math.round(item.preco * quantos * bonusVip(save, 'precoLoja')));
  const textoFinal = (item: ItemLoja, quantos: number) => `${numero(precoFinal(item, quantos))} ${nomeDaMoeda(item.moeda, precoFinal(item, quantos))}`;
  const comDesconto = (item: ItemLoja) => vipAtivo(save) && item.moeda !== 'gold';

  /** Compra da Loja do dia: o servidor confere a rotação e o saldo e devolve o save. */
  const comprarDoDia = async (item: ItemDoDia, quantos: number) => {
    try {
      await salvarAgora();
      const r = await api<{ save: Save; versao: number; texto: string }>('POST', '/lojas/comprar', { loja: item.lojaServidor ?? 'dia', item: item.id, quantidade: quantos });
      adotarSaveDoServidor(r.save, r.versao);
      aoMudar();
      aviso.textContent = r.texto;
    } catch (e) {
      aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    aviso.hidden = false;
    atualizarSaldo();
    desenharPainel();
  };

  const comprar = (item: ItemDoDia, quantos: number) => {
    if (item.doDia) return void comprarDoDia(item, quantos);
    const custo = precoFinal(item, quantos);
    if (carteira(item) < custo) {
      aviso.textContent = `${item.moeda === 'gold' ? 'Origin Coins insuficientes' : 'Poké Dólares insuficientes'} para ${quantos}× ${item.nome}.`;
    } else {
      if (item.moeda === 'gold') save.gold -= custo;
      else save.silver -= custo;
      save.itens[item.id] = (save.itens[item.id] ?? 0) + quantos;
      somarCompra(save, item.id, quantos);
      salvar(save);
      aoMudar();
      aviso.textContent = `Comprou ${quantos}× ${item.nome} por ${textoFinal(item, quantos)}${comDesconto(item) ? ' (desconto VIP)' : ''}.`;
    }
    aviso.hidden = false;
    atualizarSaldo();
    desenharPainel();
  };

  function desenharAbas() {
    abas.replaceChildren(
      el('button', {
        class: `mercado-secao mercado-secao-dia ${!busca && categoria === 'dia' ? 'ativa' : ''}`,
        onclick: () => {
          categoria = 'dia';
          busca = '';
          campoBusca.value = '';
          desenharAbas();
          desenharVitrine(true);
        },
      }, '⭐ Loja do dia'),
      // Passe Premium e VIP por Origin Coins (pedido do dono), comprados no servidor
      el('button', {
        class: `mercado-secao mercado-secao-dia ${!busca && categoria === 'premium' ? 'ativa' : ''}`,
        onclick: () => {
          categoria = 'premium';
          busca = '';
          campoBusca.value = '';
          desenharAbas();
          desenharVitrine(true);
        },
      }, '💎 Premium'),
      ...CATEGORIAS.map((c) =>
        el(
          'button',
          {
            class: `mercado-secao ${!busca && c.id === categoria ? 'ativa' : ''}`,
            onclick: () => {
              categoria = c.id;
              busca = '';
              campoBusca.value = '';
              desenharAbas();
              desenharVitrine(true);
            },
          },
          c.nome,
        ),
      ),
    );
  }

  /** O painel do item escolhido: descrição, quantidade (padrão 1, digitável), total e Comprar. */
  function desenharPainel() {
    const item = escolhido;
    if (!item) {
      painel.replaceChildren(el('p', { class: 'mercado-vazio' }, 'Escolha um item.'));
      return;
    }
    const campo = el('input', { type: 'number', min: 1, max: MAXIMO_POR_COMPRA, value: quantidade, 'aria-label': 'Quantidade' }) as HTMLInputElement;
    const valor = el('span', {}, '');
    const botao = el('button', { class: 'mercado-comprar', onclick: () => comprar(item, quantidade) }, 'Comprar') as HTMLButtonElement;
    const atualizar = () => {
      valor.textContent = numero(precoFinal(item, quantidade));
      botao.disabled = carteira(item) < precoFinal(item, quantidade);
    };
    const definir = (n: number, escrever: boolean) => {
      quantidade = Math.min((item as ItemDoDia).doDia ? MAXIMO_DO_DIA : MAXIMO_POR_COMPRA, Math.max(1, Math.floor(n) || 1));
      if (escrever) campo.value = String(quantidade);
      atualizar();
    };
    campo.addEventListener('input', () => definir(Number(campo.value), false));
    campo.addEventListener('blur', () => definir(quantidade, true));
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') botao.click();
    });
    atualizar();
    painel.replaceChildren(
      el('div', { class: 'mercado-icone-grande' }, iconeItem(item)),
      el('strong', { class: 'mercado-nome' }, item.nome),
      el('p', { class: 'mercado-desc' }, item.descricao),
      ehUsoUnico(item.id) ? el('span', { class: 'selo-uso-unico', title: 'Some depois de agir na batalha (como nos jogos): é preciso equipar outro.' }, '⏳ Uso único') : '',
      el(
        'span',
        { class: 'mercado-qtd' },
        el('button', { 'aria-label': 'Menos', onclick: () => definir(quantidade - 1, true) }, '−'),
        campo,
        el('button', { 'aria-label': 'Mais', onclick: () => definir(quantidade + 1, true) }, '+'),
      ),
      el('div', { class: 'mercado-total' }, el('span', {}, comDesconto(item) ? 'Total (VIP −20%)' : 'Total'), el('span', { class: 'mercado-preco' }, moeda(item), valor)),
      botao,
    );
  }

  const escolher = (item: ItemLoja | null) => {
    escolhido = item;
    quantidade = 1;
    for (const b of vitrine.querySelectorAll<HTMLElement>('.mercado-item')) b.classList.toggle('escolhido', b.dataset.id === item?.id);
    desenharPainel();
  };

  /** A vitrine da seção (ou da busca). `trocar`: escolhe o primeiro item da lista nova. */
  /** Os itens da rotação de hoje, com o preço em Origin Coins (o servidor manda a lista). */
  const itensDoDia = (): ItemDoDia[] =>
    (doDia?.doDia ?? []).flatMap(({ id, preco }) => {
      const i = itemDaLoja(id);
      return i ? [{ ...i, preco, moeda: 'gold' as const, doDia: true as const }] : [];
    });
  const itensPremium = (): ItemDoDia[] =>
    (doDia?.premium ?? []).map((p) => ({
      id: p.id, nome: p.nome, descricao: p.descricao, simbolo: p.simbolo, categoria: 'chave', preco: p.preco, moeda: 'gold' as const, naLoja: true,
      doDia: true as const, lojaServidor: 'premium' as const,
    }) as ItemDoDia);
  const textoTroca = () => {
    if (!doDia) return erroDoDia || 'Carregando a Loja do dia…';
    const min = Math.max(1, Math.ceil((doDia.trocaEm - doDia.agora) / 60_000));
    return `Itens sorteados à meia-noite (horário de Brasília). Os de hoje trocam em ${Math.floor(min / 60)} h ${min % 60} min.`;
  };

  function desenharVitrine(trocar: boolean) {
    const termo = busca.trim().toLowerCase();
    if (!termo && (categoria === 'dia' || categoria === 'premium')) {
      const lista = categoria === 'dia' ? itensDoDia() : itensPremium();
      vitrine.replaceChildren(
        el('p', { class: 'mercado-vazio mercado-dia-aviso' }, categoria === 'dia' ? textoTroca() : doDia ? 'Passe Premium e VIP, pagos em Origin Coins. O VIP comprado soma com o que você já tem.' : erroDoDia || 'Carregando…'),
        ...lista.map((item) =>
          el('button', { class: 'mercado-item', 'data-id': item.id, title: item.nome, onclick: () => escolher(item) },
            el('span', { class: 'mercado-icone' }, iconeItem(item)),
            el('span', { class: 'mercado-nome' }, item.nome),
            el('span', { class: 'mercado-preco' }, moeda(item), numero(item.preco)))));
      escolher(trocar || !escolhido || !lista.some((i) => i.id === escolhido!.id) ? (lista[0] ?? null) : escolhido);
      return;
    }
    const itens = termo
      ? CATALOGO.filter((i) => i.nome.toLowerCase().includes(termo) || i.descricao.toLowerCase().includes(termo))
      : CATALOGO.filter((i) => (i.abaDaLoja ?? i.categoria) === categoria);
    const visiveis = itens.slice(0, LIMITE_LISTA);
    vitrine.replaceChildren(
      ...visiveis.map((item) =>
        el(
          'button',
          { class: 'mercado-item', 'data-id': item.id, title: item.nome, onclick: () => escolher(item) },
          el('span', { class: 'mercado-icone' }, iconeItem(item)),
          el('span', { class: 'mercado-nome' }, item.nome),
          el('span', { class: 'mercado-preco' }, moeda(item), numero(item.preco)),
        ),
      ),
      ...(itens.length > LIMITE_LISTA ? [el('p', { class: 'mercado-vazio' }, `Mostrando ${LIMITE_LISTA} de ${itens.length}. Use a busca para achar o resto.`)] : []),
      ...(itens.length === 0 ? [el('p', { class: 'mercado-vazio' }, 'Nada encontrado.')] : []),
    );
    escolher(trocar || !escolhido || !visiveis.includes(escolhido) ? (visiveis[0] ?? null) : escolhido);
    if (trocar) vitrine.scrollTop = 0;
  }

  campoBusca.addEventListener('input', () => {
    busca = campoBusca.value;
    desenharAbas();
    desenharVitrine(true);
  });

  atualizarSaldo();
  desenharAbas();
  desenharVitrine(true);
  api<LojaDoDia>('GET', '/lojas').then((r) => (doDia = r), () => (erroDoDia = 'Sem conexão com o servidor: a Loja do dia não carregou.')).finally(() => {
    if ((categoria === 'dia' || categoria === 'premium') && !busca) desenharVitrine(true);
  });
  abrirJanela(
    'Loja',
    () =>
      el(
        'div',
        { class: 'loja mercado' },
        el('div', { class: 'mercado-topo' }, campoBusca, el('span', { class: 'mercado-saldo' }, moeda(), saldoSilver), el('span', { class: 'mercado-saldo' }, moeda({ moeda: 'gold' }), saldoGold)),
        aviso,
        el('div', { class: 'mercado-colunas' }, abas, vitrine, painel),
      ),
    { classe: 'janela-loja' },
  );
}
