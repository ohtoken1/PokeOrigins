// Aba "Golpes": Move Reminder (golpes por nível já esquecidos) e Move Tutor (só golpes de tutor, de qualquer geração).
import { Dex } from '@pkmn/sim';
import type { Tela } from '../main';
import { ppMaximo, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { trocarGolpe } from '../../../shared/batalha/progresso';
import { PRECO_RELEMBRAR, PRECO_TUTOR, golpesDoTutor, golpesParaRelembrar } from '../../../shared/professores';
import { nomeCategoria } from '../../../shared/traducao';
import { pokemonPorId } from '../dados';
import { carregarSave, salvar } from '../estado';
import { dicaGolpe } from '../ui/dicaGolpe';
import { corTipo, el, seloTipo, spritePokemon } from '../ui/dom';

type Professor = 'relembrar' | 'tutor';
const PROFESSORES: Record<Professor, { nome: string; fala: string; preco: number; lista: (p: PokemonIndividual) => string[] }> = {
  relembrar: {
    nome: 'Move Reminder',
    fala: 'Posso fazer seu Pokémon lembrar de qualquer golpe que ele aprende por nível até o nível atual, até os que ele esqueceu.',
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

export const telaGolpes: Tela = (raiz, navegar) => {
  const save = carregarSave();
  const tela = el('main', { class: 'tela tela-golpes' }, el('h1', {}, 'Golpes'));
  raiz.append(tela);
  if (!save) {
    tela.append(el('p', { class: 'sub' }, 'Comece um jogo para usar os professores de golpes.'), el('button', { class: 'botao', onclick: () => navegar({ tela: 'inicial' }) }, 'Começar'));
    return;
  }

  let professor: Professor = 'relembrar';
  let indice = 0;
  /** golpe escolhido esperando o jogador dizer qual esquecer (Pokémon com 4 golpes) */
  let aprendendo: string | null = null;
  let aviso = '';
  const corpo = el('div', { class: 'golpes-corpo' });

  const pagarEAprender = (p: PokemonIndividual, golpe: string, esquecer: number | null) => {
    const preco = PROFESSORES[professor].preco;
    if (save.silver < preco) {
      aviso = `Silver insuficiente (precisa de ${preco}, você tem ${save.silver}).`;
      return desenhar();
    }
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
      el('span', { class: 'rotulo-secao' }, aprendendo ? `Esquecer qual golpe para aprender ${Dex.moves.get(aprendendo).name}?` : `Golpes de ${nome}`),
      ...p.golpes.map((g, i) => {
        const m = Dex.moves.get(g.id);
        const b = el('button', { class: `golpe-atual ${aprendendo ? 'escolher' : ''}`, style: { '--cor-tipo': corTipo(m.type) }, disabled: !aprendendo, onclick: () => aprendendo && pagarEAprender(p, aprendendo, i) },
          el('strong', {}, m.name), seloTipo(m.type));
        return dicaGolpe(b, g.id, () => ({ atual: g.pp, max: ppMaximo(g.id) }));
      }),
      aprendendo ? el('button', { class: 'botao secundario', onclick: () => ((aprendendo = null), desenhar()) }, 'Cancelar') : null,
    );

    const lista = prof.lista(p);
    const linhas = lista.map((id) => {
      const m = Dex.moves.get(id);
      const linha = el('div', { class: 'golpe-oferta', style: { '--cor-tipo': corTipo(m.type) } },
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
        }, `Aprender · ${prof.preco} silver`),
      );
      return dicaGolpe(linha, id);
    });

    corpo.replaceChildren(
      ...[abas,
      el('div', { class: 'golpes-npc' }, el('div', { class: 'golpes-npc-icone' }, professor === 'relembrar' ? 'R' : 'T'), el('div', {}, el('strong', {}, prof.nome), el('p', {}, prof.fala))),
      el('div', { class: 'golpes-carteira' }, `Você tem ${save!.silver.toLocaleString('pt-BR')} silver`),
      time,
      aviso ? el('p', { class: 'golpes-aviso', role: 'status' }, aviso) : null,
      atuais,
      el('span', { class: 'rotulo-secao' }, `${lista.length} golpe${lista.length === 1 ? '' : 's'} disponíve${lista.length === 1 ? 'l' : 'is'}`),
      linhas.length ? el('div', { class: 'golpes-lista' }, ...linhas) : el('p', { class: 'meta' }, `${prof.nome} não tem golpes novos para ${nome}.`),
      ].filter((x): x is HTMLElement => !!x),
    );
  }
  desenhar();
  tela.append(corpo);
};
