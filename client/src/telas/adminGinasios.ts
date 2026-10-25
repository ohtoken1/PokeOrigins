// Administração → Ginásios (pedido do dono, 24/10/2026): a staff monta os times dos líderes no Médio e no Difícil
// (o Fácil continua com o time dos jogos). Mesmo editor do Dar Pokémon, com item segurado; o nível é do jogo
// (Médio: mínimo 10 × ordem e acompanha o mais forte do jogador; Difícil: 100). Cada mudança vai na hora para o
// servidor (server/src/ajustes.ts) e chega a todos.
import { LIDERES, lideresDaRegiao } from '../../../shared/ginasios';
import { DIFICULDADES_MANUAIS, NOME_DIFICULDADE_GINASIO, POKEMON_POR_TIME_GINASIO, nivelMinimoGinasio, type DificuldadeManual } from '../../../shared/ginasiosDificuldade';
import { REGIOES } from '../../../shared/regioes';
import type { PokemonIndividual } from '../../../shared/batalha/pokemon';
import { adotarAjustes, aoMudarAjustes, timeDoGinasio, type TimesGinasio } from '../ajustesJogo';
import type { AjustesBiomas } from '../../../shared/encontros';
import { api, ErroApi } from '../conta';
import { pokemonPorId } from '../dados';
import { el, spritePokemon } from '../ui/dom';
import { imagemTreinador } from './duelos';
import { secaoDarPokemon } from './adminPokemon';
import { confirmar } from '../ui/confirmar';

let regiaoAberta = 'kanto';
let dificuldadeAberta: DificuldadeManual = 'media';

export function secaoGinasios(): { elemento: HTMLElement; parar: () => void } {
  let regiao = regiaoAberta;
  let dificuldade = dificuldadeAberta;
  let lider = lideresDaRegiao(regiao)[0]?.id ?? LIDERES[0].id;
  let aviso = '';
  let editor: { elemento: HTMLElement; parar: () => void } | null = null;
  const caixa = el('section', { class: 'bonus-secao admin-liga' });
  const liderAtual = () => LIDERES.find((l) => l.id === lider)!;

  async function gravar(pokemon: PokemonIndividual[], mensagem: string): Promise<void> {
    try {
      adotarAjustes(await api<{ biomas: AjustesBiomas; ginasios: TimesGinasio }>('POST', '/admin/ginasios', { dificuldade, lider, pokemon }));
      aviso = mensagem;
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    desenhar();
  }
  const mudar = (f: (t: PokemonIndividual[]) => void, mensagem: string) => {
    const t = structuredClone(timeDoGinasio(dificuldade, lider));
    f(t);
    return gravar(t, mensagem);
  };

  function trocarEditor(): void {
    editor?.parar();
    editor = secaoDarPokemon({
      botao: 'Pôr no time',
      comItem: true,
      nivelAutomatico: dificuldade === 'dificil' ? 'Nível: sempre 100 no Difícil.' : 'Nível: decidido pelo jogo (mínimo pela ordem do ginásio; acompanha o Pokémon mais forte do jogador).',
      enviar: async (p, nome) => {
        if (timeDoGinasio(dificuldade, lider).length >= POKEMON_POR_TIME_GINASIO) return `O time já tem ${POKEMON_POR_TIME_GINASIO} Pokémon. Tire um antes.`;
        await mudar((t) => t.push(p), `${nome} entrou no time de ${liderAtual().nome} (${NOME_DIFICULDADE_GINASIO[dificuldade]}).`);
        return aviso;
      },
    });
  }

  function desenhar(): void {
    regiaoAberta = regiao;
    dificuldadeAberta = dificuldade;
    const l = liderAtual();
    const time = timeDoGinasio(dificuldade, lider);
    const montados = (d: DificuldadeManual) => LIDERES.filter((x) => timeDoGinasio(d, x.id).length).length;
    caixa.replaceChildren(
      el('p', { class: 'sub' }, 'Monte os times dos líderes no Médio e no Difícil (o Fácil usa o time dos jogos). Líder sem time aparece como "Em breve" para os jogadores. Cada mudança vale na hora.'),
      el('nav', { class: 'admin-abas' }, ...DIFICULDADES_MANUAIS.map((d) =>
        el('button', { class: `aba ${d === dificuldade ? 'ativa' : ''}`, onclick: () => ((dificuldade = d), (aviso = ''), trocarEditor(), desenhar()) },
          `${NOME_DIFICULDADE_GINASIO[d]} (${montados(d)}/${LIDERES.length})`))),
      el('nav', { class: 'admin-abas' }, ...REGIOES.filter((r) => r.disponivel).map((r) =>
        el('button', { class: `aba ${r.id === regiao ? 'ativa' : ''}`, onclick: () => ((regiao = r.id), (lider = lideresDaRegiao(r.id)[0].id), (aviso = ''), desenhar()) }, r.nome))),
      el('div', { class: 'liga-etapas' }, ...lideresDaRegiao(regiao).map((x) =>
        el('button', { class: `aba ${x.id === lider ? 'ativa' : ''}`, onclick: () => ((lider = x.id), (aviso = ''), desenhar()) },
          `${x.ordem}. ${x.nome} (${timeDoGinasio(dificuldade, x.id).length})`))),
      el('p', { class: 'amigos-aviso', role: 'status' }, aviso),
      el('div', { class: 'admin-ginasio-lider' },
        el('img', { class: 'retrato-npc', src: imagemTreinador(l.id), alt: l.nome }),
        el('div', {},
          el('h3', {}, `${l.nome} · Ginásio ${l.ordem} (${l.tipo}) · ${NOME_DIFICULDADE_GINASIO[dificuldade]}`),
          el('small', { class: 'meta' }, dificuldade === 'dificil' ? 'Todos no nível 100.' : `Nível mínimo ${nivelMinimoGinasio(dificuldade, l.ordem)}; sobe junto com o Pokémon mais forte do jogador.`))),
      el('h3', {}, `Time (${time.length}/${POKEMON_POR_TIME_GINASIO}) — o primeiro entra em campo primeiro`),
      time.length
        ? el('ol', { class: 'liga-time' }, ...time.map((p, i) =>
            el('li', {},
              spritePokemon(pokemonPorId(p.especieId), { animado: false, shiny: p.shiny }),
              el('span', {}, `${pokemonPorId(p.especieId).nome}${p.shiny ? ' ✨' : ''}`, el('small', { class: 'meta' }, ` ${p.natureza} · ${p.habilidade}${p.item ? ` · @ ${p.item}` : ''}`)),
              el('button', { class: 'botao secundario', disabled: i === 0, title: 'Subir', onclick: () => mudar((x) => x.splice(i - 1, 0, ...x.splice(i, 1)), 'Ordem mudada.') }, '↑'),
              el('button', { class: 'botao perigo', onclick: () => mudar((x) => x.splice(i, 1), 'Pokémon tirado do time.') }, 'Tirar'))))
        : el('p', { class: 'meta' }, 'Nenhum Pokémon ainda. Monte abaixo e clique em "Pôr no time".'),
      time.length
        ? el('button', { class: 'botao secundario', onclick: async () => (await confirmar('Apagar time', `Apagar o time inteiro de ${l.nome} no ${NOME_DIFICULDADE_GINASIO[dificuldade]}?`)) && gravar([], 'Time apagado.') }, 'Apagar o time inteiro')
        : '',
      el('h3', {}, 'Montar Pokémon'),
      el('p', { class: 'meta' }, 'O campo NT não faz nada aqui.'),
      editor!.elemento);
  }

  trocarEditor();
  desenhar();
  // outra pessoa da staff mexeu nos times
  const parar = aoMudarAjustes(() => caixa.isConnected && desenhar());
  return { elemento: caixa, parar: () => (editor?.parar(), parar()) };
}
