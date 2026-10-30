// Tutorial do Professor Carvalho (pedido do dono; refeito em 24/10/2026 para "prender" o jogador novo):
// • Começo do jogo (save novo, `save.tutorialPasso`): introdução sem "Pular" (só Próximo) e depois MISSÕES em
//   ordem, obrigatórias: usar o Kit iniciante → ir aos mapas → derrotar um selvagem → capturar um → voltar à cidade →
//   abrir o PC → abrir a ficha, com uma explicação relâmpago de IVs, EVs e Nature. Enquanto as primeiras missões não
//   acabam, os lugares da cidade (menos o Centro Pokémon e a saída) ficam fechados (`bloqueioDoTutorial`).
// • Trancas de nível (shared/trancas.ts): ao liberar um conteúdo, o Professor explica e passa uma missão ligada a ele
//   (plantar um Apricorn, fazer uma Pokébola, visitar a Arena…), às vezes com um presente para experimentar
//   (shared/tutorialRegras.ts, entregue pelo servidor). As missões ficam num quadro no canto (`.tutorial-missao`).
// As telas avisam o que o jogador fez por `tutorialFez` (client/src/tutorialEventos.ts).
import { conferirConquistas, marcarConquista, resgatarConquista } from './conquistas';
import { avisar, avisarErro } from './ui/avisos';
import { NIVEL_MINIMO, type ConteudoTrancado } from '../../shared/trancas';
import { nivelTreinador } from '../../shared/treinador';
import { PRECO_REVELAR_IVS } from '../../shared/loja';
import { KIT_INICIANTE } from '../../shared/itensCustom';
import { PRESENTES_TUTORIAL } from '../../shared/tutorialRegras';
import { adotarSaveDoServidor, aoSalvar, carregarSave, salvar, salvarAgora, type Save } from './estado';
import { api } from './conta';
import { el } from './ui/dom';
import { abrirGuia } from './ui/guia';
import { abrirBolsa } from './ui/bolsa';
import { abrirPC } from './ui/pc';
import type { Destino, Navegar } from './main';
import { definirEsperaDoTutorial, irAteNaCidade, ouvirTela, ouvirTutorial, telaAtual, type EventoTutorial } from './tutorialEventos';
import { CONQUISTA_NA_TELA, PREMIOS_NA_TELA } from './ui/semBatalha';

/** Para onde o botão da missão leva. */
type Ir = { cidade: string; rotulo: string } | { tela: Destino; rotulo: string } | { abrir: 'bolsa' | 'pc'; rotulo: string };
interface Tarefa { texto: string; evento: EventoTutorial; ir?: Ir }

interface Licao {
  conteudo: ConteudoTrancado;
  /** o que o Professor fala (a primeira página começa com a frase do nível) */
  fala: string[];
  guia?: { grupo: string; topico: string };
  tarefa?: Tarefa;
}

const NA_ARENA: Ir = { cidade: 'arena', rotulo: 'Ir até a Arena' };
const NA_ARTESA: Ir = { cidade: 'craft', rotulo: 'Ir até a Artesã' };

/** Tela de toque (celular, tablet): as falas dizem "toque" e o joystick no lugar de "clique" e das teclas. */
const TOQUE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const noAparelho = (computador: string, toque: string): string => (TOQUE ? toque : computador);

const LICOES: Licao[] = [
  {
    conteudo: 'duelos', guia: { grupo: 'sistemas', topico: 'ginasios' },
    fala: [
      'A Arena da cidade abriu para você! Lá ficam os Ginásios e os Duelos com treinadores.',
      'Nos Ginásios você enfrenta os 8 líderes da sua região, em ordem. No Fácil você conquista as insígnias; o Médio e o Difícil têm times mais fortes e pagam mais Poké Dólares na primeira vitória de cada líder.',
      'Nos Duelos com treinadores, cada desafio traz um treinador diferente e você pode repetir quantas vezes quiser: é onde você mais ganha Poké Dólares!',
    ],
    tarefa: { texto: 'Vá até a Arena da cidade e dê uma olhada. Não precisa lutar agora.', evento: 'arena', ir: NA_ARENA },
  },
  {
    conteudo: 'loginBoasVindas', guia: { grupo: 'sistemas', topico: 'login' },
    fala: ['Agora você ganha prêmios só por entrar no jogo! Nos 7 primeiros dias da sua conta, cada dia em que você entra vale um prêmio. Os prêmios chegam pelo Correio.'],
    tarefa: { texto: 'Abra Minha conta → Recompensas e veja os seus prêmios de login.', evento: 'recompensas', ir: { tela: { tela: 'conta', secao: 'recompensas' }, rotulo: 'Abrir Recompensas' } },
  },
  { conteudo: 'loginTrinta', guia: { grupo: 'sistemas', topico: 'login' }, fala: ['Você liberou também o login dos 30 dias! Nos 30 primeiros dias do servidor, cada dia tem o seu prêmio: entrou naquele dia, ganha; não entrou, perde. Se for VIP, dá para recuperar até 3 dias perdidos.'] },
  {
    conteudo: 'canteiros', guia: { grupo: 'sistemas', topico: 'craft' },
    fala: ['A Artesã da horta liberou os canteiros para você! Plante Berries e Apricorns, regue e colha depois. Os Apricorns viram Pokébolas especiais.', 'Para começar, ganhe uma semente de presente: ela vale para um plantio de graça.'],
    tarefa: { texto: 'Plante um Apricorn nos canteiros da Artesã (use a semente de presente).', evento: 'plantouApricorn', ir: NA_ARTESA },
  },
  {
    conteudo: 'craftBola', guia: { grupo: 'sistemas', topico: 'craft' },
    fala: ['Agora a Artesã também faz Pokébolas especiais, usando dois Apricorns e Poké Dólares.', `Tome o material para a sua primeira: ${PRESENTES_TUTORIAL.craftBola.texto}. Dá para uma Dream Ball!`],
    tarefa: { texto: 'Faça uma Pokébola na Artesã (aba Pokébolas).', evento: 'craftBola', ir: NA_ARTESA },
  },
  { conteudo: 'troca', guia: { grupo: 'sistemas', topico: 'trocas' }, fala: [noAparelho('Agora você pode trocar com outros treinadores! Clique em um jogador no mapa e escolha "Trocar": cada um monta a sua oferta de Pokémon, itens e moedas.', 'Agora você pode trocar com outros treinadores! Toque em um jogador no mapa e escolha "Trocar": cada um monta a sua oferta de Pokémon, itens e moedas.')] },
  {
    conteudo: 'mercadoNegro', guia: { grupo: 'sistemas', topico: 'mercado' },
    fala: ['Agora você pode usar o Mercado negro da cidade! Lá os treinadores anunciam Pokémon, itens e Origin Coins, e você pode comprar ou vender os seus.'],
    tarefa: { texto: 'Visite o Mercado negro da cidade.', evento: 'mercado', ir: { cidade: 'mercadonegro', rotulo: 'Ir até o Mercado negro' } },
  },
  {
    conteudo: 'creche', guia: { grupo: 'sistemas', topico: 'daycare' },
    fala: ['Você liberou o nosso Daycare! Deixe um casal de Pokémon lá e, com o tempo, pode sair um ovo. Os filhotes herdam parte dos IVs dos pais.'],
    tarefa: { texto: 'Visite o Daycare, ao lado da creche do Safari.', evento: 'creche', ir: { cidade: 'creche', rotulo: 'Ir até o Daycare' } },
  },
  {
    conteudo: 'suspeito', guia: { grupo: 'sistemas', topico: 'suspeito' },
    fala: ['Um Homem Suspeito, sentado no campo de flores, agora aceita falar com você. Ele reseta EVs, nível e evolução dos seus Pokémon… por um preço.'],
    tarefa: { texto: 'Fale com o Homem Suspeito no campo de flores.', evento: 'suspeito', ir: { cidade: 'suspeito', rotulo: 'Ir até o Homem Suspeito' } },
  },
  {
    conteudo: 'torneio', guia: { grupo: 'eventos', topico: 'torneio' },
    fala: ['Você já pode participar dos Torneios! São dois por dia, às 12h30 e às 18h30, valendo prêmios e medalhas.'],
    tarefa: { texto: 'Abra o Torneio na Arena e veja as regras de hoje.', evento: 'torneio', ir: NA_ARENA },
  },
  {
    conteudo: 'guilda', guia: { grupo: 'sistemas', topico: 'guildas' },
    fala: ['As Guildas foram liberadas! Entre numa ou crie a sua: a guilda sobe de nível com a ajuda dos membros e dá bônus para todos.'],
    tarefa: { texto: 'Abra a tela das Guildas e procure uma para entrar.', evento: 'guildas', ir: { cidade: 'guildas', rotulo: 'Ir até as Guildas' } },
  },
  { conteudo: 'boss', guia: { grupo: 'eventos', topico: 'boss' }, fala: ['Agora você pode enfrentar os Bosses que aparecem na gaiola da cidade! Cada treinador luta uma vez, e quem causar mais dano ganha prêmios.'] },
  {
    conteudo: 'safari', guia: { grupo: 'eventos', topico: 'safari' },
    fala: ['O Safari está aberto para você! Escolha um tipo e passe por três salas cheias de Pokémon com IVs altos, e shiny e raros aparecem muito mais.'],
    tarefa: { texto: 'Fale com o NPC do Safari e veja os seus tickets de hoje.', evento: 'safari', ir: { cidade: 'safari', rotulo: 'Ir até o Safari' } },
  },
  {
    conteudo: 'craftCharm', guia: { grupo: 'sistemas', topico: 'craft' },
    fala: ['A Artesã agora sabe fazer Charms! Com Berries e Energies do mesmo tipo, você aumenta a chance de shiny daquele tipo por 30 minutos.', `Tome o material para o seu primeiro: ${PRESENTES_TUTORIAL.craftCharm.texto}. Dá para um Fire Charm!`],
    tarefa: { texto: 'Faça um Charm na Artesã (aba Charms).', evento: 'craftCharm', ir: NA_ARTESA },
  },
  {
    conteudo: 'liga', guia: { grupo: 'eventos', topico: 'liga' },
    fala: ['Você está pronto para a Liga Pokémon! Enfrente a Elite 4, ou a Liga Nightmare se tiver coragem. Uma tentativa por semana, com o time de 6 travado do começo ao fim.'],
    tarefa: { texto: 'Abra a Liga Pokémon na Arena.', evento: 'liga', ir: NA_ARENA },
  },
];

/** Introdução (uma vez, para o jogador novo): só "Próximo", sem pular. */
const INTRO = [
  noAparelho('Chegamos à cidade! Eu sou o Professor Carvalho e vou te guiar nos primeiros passos. Ande com as setas ou W A S D.',
    'Chegamos à cidade! Eu sou o Professor Carvalho e vou te guiar nos primeiros passos. Para andar, encoste o dedo no mapa e arraste para onde quer ir: um controle aparece embaixo do dedo.'),
  noAparelho('Aqui ficam a loja, o Centro Pokémon, a estação de trem, a Arena e muitos NPCs. Clique no nome de um lugar para usá-lo, ou no minimapa, no canto de cima, para andar até ele.',
    'Aqui ficam a loja, o Centro Pokémon, a estação de trem, a Arena e muitos NPCs. Toque no nome de um lugar para usá-lo, ou no minimapa, no canto de cima, para andar até ele.'),
  'Seus Pokémon se cansam nas batalhas. Cure o time de graça no Centro Pokémon: é o coração no alto da tela. Ali do lado ficam os atalhos da Bolsa, do PC e do Correio.',
  'Agora vou te passar algumas missões rápidas para você aprender o básico. Siga o quadro do Professor, embaixo na tela. Vamos lá!',
];

/** As missões do começo do jogo, em ordem. */
interface Passo extends Tarefa { id: string; feito?: (s: Save) => boolean; depois?: string[] }
const PASSOS: Passo[] = [
  { id: 'kit', texto: 'Abra a sua Bolsa e use o Kit iniciante (aba Itens-chave): dentro dele tem Pokébolas, remédios e Poké Dólares.', evento: 'bolsa', feito: (s) => !(s.itens[KIT_INICIANTE] > 0), ir: { abrir: 'bolsa', rotulo: 'Abrir a Bolsa' } },
  { id: 'mapa', texto: 'Hora de caçar! Saia pela saída do sul da cidade e escolha um bioma.', evento: 'bioma', ir: { cidade: 'mapas', rotulo: 'Ir até a saída' } },
  { id: 'derrotar', texto: noAparelho('Ande e pare: quando aparecer um Pokémon, aperte Espaço (ou Lutar) e derrote-o.', 'Ande e pare: quando aparecer um Pokémon, toque em Lutar e derrote-o.'), evento: 'derrotou', ir: { cidade: 'mapas', rotulo: 'Ir para os mapas' } },
  { id: 'capturar', texto: 'Agora capture um Pokémon! Deixe ele fraco, abra a Bolsa na batalha e jogue uma Poké Ball.', evento: 'capturou', ir: { cidade: 'mapas', rotulo: 'Ir para os mapas' } },
  { id: 'cidade', texto: 'Muito bem! Volte para a cidade.', evento: 'cidade', ir: { tela: { tela: 'cidade' }, rotulo: 'Voltar para a cidade' } },
  { id: 'pc', texto: 'Abra o PC, no botão do PC no alto da tela.', evento: 'pc', ir: { abrir: 'pc', rotulo: 'Abrir o PC' } },
  {
    id: 'ficha', texto: noAparelho('Clique no Pokémon que você capturou e depois em "Ver ficha".', 'Toque no Pokémon que você capturou e depois em "Ver ficha".'), evento: 'ficha', ir: { abrir: 'pc', rotulo: 'Abrir o PC' },
    depois: [
      'Esta é a ficha do Pokémon. Os 6 atributos (HP, Attack, Defense, Sp. Atk, Sp. Def e Speed) decidem a força dele na batalha.',
      `IVs são a genética: de 0 a 31 em cada atributo, e nunca mudam. Nos Pokémon capturados eles vêm escondidos: avalie na ficha por ${PRECO_REVELAR_IVS.toLocaleString('pt-BR')} Poké Dólares para ver o tier (C, B, A, S ou S+).`,
      'EVs são o treino: cada Pokémon derrotado dá EVs num atributo, até 252 por atributo e 510 no total.',
      'A Nature aumenta 10% um atributo (em verde) e diminui 10% outro (em vermelho). Dá para trocar com Mints.',
      'Pronto, você já sabe o básico! Conforme subir de nível de treinador, novos sistemas vão abrir, e eu volto com uma missão para cada um. Boa jornada!',
    ],
  },
];
/** Até este passo, os lugares da cidade ficam fechados (o jogador é levado aos mapas). */
const PASSOS_QUE_PRENDEM = ['kit', 'mapa', 'derrotar', 'capturar'];
const FIM = 'fim';

/** Uma fala do Professor: páginas de texto e, se tiver, o tópico do guia que ela explica. */
interface Fala {
  id: string;
  paginas: string[];
  guia?: { grupo: string; topico: string };
  /** roda ao fechar a última página */
  aoFechar?: () => void;
}
const falaDaLicao = (l: Licao): Fala => ({
  id: l.conteudo,
  paginas: l.fala.map((f, i) => (i === 0 ? `Parabéns, você chegou ao nível ${NIVEL_MINIMO[l.conteudo]} de treinador! ${f}` : f)),
  guia: l.guia,
  aoFechar: () => {
    const save = carregarSave();
    if (!save || !l.tarefa) return;
    save.tutorialTarefas = [...new Set([...(save.tutorialTarefas ?? []), l.conteudo])];
    salvar(save);
  },
});

let navegar: Navegar = () => {};
/** Falas que ainda vão aparecer (uma de cada vez). */
const fila: Fala[] = [];
let mostrando = false;
/** Id da fala aberta agora (não entra na fila de novo enquanto aparece). */
let naTela: string | null = null;
/** Presentes já pedidos nesta sessão (não pede de novo a cada salvar se o servidor falhar). */
const pedidos = new Set<string>();

const passoAtual = (s: Save): Passo | null => (s.tutorialPasso && s.tutorialPasso !== FIM ? PASSOS.find((p) => p.id === s.tutorialPasso) ?? null : null);
const tarefaAtual = (s: Save): { id: string; tarefa: Tarefa } | null => {
  const passo = passoAtual(s);
  if (passo) return s.tutorialPasso === 'intro' ? null : { id: passo.id, tarefa: passo };
  const id = s.tutorialTarefas?.[0];
  const licao = id ? LICOES.find((l) => l.conteudo === id) : undefined;
  return licao?.tarefa ? { id: licao.conteudo, tarefa: licao.tarefa } : null;
};

/** Lugar da cidade fechado pelo tutorial do começo (mensagem) ou null. */
export function bloqueioDoTutorial(acao: string): string | null {
  const save = carregarSave();
  const passo = save ? passoAtual(save) : null;
  if (!passo || !PASSOS_QUE_PRENDEM.includes(passo.id) || acao === 'centro' || acao === 'mapas') return null;
  return `Professor Carvalho: primeiro, termine a missão! ${passo.texto}`;
}

function conferir(save: Save): void {
  // quem começou antes deste tutorial e ainda não tinha fechado a introdução (o Kit iniciante vem por ela)
  if (!save.tutorialPasso && save.kitPelaConquista && !save.conquistas?.marcas?.tutorial) {
    save.tutorialPasso = 'intro';
    save.tutorialVisto ??= [];
    salvar(save);
  }
  // começo do jogo: a introdução e as missões em ordem (as lições de nível esperam acabar)
  if (save.tutorialPasso === 'intro') {
    if (naTela !== 'intro' && !fila.some((f) => f.id === 'intro')) {
      fila.push({ id: 'intro', paginas: INTRO, aoFechar: introVista });
      void mostrarProxima();
    }
    return desenharMissao(save);
  }
  const passo = passoAtual(save);
  if (passo?.feito?.(save)) return avancar(save, passo);
  if (passo) return desenharMissao(save);

  const nivel = nivelTreinador(save.xpTreinador ?? 0);
  const liberadas = LICOES.filter((l) => nivel >= NIVEL_MINIMO[l.conteudo]);
  if (!Array.isArray(save.tutorialVisto)) {
    // save antigo, primeira vez: o que já estava liberado conta como visto (sem chuva de avisos para quem já jogava)
    save.tutorialVisto = liberadas.map((l) => l.conteudo);
    salvar(save);
    return;
  }
  const vistas = save.tutorialVisto;
  const novas = liberadas.filter((l) => !vistas.includes(l.conteudo)).map(falaDaLicao).filter((f) => f.id !== naTela && !fila.some((x) => x.id === f.id));
  // presente que ficou sem entregar (servidor fora do ar na hora): pede de novo
  for (const l of liberadas) if (vistas.includes(l.conteudo)) void pedirPresente(save, l.conteudo);
  desenharMissao(save);
  if (!novas.length) return;
  fila.push(...novas);
  void mostrarProxima();
}

async function pedirPresente(save: Save, id: string): Promise<void> {
  if (!PRESENTES_TUTORIAL[id] || save.tutorialPresentes?.includes(id) || pedidos.has(id)) return;
  pedidos.add(id);
  try {
    await salvarAgora();
    const r = await api<{ save: Save; versao: number; texto: string }>('POST', '/tutorial/presente', { id });
    adotarSaveDoServidor(r.save, r.versao);
    avisar(`🎁 Presente do Professor Carvalho: ${r.texto}.`, 'ok');
  } catch (e) {
    avisarErro(e);
  }
}

/** Passo do começo concluído: vai para o próximo (e mostra a explicação dele, se tiver). */
function avancar(save: Save, passo: Passo): void {
  const i = PASSOS.indexOf(passo);
  save.tutorialPasso = PASSOS[i + 1]?.id ?? FIM;
  salvar(save);
  if (passo.depois) {
    fila.unshift({ id: `passo-${passo.id}`, paginas: passo.depois });
    void mostrarProxima();
  } else avisar('✅ Missão do Professor concluída!', 'ok');
}

function aoFazer(e: EventoTutorial): void {
  const save = carregarSave();
  if (!save) return;
  const passo = passoAtual(save);
  if (passo && save.tutorialPasso !== 'intro') {
    // capturar também conta como batalhar (pula a missão de derrotar)
    if (passo.id === 'derrotar' && e === 'capturou') {
      save.tutorialPasso = 'capturar';
      return avancar(save, PASSOS.find((p) => p.id === 'capturar')!);
    }
    if (passo.evento === e) avancar(save, passo);
    return;
  }
  const atual = tarefaAtual(save);
  if (atual && atual.tarefa.evento === e) {
    save.tutorialTarefas = (save.tutorialTarefas ?? []).filter((x) => x !== atual.id);
    salvar(save);
    return avisar('✅ Missão do Professor concluída!', 'ok');
  }
  // feito antes de a missão chegar (visitar o Mercado, o Daycare…): já conta, e a missão não fica presa na fila
  const naFila = (save.tutorialTarefas ?? []).filter((id) => LICOES.find((l) => l.conteudo === id)?.tarefa?.evento === e);
  if (!naFila.length) return;
  save.tutorialTarefas = (save.tutorialTarefas ?? []).filter((id) => !naFila.includes(id));
  salvar(save);
}

/** Ações com presente do Professor: só depois de a missão delas chegar (senão o presente é gasto antes da hora). */
const ESPERAM_A_MISSAO: EventoTutorial[] = ['plantouApricorn', 'craftBola', 'craftCharm'];
function esperaDaMissao(e: EventoTutorial): string | null {
  if (!ESPERAM_A_MISSAO.includes(e)) return null;
  const save = carregarSave();
  const licao = LICOES.find((l) => l.tarefa?.evento === e);
  // save antigo sem o tutorial novo: nada a esperar
  if (!save || !licao || !Array.isArray(save.tutorialVisto)) return null;
  // ainda trancado pelo nível: quem barra é a tranca
  if (nivelTreinador(save.xpTreinador ?? 0) < NIVEL_MINIMO[licao.conteudo]) return null;
  const vista = save.tutorialVisto.includes(licao.conteudo);
  const naFila = (save.tutorialTarefas ?? []).includes(licao.conteudo);
  // missão já feita
  if (vista && !naFila) return null;
  // é a missão da vez
  if (naFila && tarefaAtual(save)?.id === licao.conteudo) return null;
  return 'Professor Carvalho: calma! Termine antes a missão que está no quadro; esta vem logo depois, com um presente.';
}

// ---------- quadro da missão (canto de baixo, por cima do jogo) ----------
let quadro: HTMLElement | null = null;
let desenhado = '';

function irPara(ir: Ir): void {
  if ('cidade' in ir) {
    // fora da cidade, abre a cidade antes (ela anda até o lugar assim que carregar)
    if (!irAteNaCidade(ir.cidade)) navegar({ tela: 'cidade' });
  } else if ('tela' in ir) navegar(ir.tela);
  else {
    const save = carregarSave();
    if (!save) return;
    if (ir.abrir === 'bolsa') abrirBolsa(save, () => {});
    else abrirPC(save, () => {});
  }
}

/** O botão da missão só aparece onde ele leva a algum lugar (nos mapas, "Ir para os mapas" não faz sentido). */
function botaoUtil(ir: Ir): boolean {
  const tela = telaAtual();
  if ('cidade' in ir) return !(ir.cidade === 'mapas' && (tela === 'regiao' || tela === 'bioma'));
  if ('tela' in ir) return ir.tela.tela !== tela;
  return true;
}

let vigiaAltura: ResizeObserver | null = null;
function desenharMissao(save: Save): void {
  const atual = tarefaAtual(save);
  const chave = atual ? `${atual.id}|${atual.tarefa.ir && botaoUtil(atual.tarefa.ir)}` : '';
  if (chave === desenhado && (quadro?.isConnected || !atual)) return;
  desenhado = chave;
  quadro?.remove();
  quadro = null;
  vigiaAltura?.disconnect();
  document.documentElement.style.removeProperty('--altura-missao');
  if (!atual) return;
  const { tarefa } = atual;
  const numero = passoAtual(save) ? ` ${PASSOS.findIndex((p) => p.id === atual.id) + 1}/${PASSOS.length}` : '';
  quadro = el('aside', { class: 'tutorial-missao', role: 'status' },
    el('img', { class: 'tutorial-missao-foto', src: 'treinadores/oak-retrato.png', alt: '' }),
    el('div', { class: 'tutorial-missao-corpo' },
      el('strong', {}, '🎯 Missão do Professor', numero ? el('span', {}, numero) : ''),
      el('p', {}, tarefa.texto),
      tarefa.ir && botaoUtil(tarefa.ir) ? el('button', { class: 'botao', onclick: () => irPara(tarefa.ir!) }, tarefa.ir.rotulo) : ''));
  document.body.append(quadro);
  // os avisos do canto de baixo (Outbreak, Ninho, viagem) sobem para ficar acima do quadro, nunca por cima dele
  const q = quadro;
  vigiaAltura = new ResizeObserver(() => document.documentElement.style.setProperty('--altura-missao', `${q.offsetHeight + 14}px`));
  vigiaAltura.observe(q);
}

// ---------- balão do Professor ----------
async function mostrarProxima(): Promise<void> {
  if (mostrando || !fila.length) return;
  mostrando = true;
  // não aparece no meio de uma batalha, com o guia aberto nem em cima dos "Prêmios de hoje" ou do aviso de conquista
  while (document.querySelector(`.batalha-fundo, .janela-guia, ${PREMIOS_NA_TELA}, ${CONQUISTA_NA_TELA}`)) await new Promise((r) => setTimeout(r, 1000));
  const fala = fila.shift()!;
  const save = carregarSave();
  if (save && LICOES.some((l) => l.conteudo === fala.id)) {
    save.tutorialVisto = [...new Set([...(save.tutorialVisto ?? []), fala.id])];
    salvar(save);
    void pedirPresente(save, fala.id);
  }
  naTela = fala.id;
  balao(fala);
}

/** Mostra a introdução do Professor de novo (Opções → "Ver a introdução do Professor"). */
export function verIntroducao(): void {
  if (naTela === 'intro' || fila.some((f) => f.id === 'intro')) return;
  fila.unshift({ id: 'intro', paginas: INTRO });
  void mostrarProxima();
}

/**
 * Leu a introdução até o fim: conquista Conhecedor (o Kit iniciante vai para a Bolsa, para quem começou depois que
 * ele passou a vir por ela) e começam as missões.
 */
function introVista(): void {
  const save = carregarSave();
  if (!save) return;
  if (save.tutorialPasso === 'intro') save.tutorialPasso = PASSOS[0].id;
  if (!save.conquistas?.marcas?.tutorial) {
    marcarConquista(save, 'tutorial');
    if (save.kitPelaConquista) {
      conferirConquistas(save);
      if (resgatarConquista(save, 'conhecedor')) avisar('Conquista Conhecedor: você ganhou o Kit iniciante!', 'ok');
    }
  }
  salvar(save);
}

/**
 * O Professor fala fora da fila do tutorial (telas de criação do personagem, ovo e região, que vêm antes do save).
 * `fim` = texto do botão da última página. Devolve uma promessa que resolve quando o jogador fecha.
 */
export function falarProfessor(paginas: string[], fim = 'Entendi!'): Promise<void> {
  return new Promise((resolver) => balao({ id: '', paginas }, () => resolver(), fim));
}

function balao(fala: Fala, aoFechar?: () => void, textoFim = 'Começar!'): void {
  let pagina = 0;
  const fechar = () => {
    caixa.remove();
    fala.aoFechar?.();
    if (naTela === fala.id) naTela = null;
    if (aoFechar) return aoFechar();
    mostrando = false;
    void mostrarProxima();
  };
  const texto = el('p', {});
  const botoes = el('div', { class: 'tutorial-prof-botoes' });
  const contador = el('small', { class: 'tutorial-prof-pagina' });
  const desenhar = () => {
    texto.textContent = fala.paginas[pagina];
    const ultima = pagina === fala.paginas.length - 1;
    contador.textContent = fala.paginas.length > 1 ? `${pagina + 1}/${fala.paginas.length}` : '';
    // sem "Pular" (pedido do dono): página por página, até o fim
    botoes.replaceChildren(
      ...(!ultima
        ? [el('button', { class: 'botao', onclick: () => (pagina++, desenhar()) }, 'Próximo')]
        : fala.guia
          ? [el('button', { class: 'botao secundario', onclick: () => (fechar(), abrirGuia(fala.guia)) }, 'Ver no guia'), el('button', { class: 'botao', onclick: fechar }, 'Entendi!')]
          : [el('button', { class: 'botao', onclick: fechar }, aoFechar ? textoFim : fala.id === 'intro' ? 'Começar!' : 'Entendi!')]),
    );
  };
  // janela no meio da tela, por cima de tudo (pedido do dono: o Professor grande e centralizado)
  const caixa = el('div', { class: 'tutorial-fundo' },
    el('div', { class: 'tutorial-prof', role: 'dialog', 'aria-label': 'Professor Carvalho' },
      el('img', { class: 'tutorial-prof-foto', src: 'treinadores/oak-retrato.png', alt: '' }),
      el('div', { class: 'tutorial-prof-balao' },
        el('div', { class: 'tutorial-prof-topo' }, el('strong', { class: 'tutorial-prof-nome' }, 'Professor Carvalho'), contador),
        texto,
        botoes)));
  desenhar();
  document.body.append(caixa);
}

/** Liga o tutorial (no `main`): confere ao abrir e a cada vez que o jogo salva (começou o jogo, subiu de nível). */
export function vigiarTutorial(nav: Navegar): void {
  navegar = nav;
  ouvirTutorial(aoFazer);
  definirEsperaDoTutorial(esperaDaMissao);
  ouvirTela(() => {
    const s = carregarSave();
    if (s) desenharMissao(s);
  });
  const save = carregarSave();
  if (save) conferir(save);
  aoSalvar((s) => conferir(s));
}
