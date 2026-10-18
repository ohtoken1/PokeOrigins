// Administração → Liga (pedido do dono): a staff monta os times da Liga Pokémon (Elite 4 + Campeão) e da Liga Nightmare
// (um treinador por tipo) sem precisar de programador, para balancear na hora. Cada mudança já vai para o servidor
// (server/src/liga.ts); vale para a próxima batalha que alguém começar.
import { ETAPAS_LIGA, NIVEL_MAXIMO_LIGA, NOME_LIGA, POKEMON_POR_TIME_LIGA, type TipoLiga } from '../../../shared/liga';
import type { PokemonIndividual } from '../../../shared/batalha/pokemon';
import { api, ErroApi } from '../conta';
import { pokemonPorId } from '../dados';
import { el, spritePokemon } from '../ui/dom';
import { secaoDarPokemon } from './adminPokemon';

interface TimeLiga { nome: string; pokemon: PokemonIndividual[] }
type TimesLiga = Record<TipoLiga, Record<string, TimeLiga>>;

export function secaoLiga(): { elemento: HTMLElement; parar: () => void } {
  let times: TimesLiga | null = null;
  let liga: TipoLiga = 'normal';
  let chave = ETAPAS_LIGA.normal[0].chave;
  let aviso = '';
  let editor: { elemento: HTMLElement; parar: () => void } | null = null;
  const caixa = el('section', { class: 'bonus-secao admin-liga' });

  const timeAtual = (): TimeLiga => times?.[liga][chave] ?? { nome: '', pokemon: [] };
  const etapa = () => ETAPAS_LIGA[liga].find((e) => e.chave === chave)!;

  async function gravar(time: TimeLiga): Promise<void> {
    times = (await api<{ times: TimesLiga }>('POST', '/admin/liga', { liga, chave, nome: time.nome, pokemon: time.pokemon })).times;
  }
  async function mudar(f: (t: TimeLiga) => void, mensagem: string): Promise<void> {
    const t = structuredClone(timeAtual());
    f(t);
    try {
      await gravar(t);
      aviso = mensagem;
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    desenhar();
  }

  function trocarEditor(): void {
    editor?.parar();
    editor = secaoDarPokemon({
      botao: 'Pôr no time', nivelMaximo: NIVEL_MAXIMO_LIGA[liga],
      enviar: async (p, nome) => {
        if (timeAtual().pokemon.length >= POKEMON_POR_TIME_LIGA) return `O time já tem ${POKEMON_POR_TIME_LIGA} Pokémon. Tire um antes.`;
        await mudar((t) => t.pokemon.push(p), `${nome} entrou no time.`);
        return `${nome} entrou no time.`;
      },
    });
  }

  function desenhar(): void {
    if (!times) return void caixa.replaceChildren(el('p', { class: 'meta' }, aviso || 'Carregando os times…'));
    const t = timeAtual();
    const campoNome = el('input', { class: 'db-busca', value: t.nome, placeholder: etapa().padrao, maxlength: 30, 'aria-label': 'Nome do treinador' }) as HTMLInputElement;
    const montados = (l: TipoLiga) => ETAPAS_LIGA[l].filter((e) => (times![l][e.chave]?.pokemon.length ?? 0) > 0).length;
    caixa.replaceChildren(
      el('p', { class: 'sub' }, 'Monte os times da Liga. Cada mudança vale na hora para a próxima batalha que alguém começar. A Liga só abre para os jogadores com TODOS os times montados.'),
      el('nav', { class: 'admin-abas' }, ...(['normal', 'nightmare'] as const).map((l) =>
        el('button', { class: `aba ${l === liga ? 'ativa' : ''}`, onclick: () => ((liga = l), (chave = ETAPAS_LIGA[l][0].chave), (aviso = ''), trocarEditor(), desenhar()) },
          `${NOME_LIGA[l]} (${montados(l)}/${ETAPAS_LIGA[l].length})`))),
      el('div', { class: 'liga-etapas' }, ...ETAPAS_LIGA[liga].map((e, i) =>
        el('button', { class: `aba ${e.chave === chave ? 'ativa' : ''}`, onclick: () => ((chave = e.chave), (aviso = ''), desenhar()) },
          `${i + 1}. ${times![liga][e.chave]?.nome || e.padrao} (${times![liga][e.chave]?.pokemon.length ?? 0})`))),
      el('p', { class: 'amigos-aviso', role: 'status' }, aviso),
      el('div', { class: 'liga-nome' }, campoNome,
        el('button', { class: 'botao', onclick: () => mudar((x) => (x.nome = campoNome.value.trim()), 'Nome salvo.') }, 'Salvar nome')),
      el('h3', {}, `Time (${t.pokemon.length}/${POKEMON_POR_TIME_LIGA}) — o primeiro entra em campo primeiro`),
      t.pokemon.length
        ? el('ol', { class: 'liga-time' }, ...t.pokemon.map((p, i) =>
            el('li', {},
              spritePokemon(pokemonPorId(p.especieId), { animado: false, shiny: p.shiny }),
              el('span', {}, `${pokemonPorId(p.especieId).nome}${p.shiny ? ' ✨' : ''} Nv. ${p.nivel}`, el('small', { class: 'meta' }, ` ${p.natureza} · ${p.habilidade}`)),
              el('button', { class: 'botao secundario', disabled: i === 0, title: 'Subir', onclick: () => mudar((x) => x.pokemon.splice(i - 1, 0, ...x.pokemon.splice(i, 1)), 'Ordem mudada.') }, '↑'),
              el('button', { class: 'botao perigo', onclick: () => mudar((x) => x.pokemon.splice(i, 1), 'Pokémon tirado do time.') }, 'Tirar'))))
        : el('p', { class: 'meta' }, 'Nenhum Pokémon ainda. Monte abaixo e clique em "Pôr no time".'),
      el('h3', {}, 'Montar Pokémon'),
      el('p', { class: 'meta' }, `Nível até ${NIVEL_MAXIMO_LIGA[liga]}. O campo de jogador e o NT não fazem nada aqui.`),
      editor!.elemento);
  }

  trocarEditor();
  desenhar();
  api<{ times: TimesLiga }>('GET', '/admin/liga')
    .then((r) => ((times = r.times), desenhar()))
    .catch((e) => ((aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.'), desenhar()));
  return { elemento: caixa, parar: () => editor?.parar() };
}
