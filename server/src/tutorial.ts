// Presentes do tutorial (shared/tutorialRegras.ts): quando o nível libera um conteúdo, o Professor Carvalho dá o
// necessário para o jogador experimentar. O servidor confere o nível no save guardado e entrega UMA vez por conta
// (`save.tutorialPresentes`, que o PUT /api/save não deixa o navegador mexer).
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { PRESENTES_TUTORIAL } from '../../shared/tutorialRegras.ts';
import { NIVEL_MINIMO, type ConteudoTrancado } from '../../shared/trancas.ts';
import { nivelTreinador } from '../../shared/treinador.ts';

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

export function presente(conta: banco.Conta, dados: Record<string, unknown>) {
  const id = typeof dados.id === 'string' ? dados.id : '';
  const p = PRESENTES_TUTORIAL[id];
  if (!p || !(id in NIVEL_MINIMO)) throw new ErroConta('Presente desconhecido.', 404);
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada primeiro.');
  banco.mudarSaves([conta.id], ([save]) => {
    const recebidos = Array.isArray(save.tutorialPresentes) ? (save.tutorialPresentes as string[]) : [];
    if (recebidos.includes(id)) throw new ErroConta('Você já recebeu este presente.', 409);
    if (nivelTreinador(num(save.xpTreinador)) < NIVEL_MINIMO[id as ConteudoTrancado]) throw new ErroConta('Este conteúdo ainda não foi liberado para você.', 403);
    const itens = (save.itens && typeof save.itens === 'object' ? save.itens : (save.itens = {})) as Record<string, number>;
    for (const [item, q] of Object.entries(p.itens ?? {})) itens[item] = num(itens[item]) + q;
    if (p.silver) save.silver = num(save.silver) + p.silver;
    if (p.sementes) save.sementesGratis = num(save.sementesGratis) + p.sementes;
    save.tutorialPresentes = [...recebidos, id];
  });
  const guardado = banco.lerSave(conta.id)!;
  return { save: JSON.parse(guardado.dados), versao: guardado.versao, texto: p.texto };
}

/** PUT /api/save: a lista de presentes recebidos vale a guardada (o navegador não pede o mesmo presente de novo). */
export function proteger(save: Record<string, unknown>, antes: Record<string, unknown> | null): void {
  if (!antes) return;
  if (antes.tutorialPresentes === undefined) delete save.tutorialPresentes;
  else save.tutorialPresentes = antes.tutorialPresentes;
}
