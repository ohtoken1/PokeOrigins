// Jogar → Ginásios: os líderes de cada região (abas por região), com o time dos jogos, a insígnia e a recompensa.
// Vencer dá a insígnia (uma vez; aparece no cabeçalho) e silver (toda vez).
import type { Tela } from '../main';
import { BIOMAS } from '../../../shared/biomas';
import { RECOMPENSA_GINASIO, lideresDaRegiao, type LiderGinasio } from '../../../shared/ginasios';
import { REGIOES } from '../../../shared/regioes';
import { NOMES_DIFICULDADE, montarTimeNpc } from '../../../shared/treinadoresNpc';
import { abrirBatalha } from '../batalha/telaBatalha';
import { pokemonPorId } from '../dados';
import { carregarSave, salvar } from '../estado';
import { corTipo, el, seloTipo, spritePokemon } from '../ui/dom';
import { imagemTreinador } from './duelos';
import { ehAdministrador } from '../bonificacao';
import { aoMudarViagem, viagemAtual } from '../viagem';

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
  const nomeDe = (id: string) => REGIOES.find((r) => r.id === id)?.nome ?? id;
  /** Por que não dá para desafiar os ginásios desta aba ('' = dá). */
  const bloqueio = (): string => {
    if (admin) return '';
    const viagem = viagemAtual();
    if (viagem) return `Você está viajando para ${nomeDe(viagem.para)}. Os ginásios abrem quando o trem chegar.`;
    return regiao === save.regiao ? '' : `Você está em ${nomeDe(save.regiao)}. Para desafiar os ginásios de ${nomeDe(regiao)}, viaje de trem até lá.`;
  };
  const crescimentoDe = (n: number) => pokemonPorId(n).crescimento;
  const corpo = el('div', { class: 'ginasios-corpo' });

  const desafiar = (lider: LiderGinasio) => {
    if (bloqueio()) return desenhar();
    const equipe = montarTimeNpc(lider, save.time, crescimentoDe);
    const jaTinha = save.insignias!.includes(lider.id);
    abrirBatalha({
      save,
      selvagem: equipe[0],
      bioma: BIOMAS[Math.floor(Math.random() * BIOMAS.length)],
      treinador: {
        nome: lider.nome,
        titulo: lider.titulo,
        equipe,
        recompensa: RECOMPENSA_GINASIO[lider.ordem - 1],
        imagem: imagemTreinador(lider.id),
        mensagemVitoria: jaTinha ? undefined : `Você ganhou a ${lider.insignia}!`,
      },
      aoTerminar: (resultado) => {
        if (resultado === 'vitoria' && !save.insignias!.includes(lider.id)) save.insignias!.push(lider.id);
        salvar(save);
        navegar({ tela: 'ginasios' });
      },
    });
  };

  function desenhar() {
    regiaoAberta = regiao;
    const lideres = lideresDaRegiao(regiao);
    const ganhas = lideres.filter((l) => save!.insignias!.includes(l.id)).length;
    const fechado = bloqueio();
    const podeLutar = !fechado && save!.time.some((p) => p.hp > 0);
    corpo.replaceChildren(
      el('nav', { class: 'abas abas-regioes-ginasio' },
        ...REGIOES.filter((r) => r.disponivel).map((r) => el('button', { class: `aba ${r.id === regiao ? 'ativa' : ''}`, onclick: () => ((regiao = r.id), desenhar()) }, r.nome))),
      fechado ? el('p', { class: 'aviso-mapas-viagem' }, fechado) : '',
      el('div', { class: 'ginasios-resumo' },
        el('strong', {}, `Insígnias de ${REGIOES.find((r) => r.id === regiao)?.nome}: ${ganhas}/${lideres.length}`),
        el('div', { class: 'cab-insignias-lista' }, ...lideres.map((l) => insigniaVisual(l, save!.insignias!.includes(l.id))))),
      el('div', { class: 'lista-ginasios' },
        ...lideres.map((l) => {
          const ganha = save!.insignias!.includes(l.id);
          const equipe = montarTimeNpc(l, save!.time, crescimentoDe);
          return el('article', { class: `cartao-ginasio ${ganha ? 'vencido' : ''}`, style: { '--cor-tipo': corTipo(l.tipo) } },
            el('img', { class: 'retrato-npc', src: imagemTreinador(l.id), alt: l.nome }),
            el('div', { class: 'ginasio-texto' },
              el('small', { class: 'meta' }, `Ginásio ${l.ordem} · ${l.titulo}`),
              el('h3', {}, l.nome, ' ', seloTipo(l.tipo)),
              el('div', { class: 'ginasio-insignia' }, insigniaVisual(l, ganha), el('span', {}, ganha ? `${l.insignia} conquistada` : l.insignia)),
              el('div', { class: 'mini-time' }, ...equipe.map((p) => spritePokemon(pokemonPorId(p.especieId), { animado: false }))),
              el('small', { class: 'meta' }, `${NOMES_DIFICULDADE[l.dificuldade]} · ${RECOMPENSA_GINASIO[l.ordem - 1].toLocaleString('pt-BR')} silver`)),
            el('button', { class: `botao ${ganha ? 'secundario' : ''}`, disabled: !podeLutar, title: fechado, onclick: () => desafiar(l) }, ganha ? 'Revanche' : 'Desafiar'));
        })),
    );
  }
  desenhar();
  tela.append(el('p', { class: 'sub' }, 'Vença os líderes para ganhar as insígnias.'), corpo);
  // o trem partiu ou chegou com a tela aberta
  return aoMudarViagem(desenhar);
};
