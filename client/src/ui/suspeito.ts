// Homem Suspeito (NPC sentado no banco do campo de flores da cidade): reseta EVs, nível e evolução de um Pokémon do
// time e separa fusões (Kyurem, Necrozma, Calyrex), devolvendo os dois com os IVs originais. Regras e preços em
// shared/suspeito.ts. Como o resto do save, ainda é feito no navegador.
import { ATRIBUTOS, golpesIniciais, hpMaximo } from '../../../shared/batalha/pokemon';
import { resetarNivel, voltarEspecie } from '../../../shared/batalha/progresso';
import { formaBaseDe } from '../../../shared/encontros';
import { FUSOES, MASCARAS_OGERPON, formaNormalDe } from '../../../shared/formasPorItem';
import { nomeDaMoeda } from '../../../shared/moedas';
import { PRECO_SUSPEITO, SERVICOS_SUSPEITO, type ServicoSuspeito } from '../../../shared/suspeito';
import { especiePodeTerGolpe } from '../../../shared/usoItens';
import { pokemonPorId, todosOsPokemons } from '../dados';
import { guardarNoPC, registrarCapturado, salvar, type PokemonDoJogador, type Save } from '../estado';
import { podeUsar } from '../limiteNivel';
import { confirmar } from './confirmar';
import { el } from './dom';
import { abrirJanela } from './janela';
import { cartaoPokemon } from './time';
import { valorEmMoeda } from './moeda';

const numero = (n: number) => n.toLocaleString('pt-BR');
const nome = (p: PokemonDoJogador) => pokemonPorId(p.especieId).nome;

/**
 * Primeira forma da linha deste Pokémon, ou null se ele já é a primeira. Quem mudou de forma por item (Deoxys, Rotom,
 * Hoopa, Therian…; pedido do dono) e a Ogerpon de máscara voltam para a forma normal. Fusões não: essas se separam.
 */
function formaInicial(p: PokemonDoJogador): number | null {
  const normal = formaNormalDe(p.especieId);
  if (normal !== null) return normal;
  if (p.especieId !== MASCARAS_OGERPON.tealmask && Object.values(MASCARAS_OGERPON).includes(p.especieId)) return MASCARAS_OGERPON.tealmask;
  const base = formaBaseDe(pokemonPorId(p.especieId), todosOsPokemons());
  return base.id === p.especieId ? null : base.id;
}

/** Por que o serviço não serve neste Pokémon (texto curto), ou null se serve. */
function motivo(servico: ServicoSuspeito, p: PokemonDoJogador): string | null {
  if (servico === 'evs') return ATRIBUTOS.some((a) => p.evs[a] > 0) ? null : 'Não tem EVs';
  if (servico === 'nivel') return p.nivel > 1 ? null : 'Já está no nível 1';
  if (servico === 'separar') return p.fundido ? null : 'Não é uma fusão';
  if (p.fundido) return 'Separe os dois primeiro';
  return formaInicial(p) === null ? 'Já é a primeira forma' : null;
}

/** Troca a espécie para trás: esquece o que a forma nova não pode ter e nunca fica sem golpe. */
function trocarEspecie(save: Save, p: PokemonDoJogador, para: number): void {
  p.golpes = p.golpes.filter((g) => especiePodeTerGolpe(para, g.id));
  if (p.golpesAprendidos) p.golpesAprendidos = p.golpesAprendidos.filter((id) => especiePodeTerGolpe(para, id));
  voltarEspecie(p, para);
  if (!p.golpes.length) p.golpes = golpesIniciais(para, p.nivel);
  registrarCapturado(save, para, p.shiny);
}

/** Faz o serviço e devolve a frase do resultado. */
function fazer(save: Save, servico: ServicoSuspeito, p: PokemonDoJogador): string {
  const quem = nome(p);
  if (servico === 'evs') {
    for (const a of ATRIBUTOS) p.evs[a] = 0;
    if (p.hp > hpMaximo(p)) p.hp = hpMaximo(p);
    return `Os EVs de ${quem} foram zerados.`;
  }
  if (servico === 'nivel') {
    resetarNivel(p, pokemonPorId(p.especieId).crescimento);
    return `${quem} voltou para o nível 1.`;
  }
  if (servico === 'evolucao') {
    const para = formaInicial(p)!;
    trocarEspecie(save, p, para);
    return `${quem} voltou a ser ${pokemonPorId(para).nome}.`;
  }
  // separar: o parceiro que estava dentro volta para o time (ou para o PC) e os IVs de antes da fusão voltam
  const parceiro = p.fundido as PokemonDoJogador;
  const fusao = Object.values(FUSOES).flat().find((f) => f.forma === p.especieId);
  if (fusao) trocarEspecie(save, p, fusao.base);
  delete p.fundido;
  if (p.ivsAntesDaFusao) p.ivs = p.ivsAntesDaFusao;
  delete p.ivsAntesDaFusao;
  if (p.hp > hpMaximo(p)) p.hp = hpMaximo(p);
  const noTime = save.time.length < 6 && podeUsar(save, parceiro);
  if (noTime) save.time.push(parceiro);
  else guardarNoPC(save, parceiro);
  return `${quem} e ${nome(parceiro)} foram separados. ${nome(parceiro)} voltou para ${noTime ? 'o time' : 'o PC'}.`;
}

export function abrirSuspeito(save: Save, aoMudar: () => void = () => {}): void {
  // null = os quatro quadros; com um serviço escolhido, o time para apontar o Pokémon
  let servico: ServicoSuspeito | null = null;
  let aviso = '';
  const textoPreco = (preco: number) => `${numero(preco)} ${nomeDaMoeda('silver', preco)}`;

  const janela = abrirJanela('Homem Suspeito', () => {
    if (servico === null)
      return el(
        'div',
        { class: 'suspeito' },
        el('p', { class: 'meta' }, '"Psiu… eu desfaço coisas que os outros não desfazem. Só não pergunte como."'),
        el('div', { class: 'arena-opcoes' },
          ...SERVICOS_SUSPEITO.map((s) =>
            el('button', { class: 'arena-opcao', type: 'button', onclick: () => ((servico = s.id), (aviso = ''), janela.redesenhar()) },
              el('strong', {}, s.nome), el('span', {}, s.descricao), el('small', {}, valorEmMoeda('silver', PRECO_SUSPEITO[s.id]))))),
      );

    const qual = servico;
    const info = SERVICOS_SUSPEITO.find((s) => s.id === qual)!;
    const preco = PRECO_SUSPEITO[qual];
    const semSaldo = save.silver < preco;
    const escolher = async (p: PokemonDoJogador) => {
      if (!(await confirmar(info.nome, `${info.nome} em ${nome(p)} por ${textoPreco(preco)}? Isso não tem volta.`))) return;
      // a tela ficou aberta enquanto a pergunta estava na frente: confere de novo
      if (motivo(qual, p) || save.silver < preco || !save.time.includes(p)) return janela.redesenhar();
      save.silver -= preco;
      aviso = fazer(save, qual, p);
      salvar(save);
      aoMudar();
      janela.redesenhar();
    };
    return el(
      'div',
      { class: 'bolsa suspeito' },
      el('h3', {}, info.nome),
      el('p', {}, info.descricao),
      el('p', { class: 'suspeito-custo' }, 'Custa ', valorEmMoeda('silver', preco), ' · Você tem ', valorEmMoeda('silver', save.silver)),
      el('p', { class: 'aviso-bolsa', hidden: !aviso && !semSaldo, role: 'status' }, aviso || 'Poké Dólares insuficientes para este serviço.'),
      el('p', {}, 'Em qual Pokémon do time?'),
      el(
        'div',
        { class: 'vagas' },
        save.time.map((p) => {
          const porque = motivo(qual, p) ?? (semSaldo ? 'Poké Dólares insuficientes' : null);
          return cartaoPokemon(p, { disabled: !!porque, title: porque ?? '', onclick: () => void escolher(p) });
        }),
      ),
      el('button', { class: 'botao secundario', onclick: () => ((servico = null), (aviso = ''), janela.redesenhar()) }, '← Voltar'),
    );
  });
}
