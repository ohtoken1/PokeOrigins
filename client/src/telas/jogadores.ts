// Comunidade → Buscar jogadores: procura um treinador (usuário ou nome) no servidor e mostra o perfil (identificação,
// PvP ranqueado, números da jornada com medalhas de torneio, insígnias e time). Também é o "Meu perfil" da Minha
// conta e o "Ver perfil" ao clicar em outro jogador no mapa (`abrirPerfilDe`).
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
import { abrirJanela } from '../ui/janela';
import { api, ErroApi } from '../conta';
import { icone } from '../ui/icones';

/** Perfil de outro jogador como o servidor manda (server/src/index.ts → perfilPublico): só o que é público. */
export interface PerfilPublico {
  usuario: string;
  online: boolean;
  perfil: Pick<Save, 'aparencia' | 'regiao' | 'xpTreinador' | 'criadoEm' | 'insignias' | 'vistos' | 'capturados' | 'estatisticas'> & {
    mostrarTime: boolean;
    time: { especieId: number; nivel: number; shiny: boolean }[];
  };
}

/** Abre o perfil de outro jogador numa janela (clicar no boneco no mapa → Ver perfil). */
export async function abrirPerfilDe(usuario: string): Promise<void> {
  try {
    const r = await api<PerfilPublico>('GET', `/jogadores/${encodeURIComponent(usuario)}`);
    abrirJanela(`Perfil de ${r.perfil.aparencia?.nome || r.usuario}`, () => perfilRemoto(r), { classe: 'janela-perfil' });
  } catch (e) {
    alert(e instanceof ErroApi ? e.message : 'Não foi possível abrir o perfil.');
  }
}

/** Perfil de outro jogador: o mesmo desenho, com o time só para ver (sem abrir a ficha) e escondido se ele quiser. */
function perfilRemoto(r: PerfilPublico): HTMLElement {
  const save = { ...r.perfil, time: r.perfil.time } as unknown as Save;
  return perfilJogador(save, { online: r.online, remoto: true, timeEscondido: !r.perfil.mostrarTime });
}

/** Medalha de torneio desenhada por código (fita + disco) com a quantidade do lado. */
const medalha = (cor: 'ouro' | 'prata' | 'bronze', nome: string, quantidade: number) =>
  el('span', { class: `perfil-medalha medalha-${cor}`, title: `${nome}: ${quantidade}` },
    el('span', { class: 'medalha-icone' }, el('span', { class: 'medalha-fita' }), el('span', { class: 'medalha-disco' })), String(quantidade));

/** Retrato do personagem (LPC, parado olhando para a frente). */
function retratoTreinador(save: Save): HTMLElement {
  const canvas = el('canvas', { width: 64, height: 64, class: 'perfil-retrato-canvas' }) as HTMLCanvasElement;
  montarPersonagem({ ...APARENCIA_PADRAO, ...save.aparencia }).catch(() => montarPersonagem(APARENCIA_PADRAO)).then((f) => {
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(f.walk, 0, LINHA_DIRECAO.baixo * 64, 64, 64, 0, 0, 64, 64);
  });
  return el('div', { class: 'perfil-retrato' }, canvas);
}

/** Cápsula de Pokébola com o Pokémon do time (clicar abre a ficha; de outro jogador, só mostra). */
function capsulaTime(p: PokemonDoJogador, remoto = false): HTMLElement {
  const d = pokemonPorId(p.especieId);
  return el(remoto ? 'div' : 'button', remoto ? { class: 'perfil-capsula' } : { class: 'perfil-capsula', title: 'Ver a ficha', onclick: () => abrirDetalhes(p) },
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

export function perfilJogador(save: Save, opcoes: { online?: boolean; remoto?: boolean; timeEscondido?: boolean } = {}): HTMLElement {
  const e = save.estatisticas;
  // o próprio perfil está sempre online (é quem está jogando)
  const online = opcoes.online ?? save === carregarSave();
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
      caixa('Time', opcoes.timeEscondido
        ? el('p', { class: 'meta' }, 'Este treinador escolheu não mostrar a equipe.')
        : el('div', { class: 'perfil-time' }, ...save.time.map((p) => capsulaTime(p, opcoes.remoto)),
          ...Array.from({ length: Math.max(0, 6 - save.time.length) }, () => el('div', { class: 'perfil-capsula vazia' }, 'vaga'))))),
  );
}

export const telaJogadores: Tela = (raiz) => {
  const tela = el('main', { class: 'tela tela-jogadores' }, el('h1', {}, 'Buscar jogadores'));
  raiz.append(tela);
  const campo = el('input', { type: 'search', class: 'db-busca', placeholder: 'Nome do treinador…' }) as HTMLInputElement;
  const resultado = el('div', { class: 'jogadores-resultado' });
  // busca no servidor (usuário ou nome de treinador), esperando a pessoa parar de digitar
  let relogio = 0;
  let pedido = 0;
  const buscar = () => {
    const termo = campo.value.trim();
    clearTimeout(relogio);
    if (!termo) return void resultado.replaceChildren(el('p', { class: 'meta' }, 'Digite o nome de um treinador para ver o perfil dele.'));
    relogio = window.setTimeout(async () => {
      const este = ++pedido;
      try {
        const achados = await api<{ usuario: string; nome: string | null; online: boolean }[]>('GET', `/jogadores?busca=${encodeURIComponent(termo)}`);
        if (este !== pedido) return;
        resultado.replaceChildren(
          achados.length
            ? el('div', { class: 'jogadores-lista' }, ...achados.map((j) =>
                el('button', { class: 'jogador-achado', onclick: () => abrirPerfilDe(j.usuario) },
                  el('span', { class: `perfil-bolinha ${j.online ? 'online' : 'offline'}`, title: j.online ? 'Online' : 'Offline' }),
                  el('strong', {}, j.nome || j.usuario), el('small', {}, `@${j.usuario}`))))
            : el('p', { class: 'meta' }, `Nenhum treinador encontrado com "${termo}".`),
        );
      } catch (e) {
        if (este === pedido) resultado.replaceChildren(el('p', { class: 'meta' }, e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.'));
      }
    }, 250);
  };
  campo.addEventListener('input', buscar);
  tela.append(el('div', { class: 'jogadores-busca' }, campo), resultado);
  buscar();
  return () => clearTimeout(relogio);
};
