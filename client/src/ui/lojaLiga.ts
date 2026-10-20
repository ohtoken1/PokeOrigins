// Lojas da Liga (pedido do dono; endgame = Liga Pokémon): Loja da Liga (League Coins) e Loja da Liga Nightmare
// (League Coins Nightmare), com os produtos de shared/lojasEspeciais.ts e as Mega Stones de cada tier. Abertas pela
// janela da Liga. Quem vende é o servidor (server/src/lojas.ts).
import { valorEmMoeda } from './moeda';
import { LOJAS_DA_LIGA, type IdLojaLiga, type ProdutoLiga } from '../../../shared/lojasEspeciais';
import { balaoTitulo } from './titulo';
import { itemDaLoja } from '../../../shared/loja';
import { api, ErroApi } from '../conta';
import { adotarSaveDoServidor, carregarSave, salvarAgora, type Save } from '../estado';
import { confirmar } from './confirmar';
import { el } from './dom';
import { iconeItem } from './iconeItem';
import { abrirJanela } from './janela';
import { classeTematica } from './temaEvento';

interface Estado { liga: ProdutoLiga[]; nightmare: ProdutoLiga[] }

/** Abas da loja (como as seções do Pokémarket); só aparecem as que têm produto. */
const ABAS = [
  { id: 'itens', nome: 'Itens' },
  { id: 'ovos', nome: 'Ovos' },
  { id: 'zcristais', nome: 'Z-Crystals' },
  { id: 'formas', nome: 'Itens de forma' },
  { id: 'megapedras', nome: 'Mega Stones' },
  { id: 'titulos', nome: 'Títulos' },
] as const;
type Aba = (typeof ABAS)[number]['id'];
function abaDe(p: ProdutoLiga): Aba {
  if (p.titulo) return 'titulos';
  if (p.id.startsWith('ovo-')) return 'ovos';
  const c = itemDaLoja(p.item ?? p.id)?.categoria;
  return c === 'megapedras' || c === 'zcristais' || c === 'formas' ? c : 'itens';
}

/** Nome, descrição e ícone de um produto (item comum, aleatório, saldo ou título). */
function comoMostrar(p: ProdutoLiga): { nome: string; descricao: string; icone: HTMLElement } | null {
  if (p.titulo) return { nome: p.nome ?? p.titulo, descricao: 'Título exclusivo: +5% em shiny, raros, Poké Dólares e XP enquanto estiver em uso. Uma vez por conta.', icone: balaoTitulo(p.titulo) };
  if (p.aleatorio) return { nome: p.nome ?? p.id, descricao: p.aleatorio === 'mint' ? 'Uma Mint sorteada na compra.' : 'Um Charm de tipo sorteado na compra.', icone: el('span', { class: 'icone-simbolo' }, '❔') };
  if (p.item === 'fragmentos') return { nome: p.nome ?? 'Fragmento Temporal', descricao: 'Moeda do Viajante do tempo (cubos e Chave Temporal).', icone: el('img', { src: 'itens/fragmento-temporal.svg', alt: '', width: '32', height: '32' }) };
  const i = itemDaLoja(p.item ?? p.id);
  return i ? { nome: p.nome ?? i.nome, descricao: i.descricao, icone: iconeItem(i) } : null;
}

export function abrirLojaDaLiga(loja: IdLojaLiga): void {
  const info = LOJAS_DA_LIGA[loja];
  let dados: Estado | null = null;
  let aviso = '';
  let busca = '';
  let aba: Aba = 'itens';
  const abas = el('nav', { class: 'mercado-secoes' });
  function desenharAbas(): void {
    const tem = new Set(dados?.[loja].map(abaDe));
    abas.replaceChildren(...ABAS.filter((a) => tem.has(a.id)).map((a) =>
      el('button', { type: 'button', class: `mercado-secao ${!busca && a.id === aba ? 'ativa' : ''}`, onclick: () => ((aba = a.id), (busca = ''), (campo.value = ''), desenharAbas(), desenharGrade()) }, a.nome)));
  }

  async function comprar(id: string, nome: string, preco: number): Promise<void> {
    if (!(await confirmar(info.nome, `Comprar ${nome} por ${preco} ${info.nomeMoeda}?`))) return;
    try {
      await salvarAgora();
      const r = await api<{ save: Save; versao: number; texto: string }>('POST', '/lojas/comprar', { loja, item: id, quantidade: 1 });
      adotarSaveDoServidor(r.save, r.versao);
      aviso = r.texto;
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    janela.redesenhar();
  }

  const campo = el('input', { type: 'search', class: 'db-busca', placeholder: 'Buscar…', 'aria-label': 'Buscar item' }) as HTMLInputElement;
  // a busca só refaz a grade (redesenhar a janela tiraria o foco do campo)
  const grade = el('div', { class: 'loja-liga-grade' });
  campo.addEventListener('input', () => ((busca = campo.value.trim().toLowerCase()), desenharAbas(), desenharGrade()));
  function desenharGrade(): void {
    if (!dados) return;
    const save = carregarSave();
    const saldo = save?.[info.moeda] ?? 0;
    // a ordem do servidor: produtos, depois Z-Crystals / itens de forma, depois as Mega Stones
    const lista = dados[loja].flatMap((p) => {
      const m = comoMostrar(p);
      // com busca, procura em todas as abas
      return m && (busca ? m.nome.toLowerCase().includes(busca) : abaDe(p) === aba) ? [{ p, m }] : [];
    });
    grade.replaceChildren(...lista.map(({ p, m }) => {
      const jaTem = !!p.titulo && !!save?.titulosGanhos?.includes(p.titulo);
      return el('button', { class: 'mercado-item', type: 'button', title: m.descricao, disabled: saldo < p.preco || jaTem, onclick: () => void comprar(p.id, m.nome, p.preco) },
        el('span', { class: 'mercado-icone' }, m.icone),
        el('span', { class: 'mercado-nome' }, m.nome),
        el('span', { class: 'mercado-preco' }, jaTem ? 'Você já tem' : valorEmMoeda(info.moeda, p.preco)));
    }));
  }

  const janela = abrirJanela(info.nome, () => {
    if (!dados) return el('p', { class: 'meta' }, aviso || 'Carregando…');
    const save = carregarSave();
    const saldo = save?.[info.moeda] ?? 0;
    const itens = dados[loja];
    desenharAbas();
    desenharGrade();
    return el('div', { class: 'loja-liga' },
      el('div', { class: 'loja-liga-topo' },
        el('strong', { class: 'loja-liga-saldo' }, 'Suas moedas: ', valorEmMoeda(info.moeda, saldo)),
        el('small', { class: 'meta' }, loja === 'liga' ? 'Ganhe League Coins vencendo a Liga Pokémon. Mega Stones aqui: as das Megas RU e UU.' : 'Ganhe League Coins Nightmare vencendo a Liga Nightmare. Mega Stones aqui: as das Megas OU e Ubers.'),
        itens.length > 8 ? campo : ''),
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso),
      itens.length
        ? el('div', { class: 'loja-liga-corpo' }, abas, grade)
        : el('p', { class: 'meta' }, 'Em breve: a staff ainda vai definir o que esta loja vende.'));
  }, { classe: `janela-loja-liga ${classeTematica(loja === 'liga' ? 'liga' : 'nightmare')}` });

  api<Estado>('GET', '/lojas').then((r) => ((dados = r), janela.redesenhar()), () => ((aviso = 'Sem conexão com o servidor.'), janela.redesenhar()));
}
