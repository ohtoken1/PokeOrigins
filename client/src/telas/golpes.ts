// Aba "Golpes": Move Reminder (de graça: golpes por nível e tudo o que o Pokémon já soube) e Move Tutor (só golpes de tutor, de qualquer geração).
import { Dex } from '@pkmn/sim';
import type { Tela } from '../main';
import { ppMaximo, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { trocarGolpe } from '../../../shared/batalha/progresso';
import { PRECO_RELEMBRAR, PRECO_TUTOR, golpesDoTutor, golpesParaRelembrar } from '../../../shared/professores';
import { nomeCategoria } from '../../../shared/traducao';
import { pokemonPorId } from '../dados';
import { carregarSave, salvar, type Save } from '../estado';
import { abrirJanela } from '../ui/janela';
import { confirmar } from '../ui/confirmar';
import { dicaGolpe } from '../ui/dicaGolpe';
import { corTipo, el, seloTipo, spritePokemon } from '../ui/dom';
import { valorEmMoeda } from '../ui/moeda';

export type Professor = 'relembrar' | 'tutor';
const PROFESSORES: Record<Professor, { nome: string; fala: string; preco: number; lista: (p: PokemonIndividual) => string[] }> = {
  relembrar: {
    nome: 'Move Reminder',
    fala: 'De graça, faço seu Pokémon lembrar de qualquer golpe que ele aprende por nível até o nível atual e de todo golpe que ele já soube: TM, TR, Move Tutor ou Egg Move.',
    preco: PRECO_RELEMBRAR,
    lista: golpesParaRelembrar,
  },
  tutor: {
    nome: 'Move Tutor',
    fala: 'Ensino os golpes de tutor que a espécie aprendeu em qualquer jogo (sem TMs nem Egg Moves).',
    preco: PRECO_TUTOR,
    lista: golpesDoTutor,
  },
};

/** `inicial`: professor já escolhido; `daCidade` mostra o botão de voltar para a cidade. */
export const telaGolpes = (inicial: Professor = 'relembrar', daCidade = false): Tela => (raiz, navegar) => {
  const save = carregarSave();
  const tela = el('main', { class: 'tela tela-golpes' },
    daCidade ? el('button', { class: 'botao secundario', onclick: () => navegar({ tela: 'cidade' }) }, '← Voltar para a cidade') : null,
    el('h1', {}, 'Golpes'));
  raiz.append(tela);
  if (!save) {
    tela.append(el('p', { class: 'sub' }, 'Comece um jogo para usar os professores de golpes.'), el('button', { class: 'botao', onclick: () => navegar({ tela: 'inicial' }) }, 'Começar'));
    return;
  }
  tela.append(corpoProfessores(save, inicial));
};

/** Move Reminder / Move Tutor numa janela por cima do jogo (clique nos NPCs da cidade). */
export function abrirProfessores(save: Save, inicial: Professor, aoMudar: () => void): void {
  abrirJanela('Professores de golpes', () => corpoProfessores(save, inicial, aoMudar), { classe: 'janela-professores', aoFechar: aoMudar });
}

/** Conteúdo dos professores (abas, time, golpes atuais e oferecidos). */
function corpoProfessores(save: Save, inicial: Professor, aoMudar?: () => void): HTMLElement {
  let professor: Professor = inicial;
  let indice = 0;
  /** golpe escolhido esperando o jogador dizer qual esquecer (Pokémon com 4 golpes) */
  let aprendendo: string | null = null;
  let aviso = '';
  const corpo = el('div', { class: 'golpes-corpo' });

  const pagarEAprender = async (p: PokemonIndividual, golpe: string, esquecer: number | null) => {
    const preco = PROFESSORES[professor].preco;
    if (save.silver < preco) {
      aviso = `Poké Dólares insuficientes (precisa de ${preco}, você tem ${save.silver}).`;
      return desenhar();
    }
    // "tem certeza?" antes de gastar o silver ou de esquecer um golpe (pedido do dono)
    const novo = Dex.moves.get(golpe).name;
    const quem = pokemonPorId(p.especieId).nome;
    const partes = [`Ensinar ${novo} a ${quem}`, preco ? ` por ${preco.toLocaleString('pt-BR')} Poké Dólares` : '', esquecer === null ? '?' : `? Ele vai esquecer ${Dex.moves.get(p.golpes[esquecer].id).name}.`];
    if (!(await confirmar(PROFESSORES[professor].nome, partes.join('')))) return;
    if (save.silver < preco || (esquecer !== null && !p.golpes[esquecer])) return desenhar();
    save.silver -= preco;
    const nome = pokemonPorId(p.especieId).nome;
    if (esquecer === null) {
      p.golpes.push({ id: golpe, pp: ppMaximo(golpe) });
      aviso = `${nome} aprendeu ${Dex.moves.get(golpe).name}!`;
    } else {
      const antigo = Dex.moves.get(p.golpes[esquecer].id).name;
      trocarGolpe(p, esquecer, golpe);
      aviso = `${nome} esqueceu ${antigo} e aprendeu ${Dex.moves.get(golpe).name}!`;
    }
    aprendendo = null;
    salvar(save);
    aoMudar?.();
    desenhar();
  };

  function desenhar() {
    const p = save!.time[indice] ?? save!.time[0];
    const prof = PROFESSORES[professor];
    const nome = pokemonPorId(p.especieId).nome;

    const abas = el(
      'div',
      { class: 'golpes-abas' },
      ...(Object.keys(PROFESSORES) as Professor[]).map((id) =>
        el('button', { class: `aba ${id === professor ? 'ativa' : ''}`, onclick: () => ((professor = id), (aprendendo = null), (aviso = ''), desenhar()) }, PROFESSORES[id].nome),
      ),
    );
    const time = el(
      'div',
      { class: 'golpes-time' },
      ...save!.time.map((q, i) =>
        el('button', { class: `golpes-pokemon ${i === indice ? 'ativo' : ''}`, onclick: () => ((indice = i), (aprendendo = null), (aviso = ''), desenhar()) },
          spritePokemon(pokemonPorId(q.especieId), { shiny: q.shiny, animado: false }), el('small', {}, `${pokemonPorId(q.especieId).nome} · Nv.${q.nivel}`)),
      ),
    );
    const atuais = el('div', { class: 'golpes-atuais' },
      el('span', { class: 'rotulo-secao' }, `Golpes de ${nome}`),
      ...p.golpes.map((g, i) => {
        const m = Dex.moves.get(g.id);
        const b = el('button', { class: 'golpe-atual', style: { '--cor-tipo': corTipo(m.type) }, disabled: true },
          el('strong', {}, m.name), seloTipo(m.type));
        return dicaGolpe(b, g.id, () => ({ atual: g.pp, max: ppMaximo(g.id) }));
      }),
    );

    const lista = prof.lista(p);
    const linhas = lista.map((id) => {
      const m = Dex.moves.get(id);
      const escolhendo = aprendendo === id;
      const linha = el('div', { class: `golpe-oferta ${escolhendo ? 'escolhendo' : ''}`, style: { '--cor-tipo': corTipo(m.type) } },
        el('div', { class: 'golpe-oferta-nome' }, el('strong', {}, m.name), seloTipo(m.type)),
        el('small', {}, `${nomeCategoria(m.category)} · Poder ${m.basePower || '—'} · Precisão ${m.accuracy === true ? '—' : `${m.accuracy}%`} · PP ${m.pp}`),
        el('button', {
          class: 'botao',
          disabled: save!.silver < prof.preco,
          onclick: () => {
            aviso = '';
            if (p.golpes.length < 4) return pagarEAprender(p, id, null);
            aprendendo = id;
            desenhar();
          },
        }, ...(prof.preco ? ['Aprender · ', valorEmMoeda('silver', prof.preco)] : ['Relembrar · grátis'])),
        // já sabe 4 golpes: a escolha de qual esquecer abre aqui mesmo, ao lado de onde o jogador clicou (pedido do dono)
        escolhendo
          ? el('div', { class: 'golpe-esquecer' },
              el('span', {}, `${nome} já sabe 4 golpes. Esquecer qual?`),
              ...p.golpes.map((g, i) => {
                const atual = Dex.moves.get(g.id);
                const b = el('button', { class: 'golpe-atual escolher', style: { '--cor-tipo': corTipo(atual.type) }, onclick: () => pagarEAprender(p, id, i) }, el('strong', {}, atual.name), seloTipo(atual.type));
                return dicaGolpe(b, g.id, () => ({ atual: g.pp, max: ppMaximo(g.id) }));
              }),
              el('button', { class: 'botao secundario', onclick: () => ((aprendendo = null), desenhar()) }, 'Cancelar'),
            )
          : null,
      );
      return dicaGolpe(linha, id);
    });

    corpo.replaceChildren(
      ...[abas,
      el('div', { class: 'golpes-npc' }, el('div', { class: 'golpes-npc-icone' }, professor === 'relembrar' ? 'R' : 'T'), el('div', {}, el('strong', {}, prof.nome), el('p', {}, prof.fala))),
      el('div', { class: 'golpes-carteira' }, 'Você tem ', valorEmMoeda('silver', save!.silver)),
      time,
      aviso ? el('p', { class: 'golpes-aviso', role: 'status' }, aviso) : null,
      atuais,
      el('span', { class: 'rotulo-secao' }, `${lista.length} golpe${lista.length === 1 ? '' : 's'} disponíve${lista.length === 1 ? 'l' : 'is'}`),
      linhas.length ? el('div', { class: 'golpes-lista' }, ...linhas) : el('p', { class: 'meta' }, `${prof.nome} não tem golpes novos para ${nome}.`),
      ].filter((x): x is HTMLElement => !!x),
    );
  }
  desenhar();
  return corpo;
}
