// Jogar → Cidade: a cidade inicial, onde os jogadores ficam quando não estão caçando nos mapas nem competindo.
// Mapa e prédios em jogo/cidade.ts. Os nomes dos lugares são botões (Centro Pokémon cura, Pokémarket abre a loja,
// Move Reminder/Move Tutor abrem os professores, estação = trem entre as regiões, Arena para os ginásios, Banco, Mural)
// e o minimapa no canto mostra onde fica cada um. Clicar no nome abre direto; clicar no minimapa faz o personagem andar
// sozinho até o lugar (a função abre quando ele chega); a saída do sul abre os mapas da região; andar com as teclas no meio do caminho cancela. Usa o mesmo jogo (Phaser) dos biomas, com o mapa da cidade e sem encontros.
import { textoTranca } from '../../../shared/trancas';
import { abrirEventos } from '../ui/eventos';
import { abrirBoss, aoMudarBoss, bossAtual } from '../boss';
import { abrirBatalha } from '../batalha/telaBatalha';
import { TURNOS_BOSS } from '../../../shared/eventosRegras';
import { conteudoLiberado } from '../trancas';
import type { Tela } from '../main';
import { biomaPorId } from '../../../shared/biomas';
import type { BiomaScene, OpcoesBioma } from '../jogo/BiomaScene';
import { mostrarJogo } from '../jogo/jogoUnico';
import { carregarSave, usarSave, salvar } from '../estado';
import { abrirCura } from '../ui/cura';
import { abrirLoja } from '../ui/loja';
import { abrirBanco } from '../ui/banco';
import { ehAdministrador } from '../bonificacao';
import { abrirMercado } from '../ui/mercado';
import { abrirMural } from '../ui/mural';
import { abrirSafari } from '../ui/safari';
import { abrirEstacao } from '../ui/trem';
import { abrirArena } from '../ui/arena';
import { abrirQuadroDeMissoes } from '../ui/quadroMissoes';
import { abrirLojaTemporal } from '../ui/lojaTemporal';
import { abrirSuspeito } from '../ui/suspeito';
import { abrirCraft } from '../ui/craft';
import { abrirCreche } from '../ui/creche';
import { passoDosOvos } from '../creche';
let passosSemSalvar = 0;
import { viagemAtual } from '../viagem';
import { REGIOES } from '../../../shared/regioes';
import { abrirProfessores } from './golpes';
import { montarMinimapa } from '../ui/minimapa';
import { abrirMenuJogador } from '../ui/menuJogador';
import { montarChat } from '../ui/chat';
import { el } from '../ui/dom';
import { aoMudarJanelas } from '../ui/janela';
import { painelTime } from '../ui/time';
import { aparenciaDoSave } from '../personagem/aparencia';
import { montarPersonagem } from '../personagem/lpc';

/** NPCs que ainda não têm função. */
const EM_BREVE: Record<string, string> = { sazonal: 'Evento sazonal' };

export const telaCidade: Tela = (raiz, navegar) => {
  const save = carregarSave();
  if (!save) return navegar({ tela: 'inicial' });
  usarSave(save);

  let cena: () => BiomaScene | null = () => null;
  const caixaTime = el('div', {});
  const atualizarTime = () => {
    caixaTime.replaceChildren(
      painelTime(save.time, () => {
        salvar(save);
        atualizarTime();
      }),
    );
    cena()?.definirSeguidor(save.time[0] ? { especie: save.time[0].especieId, shiny: save.time[0].shiny } : null);
  };
  atualizarTime();

  const areaJogo = el('div', { class: 'area-jogo' });
  const chat = montarChat();
  raiz.append(
    el('main', { class: 'tela tela-bioma tela-cidade' },
      el('header', { class: 'barra' },
        el('button', { class: 'botao secundario', onclick: () => navegar({ tela: 'inicio' }) }, '← Voltar'),
        el('h1', {}, 'Cidade'),
      ),
      el('div', { class: 'layout-bioma' },
        el('section', {}, areaJogo, el('p', { class: 'dica' }, 'Ande com as setas ou W A S D. Aqui não aparecem Pokémon selvagens. Clique no nome de um lugar que está na tela para usar na hora, ou no minimapa para o seu personagem andar até lá: Centro Pokémon, Pokémarket, Banco, Mural de anúncios, Move Reminder, Move Tutor… Na estação de trem você viaja para outra região; a saída do sul leva aos mapas.')),
        el('aside', {}, caixaTime, chat.elemento),
      ),
    ),
  );

  const carregando = el('div', { class: 'carregando-mapa' }, el('span', { class: 'giro' }), 'Carregando cidade…');
  areaJogo.append(carregando);

  // boné guardado para depois (pedido do dono), como nos biomas
  const aparencia = aparenciaDoSave(save);
  const opcoes: OpcoesBioma = {
    bioma: biomaPorId('grama'),
    cidade: true,
    aoPronto: () => carregando.remove(),
    seguidor: save.time[0] ? { especie: save.time[0].especieId, shiny: save.time[0].shiny } : null,
    // na cidade não há encontros
    aoPisar: () => {
      // ovos do PC chocam com 1.000 passos: salva ao chocar e a cada 25 passos (a cidade não salvava a cada passo)
      if (save && save.caixa.some((p) => p.ovo)) {
        passosSemSalvar++;
        if (passoDosOvos(save) || passosSemSalvar >= 25) {
          passosSemSalvar = 0;
          salvar(save);
        }
      }
      // saída do sul: chegou nela, abre os mapas da região (pedido do dono)
      const info = cena()?.infoMinimapa();
      if (info?.mapa.saida && info.jogador.y >= info.mapa.saida.y) usarLocal('mapas');
    },
    personagem: { chave: JSON.stringify(aparencia), folhas: montarPersonagem(aparencia) },
    nomeJogador: save.aparencia?.nome,
    // o nome clicado no mapa já está na tela do jogador: abre direto (pedido do dono); o minimapa faz andar até lá
    // (a saída para os mapas não é função de lugar: tem de andar até ela)
    aoClicarLocal: (acao) => (acao === 'mapas' ? irAoLocal(acao) : usarLocal(acao)),
    // todos os jogadores na mesma cidade
    sala: 'cidade',
    aoClicarJogador: abrirMenuJogador,
  };
  const jogo = mostrarJogo(areaJogo, opcoes);
  cena = jogo.cena;
  // Boss (client/src/boss.ts): o Pokémon furioso na gaiola enquanto o evento dura
  const desenharBoss = () => {
    const b = bossAtual();
    cena()?.mostrarBoss(b ? { especie: b.especieId, fim: b.fim, aoClicar: () => usarLocal('boss') } : null);
  };
  const pararBoss = aoMudarBoss(desenharBoss);
  const relogioBoss = window.setInterval(desenharBoss, 15_000);
  window.setTimeout(desenharBoss, 1500);

  // aviso curto em cima do jogo ("Seus Pokémon foram curados!")
  const aviso = el('div', { class: 'cidade-aviso', role: 'status' });
  areaJogo.append(aviso);
  let relogioAviso = 0;
  const avisar = (texto: string) => {
    aviso.textContent = texto;
    aviso.classList.add('visivel');
    clearTimeout(relogioAviso);
    relogioAviso = window.setTimeout(() => aviso.classList.remove('visivel'), 2200);
  };
  /** Clicou num lugar do minimapa: o personagem anda até lá e a função abre na chegada. */
  function irAoLocal(acao: string) {
    // a saída abre sozinha ao pisar nela (aoPisar)
    if (cena()?.irAte(acao, () => void (acao !== 'mapas' && usarLocal(acao)))) avisar('Indo até lá… (ande com as teclas para cancelar)');
    else avisar('Não dá para chegar lá agora.');
  }
  let saindo = false;
  /** O que cada lugar faz quando o personagem chega. */
  function usarLocal(acao: string) {
    if (acao === 'centro') {
      abrirCura(save!, () => atualizarTime());
    } else if (acao === 'loja') abrirLoja(save!, () => atualizarTime());
    else if (acao === 'reminder') abrirProfessores(save!, 'relembrar', () => atualizarTime());
    else if (acao === 'tutor') abrirProfessores(save!, 'tutor', () => atualizarTime());
    else if (acao === 'estacao') abrirEstacao(save!, () => atualizarTime());
    else if (acao === 'mapas') {
      const viagem = viagemAtual();
      if (viagem) return avisar(`Você está viajando para ${REGIOES.find((r) => r.id === viagem.para)?.nome ?? viagem.para}. Os mapas abrem quando o trem chegar.`);
      if (saindo) return;
      saindo = true;
      navegar({ tela: 'regiao' });
    }
    else if (acao === 'arena') abrirArena(navegar);
    else if (acao === 'banco' && !ehAdministrador()) avisar('Banco: fechado por enquanto.');
    else if (acao === 'banco') abrirBanco(save!, () => atualizarTime());
    else if (acao === 'mural') abrirMural();
    else if (acao === 'guildas') navegar({ tela: 'comunidade', secao: 'cla' });
    else if (acao === 'viajante') abrirLojaTemporal(save!, () => atualizarTime());
    else if (acao === 'suspeito' && !conteudoLiberado('suspeito')) avisar(`Homem Suspeito: ${textoTranca('suspeito')}.`);
    else if (acao === 'suspeito') abrirSuspeito(save!, () => atualizarTime());
    else if (acao === 'missoes') abrirQuadroDeMissoes(save!, () => atualizarTime());
    else if (acao === 'mercadonegro' && !conteudoLiberado('mercadoNegro')) avisar(`Mercado negro: ${textoTranca('mercadoNegro')}.`);
    else if (acao === 'mercadonegro') abrirMercado(save!, () => atualizarTime());
    // quem já está num Safari aberto continua; para entrar num novo vale a tranca
    else if (acao === 'safari' && !conteudoLiberado('safari') && !save!.safari?.aberto) avisar(`Safari: ${textoTranca('safari')}.`);
    else if (acao === 'safari') abrirSafari(save!, navegar, () => atualizarTime());
    else if (acao === 'craft') abrirCraft(save!, () => atualizarTime());
    else if (acao === 'creche') abrirCreche(save!, () => atualizarTime());
    // NPC Eventos (feira do oeste): Cofre e Loteria (ui/eventos.ts)
    else if (acao === 'eventos') abrirEventos(save!, () => atualizarTime());
    else if (acao === 'boss')
      abrirBoss(save!, (boss, nome, aoFim) => {
        cena()?.pausar(true);
        abrirBatalha({
          save: save!, bioma: biomaPorId('caverna'), selvagem: boss,
          treinador: { nome, titulo: 'Boss', equipe: [boss], recompensa: 0, mensagemInicio: `${nome} ruge furioso dentro da gaiola!` },
          boss: { turnos: TURNOS_BOSS, aoDano: aoFim },
          aoTerminar: () => {
            cena()?.pausar(false);
            atualizarTime();
          },
        });
      });
    // evento sazonal: o NPC fica fechado enquanto a staff não liga nenhum (ainda não há eventos sazonais)
    else if (acao === 'sazonal') avisar('🔒 Nenhum evento sazonal ativo no momento.');
    else avisar(`${EM_BREVE[acao] ?? 'Este lugar'}: em breve.`);
  }
  const minimapa = montarMinimapa(areaJogo, () => cena(), irAoLocal);

  // o mapa para com PC/Bolsa/ficha abertos
  const pararDeOuvirJanelas = aoMudarJanelas((aberta) => cena()?.pausar(aberta));

  return () => {
    pararBoss();
    clearInterval(relogioBoss);
    pararDeOuvirJanelas();
    minimapa.parar();
    chat.parar();
    clearTimeout(relogioAviso);
    jogo.tirar();
  };
};
