import { CATALOGO, CATEGORIAS, MOEDA, type CategoriaLoja, type ItemLoja } from '../../../shared/loja';
import { salvar, type Save } from '../estado';
import { abrirJanela } from './janela';
import { el } from './dom';

const LIMITE_LISTA = 120;

/** Loja: todos os itens do jogo, por categoria, com busca. Paga em silver. */
export function abrirLoja(save: Save, aoMudar: () => void): void {
  let categoria: CategoriaLoja = 'bolas';
  let busca = '';

  const saldo = el('strong', { class: 'saldo' }, '');
  const aviso = el('p', { class: 'aviso-bolsa', hidden: true }, '');
  const lista = el('div', { class: 'lista-loja' });
  const abas = el('nav', { class: 'abas abas-loja' });
  const campoBusca = el('input', { type: 'search', placeholder: 'Buscar item ou golpe…', class: 'busca' });

  const atualizarSaldo = () => (saldo.textContent = `${save.silver.toLocaleString('pt-BR')} ${MOEDA}`);

  const comprar = (item: ItemLoja, quantidade: number) => {
    const custo = item.preco * quantidade;
    if (save.silver < custo) {
      aviso.textContent = `Silver insuficiente para ${quantidade}× ${item.nome}.`;
    } else {
      save.silver -= custo;
      save.itens[item.id] = (save.itens[item.id] ?? 0) + quantidade;
      salvar(save);
      aoMudar();
      aviso.textContent = `Comprou ${quantidade}× ${item.nome} por ${custo} ${MOEDA}.`;
    }
    aviso.hidden = false;
    atualizarSaldo();
    desenharLista();
  };

  function desenharAbas() {
    abas.replaceChildren(
      ...CATEGORIAS.map((c) =>
        el(
          'button',
          {
            class: `aba ${!busca && c.id === categoria ? 'ativa' : ''}`,
            onclick: () => {
              categoria = c.id;
              busca = '';
              campoBusca.value = '';
              desenharAbas();
              desenharLista();
            },
          },
          c.nome,
        ),
      ),
    );
  }

  function desenharLista() {
    const termo = busca.trim().toLowerCase();
    const itens = termo
      ? CATALOGO.filter((i) => i.nome.toLowerCase().includes(termo) || i.descricao.toLowerCase().includes(termo))
      : CATALOGO.filter((i) => i.categoria === categoria);
    lista.replaceChildren(
      ...itens.slice(0, LIMITE_LISTA).map((item) =>
        el(
          'div',
          { class: 'linha-item' },
          el('div', { class: `icone-item ${item.id} cat-${item.categoria}` }),
          el('div', { class: 'texto' }, el('strong', {}, item.nome), el('p', {}, item.descricao)),
          el('span', { class: 'quantidade', title: 'Na bolsa' }, `×${save.itens[item.id] ?? 0}`),
          el('span', { class: 'preco' }, `${item.preco} ${MOEDA}`),
          el('button', { class: 'botao', disabled: save.silver < item.preco, onclick: () => comprar(item, 1) }, 'Comprar'),
          el('button', { class: 'botao secundario', disabled: save.silver < item.preco * 10, onclick: () => comprar(item, 10) }, '×10'),
        ),
      ),
      ...(itens.length > LIMITE_LISTA ? [el('p', { class: 'meta' }, `Mostrando ${LIMITE_LISTA} de ${itens.length}. Use a busca para achar o resto.`)] : []),
      ...(itens.length === 0 ? [el('p', { class: 'meta' }, 'Nada encontrado.')] : []),
    );
  }

  campoBusca.addEventListener('input', () => {
    busca = campoBusca.value;
    desenharAbas();
    desenharLista();
  });

  atualizarSaldo();
  desenharAbas();
  desenharLista();
  abrirJanela('Loja', () => el('div', { class: 'loja' }, el('div', { class: 'topo-loja' }, el('span', {}, 'Saldo: ', saldo), campoBusca), abas, aviso, lista), {
    classe: 'janela-loja',
  });
}
