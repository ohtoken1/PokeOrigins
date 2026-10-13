// Quadro de missões da cidade: até 12 quadrinhos, cada um com a foto do Pokémon, o IV pedido (ex.: HP 31),
// a natureza e a qualidade. Entram 2 novas a cada 2 horas. Para concluir, o jogador clica na missão e escolhe um
// Pokémon dele (time ou PC) que bata com o pedido: não entrega o Pokémon, só mostra, e recebe o gold.
// O quadro é do servidor inteiro: quem concluir primeiro leva, e a missão fica indisponível para todos.
import { NOME_ATRIBUTO_IV, proximaRodadaEm, recompensaDaMissao, type MissaoQuadro } from '../../../shared/missoesQuadro';
import { faixaDoTier } from '../../../shared/tierIv';
import { textoDoTempo } from '../../../shared/viagem';
import { pokemonPorId } from '../dados';
import type { Save } from '../estado';
import { aoMudarQuadro, atualizarQuadro, candidatosDaMissao, concluidaPorMim, concluirMissaoCom, missoesNoQuadro, quemConcluiu } from '../missoesQuadro';
import { el, spritePokemon } from './dom';
import { abrirJanela } from './janela';
import { cartaoPokemon } from './time';

function seloQualidade(tier: string): HTMLElement {
  const [min, max] = faixaDoTier(tier);
  return el('span', { class: `selo-tier tier-${tier === 'S+' ? 'sp' : tier.toLowerCase()}`, title: `Qualidade ${tier} · soma dos IVs entre ${min} e ${max} (de 186)` },
    el('span', { class: 'letra' }, tier.replace('+', '')), tier.endsWith('+') ? el('span', { class: 'mais' }, '+') : null);
}

const pedido = (m: MissaoQuadro) => `${pokemonPorId(m.especie).nome} · ${NOME_ATRIBUTO_IV[m.iv]} 31 · ${m.natureza} · Qualidade ${m.qualidade}`;

export function abrirQuadroDeMissoes(save: Save, aoMudar: () => void = () => {}): void {
  /** Missão que o jogador abriu para escolher o Pokémon (null = o quadro). */
  let aberta: MissaoQuadro | null = null;
  let aviso = '';
  let ultimoSegundo = 0;
  let ocupado = false;

  const cartao = (m: MissaoQuadro, agora: number): HTMLElement => {
    const dados = pokemonPorId(m.especie);
    const quem = quemConcluiu(m);
    const feita = !!quem;
    const minha = concluidaPorMim(m);
    const tenho = candidatosDaMissao(save, m).length;
    return el('button', {
      class: `missao-quadro ${feita ? 'feita' : ''}`, type: 'button', disabled: feita,
      title: feita ? `Concluída por ${quem!.por}: não está mais disponível` : 'Clique para escolher um Pokémon seu e concluir',
      onclick: () => {
        aberta = m;
        aviso = '';
        janela.redesenhar();
      },
    },
      el('div', { class: 'missao-foto' }, spritePokemon(dados, { animado: false }), seloQualidade(m.qualidade)),
      el('strong', {}, dados.nome),
      el('ul', {},
        el('li', {}, el('small', {}, 'IV'), `${NOME_ATRIBUTO_IV[m.iv]} 31`),
        el('li', {}, el('small', {}, 'Nature'), m.natureza),
        el('li', {}, el('small', {}, 'Qualidade'), m.qualidade)),
      el('div', { class: 'missao-rodape' },
        el('span', { class: 'banco-moeda' }, el('span', { class: 'icone-moeda moeda-gold' }), el('strong', {}, String(recompensaDaMissao(m)))),
        feita ? el('span', { class: 'missao-feita', title: 'Sai do quadro no próximo sorteio' }, minha ? 'Concluída por você' : `Concluída por ${quem!.por}`) : el('small', { class: 'missao-tempo', title: 'Tempo até esta missão sair do quadro' }, `Sai em ${textoDoTempo(m.ate - agora)}`),
        !feita && tenho ? el('small', { class: 'missao-tenho' }, `Você tem ${tenho}`) : null));
  };

  const janela = abrirJanela('Quadro de missões', () => {
    const agora = Date.now();
    const missoes = missoesNoQuadro(agora);
    // a missão aberta saiu do quadro (ou outro jogador concluiu) enquanto o jogador escolhia
    if (aberta && !missoes.some((m) => m.id === aberta!.id)) {
      aberta = null;
      aviso = 'Essa missão saiu do quadro.';
    } else if (aberta && !ocupado && quemConcluiu(aberta)) {
      aviso = `${quemConcluiu(aberta)!.por} concluiu essa missão antes.`;
      aberta = null;
    }
    if (aberta) {
      const m = aberta;
      const meus = candidatosDaMissao(save, m);
      return el('div', { class: 'quadro-missoes' },
        el('button', { class: 'botao secundario missao-voltar', type: 'button', onclick: () => ((aberta = null), (aviso = ''), janela.redesenhar()) }, '← Voltar ao quadro'),
        el('p', { class: 'missao-pedido' }, el('strong', {}, pedido(m)), el('span', { class: 'banco-moeda' }, el('span', { class: 'icone-moeda moeda-gold' }), el('strong', {}, String(recompensaDaMissao(m))))),
        el('p', { class: 'meta' }, meus.length
          ? 'Escolha o Pokémon que cumpre a missão (time e PC). Você não entrega: ele continua com você.'
          : `Você não tem nenhum ${pokemonPorId(m.especie).nome} no time nem no PC.`),
        el('p', { class: 'banco-aviso', role: 'status' }, aviso),
        el('div', { class: 'vagas missao-candidatos' },
          ...meus.map((p) => cartaoPokemon(p, {
            onclick: async () => {
              if (ocupado) return;
              ocupado = true;
              const erro = await concluirMissaoCom(save, m, p);
              ocupado = false;
              if (erro) aviso = erro;
              else {
                aoMudar();
                aviso = `Missão concluída! +${recompensaDaMissao(m)} Origin Coins.`;
                aberta = null;
              }
              janela.redesenhar();
            },
          }))));
    }
    const feitasTotal = save.estatisticas?.missoesQuadro ?? 0;
    return el('div', { class: 'quadro-missoes' },
      el('p', { class: 'meta' }, `Missões concluídas por você: ${feitasTotal.toLocaleString('pt-BR')} (veja o ranking em Comunidade → Ranking). `, 'O quadro é o mesmo para todos os jogadores: cada missão só pode ser concluída por UM jogador, o primeiro que apresentar um Pokémon com o IV, a Nature e a qualidade pedidos. Você não perde o Pokémon. Novas missões em ', el('span', { class: 'missao-proxima' }, textoDoTempo(proximaRodadaEm(agora) - agora)), '.'),
      el('p', { class: 'banco-aviso', role: 'status' }, aviso),
      el('div', { class: 'grade-missoes' }, ...missoes.map((m) => cartao(m, agora))));
  }, { classe: 'janela-missoes', aoFechar: () => (clearInterval(tique), pararDeOuvir()) });
  // alguém concluiu uma missão com o quadro aberto
  const pararDeOuvir = aoMudarQuadro(() => {
    if (!ocupado) janela.redesenhar();
  });
  void atualizarQuadro();
  // a contagem anda sem refazer a janela (refazer a cada segundo perderia o clique); só refaz quando a rodada vira
  const tique = window.setInterval(() => {
    const agora = Date.now();
    const rodada = proximaRodadaEm(agora);
    if (ultimoSegundo && rodada !== ultimoSegundo) janela.redesenhar();
    ultimoSegundo = rodada;
    if (aberta) return;
    const missoes = missoesNoQuadro(agora);
    const proxima = document.querySelector('.janela-missoes .missao-proxima');
    if (proxima) proxima.textContent = textoDoTempo(rodada - agora);
    document.querySelectorAll('.janela-missoes .grade-missoes .missao-quadro').forEach((c, i) => {
      const tempo = c.querySelector('.missao-tempo');
      if (tempo && missoes[i]) tempo.textContent = `Sai em ${textoDoTempo(missoes[i].ate - agora)}`;
    });
  }, 1000);
}
