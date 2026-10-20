// Tutorial (pedido do dono): quando o treinador chega no nível que libera um conteúdo (shared/trancas.ts), o
// Professor Carvalho aparece num balão de fala explicando o básico, e o botão abre o Guia do jogo no tópico certo.
// Cada aviso aparece uma vez por conta (`save.tutorialVisto`). Quem já passou do nível quando isto entrou no jogo
// não recebe os avisos antigos de uma vez (a primeira conferência marca o que já estava liberado como visto).
import { conferirConquistas, marcarConquista, resgatarConquista } from './conquistas';
import { avisar } from './ui/avisos';
import { NIVEL_MINIMO, type ConteudoTrancado } from '../../shared/trancas';
import { nivelTreinador } from '../../shared/treinador';
import { aoSalvar, carregarSave, salvar, type Save } from './estado';
import { el } from './ui/dom';
import { abrirGuia } from './ui/guia';

interface Licao {
  conteudo: ConteudoTrancado;
  /** o que o Professor fala (depois da frase do nível) */
  fala: string;
  guia?: { grupo: string; topico: string };
}

const LICOES: Licao[] = [
  { conteudo: 'loginBoasVindas', guia: { grupo: 'sistemas', topico: 'login' }, fala: 'Agora você ganha prêmios só por entrar no jogo! Nos 7 primeiros dias da sua conta, cada dia em que você entra vale um prêmio. Veja em Minha conta → Recompensas; os prêmios chegam pelo Correio.' },
  { conteudo: 'loginTrinta', guia: { grupo: 'sistemas', topico: 'login' }, fala: 'Você liberou o login dos 30 dias! Nos 30 primeiros dias do servidor, cada dia tem o seu prêmio: entrou naquele dia, ganha; não entrou, perde. Se for VIP, dá para recuperar até 3 dias perdidos.' },
  { conteudo: 'troca', guia: { grupo: 'sistemas', topico: 'trocas' }, fala: 'Agora você pode trocar com outros treinadores! Clique em um jogador no mapa e escolha "Trocar": cada um monta a sua oferta de Pokémon, itens e moedas.' },
  { conteudo: 'mercadoNegro', guia: { grupo: 'sistemas', topico: 'mercado' }, fala: 'Agora você pode usar o Mercado negro da cidade! Lá os treinadores anunciam Pokémon, itens e Origin Coins, e você pode comprar ou vender os seus.' },
  { conteudo: 'canteiros', guia: { grupo: 'sistemas', topico: 'craft' }, fala: 'A Artesã da horta liberou os canteiros para você! Plante Berries e Apricorns, regue e colha depois.' },
  { conteudo: 'craftBola', guia: { grupo: 'sistemas', topico: 'craft' }, fala: 'Agora a Artesã também faz Pokébolas especiais para você, usando Apricorns.' },
  { conteudo: 'creche', guia: { grupo: 'sistemas', topico: 'daycare' }, fala: 'Você liberou o nosso Daycare! Deixe um casal de Pokémon lá e, com o tempo, pode sair um ovo. Os filhotes herdam parte dos IVs dos pais.' },
  { conteudo: 'suspeito', guia: { grupo: 'sistemas', topico: 'suspeito' }, fala: 'Um Homem Suspeito, sentado no campo de flores, agora aceita falar com você. Ele reseta EVs, nível e evolução dos seus Pokémon… por um preço.' },
  { conteudo: 'torneio', guia: { grupo: 'eventos', topico: 'torneio' }, fala: 'Você já pode participar dos Torneios! São dois por dia, às 12h30 e às 18h30, valendo prêmios e medalhas.' },
  { conteudo: 'guilda', guia: { grupo: 'sistemas', topico: 'guildas' }, fala: 'As Guildas foram liberadas! Entre numa ou crie a sua: a guilda sobe de nível com a ajuda dos membros e dá bônus para todos.' },
  { conteudo: 'boss', guia: { grupo: 'eventos', topico: 'boss' }, fala: 'Agora você pode enfrentar os Bosses que aparecem na gaiola da cidade! Cada treinador luta uma vez, e quem causar mais dano ganha prêmios.' },
  { conteudo: 'safari', guia: { grupo: 'eventos', topico: 'safari' }, fala: 'O Safari está aberto para você! Escolha um tipo e passe por três salas cheias de Pokémon com IVs altos, e shiny e raros aparecem muito mais.' },
  { conteudo: 'craftCharm', guia: { grupo: 'sistemas', topico: 'craft' }, fala: 'A Artesã agora sabe fazer Charms! Com Berries e Energies do mesmo tipo, você aumenta a chance de shiny daquele tipo.' },
  { conteudo: 'liga', guia: { grupo: 'eventos', topico: 'liga' }, fala: 'Você está pronto para a Liga Pokémon! Enfrente a Elite 4 — ou a Liga Nightmare, se tiver coragem. Uma tentativa por semana, com o time de 6 travado do começo ao fim.' },
];

/** Introdução ao jogo (pedido do dono): aparece uma vez, para quem acabou de começar. Uma fala por página. */
const INTRO = [
  'Chegamos à cidade! Vou te mostrar rapidinho o básico para começar a sua jornada. Ande com as setas ou W A S D.',
  'Aqui ficam a loja, o Centro Pokémon, a estação de trem, a Arena e muitos NPCs. Clique no nome de um lugar para usá-lo na hora, ou no minimapa, no canto de cima, para andar até ele.',
  'Para caçar Pokémon, saia pela saída do sul da cidade e escolha um bioma. Quando você para de andar, pode aparecer um Pokémon: aperte Enter para lutar, ou continue andando para fugir.',
  'Seus Pokémon se cansam nas batalhas. Cure o time de graça no Centro Pokémon: é o coração no alto da tela. Ali do lado ficam também os atalhos da Bolsa, do PC e do Correio.',
  'Antes de sair, abra a sua Bolsa: tem um Kit iniciante esperando por você, com Pokébolas, remédios e Poké Dólares!',
  'Conforme você sobe de nível de treinador, novos sistemas são liberados, e eu volto para te contar cada um. Ficou com dúvida? Clique no botão dourado "?" no canto de cima, ou aperte F1 para ver os atalhos do teclado. Boa jornada!',
];

/** Uma fala do Professor: páginas de texto e, se tiver, o tópico do guia que ela explica. */
interface Fala {
  id: string;
  paginas: string[];
  guia?: { grupo: string; topico: string };
}
const falaDaLicao = (l: Licao): Fala => ({ id: l.conteudo, paginas: [`Parabéns, você chegou ao nível ${NIVEL_MINIMO[l.conteudo]} de treinador! ${l.fala}`], guia: l.guia });

/** Falas que ainda vão aparecer (uma de cada vez). */
const fila: Fala[] = [];
let mostrando = false;

function conferir(save: Save): void {
  const nivel = nivelTreinador(save.xpTreinador ?? 0);
  const liberadas = LICOES.filter((l) => nivel >= NIVEL_MINIMO[l.conteudo]);
  if (!Array.isArray(save.tutorialVisto)) {
    // primeira vez: o que já estava liberado conta como visto (sem chuva de avisos para quem já jogava);
    // jogador novo (sem XP) ganha a introdução
    const novo = !(save.xpTreinador > 0);
    save.tutorialVisto = [...liberadas.map((l) => l.conteudo), ...(novo ? [] : ['intro'])];
    salvar(save);
    if (!novo) return;
  }
  const vistas = save.tutorialVisto!;
  const novas: Fala[] = [
    // a introdução volta enquanto o jogador novo não a fechou (é ela que entrega o Kit iniciante)
    ...(vistas.includes('intro') && !(save.kitPelaConquista && !save.conquistas?.marcas?.tutorial) ? [] : [{ id: 'intro', paginas: INTRO }]),
    ...liberadas.filter((l) => !vistas.includes(l.conteudo)).map(falaDaLicao),
  ].filter((f) => !fila.some((x) => x.id === f.id));
  if (!novas.length) return;
  fila.push(...novas);
  void mostrarProxima();
}

async function mostrarProxima(): Promise<void> {
  if (mostrando || !fila.length) return;
  mostrando = true;
  // não aparece no meio de uma batalha nem com o guia aberto: espera fechar
  while (document.querySelector('.batalha-fundo, .janela-guia')) await new Promise((r) => setTimeout(r, 1000));
  const fala = fila.shift()!;
  const save = carregarSave();
  if (save) {
    save.tutorialVisto = [...new Set([...(save.tutorialVisto ?? []), fala.id])];
    salvar(save);
  }
  balao(fala);
}

/**
 * O Professor fala fora da fila do tutorial (telas de criação do personagem, ovo e região, que vêm antes do save).
 * `fim` = texto do botão da última página. Devolve uma promessa que resolve quando o jogador fecha.
 */
/** Mostra a introdução do Professor de novo (Opções → "Ver a introdução do Professor"). */
export function verIntroducao(): void {
  if (fila.some((f) => f.id === 'intro')) return;
  fila.unshift({ id: 'intro', paginas: INTRO });
  void mostrarProxima();
}

/**
 * Fechou a introdução (no fim ou em "Pular"): conquista Conhecedor. Para quem começou depois que o Kit iniciante
 * passou a vir por ela (`save.kitPelaConquista`), a recompensa é resgatada na hora: o kit já vai para a Bolsa.
 */
function introVista(): void {
  const save = carregarSave();
  if (!save || save.conquistas?.marcas?.tutorial) return;
  marcarConquista(save, 'tutorial');
  if (save.kitPelaConquista) {
    conferirConquistas(save);
    if (resgatarConquista(save, 'conhecedor')) avisar('Conquista Conhecedor: você ganhou o Kit iniciante! Abra pela Bolsa (aba Itens-chave).', 'ok');
  }
  salvar(save);
}

export function falarProfessor(paginas: string[], fim = 'Entendi!'): Promise<void> {
  return new Promise((resolver) => balao({ id: '', paginas }, () => resolver(), fim));
}

function balao(fala: Fala, aoFechar?: () => void, textoFim = 'Começar!'): void {
  let pagina = 0;
  const fechar = () => {
    caixa.remove();
    if (fala.id === 'intro') introVista();
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
    botoes.replaceChildren(
      ...(!ultima
        ? [el('button', { class: 'botao secundario', onclick: fechar }, 'Pular'), el('button', { class: 'botao', onclick: () => (pagina++, desenhar()) }, 'Próximo')]
        : fala.guia
          ? [el('button', { class: 'botao secundario', onclick: fechar }, 'Depois'), el('button', { class: 'botao', onclick: () => (abrirGuia(fala.guia), fechar()) }, 'Ver como funciona')]
          : aoFechar
            ? [el('button', { class: 'botao', onclick: fechar }, textoFim)]
            : [el('button', { class: 'botao secundario', onclick: () => (abrirGuia(), fechar()) }, 'Abrir o guia'), el('button', { class: 'botao', onclick: fechar }, textoFim)]),
    );
  };
  // janela no meio da tela, por cima de tudo (pedido do dono: o Professor grande e centralizado)
  const caixa = el('div', { class: 'tutorial-fundo' },
    el('div', { class: 'tutorial-prof', role: 'dialog', 'aria-label': 'Professor Carvalho' },
      el('img', { class: 'tutorial-prof-foto', src: 'treinadores/oak.png', alt: '' }),
      el('div', { class: 'tutorial-prof-balao' },
        el('div', { class: 'tutorial-prof-topo' }, el('strong', { class: 'tutorial-prof-nome' }, 'Professor Carvalho'), contador),
        texto,
        botoes)));
  desenhar();
  document.body.append(caixa);
}

/** Liga o tutorial (no `main`): confere ao abrir e a cada vez que o jogo salva (começou o jogo, subiu de nível). */
export function vigiarTutorial(): void {
  const save = carregarSave();
  if (save) conferir(save);
  aoSalvar((s) => conferir(s));
}
