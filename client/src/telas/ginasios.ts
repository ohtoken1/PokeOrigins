// Jogar → Ginásios: os líderes de cada região (abas por região), em três dificuldades (shared/ginasiosDificuldade.ts).
// Fácil = o time dos jogos, dá a insígnia (uma vez; aparece no cabeçalho). Médio e Difícil = times montados pela
// staff (Administração → Ginásios), sem insígnia nova. Cada dificuldade tem a sua sequência e paga Poké Dólares só
// na primeira vitória.
import type { Tela } from '../main';
import { BIOMAS } from '../../../shared/biomas';
import { RECOMPENSA_GINASIO, lideresDaRegiao, type LiderGinasio } from '../../../shared/ginasios';
import { DIFICULDADES_GINASIO, MULT_RECOMPENSA_GINASIO, NOME_DIFICULDADE_GINASIO, nivelDoLider, type DificuldadeGinasio } from '../../../shared/ginasiosDificuldade';
import { REGIOES } from '../../../shared/regioes';
import { montarTimeNpc, nivelDoGinasio } from '../../../shared/treinadoresNpc';
import { curar, expParaNivel, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { abrirBatalha } from '../batalha/telaBatalha';
import { pokemonPorId } from '../dados';
import { carregarSave, salvar, type Save } from '../estado';
import { corTipo, el, seloTipo, spritePokemon } from '../ui/dom';
import { imagemTreinador } from './duelos';
import { colunaDoTime } from '../ui/time';
import { ehAdministrador } from '../bonificacao';
import { aoMudarViagem, viagemAtual } from '../viagem';
import { aoMudarAjustes, timeDoGinasio } from '../ajustesJogo';
import { conteudoLiberado } from '../trancas';
import { textoTranca } from '../../../shared/trancas';

/**
 * Desenho da insígnia (client/public/insignias/<líder>.png); apagado se ainda não foi conquistada.
 * A insígnia NÃO é item (fica em save.insignias). Em Alola, os selos usam o mesmo desenho dos cristais Z
 * do tipo, mas são imagens próprias, sem ligação com os itens Z.
 */
export function insigniaVisual(lider: LiderGinasio, ganha: boolean): HTMLElement {
  return el('span', { class: `insignia-img ${ganha ? 'ganha' : 'nao-ganha'}`, title: `${lider.insignia}${ganha ? '' : ' (ainda não conquistada)'}` },
    el('img', { src: `insignias/${lider.id}.png`, alt: lider.insignia, loading: 'lazy' }));
}

let regiaoAberta: string | null = null;
let dificuldadeAberta: DificuldadeGinasio = 'facil';

/** Líderes já vencidos naquela dificuldade (Fácil = as insígnias). */
function vencidos(save: Save, d: DificuldadeGinasio): string[] {
  if (d === 'facil') return (save.insignias ??= []);
  save.ginasiosVencidos ??= {};
  return (save.ginasiosVencidos[d] ??= []);
}

/** Time do líder na batalha: o dos jogos (Fácil) ou o da staff, no nível da dificuldade, curado. */
function equipeDoLider(lider: LiderGinasio, d: DificuldadeGinasio, time: PokemonIndividual[]): PokemonIndividual[] {
  const nivel = nivelDoLider(d, lider.ordem, nivelDoGinasio(time));
  const crescimentoDe = (n: number) => pokemonPorId(n).crescimento;
  if (d === 'facil') return montarTimeNpc(lider, time, crescimentoDe, nivel, true);
  return timeDoGinasio(d, lider.id).map((original) => {
    const p = structuredClone(original);
    p.nivel = nivel;
    p.exp = expParaNivel(crescimentoDe(p.especieId), nivel);
    curar(p);
    return p;
  });
}

export const telaGinasios: Tela = (raiz, navegar) => {
  const save = carregarSave();
  const tela = el('main', { class: 'tela tela-ginasios' }, el('h1', {}, 'Ginásios'));
  raiz.append(tela);
  if (!save) {
    tela.append(el('p', { class: 'sub' }, 'Comece um jogo para desafiar os ginásios.'), el('button', { class: 'botao', onclick: () => navegar({ tela: 'inicial' }) }, 'Começar'));
    return;
  }
  save.insignias ??= [];
  // jogador comum só desafia os ginásios da região onde está, e nenhum enquanto viaja de trem (pedido do dono);
  // as outras abas ficam só para olhar. Administradores desafiam qualquer um.
  const admin = ehAdministrador();
  let regiao = admin ? regiaoAberta ?? save.regiao : save.regiao;
  let dificuldade = dificuldadeAberta;
  const nomeDe = (id: string) => REGIOES.find((r) => r.id === id)?.nome ?? id;
  /** Por que não dá para desafiar os ginásios desta aba ('' = dá). */
  const bloqueio = (): string => {
    if (admin) return '';
    if (!conteudoLiberado('duelos')) return `Ginásios: ${textoTranca('duelos')}.`;
    const viagem = viagemAtual();
    if (viagem) return `Você está viajando para ${nomeDe(viagem.para)}. Os ginásios abrem quando o trem chegar.`;
    return regiao === save.regiao ? '' : `Você está em ${nomeDe(save.regiao)}. Para desafiar os ginásios de ${nomeDe(regiao)}, viaje de trem até lá.`;
  };
  /**
   * Ginásios em ordem (pedido do dono, vale para todos, administradores inclusive): só dá para desafiar um líder
   * depois de vencer todos os anteriores da mesma região NA MESMA dificuldade. Devolve o que falta (null = liberado).
   */
  const faltaAntes = (lider: LiderGinasio): LiderGinasio | null =>
    lideresDaRegiao(lider.regiao).filter((l) => l.ordem < lider.ordem && !vencidos(save, dificuldade).includes(l.id)).sort((a, b) => a.ordem - b.ordem)[0] ?? null;
  const semTime = (lider: LiderGinasio) => dificuldade !== 'facil' && !timeDoGinasio(dificuldade, lider.id).length;
  const recompensaDe = (lider: LiderGinasio) => RECOMPENSA_GINASIO[lider.ordem - 1] * MULT_RECOMPENSA_GINASIO[dificuldade];
  const corpo = el('div', { class: 'ginasios-corpo' });

  const desafiar = (lider: LiderGinasio) => {
    if (bloqueio() || faltaAntes(lider) || semTime(lider)) return desenhar();
    const d = dificuldade;
    const equipe = equipeDoLider(lider, d, save.time);
    const jaTinha = vencidos(save, d).includes(lider.id);
    const daInsignia = d === 'facil' && !jaTinha;
    abrirBatalha({
      save,
      selvagem: equipe[0],
      bioma: BIOMAS[Math.floor(Math.random() * BIOMAS.length)],
      treinador: {
        // IA (shared/batalha/ia.ts, pedido do dono): Fácil = fácil, Médio = médio, Difícil = difícil
        ia: d === 'facil' ? 'facil' : d === 'media' ? 'medio' : 'dificil',
        nome: lider.nome,
        titulo: d === 'facil' ? lider.titulo : `${lider.titulo} · ${NOME_DIFICULDADE_GINASIO[d]}`,
        equipe,
        // os Poké Dólares do ginásio só saem na PRIMEIRA vitória de cada dificuldade (decisão do dono)
        recompensa: jaTinha ? 0 : recompensaDe(lider),
        imagem: imagemTreinador(lider.id),
        mensagemVitoria: daInsignia ? `Você ganhou a ${lider.insignia}!` : jaTinha ? undefined : `Você venceu ${lider.nome} no ${NOME_DIFICULDADE_GINASIO[d]}!`,
        avisoFuga: jaTinha ? 'Você não ganha nada desta batalha.' : daInsignia ? `Você não ganha a ${lider.insignia} nem a recompensa.` : 'Você não ganha a recompensa.',
      },
      aoTerminar: (resultado) => {
        if (resultado === 'vitoria' && !vencidos(save, d).includes(lider.id)) vencidos(save, d).push(lider.id);
        salvar(save);
        navegar({ tela: 'ginasios' });
      },
    });
  };

  function desenhar() {
    regiaoAberta = regiao;
    dificuldadeAberta = dificuldade;
    const lideres = lideresDaRegiao(regiao);
    const ganhas = lideres.filter((l) => save!.insignias!.includes(l.id)).length;
    const feitos = vencidos(save!, dificuldade);
    const fechado = bloqueio();
    const podeLutar = !fechado && save!.time.some((p) => p.hp > 0);
    const maior = nivelDoGinasio(save!.time);
    corpo.replaceChildren(
      // escolher a região só para a staff (pedido do dono): o jogador vê só os ginásios da região onde está
      admin ? el('nav', { class: 'abas abas-regioes-ginasio' },
        ...REGIOES.filter((r) => r.disponivel).map((r) => el('button', { class: `aba ${r.id === regiao ? 'ativa' : ''}`, onclick: () => ((regiao = r.id), desenhar()) }, r.nome))) : '',
      el('nav', { class: 'abas abas-dificuldade-ginasio' },
        ...DIFICULDADES_GINASIO.map((d) => el('button', { class: `aba ${d === dificuldade ? 'ativa' : ''}`, onclick: () => ((dificuldade = d), desenhar()) }, NOME_DIFICULDADE_GINASIO[d]))),
      fechado ? el('p', { class: 'aviso-mapas-viagem' }, fechado) : '',
      el('div', { class: 'ginasios-resumo' },
        el('strong', {}, dificuldade === 'facil'
          ? `Insígnias de ${nomeDe(regiao)}: ${ganhas}/${lideres.length}`
          : `${NOME_DIFICULDADE_GINASIO[dificuldade]} em ${nomeDe(regiao)}: ${lideres.filter((l) => feitos.includes(l.id)).length}/${lideres.length} vencidos`),
        el('div', { class: 'cab-insignias-lista' }, ...lideres.map((l) => insigniaVisual(l, save!.insignias!.includes(l.id))))),
      el('div', { class: 'lista-ginasios' },
        ...lideres.map((l) => {
          const ganha = feitos.includes(l.id);
          const vazio = semTime(l);
          const equipe = vazio ? [] : equipeDoLider(l, dificuldade, save!.time);
          const antes = faltaAntes(l);
          const nivel = nivelDoLider(dificuldade, l.ordem, maior);
          return el('article', { class: `cartao-ginasio ${ganha ? 'vencido' : ''} ${antes || vazio ? 'trancado' : ''}`, style: { '--cor-tipo': corTipo(l.tipo) } },
            el('img', { class: 'retrato-npc', src: imagemTreinador(l.id), alt: l.nome }),
            el('div', { class: 'ginasio-texto' },
              el('small', { class: 'meta' }, `Ginásio ${l.ordem} · ${l.titulo}`),
              el('h3', {}, l.nome, ' ', seloTipo(l.tipo)),
              dificuldade === 'facil'
                ? el('div', { class: 'ginasio-insignia' }, insigniaVisual(l, ganha), el('span', {}, ganha ? `${l.insignia} conquistada` : l.insignia))
                : el('div', { class: 'ginasio-insignia' }, el('span', {}, ganha ? `✔ Vencido no ${NOME_DIFICULDADE_GINASIO[dificuldade]}` : `Dificuldade ${NOME_DIFICULDADE_GINASIO[dificuldade]}`)),
              vazio
                ? el('small', { class: 'meta' }, 'Time em preparação.')
                : el('div', { class: 'mini-time' }, ...equipe.map((p) => spritePokemon(pokemonPorId(p.especieId), { animado: false, shiny: p.shiny }))),
              el('small', { class: 'meta' }, `Nv. ${nivel} · ${ganha ? 'recompensa já recebida' : `${recompensaDe(l).toLocaleString('pt-BR')} Poké Dólares na primeira vitória`}`)),
            vazio
              ? el('button', { class: 'botao secundario', disabled: true }, 'Em breve')
              : antes
                ? el('button', { class: 'botao secundario', disabled: true, title: `Vença ${antes.nome} primeiro` }, `🔒 Vença ${antes.nome}`)
                : el('button', { class: `botao ${ganha ? 'secundario' : ''}`, disabled: !podeLutar, title: fechado, onclick: () => desafiar(l) }, ganha ? 'Revanche' : 'Desafiar'));
        })),
    );
  }
  desenhar();
  tela.append(el('div', { class: 'layout-bioma' },
    el('section', {}, el('p', { class: 'sub' }, 'Vença os líderes em ordem. A insígnia sai no Fácil; Médio e Difícil pagam mais na primeira vitória.'), corpo),
    colunaDoTime(save.time, () => salvar(save), () => corpo.isConnected && desenhar())));
  // o trem partiu ou chegou com a tela aberta; a staff mudou um time
  const pararViagem = aoMudarViagem(desenhar);
  const pararAjustes = aoMudarAjustes(() => corpo.isConnected && desenhar());
  return () => {
    pararViagem();
    pararAjustes();
  };
};
