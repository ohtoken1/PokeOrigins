// Creche da cidade (NPC na frente da creche do Safari): o jogador deixa um casal (dois com VIP), a cada ciclo há
// chance de ovo, e o ovo sai como um Pokémon para o PC. Regras em shared/breeding.ts, estado em client/src/creche.ts.
import { CHANCE_OVO_POR_CICLO, CICLO_CRECHE_MS, CICLO_CRECHE_VIP_MS, PASSOS_PARA_CHOCAR, PRECO_CHOCAR_DAYCARE, TEMPO_CHOCAR_DAYCARE_MS, chanceShinyDoCasal, maeEPai, motivoForaDaCreche, podemCruzar } from '../../../shared/breeding';
import { textoTranca } from '../../../shared/trancas';
import { vipAtivo } from '../../../shared/vip';
import { SPRITE_OVO, atualizarCreche, buscarChocado, casaisDe, chocandoNoDaycare, deixarCasal, deixarOvoParaChocar, ovosNoPC, retirarCasal, retirarOvo, vagasDaCreche } from '../creche';
import { valorEmMoeda } from './moeda';
import { pokemonPorId } from '../dados';
import { salvar, type PokemonDoJogador, type Save } from '../estado';
import { conteudoLiberado } from '../trancas';
import { confirmar } from './confirmar';
import { el, spritePokemon } from './dom';
import { abrirJanela } from './janela';
import { resumoAoPassar } from './resumo';
import { tutorialFez } from '../tutorialEventos';

const nome = (p: PokemonDoJogador) => `${pokemonPorId(p.especieId).nome}${p.shiny ? ' ✨' : ''}`;
const sexo = (p: PokemonDoJogador) => (p.genero === 'M' ? '♂' : p.genero === 'F' ? '♀' : '');
const duracao = (ms: number) => {
  const min = Math.max(0, Math.ceil(ms / 60_000));
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
};

export function abrirCreche(save: Save, aoMudar: () => void = () => {}): void {
  tutorialFez('creche');
  // escolhendo um casal: o primeiro escolhido (null = escolhendo o primeiro)
  let escolhendo = false;
  let primeiro: PokemonDoJogador | null = null;
  let aviso = '';
  const mudou = (texto: string) => {
    salvar(save);
    aoMudar();
    aviso = texto;
    janela.redesenhar();
  };

  const cartao = (p: PokemonDoJogador, onclick?: () => void, extra = '') => {
    const c = el(onclick ? 'button' : 'div', { class: `creche-pokemon ${extra}`, ...(onclick ? { type: 'button', onclick } : {}) },
      spritePokemon(pokemonPorId(p.especieId), { shiny: p.shiny, animado: false }),
      el('strong', {}, nome(p), ' ', sexo(p)), el('small', {}, `Nv. ${p.nivel}`));
    resumoAoPassar(c, () => p);
    return c;
  };

  const escolha = () => {
    const todos = [...save.time, ...save.caixa].filter((p) => !p.ovo);
    const candidatos = primeiro ? todos.filter((p) => p !== primeiro && podemCruzar(primeiro!, p)) : todos.filter((p) => !motivoForaDaCreche(p));
    return el('div', { class: 'creche-escolha' },
      el('p', { class: 'meta' }, primeiro ? `Escolha o par de ${nome(primeiro)} (grupo de ovo em comum e sexo diferente, ou um Ditto).` : 'Escolha o primeiro Pokémon do casal (time e PC). Lendários, míticos, Ultra Beasts, Paradoxos, NT e ovos não entram.'),
      el('div', { class: 'creche-acoes' },
        el('button', { class: 'botao secundario', onclick: () => (primeiro ? (primeiro = null) : (escolhendo = false), janela.redesenhar()) }, primeiro ? 'Trocar o primeiro' : 'Cancelar'),
        primeiro ? el('button', { class: 'botao secundario', onclick: () => ((escolhendo = false), (primeiro = null), janela.redesenhar()) }, 'Cancelar') : null),
      candidatos.length
        ? el('div', { class: 'creche-grade' }, ...candidatos.map((p) => cartao(p, async () => {
            if (!primeiro) {
              primeiro = p;
              return janela.redesenhar();
            }
            const a = primeiro;
            if (!(await confirmar('Deixar no Daycare', `Deixar ${nome(a)} e ${nome(p)} no Daycare? Eles ficam lá até você retirar; retirar antes de sair um ovo perde o ciclo em andamento.`))) return;
            const erro = deixarCasal(save, a, p);
            escolhendo = false;
            primeiro = null;
            if (erro) return mudou(erro);
            mudou(`${nome(a)} e ${nome(p)} estão no Daycare.`);
          })))
        : el('p', { class: 'meta' }, primeiro ? 'Nenhum Pokémon seu pode cruzar com este.' : 'Nenhum Pokémon seu pode ir para o Daycare.'));
  };

  const casais = () => {
    atualizarCreche(save);
    const vip = vipAtivo(save);
    const ciclo = vip ? CICLO_CRECHE_VIP_MS : CICLO_CRECHE_MS;
    const lista = casaisDe(save);
    const vagas = vagasDaCreche(save);
    return el('div', { class: 'creche-casais' },
      el('p', { class: 'meta' }, `A cada ${duracao(ciclo)}${vip ? ' (VIP)' : ''} o casal tem ${Math.round(CHANCE_OVO_POR_CICLO * 100)}% de chance de fazer um ovo. Saiu ovo: retire para o próximo ciclo começar. O ovo vai para o PC. Vagas: ${lista.length}/${vagas}${vip ? '' : ' (VIP: 2 casais)'}.`),
      ...lista.map((c, i) => {
        const { mae, pai } = maeEPai(c.pais[0], c.pais[1]);
        return el('div', { class: `creche-casal ${c.ovo ? 'com-ovo' : ''}` },
          el('div', { class: 'creche-par' }, cartao(mae), el('span', { class: 'creche-coracao' }, '❤'), cartao(pai)),
          el('div', { class: 'creche-info' },
            c.ovo ? el('strong', { class: 'creche-ovo' }, '🥚 Um ovo apareceu!') : el('span', {}, `Próximo ciclo em ${duracao(c.desde + ciclo - Date.now())}`),
            el('small', { class: 'meta' }, `Chance de shiny: ${Math.round(chanceShinyDoCasal(mae, pai) * 100)}%`),
            el('div', { class: 'creche-acoes' },
              c.ovo ? el('button', { class: 'botao', onclick: () => (retirarOvo(save, i), mudou('O ovo foi para o seu PC.')) }, 'Retirar ovo') : null,
              el('button', {
                class: 'botao secundario', onclick: async () => {
                  if (!(await confirmar('Retirar casal', `Retirar ${nome(mae)} e ${nome(pai)} do Daycare?${c.ovo ? ' O ovo pronto vai junto para o PC.' : ' O ciclo em andamento se perde.'}`))) return;
                  retirarCasal(save, i);
                  mudou('O casal voltou para você (time ou PC).');
                },
              }, 'Retirar casal'))));
      }),
      lista.length < vagas ? el('button', { class: 'botao', onclick: () => ((escolhendo = true), (aviso = ''), janela.redesenhar()) }, 'Deixar um casal') : null,
      ovos());
  };

  // chocar ovos (pedido do dono): sozinho com 1.000 passos no mapa, ou a moça choca em 10 minutos por 20 mil
  const ovos = () => {
    const doPC = ovosNoPC(save);
    const chocando = chocandoNoDaycare(save);
    return el('section', { class: 'creche-chocar' },
      el('h3', {}, '🥚 Chocar ovos'),
      el('p', { class: 'meta' }, `Os ovos do seu PC chocam sozinhos com ${PASSOS_PARA_CHOCAR.toLocaleString('pt-BR')} passos no mapa (cidade e biomas). Com pressa? Eu choco para você em ${duracao(TEMPO_CHOCAR_DAYCARE_MS)}.`),
      ...chocando.map((c, i) => {
        const pronto = c.pronto <= Date.now();
        return el('div', { class: 'creche-ovo-linha' },
          el('img', { class: 'casa-ovo', src: SPRITE_OVO, alt: 'Ovo' }),
          el('span', {}, pronto ? '🐣 Chocou!' : `Chocando · pronto em ${duracao(c.pronto - Date.now())}`),
          pronto ? el('button', { class: 'botao', onclick: () => { const p = buscarChocado(save, i); if (p) mudou(`Nasceu: ${nome(p)}! Foi para o seu ${save.time.includes(p) ? 'time' : 'PC'}.`); } }, 'Buscar') : null);
      }),
      doPC.length
        ? el('div', { class: 'creche-ovos' }, ...doPC.map((p) => el('div', { class: 'creche-ovo-linha' },
            el('img', { class: 'casa-ovo', src: SPRITE_OVO, alt: 'Ovo' }),
            el('span', {}, `Ovo do PC · ${(p.ovo?.passos ?? 0).toLocaleString('pt-BR')}/${PASSOS_PARA_CHOCAR.toLocaleString('pt-BR')} passos`),
            el('button', {
              class: 'botao secundario', disabled: save.silver < PRECO_CHOCAR_DAYCARE,
              onclick: async () => {
                if (!(await confirmar('Chocar ovo', `Pagar ${PRECO_CHOCAR_DAYCARE.toLocaleString('pt-BR')} Poké Dólares para eu chocar este ovo? Ele fica comigo por ${duracao(TEMPO_CHOCAR_DAYCARE_MS)}.`))) return;
                const erro = deixarOvoParaChocar(save, p);
                mudou(erro ?? 'Deixe comigo! Volte em 10 minutos para buscar.');
              },
            }, 'Chocar ', valorEmMoeda('silver', PRECO_CHOCAR_DAYCARE)))))
        : el('p', { class: 'meta' }, 'Você não tem ovos no PC.'));
  };

  const janela = abrirJanela('Daycare', () =>
    el('div', { class: 'creche' },
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso),
      !conteudoLiberado('creche') ? el('p', { class: 'meta' }, `Daycare: ${textoTranca('creche')}.`) : escolhendo ? escolha() : casais()),
  { classe: 'janela-creche' });
  // a contagem dos ovos chocando anda com a janela aberta
  const relogio = window.setInterval(() => (document.querySelector('.janela-creche') ? !escolhendo && janela.redesenhar() : clearInterval(relogio)), 20_000);
}
