// Bosses (global e da guilda): o Pokémon montado pela staff fica 2 h na gaiola da cidade (BiomaScene.mostrarBoss).
// Clicar abre a janela (ranking e "Enfrentar"); cada jogador luta UMA vez: HP infinito, 50 turnos, golpes proibidos.
// A luta é calculada no servidor (server/src/eventos.ts + pvp.ts, como a Liga); ele conta o dano e entrega os prêmios no fim.
import { GOLPES_PROIBIDOS_BOSS, TURNOS_BOSS } from '../../shared/eventosRegras';
import { especie } from '../../shared/batalha/pokemon';
import { Dex } from '@pkmn/sim';
import { api, ErroApi } from './conta';
import { pokemonPorId } from './dados';
import { salvarAgora, type Save } from './estado';
import { aoAvisoDoServidor } from './online';
import { confirmar } from './ui/confirmar';
import { el, spritePokemon } from './ui/dom';
import { bannerEvento, classeTematica } from './ui/temaEvento';
import { abrirJanela } from './ui/janela';
import { avisar } from './ui/avisos';
import { conteudoLiberado } from './trancas';
import { textoTranca } from '../../shared/trancas';

export interface EstadoBoss {
  tipo: 'global' | 'guilda';
  especieId: number;
  nome: string;
  fim: number;
  ativo: boolean;
  jaLutei: boolean;
  meuDano: number | null;
  resultado: string | null;
  ranking: { nome: string; dano: number; guilda: string | null }[];
  guildas: { nome: string; dano: number }[];
}

let estado: EstadoBoss | null = null;
const ouvintes = new Set<() => void>();
async function atualizar(): Promise<void> {
  try {
    estado = (await api<{ boss: EstadoBoss | null }>('GET', '/eventos')).boss;
  } catch {
    // fica o último
  }
  ouvintes.forEach((f) => f());
}
export const bossAtual = () => (estado?.ativo && Date.now() < estado.fim ? estado : null);
export function aoMudarBoss(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
let ligado = false;
export function vigiarBoss(): void {
  if (ligado) return;
  ligado = true;
  aoAvisoDoServidor((msg) => msg.t === 'eventos' && void atualizar());
  void atualizar();
  setInterval(() => void atualizar(), 60_000);
}

/** Golpes proibidos no time (Curse só conta para Pokémon Ghost, que usa a versão que tira vida). */
export function golpesProibidosNoTime(save: Save): string[] {
  const achados: string[] = [];
  for (const p of save.time) {
    for (const g of p.golpes) {
      if (!GOLPES_PROIBIDOS_BOSS.includes(g.id)) continue;
      if (g.id === 'curse' && !especie(p.especieId).types.includes('Ghost')) continue;
      achados.push(`${pokemonPorId(p.especieId).nome}: ${Dex.moves.get(g.id).name}`);
    }
  }
  return achados;
}

const numero = (n: number) => n.toLocaleString('pt-BR');

/** Janela do Boss. "Enfrentar" pede ao servidor: a batalha é calculada lá e abre sozinha (client/src/pvp.ts). */
export function abrirBoss(save: Save): void {
  let aviso = '';
  const janela = abrirJanela('Boss', () => {
    const b = estado;
    if (!b) return el('div', { class: 'boss-janela' }, bannerEvento('boss', { selo: { texto: 'Nenhum Boss agora', estado: 'fechado' } }), el('p', { class: 'meta' }, 'Nenhum Boss agora. Quando a staff soltar um, ele aparece nesta gaiola e o aviso passa na barrinha de avisos do topo.'));
    const ativo = !!bossAtual();
    const min = Math.max(0, Math.ceil((b.fim - Date.now()) / 60_000));
    return el('div', { class: 'boss-janela' },
      bannerEvento('boss', {
        titulo: b.tipo === 'global' ? 'Boss global' : 'Boss da guilda',
        subtitulo: b.nome,
        selo: ativo ? { texto: `● AO VIVO · ${min} min`, estado: 'ativo' } : { texto: 'Terminou', estado: 'fechado' },
      }),
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso),
      el('div', { class: 'expedicao-time' }, spritePokemon(pokemonPorId(b.especieId), { animado: false }),
        el('div', {}, el('strong', {}, `${b.tipo === 'global' ? '👹 Boss global' : '🛡️ Boss da guilda'}: ${b.nome}`),
          el('p', { class: 'meta' }, ativo ? `Termina em ${min} min. HP infinito: cada treinador luta uma vez, por até ${TURNOS_BOSS} turnos, e o dano conta para o ranking${b.tipo === 'guilda' ? ' da sua guilda' : ''}. Golpes que tiram porcentagem da vida ou dano fixo são proibidos.` : `Terminou. ${b.resultado ?? ''}`))),
      ativo && !b.jaLutei && !conteudoLiberado('boss')
        ? el('p', { class: 'meta' }, textoTranca('boss'))
        : ativo && !b.jaLutei
        ? el('button', {
            class: 'botao', onclick: async () => {
              const proibidos = golpesProibidosNoTime(save);
              if (proibidos.length) return ((aviso = `Golpes proibidos no seu time: ${proibidos.join(', ')}. Troque antes de lutar.`), janela.redesenhar());
              if (!(await confirmar('Boss', `Enfrentar o ${b.nome}? Você só pode lutar UMA vez contra este boss.`))) return;
              try {
                await salvarAgora(); // o servidor usa o time guardado
                await api('POST', '/eventos/boss/entrar');
                janela.fechar();
                void atualizar();
              } catch (e) {
                aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
                janela.redesenhar();
              }
            },
          }, 'Enfrentar')
        : el('p', {}, b.meuDano !== null ? `Seu dano: ${numero(b.meuDano)}` : ''),
      el('h3', {}, 'Ranking de dano'),
      el('ol', { class: 'evento-ranking' }, ...b.ranking.map((r) => el('li', {}, `${r.nome}${r.guilda ? ` [${r.guilda}]` : ''} — ${numero(r.dano)}`))),
      b.tipo === 'guilda' ? el('h3', {}, 'Guildas') : '',
      b.tipo === 'guilda' ? el('ol', { class: 'evento-ranking' }, ...b.guildas.map((g) => el('li', {}, `${g.nome} — ${numero(g.dano)}`))) : '');
  }, { classe: `janela-boss ${classeTematica('boss')}` });
  const parar = aoMudarBoss(() => (document.querySelector('.janela-boss') ? janela.redesenhar() : parar()));
}
