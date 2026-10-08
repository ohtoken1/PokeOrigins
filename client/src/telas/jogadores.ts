// Comunidade → Buscar jogadores: procura um treinador pelo nome e mostra o perfil (identificação, PvP ranqueado,
// números da jornada com medalhas de torneio, insígnias e time). Também é o "Meu perfil" da Minha conta.
// Sem servidor ainda, a busca só encontra o próprio jogador deste navegador.
import type { Tela } from '../main';
import { progressoTreinador } from '../../../shared/treinador';
import { lideresDaRegiao } from '../../../shared/ginasios';
import { APARENCIA_PADRAO, LINHA_DIRECAO, montarPersonagem } from '../personagem/lpc';
import { insigniaVisual } from './ginasios';
import { REGIOES, regiaoPorId } from '../../../shared/regioes';
import { pokemonPorId, todosOsPokemons } from '../dados';
import { carregarSave, type PokemonDoJogador, type Save } from '../estado';
import { abrirDetalhes } from '../ui/detalhes';
import { el, spritePokemon } from '../ui/dom';
import { icone } from '../ui/icones';

/** Sem servidor, o único perfil que existe é o de quem está jogando agora: sempre online. */
function estaOnline(save: Save): boolean {
  return save === carregarSave();
}

/** Medalha de torneio desenhada por código (fita + disco) com a quantidade do lado. */
const medalha = (cor: 'ouro' | 'prata' | 'bronze', nome: string, quantidade: number) =>
  el('span', { class: `perfil-medalha medalha-${cor}`, title: `${nome}: ${quantidade}` },
    el('span', { class: 'medalha-icone' }, el('span', { class: 'medalha-fita' }), el('span', { class: 'medalha-disco' })), String(quantidade));

/** Retrato do personagem (LPC, parado olhando para a frente). */
function retratoTreinador(save: Save): HTMLElement {
  const canvas = el('canvas', { width: 64, height: 64, class: 'perfil-retrato-canvas' }) as HTMLCanvasElement;
  montarPersonagem({ ...APARENCIA_PADRAO, ...save.aparencia }).then((f) => {
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(f.walk, 0, LINHA_DIRECAO.baixo * 64, 64, 64, 0, 0, 64, 64);
  });
  return el('div', { class: 'perfil-retrato' }, canvas);
}

/** Cápsula de Pokébola com o Pokémon do time (clicar abre a ficha). */
function capsulaTime(p: PokemonDoJogador): HTMLElement {
  const d = pokemonPorId(p.especieId);
  return el('button', { class: 'perfil-capsula', title: 'Ver a ficha', onclick: () => abrirDetalhes(p) },
    spritePokemon(d, { shiny: p.shiny, animado: false }),
    el('span', {}, d.nome, p.shiny ? el('span', { class: 'perfil-shiny' }, ' ★') : '', ` · ${p.nivel}`));
}

/** Insígnias com uma lista de regiões para escolher (começa na região atual do jogador). */
function painelInsignias(save: Save): HTMLElement {
  const lista = el('div', { class: 'perfil-insignias' });
  const regioes = REGIOES.filter((r) => lideresDaRegiao(r.id).length);
  const ganhasEm = (id: string) => lideresDaRegiao(id).filter((l) => (save.insignias ?? []).includes(l.id)).length;
  const seletor = el('select', { class: 'perfil-seletor-regiao', 'aria-label': 'Região das insígnias' },
    ...regioes.map((r) => el('option', { value: r.id }, `${r.nome} (${ganhasEm(r.id)}/${lideresDaRegiao(r.id).length})`))) as HTMLSelectElement;
  const mostrar = () => lista.replaceChildren(...lideresDaRegiao(seletor.value).map((l) => insigniaVisual(l, (save.insignias ?? []).includes(l.id))));
  seletor.value = regioes.some((r) => r.id === save.regiao) ? save.regiao : regioes[0].id;
  seletor.addEventListener('change', mostrar);
  mostrar();
  return el('div', {}, seletor, lista);
}

export function perfilJogador(save: Save): HTMLElement {
  const e = save.estatisticas;
  const online = estaOnline(save);
  const totalDex = todosOsPokemons().filter((p) => !p.numeroDex).length;
  const parteDex = Math.round((save.capturados.length / totalDex) * 1000) / 10;
  const desde = save.criadoEm ? new Date(save.criadoEm).toLocaleDateString('pt-BR') : '—';
  const [ouro, prata, bronze] = [e?.medalhasOuro ?? 0, e?.medalhasPrata ?? 0, e?.medalhasBronze ?? 0];
  const t = progressoTreinador(save.xpTreinador);
  const numero = (classe: string, rotulo: string, valor: string | HTMLElement, titulo = '') =>
    el('div', { class: `perfil-numero ${classe}`, title: titulo }, el('small', {}, rotulo), el('strong', {}, valor));
  const caixa = (titulo: string, ...conteudo: HTMLElement[]) => el('section', { class: 'perfil-painel' }, el('h3', {}, titulo), ...conteudo);
  const degrau = (cor: 'ouro' | 'prata' | 'bronze', lugar: string, nome: string, qtd: number) =>
    el('div', { class: `podio-degrau podio-${cor}`, title: `${nome}: ${qtd}` },
      el('span', { class: 'medalha-icone' }, el('span', { class: 'medalha-fita' }), el('span', { class: 'medalha-disco' })),
      el('small', {}, lugar), el('strong', {}, String(qtd)));
  return el(
    'article',
    { class: 'perfil-jogador' },
    // coluna da esquerda: identidade (retrato, nome, status, nível, região, desde quando, PvP)
    el('aside', { class: 'perfil-lado' },
      retratoTreinador(save),
      el('h2', {}, save.aparencia?.nome || 'Treinador'),
      el('span', { class: `perfil-status ${online ? 'online' : 'offline'}` }, el('span', { class: 'perfil-bolinha' }), online ? 'Online agora' : 'Offline'),
      el('div', { class: 'perfil-nivel', title: t.necessario ? `${t.atual.toLocaleString('pt-BR')} / ${t.necessario.toLocaleString('pt-BR')} XP` : 'Nível máximo' },
        el('small', {}, `Treinador Nv. ${t.nivel}`),
        el('span', { class: 'barra-exp perfil-barra' }, el('span', { class: 'preenchido', style: { width: `${t.necessario ? (t.atual / t.necessario) * 100 : 100}%` } }))),
      el('div', { class: 'perfil-info' },
        el('div', {}, icone('mapa'), el('span', {}, 'Região:'), regiaoPorId(save.regiao)?.nome ?? save.regiao),
        el('div', {}, icone('calendario'), el('span', {}, 'Treinador desde:'), desde)),
      el('div', { class: 'perfil-pvp', title: 'O PvP ranqueado ainda vai ser feito' },
        el('small', {}, 'PvP ranqueado'), el('strong', {}, 'Sem classificação'), el('span', { class: 'selo-em-breve' }, 'Em breve'))),
    // direita: números, medalhas, insígnias e time
    el('div', { class: 'perfil-direita' },
      el('div', { class: 'perfil-numeros' },
        numero('n-vistos', 'Vistos', save.vistos.length.toLocaleString('pt-BR')),
        numero('n-capturados', 'Capturados', (e?.capturas ?? 0).toLocaleString('pt-BR')),
        numero('n-shiny', 'Shiny', el('span', {}, (e?.capturasShiny ?? 0).toLocaleString('pt-BR'), el('span', { class: 'perfil-shiny' }, ' ★'))),
        numero('n-dex', 'Dex completa', `${parteDex.toLocaleString('pt-BR')}%`, `${save.capturados.length} de ${totalDex} espécies (todas as regiões)`)),
      el('div', { class: 'perfil-meio' },
        caixa('Medalhas de torneio',
          el('div', { class: 'perfil-podio' }, degrau('prata', '2º', 'Prata', prata), degrau('ouro', '1º', 'Ouro', ouro), degrau('bronze', '3º', 'Bronze', bronze))),
        caixa('Insígnias', painelInsignias(save))),
      caixa('Time', el('div', { class: 'perfil-time' }, ...save.time.map(capsulaTime),
        ...Array.from({ length: Math.max(0, 6 - save.time.length) }, () => el('div', { class: 'perfil-capsula vazia' }, 'vaga'))))),
  );
}

export const telaJogadores: Tela = (raiz) => {
  const tela = el('main', { class: 'tela tela-jogadores' }, el('h1', {}, 'Buscar jogadores'));
  raiz.append(tela);
  const campo = el('input', { type: 'search', class: 'db-busca', placeholder: 'Nome do treinador…' }) as HTMLInputElement;
  const resultado = el('div', { class: 'jogadores-resultado' });
  const buscar = () => {
    const termo = campo.value.trim().toLowerCase();
    const save = carregarSave();
    // sem servidor: a "lista de jogadores" tem só quem joga neste navegador
    const jogadores = save ? [save] : [];
    const achados = termo ? jogadores.filter((s) => (s.aparencia?.nome ?? '').toLowerCase().includes(termo)) : [];
    resultado.replaceChildren(
      !termo
        ? el('p', { class: 'meta' }, 'Digite o nome de um treinador para ver o perfil dele.')
        : achados.length
          ? el('div', {}, ...achados.map(perfilJogador))
          : el('p', { class: 'meta' }, `Nenhum treinador encontrado com "${campo.value.trim()}".`),
    );
  };
  campo.addEventListener('input', buscar);
  tela.append(
    el('div', { class: 'jogadores-busca' }, campo),
    el('small', { class: 'meta' }, 'Por enquanto só dá para encontrar você mesmo: a busca com todos os jogadores precisa do servidor online.'),
    resultado,
  );
  buscar();
};
