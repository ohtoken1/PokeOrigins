import { CATALOGO, CATEGORIAS, type CategoriaLoja, type ItemLoja } from '../../../shared/loja';
import { salvar, type Save } from '../estado';
import { bonusVip, vipAtivo } from '../../../shared/vip';
import { abrirJanela } from './janela';
import { el } from './dom';
import { iconeItem } from './iconeItem';
import { nomeDaMoeda } from '../../../shared/moedas';

const LIMITE_LISTA = 120;
const MAXIMO_POR_COMPRA = 999;

/**
 * Loja em três colunas (modelo aprovado pelo dono): seções à esquerda, vitrine no meio (só imagem, nome e preço) e,
 * à direita, o painel do item clicado, com a descrição, a caixa de quantidade, o total e o Comprar. Com busca.
 * Paga em silver (Mega Stones em gold).
 */
export function abrirLoja(save: Save, aoMudar: () => void): void {
  let categoria: CategoriaLoja = 'bolas';
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

  const comprar = (item: ItemLoja, quantos: number) => {
    const custo = precoFinal(item, quantos);
    if (carteira(item) < custo) {
      aviso.textContent = `${item.moeda === 'gold' ? 'Origin Coins insuficientes' : 'Poké Dólares insuficientes'} para ${quantos}× ${item.nome}.`;
    } else {
      if (item.moeda === 'gold') save.gold -= custo;
      else save.silver -= custo;
      save.itens[item.id] = (save.itens[item.id] ?? 0) + quantos;
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
      quantidade = Math.min(MAXIMO_POR_COMPRA, Math.max(1, Math.floor(n) || 1));
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
  function desenharVitrine(trocar: boolean) {
    const termo = busca.trim().toLowerCase();
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
