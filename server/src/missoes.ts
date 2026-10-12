// Quadro de missões da cidade: o quadro é do SERVIDOR INTEIRO (decisão do dono). Cada missão só pode ser concluída
// por um jogador; o servidor guarda quem concluiu, confere o Pokémon no save guardado e entrega o gold.
// Limite conhecido: o servidor não tem os dados das espécies, então não sorteia as missões; ele confia no pedido
// (espécie, Nature, IV, qualidade) que o jogo manda junto com o id da rodada. Sai quando os dados forem para cá.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisarTodos } from './mundo.ts';
import { ATRIBUTOS_IV, MISSOES_POR_RODADA, RECOMPENSA_MISSAO_GOLD, RODADAS_NO_QUADRO, rodadaDe, type MissaoConcluida } from '../../shared/missoesRegras.ts';
import { tierIv } from '../../shared/tierIv.ts';

const saldo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
type Pokemon = { uid?: number; especieId?: number; natureza?: string; ivs?: Record<string, number> };

/** A missão `id` ("<rodada>-<posição>") ainda está no quadro? */
function noQuadro(id: unknown, agora: number): id is string {
  if (typeof id !== 'string') return false;
  const partes = /^(\d{1,9})-(\d)$/.exec(id);
  if (!partes) return false;
  const [rodada, posicao, atual] = [Number(partes[1]), Number(partes[2]), rodadaDe(agora)];
  return posicao < MISSOES_POR_RODADA && rodada <= atual && rodada > atual - RODADAS_NO_QUADRO;
}

/** As missões que já foram concluídas e ainda estão no quadro. */
export function listar(): { concluidas: MissaoConcluida[] } {
  const agora = Date.now();
  return { concluidas: banco.missoesConcluidas().filter((m) => noQuadro(m.id, agora)) };
}

/** O jogador apresenta um Pokémon dele (pelo `uid`) para concluir a missão. Não entrega o Pokémon. */
export function concluir(conta: banco.Conta, dados: Record<string, unknown>) {
  const { id, uid, especie, natureza, iv, qualidade } = dados;
  const agora = Date.now();
  if (!noQuadro(id, agora)) throw new ErroConta('Essa missão já saiu do quadro.', 409);
  if (typeof especie !== 'number' || typeof natureza !== 'string' || typeof iv !== 'string' || !ATRIBUTOS_IV.includes(iv) || typeof qualidade !== 'string' || !(qualidade in RECOMPENSA_MISSAO_GOLD))
    throw new ErroConta('Missão inválida.');
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada antes de fazer missões.');
  banco.mudarSaves([conta.id], ([save]) => {
    const feita = banco.missaoConcluida(id);
    if (feita) throw new ErroConta(feita.por === conta.usuario ? 'Você já concluiu essa missão.' : `${feita.por} já concluiu essa missão.`, 409);
    const meus = [...((save.time as Pokemon[]) ?? []), ...((save.caixa as Pokemon[]) ?? [])];
    const p = meus.find((x) => x.uid === uid);
    if (!p || !p.ivs) throw new ErroConta('Esse Pokémon não é seu.');
    if (p.especieId !== especie || p.natureza !== natureza || p.ivs[iv] !== 31 || tierIv({ ivs: p.ivs }) !== qualidade) throw new ErroConta('Este Pokémon não cumpre a missão.');
    // dentro da mesma mudança: se outro jogador concluir ao mesmo tempo, só um passa
    banco.concluirMissao(id, conta.id, conta.usuario, agora);
    save.gold = saldo(save.gold) + RECOMPENSA_MISSAO_GOLD[qualidade];
    const estatisticas = (save.estatisticas && typeof save.estatisticas === 'object' ? save.estatisticas : (save.estatisticas = {})) as Record<string, unknown>;
    estatisticas.missoesQuadro = saldo(estatisticas.missoesQuadro) + 1;
  });
  avisarTodos({ t: 'missoes' });
  const guardado = banco.lerSave(conta.id)!;
  return { save: JSON.parse(guardado.dados), versao: guardado.versao, ...listar() };
}
