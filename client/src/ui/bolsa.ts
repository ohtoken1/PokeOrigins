import { especie, hpMaximo, nomeGolpe, ppMaximo, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { evoluir, trocarGolpe } from '../../../shared/batalha/progresso';
import { ITENS, usarRemedio, type ItemId } from '../../../shared/itens';
import { CATEGORIAS_BOLSA as CATEGORIAS, CABO_DE_LIGACAO, SHARDS_POR_TROCA, itemDaLoja, type CategoriaLoja, type ItemLoja } from '../../../shared/loja';
import { ehEquipavel, evolucaoPorItem, nomeItemEquipado, podeAprenderPorMaquina } from '../../../shared/usoItens';
import { pokemonPorId, todosOsPokemons } from '../dados';
import { registrarCapturado, salvar, type Save } from '../estado';
import { abrirJanela } from './janela';
import { corTipo, el } from './dom';
import { dicaGolpe } from './dicaGolpe';
import { Dex } from '@pkmn/sim';
import { iconeItem } from './iconeItem';
import { cartaoPokemon } from './time';
import { abrirJanelaTicket } from './ticket';
import { abrirJanelaOvo } from './ovo';

const ACAO: Partial<Record<CategoriaLoja, string>> = {
  remedios: 'Usar',
  evolucao: 'Usar',
  batalha: 'Equipar',
  frutas: 'Equipar',
  gems: 'Equipar',
  placas: 'Equipar',
  memorias: 'Equipar',
  zcristais: 'Equipar',
  lendarios: 'Equipar',
  terashards: 'Usar',
  tm: 'Ensinar',
  tr: 'Ensinar',
  tickets: 'Abrir',
  ovos: 'Chocar',
};

type Modo =
  | { tipo: 'lista' }
  | { tipo: 'alvo'; item: ItemLoja }
  | { tipo: 'esquecer'; p: PokemonIndividual; golpe: string; aoAprender: () => void; aoDesistir: () => void };

/** Bolsa fora da batalha: ver itens, usar remédios e pedras, ensinar TMs/TRs, equipar itens. */
export function abrirBolsa(save: Save, aoMudar: () => void): void {
  let aba: CategoriaLoja = 'remedios';
  let modo: Modo = { tipo: 'lista' };
  let aviso = '';
  /** Golpes que ainda precisam de decisão (ex.: aprendidos ao evoluir com 4 golpes). */
  const fila: Extract<Modo, { tipo: 'esquecer' }>[] = [];

  const nome = (p: PokemonIndividual) => pokemonPorId(p.especieId).nome;
  // evoluções de qualquer região carregada (ex.: Onix + Metal Coat → Steelix de Johto)
  const existe = (numero: number) => todosOsPokemons().some((d) => d.id === numero);
  const gastar = (id: string) => {
    save.itens[id] = (save.itens[id] ?? 0) - 1;
    if (save.itens[id] <= 0) delete save.itens[id];
  };
  const concluir = (mensagem: string) => {
    aviso = mensagem;
    salvar(save);
    aoMudar();
    modo = fila.shift() ?? { tipo: 'lista' };
  };

  /** Aprende na hora se tiver vaga; senão pergunta qual golpe esquecer. */
  const aprender = (p: PokemonIndividual, golpe: string, aoAprender: () => void, aoDesistir: () => void) => {
    if (p.golpes.length < 4) {
      p.golpes.push({ id: golpe, pp: ppMaximo(golpe) });
      aoAprender();
      return `${nome(p)} aprendeu ${nomeGolpe(golpe)}!`;
    }
    fila.push({ tipo: 'esquecer', p, golpe, aoAprender, aoDesistir });
    return null;
  };

  const aplicar = (item: ItemLoja, p: PokemonIndividual): string | null => {
    const quem = nome(p);
    switch (item.categoria) {
      case 'remedios': {
        const msg = usarRemedio(ITENS[item.id as ItemId], p, quem);
        if (msg) gastar(item.id);
        return msg ?? 'Não teria efeito.';
      }
      case 'evolucao': {
        const para = evolucaoPorItem(p, item.id, existe);
        if (!para) return `${item.nome} não tem efeito em ${quem}.`;
        gastar(item.id);
        // troca com item (ex.: Metal Coat): o item equipado é gasto na evolução
        if (item.id === CABO_DE_LIGACAO && especie(para).evoItem) p.item = null;
        const r = evoluir(p, para, (n) => pokemonPorId(n).nome);
        registrarCapturado(save, para);
        for (const golpe of r.golpesPendentes) aprender(p, golpe, () => {}, () => {});
        return [`${quem} evoluiu para ${pokemonPorId(para).nome}!`, ...r.mensagens].join(' ');
      }
      case 'batalha':
      case 'frutas':
      case 'gems':
      case 'placas':
      case 'memorias':
      case 'zcristais':
      case 'lendarios': {
        if (!ehEquipavel(item.id)) return 'Esse item não pode ser equipado.';
        gastar(item.id);
        const antigo = p.item;
        if (antigo) save.itens[antigo] = (save.itens[antigo] ?? 0) + 1;
        p.item = item.id;
        return `${quem} agora segura ${item.nome}.${antigo ? ` (${nomeItemEquipado(antigo)} voltou para a bolsa)` : ''}`;
      }
      case 'terashards': {
        // como em Scarlet/Violet: SHARDS_POR_TROCA shards do tipo trocam o Tera Type
        const tipo = item.teraTipo!;
        if ((p.teraTipo ?? especie(p.especieId).types[0]) === tipo) return `O Tera Type de ${quem} já é ${tipo}.`;
        if ((save.itens[item.id] ?? 0) < SHARDS_POR_TROCA) return `Precisa de ${SHARDS_POR_TROCA} ${item.nome} (você tem ${save.itens[item.id] ?? 0}).`;
        save.itens[item.id] -= SHARDS_POR_TROCA;
        if (save.itens[item.id] <= 0) delete save.itens[item.id];
        p.teraTipo = tipo;
        return `O Tera Type de ${quem} agora é ${tipo}!`;
      }
      case 'tm':
      case 'tr': {
        const golpe = item.golpe!;
        if (p.golpes.some((g) => g.id === golpe)) return `${quem} já conhece ${nomeGolpe(golpe)}.`;
        if (!podeAprenderPorMaquina(p, golpe)) return `${quem} não pode aprender ${nomeGolpe(golpe)}.`;
        return aprender(p, golpe, () => gastar(item.id), () => {}) ?? '';
      }
      default:
        return null;
    }
  };

  abrirJanela('Bolsa', (janela) => {
    const refazer = () => janela.redesenhar();

    if (modo.tipo === 'esquecer') {
      const m = modo;
      return el(
        'div',
        { class: 'bolsa' },
        el('p', {}, `${nome(m.p)} quer aprender `, dicaGolpe(el('span', { class: 'golpe-novo', style: { '--cor-tipo': corTipo(Dex.moves.get(m.golpe).type) } }, nomeGolpe(m.golpe)), m.golpe), ', mas já conhece 4 golpes. Esquecer qual?'),
        el(
          'div',
          { class: 'lista-golpes-escolha' },
          m.p.golpes.map((g, i) =>
            dicaGolpe(el(
              'button',
              {
                class: 'botao secundario',
                onclick: () => {
                  const esquecido = nomeGolpe(g.id);
                  trocarGolpe(m.p, i, m.golpe);
                  m.aoAprender();
                  concluir(`${nome(m.p)} esqueceu ${esquecido} e aprendeu ${nomeGolpe(m.golpe)}!`);
                  refazer();
                },
              },
              nomeGolpe(g.id),
            ), g.id, () => ({ atual: g.pp, max: ppMaximo(g.id) })),
          ),
        ),
        el(
          'button',
          {
            class: 'botao',
            onclick: () => {
              m.aoDesistir();
              concluir(`${nome(m.p)} não aprendeu ${nomeGolpe(m.golpe)}.`);
              refazer();
            },
          },
          `Não aprender ${nomeGolpe(m.golpe)}`,
        ),
      );
    }

    if (modo.tipo === 'alvo') {
      const item = modo.item;
      return el(
        'div',
        { class: 'bolsa' },
        el('p', {}, `${ACAO[item.categoria]} ${item.nome} em qual Pokémon?`),
        el(
          'div',
          { class: 'vagas' },
          save.time.map((p) =>
            cartaoPokemon(p, {
              onclick: () => {
                const msg = aplicar(item, p);
                if (msg) concluir(msg);
                else {
                  // vai perguntar qual golpe esquecer
                  modo = fila.shift() ?? { tipo: 'lista' };
                }
                refazer();
              },
            }),
          ),
        ),
        el('button', { class: 'botao secundario', onclick: () => ((modo = { tipo: 'lista' }), refazer()) }, '← Voltar'),
      );
    }

    // lista por categoria (só mostra o que o jogador tem)
    const meus = Object.entries(save.itens)
      .filter(([, qtd]) => qtd > 0)
      .map(([id, qtd]) => ({ item: itemDaLoja(id), qtd }))
      .filter((x): x is { item: ItemLoja; qtd: number } => !!x.item);
    const comItens = CATEGORIAS.filter((c) => meus.some((m) => m.item.categoria === c.id));
    if (!comItens.some((c) => c.id === aba) && comItens.length) aba = comItens[0].id;

    return el(
      'div',
      { class: 'bolsa' },
      aviso && el('p', { class: 'aviso-bolsa' }, aviso),
      el(
        'nav',
        { class: 'abas abas-loja' },
        comItens.map((c) => el('button', { class: `aba ${c.id === aba ? 'ativa' : ''}`, onclick: () => ((aba = c.id), (aviso = ''), refazer()) }, c.nome)),
      ),
      meus.length === 0 && el('p', { class: 'meta' }, 'A bolsa está vazia. Compre itens na Loja.'),
      el(
        'section',
        {},
        meus
          .filter((m) => m.item.categoria === aba)
          .map(({ item, qtd }) =>
            el(
              'div',
              { class: 'linha-item' },
              iconeItem(item),
              el('div', { class: 'texto' }, el('strong', {}, item.nome), el('p', {}, item.descricao)),
              el('span', { class: 'quantidade' }, `×${qtd}`),
              ACAO[item.categoria] &&
                el(
                  'button',
                  {
                    class: 'botao',
                    onclick: () => {
                      aviso = '';
                      if (item.categoria === 'ovos') {
                        abrirJanelaOvo(save, item.id, () => {
                          aoMudar();
                          refazer();
                        });
                      } else if (item.categoria === 'tickets') {
                        // abre o ticket numa janela própria (sorteio animado)
                        abrirJanelaTicket(save, item.id, () => {
                          aoMudar();
                          refazer();
                        });
                      } else if (ITENS[item.id]?.reviverTime) {
                        // Sacred Ash: revive todo o time de uma vez, sem escolher alvo
                        const revividos = save.time.filter((p) => p.hp <= 0);
                        if (!revividos.length) aviso = 'Não teria efeito.';
                        else {
                          for (const p of revividos) p.hp = hpMaximo(p);
                          gastar(item.id);
                          concluir(`${revividos.map(nome).join(', ')} ${revividos.length > 1 ? 'foram revividos' : 'foi revivido'}!`);
                        }
                      } else modo = { tipo: 'alvo', item };
                      refazer();
                    },
                  },
                  ACAO[item.categoria]!,
                ),
            ),
          ),
      ),
    );
  });
}
