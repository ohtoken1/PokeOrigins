// NPC de craft da cidade (perto da horta grande, lado leste): Pokébolas com Apricorns, Charms com Berries + Energies
// e os canteiros onde se plantam Berries e Apricorns. Regras em shared/craft.ts (planilha do dono). Como o resto do
// save, ainda é feito no navegador.
import {
  BOLAS_POR_CRAFT,
  BERRIES_POR_CHARM,
  CHARMS_POR_CRAFT,
  CHARMS_POR_CRAFT_VIP,
  ENERGIES_POR_CHARM,
  PRECO_CRAFT_BOLA,
  PRECO_CRAFT_BOLA_VIP,
  PRECO_CRAFT_CHARM,
  PRECO_SEMENTE,
  RECEITAS_BOLA,
  RECEITAS_CHARM,
  atualizarCanteiro,
  canteiroPronto,
  canteiroSeco,
  colheitaDe,
  idApricornDaCor,
  plantar,
  regar,
  tempoParaCrescer,
  type Canteiro,
} from '../../../shared/craft';
import { itemDaLoja } from '../../../shared/loja';
import { CORES_DOS_APRICORNS, idApricorn } from '../../../shared/materiais';
import { itensDoGrupo } from '../../../shared/tickets';
import { textoTranca, type ConteudoTrancado } from '../../../shared/trancas';
import { nivelTreinador } from '../../../shared/treinador';
import { vipAtivo } from '../../../shared/vip';
import { salvar, type Save } from '../estado';
import { conteudoLiberado } from '../trancas';
import { confirmar } from './confirmar';
import { el } from './dom';
import { iconeItem } from './iconeItem';
import { abrirJanela } from './janela';
import { valorEmMoeda } from './moeda';

type Aba = 'bolas' | 'charms' | 'canteiros';
const ABAS: { id: Aba; nome: string; tranca: ConteudoTrancado }[] = [
  { id: 'bolas', nome: 'Pokébolas', tranca: 'craftBola' },
  { id: 'charms', nome: 'Charms', tranca: 'craftCharm' },
  { id: 'canteiros', nome: 'Canteiros', tranca: 'canteiros' },
];
const numero = (n: number) => n.toLocaleString('pt-BR');
const nomeItem = (id: string) => itemDaLoja(id)?.nome ?? id;
const icone = (id: string) => {
  const item = itemDaLoja(id);
  return item ? iconeItem(item) : el('span', {}, id);
};
const tenho = (save: Save, id: string) => save.itens[id] ?? 0;
function gastar(save: Save, id: string, n: number): void {
  save.itens[id] = tenho(save, id) - n;
  if (save.itens[id] <= 0) delete save.itens[id];
}
const ganhar = (save: Save, id: string, n: number) => (save.itens[id] = tenho(save, id) + n);

/** Tudo o que pode ser plantado: todas as Berries e os 7 Apricorns (pedido do dono), em ordem de nome. */
const PLANTAS = [...CORES_DOS_APRICORNS.map(idApricorn), ...itensDoGrupo('fruta').filter((id) => itemDaLoja(id)).sort((a, b) => nomeItem(a).localeCompare(nomeItem(b)))];

const duracao = (ms: number) => {
  const min = Math.max(0, Math.ceil(ms / 60_000));
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
};

export function abrirCraft(save: Save, aoMudar: () => void = () => {}): void {
  let aba: Aba = 'bolas';
  let aviso = '';
  let semente = PLANTAS[0];
  const mudou = (texto: string) => {
    salvar(save);
    aoMudar();
    aviso = texto;
    janela.redesenhar();
  };

  // ---------- Pokébolas ----------
  const abaBolas = () => {
    const preco = vipAtivo(save) ? PRECO_CRAFT_BOLA_VIP : PRECO_CRAFT_BOLA;
    return el('div', { class: 'craft-lista' },
      el('p', { class: 'meta' }, `Cada receita gasta 1 Apricorn de cada cor e ${numero(preco)} Poké Dólares${vipAtivo(save) ? ' (preço VIP)' : ''}, e dá ${BOLAS_POR_CRAFT} Pokébolas.`),
      ...Object.entries(RECEITAS_BOLA).map(([bola, cores]) => {
        const ids = cores.map(idApricornDaCor);
        const maximo = Math.min(...ids.map((id) => tenho(save, id)), Math.floor(save.silver / preco));
        const campo = el('input', { type: 'number', min: '1', max: String(Math.max(1, maximo)), value: '1', class: 'craft-qtd', disabled: maximo < 1, 'aria-label': 'Quantas receitas' }) as HTMLInputElement;
        return el('div', { class: 'linha-item craft-linha' },
          icone(bola),
          el('div', { class: 'texto' }, el('strong', {}, nomeItem(bola)),
            el('div', { class: 'craft-ingredientes' }, ...ids.map((id) => el('span', { class: `craft-ingrediente ${tenho(save, id) < 1 ? 'falta' : ''}` }, icone(id), `${numero(tenho(save, id))}/1`)), valorEmMoeda('silver', preco))),
          campo,
          el('button', {
            class: 'botao', disabled: maximo < 1,
            onclick: async () => {
              const n = Math.max(1, Math.min(maximo, Math.floor(Number(campo.value) || 1)));
              if (!(await confirmar('Criar Pokébolas', `Gastar ${n}× ${ids.map(nomeItem).join(' + ')} e ${numero(n * preco)} Poké Dólares para criar ${n * BOLAS_POR_CRAFT} ${nomeItem(bola)}?`))) return;
              if (Math.min(...ids.map((id) => tenho(save, id))) < n || save.silver < n * preco) return;
              ids.forEach((id) => gastar(save, id, n));
              save.silver -= n * preco;
              ganhar(save, bola, n * BOLAS_POR_CRAFT);
              mudou(`Criou ${n * BOLAS_POR_CRAFT} ${nomeItem(bola)}! Estão na bolsa.`);
            },
          }, 'Criar'));
      }));
  };

  // ---------- Charms ----------
  const abaCharms = () => {
    const vip = vipAtivo(save);
    const sai = vip ? CHARMS_POR_CRAFT_VIP : CHARMS_POR_CRAFT;
    return el('div', { class: 'craft-lista' },
      el('p', { class: 'meta' }, `Cada Charm gasta ${BERRIES_POR_CHARM} Berries do tipo, ${ENERGIES_POR_CHARM} Energies do tipo e ${numero(PRECO_CRAFT_CHARM)} Poké Dólares. ${vip ? 'VIP: cada receita dá 2 Charms.' : 'VIP recebe 2 Charms por receita.'}`),
      ...RECEITAS_CHARM.map((r) => {
        const pode = tenho(save, r.berry) >= BERRIES_POR_CHARM && tenho(save, r.energia) >= ENERGIES_POR_CHARM && save.silver >= PRECO_CRAFT_CHARM;
        const ingrediente = (id: string, precisa: number) => el('span', { class: `craft-ingrediente ${tenho(save, id) < precisa ? 'falta' : ''}` }, icone(id), `${numero(tenho(save, id))}/${precisa}`);
        return el('div', { class: 'linha-item craft-linha' },
          icone(r.charm),
          el('div', { class: 'texto' }, el('strong', {}, nomeItem(r.charm)),
            el('div', { class: 'craft-ingredientes' }, ingrediente(r.berry, BERRIES_POR_CHARM), ingrediente(r.energia, ENERGIES_POR_CHARM), valorEmMoeda('silver', PRECO_CRAFT_CHARM))),
          el('button', {
            class: 'botao', disabled: !pode,
            onclick: async () => {
              if (!(await confirmar('Criar Charm', `Gastar ${BERRIES_POR_CHARM} ${nomeItem(r.berry)}, ${ENERGIES_POR_CHARM} ${nomeItem(r.energia)} e ${numero(PRECO_CRAFT_CHARM)} Poké Dólares para criar ${sai} ${nomeItem(r.charm)}?`))) return;
              if (tenho(save, r.berry) < BERRIES_POR_CHARM || tenho(save, r.energia) < ENERGIES_POR_CHARM || save.silver < PRECO_CRAFT_CHARM) return;
              gastar(save, r.berry, BERRIES_POR_CHARM);
              gastar(save, r.energia, ENERGIES_POR_CHARM);
              save.silver -= PRECO_CRAFT_CHARM;
              ganhar(save, r.charm, sai);
              mudou(`Criou ${sai} ${nomeItem(r.charm)}! ${sai > 1 ? 'Estão' : 'Está'} na bolsa.`);
            },
          }, 'Criar'));
      }));
  };

  // ---------- canteiros ----------
  const abaCanteiros = () => {
    const agora = Date.now();
    const vip = vipAtivo(save);
    const quantos = Math.max(1, nivelTreinador(save.xpTreinador));
    const canteiros: Canteiro[] = (save.canteiros ??= []);
    while (canteiros.length < quantos) canteiros.push({});
    const meus = canteiros.slice(0, quantos);
    meus.forEach((c) => atualizarCanteiro(c, agora, vip));
    const vazios = meus.filter((c) => !c.planta);
    const prontos = meus.filter((c) => canteiroPronto(c, vip));
    const secos = meus.filter((c) => canteiroSeco(c, agora, vip));

    const plantarEm = async (lista: Canteiro[]) => {
      const custo = lista.length * PRECO_SEMENTE;
      if (save.silver < custo) return mudou(`Faltam Poké Dólares: ${lista.length} sementes custam ${numero(custo)}.`);
      if (!(await confirmar('Plantar', `Comprar ${lista.length} semente${lista.length > 1 ? 's' : ''} de ${nomeItem(semente)} por ${numero(custo)} Poké Dólares e plantar? A semente não volta na colheita.`))) return;
      if (save.silver < custo) return;
      save.silver -= custo;
      lista.forEach((c) => plantar(c, semente, Date.now()));
      mudou(`Plantou ${lista.length}× ${nomeItem(semente)}.`);
    };
    const colher = (lista: Canteiro[]) => {
      const ganhos = new Map<string, number>();
      for (const c of lista) {
        const n = colheitaDe(c.planta!, vip);
        ganhar(save, c.planta!, n);
        ganhos.set(c.planta!, (ganhos.get(c.planta!) ?? 0) + n);
        for (const k of Object.keys(c)) delete c[k as keyof Canteiro];
      }
      mudou(`Colheu ${[...ganhos].map(([id, n]) => `${n}× ${nomeItem(id)}`).join(', ')}. Está na bolsa.`);
    };
    const regarTodos = (lista: Canteiro[]) => {
      lista.forEach((c) => regar(c, Date.now(), vip));
      mudou(`Regou ${lista.length} canteiro${lista.length > 1 ? 's' : ''}.`);
    };

    const seletor = el('select', { class: 'craft-semente', 'aria-label': 'Semente', onchange: (e: Event) => (semente = (e.target as HTMLSelectElement).value) },
      ...PLANTAS.map((id) => el('option', { value: id, selected: id === semente }, nomeItem(id)))) as HTMLSelectElement;

    return el('div', { class: 'craft-canteiros' },
      el('p', { class: 'meta' }, `Você tem ${quantos} canteiro${quantos > 1 ? 's' : ''} (um por nível de treinador). Cada semente custa ${numero(PRECO_SEMENTE)} Poké Dólares e não volta na colheita. ${vip ? 'VIP: cresce sem precisar regar, mais rápido e colhe mais.' : 'Regue a cada 1 hora: sem água, a planta para de crescer (nada morre).'} Berry: ${numero(colheitaDe('oranberry', vip))} por canteiro; Apricorn: ${numero(colheitaDe('apricorn-red', vip))}.`),
      el('div', { class: 'craft-acoes' },
        el('label', {}, 'Semente: ', seletor),
        el('button', { class: 'botao', disabled: !vazios.length, onclick: () => void plantarEm(vazios) }, `Plantar nos vazios (${vazios.length})`),
        !vip ? el('button', { class: 'botao secundario', disabled: !secos.length, onclick: () => regarTodos(secos) }, `💧 Regar (${secos.length})`) : null,
        el('button', { class: 'botao secundario', disabled: !prontos.length, onclick: () => colher(prontos) }, `Colher tudo (${prontos.length})`)),
      el('div', { class: 'craft-grade' },
        ...meus.map((c, i) => {
          if (!c.planta) return el('div', { class: 'canteiro vazio' }, el('small', {}, `Canteiro ${i + 1}`), el('span', { class: 'canteiro-terra' }), el('button', { class: 'botao secundario', onclick: () => void plantarEm([c]) }, 'Plantar'));
          const total = tempoParaCrescer(c.planta, vip);
          const pronto = canteiroPronto(c, vip);
          const seco = canteiroSeco(c, agora, vip);
          const falta = total - (c.crescido ?? 0);
          return el('div', { class: `canteiro ${pronto ? 'pronto' : seco ? 'seco' : 'crescendo'}`, title: nomeItem(c.planta) },
            el('small', {}, `Canteiro ${i + 1}`),
            icone(c.planta),
            el('span', { class: 'barra-exp canteiro-barra' }, el('span', { class: 'preenchido', style: { width: `${Math.min(100, ((c.crescido ?? 0) / total) * 100)}%` } })),
            el('small', { class: 'canteiro-estado' }, pronto ? 'Pronto!' : seco ? '💧 Sem água' : `Falta ${duracao(falta)}`),
            pronto
              ? el('button', { class: 'botao', onclick: () => colher([c]) }, 'Colher')
              : !vip ? el('button', { class: 'botao secundario', onclick: () => regarTodos([c]) }, seco ? 'Regar' : `💧 ${duracao((c.regadoAte ?? 0) - agora)}`) : null);
        })));
  };

  const janela = abrirJanela('Artesã', () => {
    const atual = ABAS.find((a) => a.id === aba)!;
    return el('div', { class: 'craft' },
      el('nav', { class: 'abas abas-loja' },
        ...ABAS.map((a) => el('button', { class: `aba ${a.id === aba ? 'ativa' : ''}`, onclick: () => ((aba = a.id), (aviso = ''), janela.redesenhar()) }, a.nome))),
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso),
      !conteudoLiberado(atual.tranca) ? el('p', { class: 'meta craft-tranca' }, `${atual.nome}: ${textoTranca(atual.tranca)}.`)
        : aba === 'bolas' ? abaBolas() : aba === 'charms' ? abaCharms() : abaCanteiros());
  }, { classe: 'janela-loja janela-craft' });
  // os canteiros crescem com a janela aberta
  const relogio = window.setInterval(() => {
    if (!document.body.contains(document.querySelector('.janela-craft'))) return clearInterval(relogio);
    if (aba === 'canteiros') janela.redesenhar();
  }, 30_000);
}
