// Cabeçalho fixo embaixo da barra do topo, em todas as telas (menos as que precisam do espaço: criação do
// personagem e roleta do inicial; no mapa do bioma ele aparece, pedido do dono). Mostra nome, VIP, XP de treinador, região, Pokédex da região,
// insígnias, silver/gold e atalhos (Centro Pokémon, Pokémarket, Bolsa, PC, Mapas).
import { lideresDaRegiao } from '../../../shared/ginasios';
import { insigniaVisual } from '../telas/ginasios';
import { selosBonus } from './selosBonus';
import type { Destino, Navegar } from '../main';
import { regiaoPorId } from '../../../shared/regioes';
import { progressoTreinador } from '../../../shared/treinador';
import { tempoRestanteVip, vipAtivo } from '../../../shared/vip';
import { carregarSave, curarTime } from '../estado';
import { abrirBolsa } from './bolsa';
import { el } from './dom';
import { iconePokedex } from './barraTopo';
import { icone, type NomeIcone } from './icones';
import { abrirLoja } from './loja';
import { abrirPC } from './pc';

/** Telas sem o cabeçalho (precisam de mais espaço ou ainda não há jogo). */
const SEM_CABECALHO: Destino['tela'][] = ['inicial', 'personagem'];

export function montarCabecalho(navegar: Navegar): (destino: Destino) => void {
  const raiz = el('header', { class: 'cabecalho-jogo', hidden: true });
  document.querySelector('.barra-topo')?.after(raiz);
  let atual: Destino = { tela: 'inicio' };

  /** Depois de usar um atalho: atualiza o cabeçalho e a tela (se ela mostra o time/dinheiro). */
  const aoMudar = () => {
    if (atual.tela === 'regiao' || atual.tela === 'inicio') navegar(atual);
    else desenhar();
  };
  const aviso = el('span', { class: 'cabecalho-aviso', role: 'status' });
  let relogioAviso = 0;
  const avisar = (texto: string) => {
    aviso.textContent = texto;
    clearTimeout(relogioAviso);
    relogioAviso = window.setTimeout(() => (aviso.textContent = ''), 2500);
  };

  function desenhar() {
    const save = carregarSave();
    raiz.hidden = !save || SEM_CABECALHO.includes(atual.tela);
    if (!save || raiz.hidden) return raiz.replaceChildren();
    const t = progressoTreinador(save.xpTreinador);
    const regiao = regiaoPorId(save.regiao);
    const [ini, fim] = regiao?.pokedex ?? [1, 1];
    const totalDex = fim - ini + 1;
    const capturadosDex = save.capturados.filter((n) => n >= ini && n <= fim).length;
    const parteDex = Math.round((capturadosDex / totalDex) * 1000) / 10;
    const vip = vipAtivo(save);
    const lideres = lideresDaRegiao(save.regiao);
    const atalho = (nome: NomeIcone, texto: string, acao: () => void) =>
      el('button', { class: 'atalho-hex', title: texto, 'aria-label': texto, onclick: acao }, icone(nome));

    raiz.replaceChildren(
      el(
        'div',
        { class: 'cabecalho-conteudo' },
        // Pokédex (atalho) com o quanto já foi capturado da região, perto do nome
        el('button', { class: `cab-pokedex ${atual.tela === 'pokedex' ? 'ativa' : ''}`, title: `Pokédex de ${regiao?.nome ?? ''}: ${capturadosDex} de ${totalDex} capturados`, onclick: () => navegar({ tela: 'pokedex' }) },
          iconePokedex(),
          el('span', { class: 'cab-pokedex-texto' },
            el('strong', {}, `${capturadosDex}/${totalDex}`),
            el('small', {}, `${parteDex.toLocaleString('pt-BR')}%`),
            el('span', { class: 'cab-dex-barra' }, el('span', { style: { width: `${parteDex}%` } })))),
        el('div', { class: 'cab-grupo cab-treinador' },
          el('div', { class: 'cab-nome' },
            el('strong', {}, save.aparencia?.nome || 'Treinador'),
            vip ? el('span', { class: 'icone-vip', title: `VIP ativo · acaba em ${tempoRestanteVip(save)}` }, 'VIP') : el('span', { class: 'cab-sem-vip', title: 'Sem VIP' }, 'sem VIP')),
          el('div', { class: 'cab-xp', title: t.necessario ? `${t.atual.toLocaleString('pt-BR')} / ${t.necessario.toLocaleString('pt-BR')} XP` : 'Nível máximo' },
            el('small', {}, `Treinador Nv. ${t.nivel}`),
            el('div', { class: 'barra-exp' }, el('div', { class: 'preenchido', style: { width: `${t.necessario ? (t.atual / t.necessario) * 100 : 100}%` } })))),
        el('div', { class: 'cab-grupo cab-regiao' },
          el('small', {}, 'Região'),
          el('strong', {}, regiao?.nome ?? save.regiao)),
        // insígnias da região atual (clicar abre os Ginásios)
        el('button', { class: 'cab-grupo cab-insignias', title: 'Insígnias: vença os Ginásios', onclick: () => navegar({ tela: 'ginasios' }) },
          el('small', {}, `Insígnias ${lideres.filter((l) => (save.insignias ?? []).includes(l.id)).length}/${lideres.length}`),
          el('div', { class: 'cab-insignias-lista' }, ...lideres.map((l) => insigniaVisual(l, (save.insignias ?? []).includes(l.id))))),
        // bônus da administração (Shiny 2x, XP 2x…), só informativo
        selosBonus(),
        el('div', { class: 'cab-grupo cab-moedas' },
          el('span', { class: 'cab-moeda', title: 'Silver' }, el('span', { class: 'icone-moeda moeda-silver' }), save.silver.toLocaleString('pt-BR')),
          el('span', { class: 'cab-moeda', title: 'Gold' }, el('span', { class: 'icone-moeda moeda-gold' }), save.gold.toLocaleString('pt-BR'))),
        // ícone só (o nome aparece ao passar o mouse)
      ),
      // atalhos fora da barra: botões hexagonais soltos, um do lado do outro
      el('div', { class: 'cab-atalhos-fora' },
          atalho('coracao', 'Centro Pokémon', () => {
            curarTime(save);
            avisar('Time curado!');
            aoMudar();
          }),
          atalho('loja', 'Pokémarket', () => abrirLoja(save, aoMudar)),
          atalho('mochila', 'Bolsa', () => abrirBolsa(save, aoMudar)),
          atalho('computador', 'PC', () => abrirPC(save, aoMudar)),
          atalho('mapa', 'Mapas', () => navegar({ tela: 'regiao' })),
          aviso),
    );
  }

  return (destino) => {
    atual = destino;
    desenhar();
  };
}
