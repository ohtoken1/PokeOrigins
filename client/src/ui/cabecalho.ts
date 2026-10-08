// Cabeçalho fixo embaixo da barra do topo, em todas as telas (menos as que precisam do espaço: criação do
// personagem, roleta do inicial e o mapa do bioma). Mostra nome, VIP, XP de treinador, região, Pokédex da região,
// insígnias, silver/gold e atalhos (Centro Pokémon, Pokémarket, Bolsa, PC, Mapas).
import type { Destino, Navegar } from '../main';
import { regiaoPorId } from '../../../shared/regioes';
import { progressoTreinador } from '../../../shared/treinador';
import { tempoRestanteVip, vipAtivo } from '../../../shared/vip';
import { carregarSave, curarTime } from '../estado';
import { abrirBolsa } from './bolsa';
import { el } from './dom';
import { icone, type NomeIcone } from './icones';
import { abrirLoja } from './loja';
import { abrirPC } from './pc';

/** Telas sem o cabeçalho (precisam de mais espaço ou ainda não há jogo). */
const SEM_CABECALHO: Destino['tela'][] = ['inicial', 'personagem', 'bioma'];
/** Insígnias do jogo (ainda não existem: ginásios em breve). */
const TOTAL_INSIGNIAS = 8;

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
    const atalho = (nome: NomeIcone, texto: string, acao: () => void) =>
      el('button', { class: 'atalho-cabecalho', title: texto, 'aria-label': texto, onclick: acao }, icone(nome), el('span', {}, texto));

    raiz.replaceChildren(
      el(
        'div',
        { class: 'cabecalho-conteudo' },
        el('div', { class: 'cab-grupo cab-treinador' },
          el('div', { class: 'cab-nome' },
            el('strong', {}, save.aparencia?.nome || 'Treinador'),
            vip ? el('span', { class: 'icone-vip', title: `VIP ativo · acaba em ${tempoRestanteVip(save)}` }, 'VIP') : el('span', { class: 'cab-sem-vip', title: 'Sem VIP' }, 'sem VIP')),
          el('div', { class: 'cab-xp', title: t.necessario ? `${t.atual.toLocaleString('pt-BR')} / ${t.necessario.toLocaleString('pt-BR')} XP` : 'Nível máximo' },
            el('small', {}, `Treinador Nv. ${t.nivel}`),
            el('div', { class: 'barra-exp' }, el('div', { class: 'preenchido', style: { width: `${t.necessario ? (t.atual / t.necessario) * 100 : 100}%` } })))),
        el('div', { class: 'cab-grupo cab-regiao', title: `Pokédex de ${regiao?.nome ?? ''}: ${capturadosDex} de ${totalDex} capturados` },
          el('small', {}, 'Região'),
          el('strong', {}, regiao?.nome ?? save.regiao),
          el('button', { class: 'cab-dex', onclick: () => navegar({ tela: 'pokedex' }) },
            el('span', {}, `Pokédex ${capturadosDex}/${totalDex} (${parteDex.toLocaleString('pt-BR')}%)`),
            el('span', { class: 'cab-dex-barra' }, el('span', { style: { width: `${parteDex}%` } })))),
        el('div', { class: 'cab-grupo cab-insignias', title: 'Insígnias: chegam com os Ginásios (em breve)' },
          el('small', {}, `Insígnias 0/${TOTAL_INSIGNIAS}`),
          el('div', { class: 'cab-insignias-lista' }, ...Array.from({ length: TOTAL_INSIGNIAS }, () => el('span', { class: 'insignia vazia' })))),
        el('div', { class: 'cab-grupo cab-moedas' },
          el('span', { class: 'cab-moeda', title: 'Silver' }, el('span', { class: 'icone-moeda moeda-silver' }), save.silver.toLocaleString('pt-BR')),
          el('span', { class: 'cab-moeda', title: 'Gold' }, el('span', { class: 'icone-moeda moeda-gold' }), save.gold.toLocaleString('pt-BR'))),
        el('div', { class: 'cab-grupo cab-atalhos' },
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
      ),
    );
  }

  return (destino) => {
    atual = destino;
    desenhar();
  };
}
