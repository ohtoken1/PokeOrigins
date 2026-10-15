import { ATRIBUTOS, especie, golpesIniciais, hpMaximo, nomeGolpe, ppMaximo, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { evoluir, trocarGolpe } from '../../../shared/batalha/progresso';
import { ITENS, usarRemedio, type ItemId } from '../../../shared/itens';
import { CATEGORIAS_BOLSA as CATEGORIAS, CABO_DE_LIGACAO, SHARDS_POR_TROCA, itemDaLoja, type CategoriaLoja, type ItemLoja } from '../../../shared/loja';
import { SEGURAR_OU_EVOLUIR, ehEquipavel, ehItemDeHabilidade, usarItemDeHabilidade, especiePodeTerGolpe, evolucaoPorItem, nomeItemEquipado, podeAprenderPorMaquina } from '../../../shared/usoItens';
import { KIT_INICIANTE, cuboPorItem, ehSeloSazonal } from '../../../shared/itensCustom';
import { sortearKit } from '../../../shared/kitIniciante';
import { PASSE_PREMIUM } from '../../../shared/passeTemporadas';
import { ativarPremium } from '../passe';
import { FUSOES, GOLPE_DA_FORMA, ehItemDeForma, ivDaFusao, jaMudouDeForma, outrasFormas, proximaForma } from '../../../shared/formasPorItem';
import { BOXES_INICIAIS, BOXES_MAXIMO, BOX_POKEMON, numeroDeBoxes, podeAbrirBox } from '../../../shared/pc';
import { charmAte, charmAtivo, nomeCharm, tipoDoCharm, usarCharm } from '../../../shared/charms';
import { textoDoTempo } from '../../../shared/viagem';
import { pokemonPorId, todosOsPokemons } from '../dados';
import { guardarNoPC, registrarCapturado, salvar, salvarAgora, type PokemonDoJogador, type Save } from '../estado';
import { ehSkin, moverSkin, quantidadeNt, skinsNaBolsa } from '../../../shared/skins';
import { abrirJanela } from './janela';
import { confirmar } from './confirmar';
import { corTipo, el, seloTipo, spritePokemon } from './dom';
import { dicaGolpe } from './dicaGolpe';
import { Dex } from '@pkmn/sim';
import { iconeItem } from './iconeItem';
import { cartaoPokemon } from './time';
import { abrirJanelaTicket } from './ticket';
import { abrirJanelaOvo } from './ovo';
import { marcarConquista } from '../conquistas';
import { animarEvolucaoNaTela } from '../batalha/animacoes';

const ACAO: Partial<Record<CategoriaLoja, string>> = {
  remedios: 'Usar',
  evolucao: 'Usar',
  batalha: 'Equipar',
  up: 'Equipar',
  mints: 'Usar',
  megapedras: 'Equipar',
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
  cubos: 'Usar',
  ovos: 'Chocar',
};
/** O botão do item: pela categoria; na aba Up, Ability Capsule e Ability Patch são de usar. */
/** Itens que são gastos ao usar num Pokémon e não voltam: perguntam "tem certeza?" (pedido do dono). */
const PEDE_CONFIRMACAO = (item: ItemLoja) => ['evolucao', 'cubos', 'mints', 'terashards', 'tm', 'tr', 'formas'].includes(item.categoria) || ehItemDeHabilidade(item.id);
const acaoDe = (item: ItemLoja) => (ehItemDeHabilidade(item.id) || item.id === BOX_POKEMON || item.id === KIT_INICIANTE || item.id === PASSE_PREMIUM || ehItemDeForma(item.id) ? 'Usar' : ACAO[item.categoria]);

type Modo =
  | { tipo: 'lista' }
  | { tipo: 'alvo'; item: ItemLoja }
  | { tipo: 'forma'; item: ItemLoja; p: PokemonIndividual; opcoes: number[] }
  | { tipo: 'parceiro'; item: ItemLoja; p: PokemonIndividual; parceiros: PokemonIndividual[] }
  | { tipo: 'esquecer'; p: PokemonIndividual; golpe: string; aoAprender: () => void; aoDesistir: () => void };

/** Bolsa fora da batalha: ver itens, usar remédios e pedras, ensinar TMs/TRs, equipar itens. */
export function abrirBolsa(save: Save, aoMudar: () => void): void {
  let aba: CategoriaLoja = 'remedios';
  let modo: Modo = { tipo: 'lista' };
  let aviso = '';
  /** Item aberto no painel da direita (id) e a rolagem da grade, para o redesenho não voltar ao topo. */
  let escolhido: string | null = null;
  let rolagem = 0;
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

  /** Troca a espécie sem evoluir (itens de forma): esquece o que a forma nova não pode ter e nunca fica sem golpe. */
  const mudarForma = (p: PokemonIndividual, para: number): string[] => {
    const esquecidos = p.golpes.filter((g) => !especiePodeTerGolpe(para, g.id)).map((g) => nomeGolpe(g.id));
    p.golpes = p.golpes.filter((g) => especiePodeTerGolpe(para, g.id));
    if (p.golpesAprendidos) p.golpesAprendidos = p.golpesAprendidos.filter((id) => especiePodeTerGolpe(para, id));
    const r = evoluir(p, para, (n) => pokemonPorId(n).nome);
    if (!p.golpes.length && !r.golpesPendentes.length) p.golpes = golpesIniciais(para, p.nivel);
    registrarCapturado(save, para, p.shiny);
    for (const golpe of r.golpesPendentes) aprender(p, golpe, () => {}, () => {});
    return [...(esquecidos.length ? [`Esqueceu ${esquecidos.join(', ')}.`] : []), ...r.mensagens];
  };

  /** Itens de forma (Reveal Glass, Rotom Catalog, DNA Splicers…): gastos a cada uso que tem efeito (pedido do dono). */
  /** Formas entre as quais o jogador escolhe: rodas com 3 ou mais formas (Deoxys, Rotom). */
  const formasParaEscolher = (item: ItemLoja, p: PokemonIndividual): number[] => (FUSOES[item.id] ? [] : outrasFormas(item.id, p.especieId).filter(existe));
  /** Fusão: quem do time pode se juntar com este Pokémon usando o item (o jogador escolhe qual; pedido do dono). */
  const parceirosDaFusao = (item: ItemLoja, p: PokemonIndividual): PokemonIndividual[] =>
    save.time.filter((q) => q !== p && (FUSOES[item.id] ?? []).some((f) => f.base === p.especieId && f.parceiro === q.especieId && existe(f.forma)));

  /** Imagem de frente (animada se houver) de uma espécie, para as janelas de evolução. */
  const imagemDe = (id: number, shiny: boolean): string => {
    const d = pokemonPorId(id);
    return (shiny ? d.sprites.gifShiny ?? d.sprites.frenteShiny : d.sprites.gif ?? d.sprites.frente) ?? '';
  };

  const usarItemDeForma = (item: ItemLoja, p: PokemonIndividual, escolhida?: number, parceiroEscolhido?: PokemonIndividual): string => {
    const quem = nome(p);
    const fusoes = FUSOES[item.id];
    // sem volta (pedido do dono): quem já mudou de forma ou se juntou fica assim
    if (jaMudouDeForma(item.id, p.especieId)) return `${quem} já mudou de forma e não volta mais. ${item.nome} não tem efeito.`;
    if (!fusoes) {
      const para = escolhida ?? proximaForma(item.id, p.especieId);
      if (!para || !existe(para)) return `${item.nome} não tem efeito em ${quem}.`;
      gastar(item.id);
      void animarEvolucaoNaTela({ nome: quem, src: imagemDe(p.especieId, p.shiny) }, { nome: pokemonPorId(para).nome, src: imagemDe(para, p.shiny) }, { inicio: `O quê? ${quem} está mudando de forma!`, fim: `${quem} virou ${pokemonPorId(para).nome}!` });
      const mensagens = mudarForma(p, para);
      // Rotom: cada eletrodoméstico ensina o golpe dele (com 4 golpes, pergunta qual esquecer)
      const golpe = GOLPE_DA_FORMA[para];
      const aprendeu = golpe && !p.golpes.some((g) => g.id === golpe) ? aprender(p, golpe, () => {}, () => {}) : null;
      return [`${quem} mudou para ${pokemonPorId(para).nome}!`, ...mensagens, ...(aprendeu ? [aprendeu] : [])].join(' ');
    }
    const opcoes = fusoes.filter((f) => f.base === p.especieId && (escolhida === undefined || f.forma === escolhida));
    if (!opcoes.length) return `${item.nome} não tem efeito em ${quem}.`;
    const indice = save.time.findIndex((q) => q !== p && (parceiroEscolhido ? q === parceiroEscolhido : opcoes.some((f) => f.parceiro === q.especieId)));
    if (indice < 0) return `Para usar ${item.nome}, ${opcoes.map((f) => pokemonPorId(f.parceiro).nome).join(' ou ')} precisa estar no time.`;
    const parceiro = save.time[indice];
    const fusao = opcoes.find((f) => f.parceiro === parceiro.especieId)!;
    if (!existe(fusao.forma)) return `${item.nome} não tem efeito em ${quem}.`;
    gastar(item.id);
    save.time.splice(indice, 1);
    p.fundido = parceiro;
    void animarEvolucaoNaTela(
      { nome: quem, src: imagemDe(p.especieId, p.shiny) },
      { nome: pokemonPorId(fusao.forma).nome, src: imagemDe(fusao.forma, p.shiny) },
      { parceiro: { nome: nome(parceiro), src: imagemDe(parceiro.especieId, parceiro.shiny) } },
    );
    // IVs da fusão: cada um fica entre o IV de um e o do outro (os originais ficam guardados para um futuro item de separação)
    p.ivsAntesDaFusao = { ...p.ivs };
    const [uidA, uidB] = [(p as PokemonDoJogador).uid ?? 0, parceiro.uid ?? 0];
    ATRIBUTOS.forEach((a, i) => (p.ivs[a] = ivDaFusao(p.ivsAntesDaFusao![a], parceiro.ivs[a], uidA, uidB, i)));
    const mensagens = mudarForma(p, fusao.forma);
    if (p.hp > hpMaximo(p)) p.hp = hpMaximo(p);
    return [`${quem} se juntou com ${nome(parceiro)} e virou ${pokemonPorId(fusao.forma).nome}!`, ...mensagens].join(' ');
  };

  const aplicar = (item: ItemLoja, p: PokemonIndividual): string | null => {
    const quem = nome(p);
    if (ehItemDeForma(item.id)) return usarItemDeForma(item, p);
    switch (item.categoria) {
      case 'remedios': {
        const msg = usarRemedio(ITENS[item.id as ItemId], p, quem);
        if (msg) gastar(item.id);
        return msg ?? 'Não teria efeito.';
      }
      case 'cubos':
      case 'evolucao': {
        // cubo: transforma o Pokémon de origem na versão do passado/futuro (Volcarona + Cubo de Iron Moth)
        const cubo = item.categoria === 'cubos' ? cuboPorItem(item.id) : undefined;
        const para = cubo ? (cubo.origens.includes(p.especieId) && existe(cubo.especie) ? cubo.especie : null) : evolucaoPorItem(p, item.id, existe);
        if (!para) return cubo ? `${item.nome} só funciona em ${cubo.origens.map((n) => pokemonPorId(n).nome).join(' ou ')}.` : `${item.nome} não tem efeito em ${quem}.`;
        gastar(item.id);
        // troca com item (ex.: Metal Coat): o item equipado é gasto na evolução
        if (item.id === CABO_DE_LIGACAO && especie(para).evoItem) p.item = null;
        // mesma animação da evolução por nível, numa janela por cima da bolsa
        const [de, novo] = [pokemonPorId(p.especieId), pokemonPorId(para)];
        const imagem = (d: typeof de) => (p.shiny ? d.sprites.gifShiny ?? d.sprites.frenteShiny : d.sprites.gif ?? d.sprites.frente) ?? '';
        // Teal Mask: não é evolução, a Ogerpon volta à forma padrão
        const volta = item.id === 'tealmask';
        void animarEvolucaoNaTela({ nome: quem, src: imagem(de) }, { nome: novo.nome, src: imagem(novo) }, volta ? { inicio: `O quê? ${quem} está mudando de forma!`, fim: `${quem} voltou à forma padrão!` } : undefined);
        // cubo (pedido do dono): a forma nova esquece os golpes que ela não pode ter (antes de aprender os dela)
        const esquecidos = cubo ? p.golpes.filter((g) => !especiePodeTerGolpe(para, g.id)).map((g) => nomeGolpe(g.id)) : [];
        if (cubo) p.golpes = p.golpes.filter((g) => especiePodeTerGolpe(para, g.id));
        // o Move Reminder também não devolve o que a forma nova não pode ter
        if (cubo && p.golpesAprendidos) p.golpesAprendidos = p.golpesAprendidos.filter((id) => especiePodeTerGolpe(para, id));
        const r = evoluir(p, para, (n) => pokemonPorId(n).nome);
        // nunca fica sem golpe: sem nenhum, recebe os do nível dela
        if (!p.golpes.length && !r.golpesPendentes.length) p.golpes = golpesIniciais(para, p.nivel);
        if (esquecidos.length) r.mensagens.unshift(`Esqueceu ${esquecidos.join(', ')} (${pokemonPorId(para).nome} não aprende).`);
        registrarCapturado(save, para, p.shiny);
        if (cubo?.era === 'passado') marcarConquista(save, 'cuboPassado');
        else if (cubo?.era === 'futuro') marcarConquista(save, 'cuboFuturo');
        for (const golpe of r.golpesPendentes) aprender(p, golpe, () => {}, () => {});
        return [cubo ? `${quem} atravessou o tempo e virou ${pokemonPorId(para).nome}!` : volta ? `${quem} voltou à forma padrão!` : `${quem} evoluiu para ${pokemonPorId(para).nome}!`, ...r.mensagens].join(' ');
      }
      case 'mints': {
        const natureza = item.natureza!;
        if (p.natureza === natureza) return `A Nature de ${quem} já é ${natureza}.`;
        gastar(item.id);
        p.natureza = natureza;
        return `A Nature de ${quem} agora é ${natureza}!`;
      }
      case 'up':
        if (ehItemDeHabilidade(item.id)) {
          const r = usarItemDeHabilidade(item.id, p, quem);
          if (r.usou) gastar(item.id);
          return r.mensagem;
        }
      // os outros itens da aba Up são de segurar
      // falls through
      case 'batalha':
      case 'megapedras':
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

    if (modo.tipo === 'parceiro') {
      // fusão: o jogador escolhe com quem juntar (pedido do dono)
      const m = modo;
      return el(
        'div',
        { class: 'bolsa' },
        el('p', {}, `${m.item.nome}: juntar ${nome(m.p)} com qual Pokémon?`),
        el(
          'div',
          { class: 'vagas' },
          m.parceiros.map((q) =>
            cartaoPokemon(q, {
              onclick: async () => {
                if (!(await confirmar(m.item.nome, `Juntar ${nome(m.p)} com ${nome(q)}? O item é gasto e a fusão não tem volta.`))) return;
                concluir(usarItemDeForma(m.item, m.p, undefined, q));
                refazer();
              },
            }),
          ),
        ),
        el('p', { class: 'meta' }, 'Os IVs da fusão ficam entre os dos dois. A fusão não tem volta.'),
        el('button', { class: 'botao', onclick: () => ((modo = { tipo: 'lista' }), refazer()) }, 'Cancelar'),
      );
    }

    if (modo.tipo === 'forma') {
      // mais de uma forma possível (Deoxys, Rotom…): o jogador escolhe qual (pedido do dono)
      const m = modo;
      return el(
        'div',
        { class: 'bolsa' },
        el('p', {}, `${m.item.nome}: qual forma para ${nome(m.p)}?`),
        el(
          'div',
          { class: 'escolha-forma' },
          m.opcoes.map((id) => {
            const d = pokemonPorId(id);
            return el(
              'button',
              {
                class: 'botao secundario',
                onclick: async () => {
                  if (!(await confirmar(m.item.nome, `Mudar ${nome(m.p)} para ${d.nome}? O item é gasto e ${nome(m.p)} não volta para a forma de antes.`))) return;
                  concluir(usarItemDeForma(m.item, m.p, id));
                  refazer();
                },
              },
              spritePokemon(d, { shiny: m.p.shiny, animado: false }),
              el('strong', {}, d.nome),
              el('span', { class: 'tipos' }, d.tipos.map((tp) => seloTipo(tp))),
            );
          }),
        ),
        el('button', { class: 'botao', onclick: () => ((modo = { tipo: 'lista' }), refazer()) }, 'Cancelar'),
      );
    }

    if (modo.tipo === 'alvo') {
      const item = modo.item;
      return el(
        'div',
        { class: 'bolsa' },
        el('p', {}, `${acaoDe(item)} ${item.nome} em qual Pokémon?`),
        el(
          'div',
          { class: 'vagas' },
          save.time.map((p) =>
            cartaoPokemon(p, {
              onclick: async () => {
                // itens que são gastos e não voltam pedem confirmação (remédios e itens de segurar, não)
                if (ehItemDeForma(item.id)) {
                  const opcoes = formasParaEscolher(item, p);
                  if (opcoes.length > 1) {
                    modo = { tipo: 'forma', item, p, opcoes };
                    return refazer();
                  }
                  const parceiros = parceirosDaFusao(item, p);
                  if (parceiros.length) {
                    modo = { tipo: 'parceiro', item, p, parceiros };
                    return refazer();
                  }
                }
                if (PEDE_CONFIRMACAO(item) && !(await confirmar(item.nome, `${acaoDe(item)} ${item.nome} em ${nome(p)}? O item é gasto e não volta.`))) return;
                // Razor Claw e Razor Fang são de segurar, mas também evoluem Sneasel e Gligar: o jogador escolhe
                const evolui = SEGURAR_OU_EVOLUIR.has(item.id) ? evolucaoPorItem(p, item.id, existe) : null;
                const evoluir = !!evolui && (await confirmar(item.nome, `${nome(p)} pode evoluir para ${pokemonPorId(evolui).nome} com ${item.nome}. Evoluir agora? O item é gasto e não volta. Respondendo "Não", ele só segura o item.`));
                const msg = aplicar(evoluir ? { ...item, categoria: 'evolucao' } : item, p);
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
      // selos sazonais são de coleção: aparecem no perfil, não na bolsa
      // skins ficam em Minha conta → Minhas skins; na bolsa só as que o jogador levou para trocar ou vender
      .map(([id, qtd]): [string, number] => [id, ehSkin(id) ? skinsNaBolsa(save, id) : qtd])
      .filter(([id, qtd]) => qtd > 0 && !ehSeloSazonal(id))
      .map(([id, qtd]) => ({ item: itemDaLoja(id), qtd }))
      .filter((x): x is { item: ItemLoja; qtd: number } => !!x.item);
    const comItens = CATEGORIAS.filter((c) => meus.some((m) => m.item.categoria === c.id));
    if (!comItens.some((c) => c.id === aba) && comItens.length) aba = comItens[0].id;

    // mesmo desenho da loja (pedido do dono): seções à esquerda, os itens no meio e, à direita, o item clicado
    const daAba = meus.filter((m) => m.item.categoria === aba);
    const sel = daAba.find((m) => m.item.id === escolhido) ?? daAba[0];
    const vitrine = el(
      'div',
      { class: 'mercado-vitrine' },
      daAba.map(({ item, qtd }) =>
        el(
          'button',
          { class: `mercado-item ${item.id === sel?.item.id ? 'escolhido' : ''}`, title: item.nome, onclick: () => ((escolhido = item.id), (rolagem = vitrine.scrollTop), (aviso = ''), refazer()) },
          el('span', { class: 'mercado-icone' }, iconeItem(item)),
          el('span', { class: 'mercado-nome' }, item.nome),
          el('span', { class: 'mercado-preco' }, `×${qtd}`),
        ),
      ),
      meus.length === 0 && el('p', { class: 'mercado-vazio' }, 'A bolsa está vazia. Compre itens na Loja.'),
    );
    requestAnimationFrame(() => (vitrine.scrollTop = rolagem));
    return el(
      'div',
      { class: 'mercado bolsa-loja' },
      aviso && el('p', { class: 'aviso-bolsa' }, aviso),
      el(
        'div',
        { class: 'mercado-colunas' },
        el(
          'nav',
          { class: 'mercado-secoes' },
          comItens.map((c) => el('button', { class: `mercado-secao ${c.id === aba ? 'ativa' : ''}`, onclick: () => ((aba = c.id), (escolhido = null), (rolagem = 0), (aviso = ''), refazer()) }, c.nome)),
        ),
        vitrine,
        !sel
          ? el('aside', { class: 'mercado-painel' }, el('p', { class: 'mercado-vazio' }, 'Escolha um item.'))
          : (({ item, qtd }) =>
            el(
              'aside',
              { class: 'mercado-painel' },
              el('div', { class: 'mercado-icone-grande' }, iconeItem(item)),
              el('strong', { class: 'mercado-nome' }, item.nome),
              el('p', { class: 'mercado-desc' }, item.descricao),
              el('div', { class: 'mercado-total' }, el('span', {}, 'Na bolsa'), el('span', { class: 'mercado-preco' }, `×${qtd}`, quantidadeNt(save, item.id) ? el('small', { class: 'qtd-nt', title: 'NT: não pode ser trocado nem vendido' }, ` (${quantidadeNt(save, item.id)} NT)`) : null)),
              // charm: usa na conta (como uma poção); travado enquanto o bônus de 30 minutos daquele tipo está ativo
              (() => {
                const tipo = tipoDoCharm(item.id);
                if (!tipo) return null;
                const ativo = charmAtivo(save, tipo);
                return el('button', {
                  class: 'botao', disabled: ativo,
                  title: ativo ? 'Só um deste tipo por vez: espere o bônus acabar' : '',
                  onclick: async () => {
                    if (!(await confirmar(item.nome, `Usar ${item.nome}? O bônus dura 30 minutos e o item é gasto.`))) return;
                    const erro = usarCharm(save, tipo, Date.now(), item.id);
                    if (!erro) {
                      marcarConquista(save, 'charm');
                      salvar(save);
                      aoMudar();
                    }
                    aviso = erro || `${nomeCharm(tipo)} ativado: +20% de chance de shiny nos Pokémon desse tipo por 30 minutos!`;
                    refazer();
                  },
                }, ativo ? `Ativo · ${textoDoTempo(charmAte(save, tipo) - Date.now())}` : 'Usar');
              })(),
              // skin na bolsa é só um item (pode ser trocada ou vendida): a única opção é usar, que a leva para Minhas skins
              item.categoria === 'skins' &&
                el('button', {
                  class: 'botao',
                  title: 'Leva a skin para Minhas skins, onde você escolhe o visual e o bônus',
                  onclick: () => {
                    if (moverSkin(save, item.id, false)) {
                      salvar(save);
                      // trocas e mercado conferem o save guardado no servidor
                      void salvarAgora();
                      aoMudar();
                      aviso = `${item.nome} foi para Minhas skins.`;
                    }
                    refazer();
                  },
                }, 'Usar'),
              item.categoria !== 'skins' && acaoDe(item) &&
                el(
                  'button',
                  {
                    class: 'botao',
                    onclick: async () => {
                      aviso = '';
                      if (item.id === BOX_POKEMON && podeAbrirBox(save) && !(await confirmar(item.nome, 'Usar o Box Pokémon para abrir mais uma box no PC? O item é gasto.'))) return;
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
                      } else if (item.id === KIT_INICIANTE) {
                        // conteúdo definido pelo dono (shared/kitIniciante.ts): itens fixos + uma skin e um charm sorteados
                        const kit = sortearKit();
                        gastar(item.id);
                        for (const [id, quantidade] of Object.entries(kit.itens)) save.itens[id] = (save.itens[id] ?? 0) + quantidade;
                        save.silver += kit.silver;
                        concluir(`Kit iniciante aberto! Você recebeu Pokébolas, remédios, ${kit.silver.toLocaleString('pt-BR')} Poké Dólares, a ${itemDaLoja(kit.skin)?.nome ?? 'skin'} e um ${itemDaLoja(kit.charm)?.nome ?? 'Charm'}.`);
                      } else if (item.id === PASSE_PREMIUM) {
                        // libera a trilha premium da temporada em vigor (o item só é gasto se liberou)
                        const r = ativarPremium(save);
                        if (r.ok) {
                          gastar(item.id);
                          concluir(r.texto);
                        } else aviso = r.texto;
                      } else if (item.id === BOX_POKEMON) {
                        // abre uma box nova no PC, sem escolher Pokémon
                        if (!podeAbrirBox(save)) aviso = `Você já tem as ${BOXES_MAXIMO} boxes do PC.`;
                        else {
                          // quem ainda usa boxes do tempo em que eram 30 abre a seguinte à última que tem
                          save.boxesExtras = numeroDeBoxes(save) - BOXES_INICIAIS + 1;
                          gastar(item.id);
                          concluir(`Box nova aberta no PC! Agora você tem ${numeroDeBoxes(save)} boxes.`);
                        }
                      } else modo = { tipo: 'alvo', item };
                      refazer();
                    },
                  },
                  acaoDe(item)!,
                ),
            ))(sel),
      ),
    );
  }, { classe: 'janela-loja' });
}
