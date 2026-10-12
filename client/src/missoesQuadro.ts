// Quadro de missões (regras em shared/missoesQuadro.ts). O quadro é do SERVIDOR INTEIRO (decisão do dono): cada
// missão só pode ser concluída por um jogador, e aí fica indisponível para todos. O servidor guarda quem concluiu
// (server/src/missoes.ts), confere o Pokémon e entrega o gold; aqui fica a lista das concluídas, sempre atualizada.
import { BIOMAS } from '../../shared/biomas';
import { montarTabela } from '../../shared/encontros';
import { cumpreMissao, missoesDoQuadro, rodadaDe, type MissaoQuadro } from '../../shared/missoesQuadro';
import type { MissaoConcluida } from '../../shared/missoesRegras';
import { REGIOES } from '../../shared/regioes';
import { api, conta, ErroApi } from './conta';
import { pokemonsDaRegiao, todosOsPokemons } from './dados';
import { adotarSaveDoServidor, salvarAgora, type PokemonDoJogador, type Save } from './estado';
import { aoAvisoDoServidor } from './online';

let comuns: number[] | null = null;
/** Espécies comuns que aparecem soltas em algum mapa (sem inicial, lendário, mítico e Ultra Beast), em ordem de número. */
function especiesComuns(): number[] {
  if (comuns) return comuns;
  const todos = todosOsPokemons();
  const ids = new Set<number>();
  for (const r of REGIOES.filter((x) => x.disponivel))
    for (const bioma of BIOMAS) for (const e of montarTabela(bioma, pokemonsDaRegiao(r.id), [], todos)) if (!e.grupo) ids.add(e.pokemon.id);
  return (comuns = [...ids].sort((a, b) => a - b));
}

// ---------- concluídas (do servidor) ----------
let concluidas = new Map<string, MissaoConcluida>();
const ouvintes = new Set<() => void>();
/** Chamado quando alguém conclui uma missão (o quadro aberto redesenha). */
export function aoMudarQuadro(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
function adotarConcluidas(lista: MissaoConcluida[]): void {
  concluidas = new Map(lista.map((m) => [m.id, m]));
  ouvintes.forEach((f) => f());
}
/** Busca no servidor quais missões já foram concluídas. */
export async function atualizarQuadro(): Promise<void> {
  try {
    adotarConcluidas((await api<{ concluidas: MissaoConcluida[] }>('GET', '/missoes')).concluidas);
  } catch {
    // sem conexão: fica com a lista que tinha
  }
}
/** Ao abrir o jogo e a cada aviso do servidor ("alguém concluiu uma missão"). */
export function vigiarQuadro(): void {
  void atualizarQuadro();
  aoAvisoDoServidor((msg) => {
    if (msg.t === 'missoes') void atualizarQuadro();
  });
}

export const missoesDeAgora = (agora = Date.now()): MissaoQuadro[] => missoesDoQuadro(agora, especiesComuns());
/** Quem concluiu a missão (null = ainda está disponível). */
export const quemConcluiu = (m: MissaoQuadro): MissaoConcluida | null => concluidas.get(m.id) ?? null;
/** Fui eu? */
export const concluidaPorMim = (m: MissaoQuadro): boolean => quemConcluiu(m)?.por === conta()?.usuario;
/** O quadro de agora: a missão concluída fica marcada até o próximo sorteio e depois some. */
export const missoesNoQuadro = (agora = Date.now()): MissaoQuadro[] =>
  missoesDeAgora(agora).filter((m) => {
    const feita = quemConcluiu(m);
    return !feita || rodadaDe(feita.quando) === rodadaDe(agora);
  });

/** Os Pokémon do jogador (time e PC) da espécie que a missão pede. */
export const candidatosDaMissao = (save: Save, m: MissaoQuadro): PokemonDoJogador[] => [...save.time, ...save.caixa].filter((p) => p.especieId === m.especie);

/**
 * O jogador apresenta um Pokémon dele no quadro (não entrega: continua com ele). O servidor confere no save
 * guardado (por isso salva antes), marca a missão como concluída para TODOS e entrega o gold. Devolve '' se
 * concluiu, ou o motivo de não concluir.
 */
export async function concluirMissaoCom(save: Save, m: MissaoQuadro, p: PokemonDoJogador): Promise<string> {
  if (quemConcluiu(m)) return 'Essa missão já foi concluída.';
  if (!cumpreMissao(m, p)) return p.natureza !== m.natureza ? `Este tem a Nature ${p.natureza}; a missão pede ${m.natureza}.` : 'Este Pokémon não tem o IV ou a qualidade que a missão pede.';
  try {
    await salvarAgora();
    const r = await api<{ save: Save; versao: number; concluidas: MissaoConcluida[] }>('POST', '/missoes/concluir', { id: m.id, uid: p.uid, especie: m.especie, natureza: m.natureza, iv: m.iv, qualidade: m.qualidade });
    adotarSaveDoServidor(r.save, r.versao);
    adotarConcluidas(r.concluidas);
    return '';
  } catch (e) {
    // outro jogador foi mais rápido: a lista nova mostra quem
    void atualizarQuadro();
    return e instanceof ErroApi ? e.message : 'Não foi possível concluir a missão agora.';
  }
}
