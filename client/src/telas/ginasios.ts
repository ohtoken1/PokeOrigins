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
import { itemDaLoja } from '../../../shared/loja';
import { iconeItem } from '../ui/iconeItem';

/** Alola não tem insígnias: os Kahunas dão o Z-Crystal do tipo deles. */
const Z_DOS_KAHUNAS: Record<string, string> = { hala: 'fightiniumz', olivia: 'rockiumz', nanu: 'darkiniumz', hapu: 'groundiumz' };

/** Desenho de verdade da insígnia (client/public/insignias); apagado se ainda não foi conquistada. */
export function insigniaVisual(lider: LiderGinasio, ganha: boolean): HTMLElement {
  const titulo = `${lider.insignia}${ganha ? '' : ' (ainda não conquistada)'}`;
  const z = Z_DOS_KAHUNAS[lider.id];
  const imagem = z ? iconeItem(itemDaLoja(z) ?? { id: z, categoria: 'zcristais' }) : el('img', { src: `insignias/${lider.id}.png`, alt: lider.insignia, loading: 'lazy' });
  return el('span', { class: `insignia-img ${ganha ? 'ganha' : 'nao-ganha'}`, title: titulo }, imagem);
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
  let regiao = regiaoAberta ?? save.regiao;
  const crescimentoDe = (n: number) => pokemonPorId(n).crescimento;
  const corpo = el('div', { class: 'ginasios-corpo' });

  const desafiar = (lider: LiderGinasio) => {
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
    const podeLutar = save!.time.some((p) => p.hp > 0);
    corpo.replaceChildren(
      el('nav', { class: 'abas abas-regioes-ginasio' },
        ...REGIOES.filter((r) => r.disponivel).map((r) => el('button', { class: `aba ${r.id === regiao ? 'ativa' : ''}`, onclick: () => ((regiao = r.id), desenhar()) }, r.nome))),
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
            el('button', { class: `botao ${ganha ? 'secundario' : ''}`, disabled: !podeLutar, onclick: () => desafiar(l) }, ganha ? 'Revanche' : 'Desafiar'));
        })),
    );
  }
  desenhar();
  tela.append(el('p', { class: 'sub' }, 'Vença os líderes para ganhar as insígnias.'), corpo);
};
