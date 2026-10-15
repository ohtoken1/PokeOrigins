// Loja do Viajante do tempo (NPC da praça da cidade): vende os cubos dos Pokémon do passado e do futuro, pagos em
// Fragmentos Temporais (`save.fragmentos`). Parecida com o Pokémarket, com abas Passado / Futuro / Lendário.
import { CUBOS, ICONE_FRAGMENTO, NOME_FRAGMENTO, PRECO_CHAVE_TEMPORAL, PRECO_CUBO, RECICLAGEM_CUBO, type Cubo, type EraCubo } from '../../../shared/itensCustom';
import { confirmar } from './confirmar';
import { itemDaLoja } from '../../../shared/loja';
import { CHAVE_TEMPORAL } from '../../../shared/tickets';
import { pokemonPorId } from '../dados';
import { salvar, type Save } from '../estado';
import { el } from './dom';
import { iconeItem } from './iconeItem';
import { abrirJanela } from './janela';

const ERAS: { id: EraCubo; nome: string }[] = [
  { id: 'passado', nome: 'Passado' },
  { id: 'futuro', nome: 'Futuro' },
  { id: 'lendario', nome: 'Lendário' },
];
const numero = (n: number) => n.toLocaleString('pt-BR');

/** Desenho da moeda: um reloginho quebrado no meio. */
export const iconeFragmento = (): HTMLElement => el('img', { class: 'icone-fragmento', src: ICONE_FRAGMENTO, alt: NOME_FRAGMENTO, title: NOME_FRAGMENTO });
const plural = (n: number) => (n === 1 ? NOME_FRAGMENTO : 'Fragmentos Temporais');

export function abrirLojaTemporal(save: Save, aoMudar: () => void = () => {}): void {
  let era: EraCubo = 'passado';
  let aviso = '';
  const saldo = () => save.fragmentos ?? 0;

  const janela = abrirJanela('Viajante do tempo', () => {
    const comprarChave = () => {
      if (saldo() < PRECO_CHAVE_TEMPORAL) aviso = 'Faltam Fragmentos Temporais para a Chave Temporal.';
      else {
        save.fragmentos = saldo() - PRECO_CHAVE_TEMPORAL;
        save.itens[CHAVE_TEMPORAL.id] = (save.itens[CHAVE_TEMPORAL.id] ?? 0) + 1;
        salvar(save);
        aoMudar();
        aviso = `Comprou a Chave Temporal por ${numero(PRECO_CHAVE_TEMPORAL)} ${plural(PRECO_CHAVE_TEMPORAL)}. Ela está na aba Orbs da bolsa.`;
      }
      janela.redesenhar();
    };
    const chave = itemDaLoja(CHAVE_TEMPORAL.id);
    const comprar = (cubo: Cubo) => {
      const preco = PRECO_CUBO[cubo.era];
      if (saldo() < preco) aviso = `Faltam Fragmentos Temporais para o ${cubo.nome}.`;
      else {
        save.fragmentos = saldo() - preco;
        save.itens[cubo.id] = (save.itens[cubo.id] ?? 0) + 1;
        salvar(save);
        aoMudar();
        aviso = `Comprou ${cubo.nome} por ${numero(preco)} ${plural(preco)}. Ele está na aba Cubos da bolsa.`;
      }
      janela.redesenhar();
    };
    // reciclagem (pedido do dono): o cubo que o jogador não quer vira Fragmentos Temporais para comprar outro
    const desmontar = async (cubo: Cubo) => {
      const valor = RECICLAGEM_CUBO[cubo.era];
      if (!(save.itens[cubo.id] > 0)) return;
      if (!(await confirmar('Desmontar cubo', `Desmontar 1 ${cubo.nome} e receber ${numero(valor)} ${plural(valor)}? Não tem volta.`))) return;
      if (!(save.itens[cubo.id] > 0)) return;
      save.itens[cubo.id] -= 1;
      if (save.itens[cubo.id] <= 0) delete save.itens[cubo.id];
      save.fragmentos = saldo() + valor;
      salvar(save);
      aoMudar();
      aviso = `Desmontou ${cubo.nome} e recebeu ${numero(valor)} ${plural(valor)}.`;
      janela.redesenhar();
    };
    return el('div', { class: 'loja loja-temporal' },
      el('div', { class: 'topo-loja' }, el('span', { class: 'saldo' }, 'Saldo: ', iconeFragmento(), el('strong', {}, numero(saldo())), ` ${plural(saldo())}`)),
      el('p', { class: 'meta' }, 'Cada cubo transforma um Pokémon na versão dele de outra era. Compre o cubo e use pela bolsa, como uma pedra de evolução. Não quer um cubo que tem? Desmonte e receba Fragmentos Temporais de volta.'),
      el('div', { class: 'lista-loja' },
        el('div', { class: 'linha-item' },
          chave ? iconeItem(chave) : '',
          el('div', { class: 'texto' }, el('strong', {}, 'Chave Temporal'), el('p', {}, 'Abre e sorteia um cubo do passado ou do futuro (1% de Koraidon ou Miraidon).')),
          el('span', { class: 'quantidade', title: 'Na bolsa' }, `×${save.itens[CHAVE_TEMPORAL.id] ?? 0}`),
          el('span', { class: 'preco' }, iconeFragmento(), numero(PRECO_CHAVE_TEMPORAL)),
          el('div', { class: 'botoes-cubo' }, el('button', { class: 'botao', disabled: saldo() < PRECO_CHAVE_TEMPORAL, onclick: comprarChave }, 'Comprar')))),
      el('nav', { class: 'abas abas-loja' },
        ...ERAS.map((e) => el('button', { class: `aba ${e.id === era ? 'ativa' : ''}`, onclick: () => ((era = e.id), (aviso = ''), janela.redesenhar()) }, e.nome))),
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso),
      el('div', { class: 'lista-loja' },
        ...CUBOS.filter((c) => c.era === era).map((cubo) => {
          const item = itemDaLoja(cubo.id);
          const preco = PRECO_CUBO[cubo.era];
          return el('div', { class: 'linha-item' },
            item ? iconeItem(item) : '',
            el('div', { class: 'texto' },
              el('strong', {}, cubo.nome),
              el('p', {}, el('span', { class: 'origem' }, `Usar em ${cubo.origens.map((n) => pokemonPorId(n).nome).join(' ou ')}`), ` → ${pokemonPorId(cubo.especie).nome}`)),
            el('span', { class: 'quantidade', title: 'Na bolsa' }, `×${save.itens[cubo.id] ?? 0}`),
            el('span', { class: 'preco' }, iconeFragmento(), numero(preco)),
            el('div', { class: 'botoes-cubo' },
              el('button', { class: 'botao', disabled: saldo() < preco, onclick: () => comprar(cubo) }, 'Comprar'),
              (save.itens[cubo.id] ?? 0) > 0
                ? el('button', { class: 'botao botao-desmontar', title: `Recebe ${numero(RECICLAGEM_CUBO[cubo.era])} ${plural(RECICLAGEM_CUBO[cubo.era])}`, onclick: () => void desmontar(cubo) }, `Desmontar (+${numero(RECICLAGEM_CUBO[cubo.era])})`)
                : null));
        })));
  }, { classe: 'janela-loja' });
}
