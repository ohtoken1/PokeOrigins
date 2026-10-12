// Números do quadro de missões que o SERVIDOR também usa (este arquivo não importa nada). O sorteio das missões
// mora em shared/missoesQuadro.ts, que precisa dos dados das espécies (só o jogo tem).

/** De quanto em quanto tempo entram missões novas. */
export const INTERVALO_MISSOES_MS = 2 * 60 * 60 * 1000;
export const MISSOES_POR_RODADA = 2;
export const MAXIMO_NO_QUADRO = 12;
/** Quantas rodadas ficam no quadro ao mesmo tempo (12 missões = 6 rodadas de 2: cada missão fica 12 horas). */
export const RODADAS_NO_QUADRO = Math.floor(MAXIMO_NO_QUADRO / MISSOES_POR_RODADA);
/** Recompensa em gold pela qualidade pedida (pedido do dono). */
export const RECOMPENSA_MISSAO_GOLD: Record<string, number> = { C: 1, B: 2, A: 3, S: 4 };
export const ATRIBUTOS_IV = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export const rodadaDe = (agora: number) => Math.floor(agora / INTERVALO_MISSOES_MS);

/**
 * O quadro é do SERVIDOR INTEIRO (decisão do dono): cada missão só pode ser concluída por UM jogador; depois disso
 * fica indisponível para todos. Quem concluiu e quando (o servidor guarda e manda para todos).
 */
export interface MissaoConcluida {
  id: string;
  /** nome de usuário de quem concluiu */
  por: string;
  quando: number;
}
