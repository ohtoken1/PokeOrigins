// Loja da guilda (pedido do dono; regras em shared/lojaGuilda.ts): paga em Pontos de guilda, a mesma para todos e
// trocada todo mês, com limites de compra por mês. Aberta pela tela da Guilda. Quem vende é o servidor
// (server/src/lojas.ts, `comprarGuilda`).
import type { ProdutoGuilda } from '../../../shared/lojaGuilda';
import { itemDaLoja } from '../../../shared/loja';
import { api, ErroApi } from '../conta';
import { pokemonPorId } from '../dados';
import { adotarSaveDoServidor, carregarSave, salvarAgora, type Save } from '../estado';
import { confirmar } from './confirmar';
import { el, spritePokemon } from './dom';
import { iconeItem } from './iconeItem';
import { abrirJanela } from './janela';

interface Estado { mes: string; trocaEm: number; agora: number; temGuilda: boolean; produtos: ProdutoGuilda[]; compras: Record<string, number> }

const pontos = (n: number) => el('span', { class: 'pontos-guilda', title: 'Pontos de guilda' }, '🛡️ ', el('strong', {}, String(n)));

function comoMostrar(p: ProdutoGuilda): { nome: string; descricao: string; icone: HTMLElement } {
  if (p.inicial) {
    const e = pokemonPorId(p.inicial);
    return { nome: e.nome, descricao: 'Inicial do mês: nível 1, cada IV de 10 a 31 e 5% de chance de shiny.', icone: spritePokemon(e, { animado: false }) };
  }
  if (p.aleatorio) return { nome: p.nome ?? p.id, descricao: p.aleatorio === 'mint' ? 'Uma Mint sorteada na compra.' : p.aleatorio === 'terashard' ? 'Um tipo sorteado na compra: as 10 Tera Shards vêm desse tipo. 50 do mesmo tipo trocam o Tera Type de um Pokémon.' : 'Um Charm de tipo sorteado na compra.', icone: el('span', { class: 'icone-simbolo' }, '❔') };
  const i = itemDaLoja(p.item!);
  return { nome: `${i?.nome ?? p.item} ×${p.quantidade}`, descricao: i?.descricao ?? '', icone: i ? iconeItem(i) : el('span', {}, '?') };
}

export function abrirLojaDaGuilda(): void {
  let dados: Estado | null = null;
  let aviso = '';

  async function comprar(p: ProdutoGuilda, nome: string): Promise<void> {
    if (!(await confirmar('Loja da guilda', `Comprar ${nome} por ${p.preco} ${p.preco === 1 ? 'Ponto' : 'Pontos'} de guilda?`))) return;
    try {
      await salvarAgora();
      const r = await api<Estado & { save: Save; versao: number; texto: string }>('POST', '/lojas/guilda/comprar', { produto: p.id, quantidade: 1 });
      adotarSaveDoServidor(r.save, r.versao);
      dados = r;
      aviso = r.texto;
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    janela.redesenhar();
  }

  const janela = abrirJanela('Loja da guilda', () => {
    if (!dados) return el('p', { class: 'meta' }, aviso || 'Carregando…');
    const saldo = carregarSave()?.pontosGuilda ?? 0;
    const troca = new Date(dados.trocaEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
    return el('div', { class: 'loja-liga' },
      el('div', { class: 'loja-liga-topo' },
        el('strong', { class: 'loja-liga-saldo' }, 'Seus pontos: ', pontos(saldo)),
        el('small', { class: 'meta' }, `Ganhe Pontos de guilda lutando no Boss da guilda. A loja é a mesma para todos e troca no dia ${troca}; os limites de compra também zeram nesse dia.`)),
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso),
      dados.temGuilda ? null : el('p', { class: 'meta' }, 'Entre numa guilda para comprar aqui.'),
      el('div', { class: 'loja-liga-grade' }, ...dados.produtos.map((p) => {
        const m = comoMostrar(p);
        const feitas = dados!.compras[p.id] ?? 0;
        const esgotou = feitas >= p.limite;
        return el('button', { class: 'mercado-item', type: 'button', title: m.descricao, disabled: !dados!.temGuilda || esgotou || saldo < p.preco, onclick: () => void comprar(p, m.nome) },
          el('span', { class: 'mercado-icone' }, m.icone),
          el('span', { class: 'mercado-nome' }, m.nome),
          el('span', { class: 'mercado-preco' }, pontos(p.preco)),
          el('small', { class: 'loja-guilda-limite' }, esgotou ? 'Esgotado este mês' : `${feitas}/${p.limite} este mês`));
      })));
  }, { classe: 'janela-loja-liga' });

  api<Estado>('GET', '/lojas/guilda').then((r) => ((dados = r), janela.redesenhar()), () => ((aviso = 'Sem conexão com o servidor.'), janela.redesenhar()));
}
