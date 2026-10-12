// Safari (shared/safari.ts): o SERVIDOR conta os tickets do dia (1 grátis, +1 VIP, +1 comprado com gold), cobra o
// gold no save guardado e abre o Safari. O sorteio dos Pokémon e as batalhas ainda são do jogo, como nos mapas.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { NIVEL_MINIMO, liberado } from '../../shared/trancas.ts';
import { nivelTreinador } from '../../shared/treinador.ts';
import { PRECO_ENTRADA_SAFARI_GOLD, TIPOS_SAFARI, diaDoSafari, entradasUsadas, lerSafariAberto, proximaEntrada, ticketComprado } from '../../shared/safari.ts';

const saldo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

function resposta(contaId: number) {
  const guardado = banco.lerSave(contaId)!;
  return { save: JSON.parse(guardado.dados), versao: guardado.versao, agora: Date.now() };
}

/** Tranca de nível do Safari (shared/trancas.ts), conferida no save guardado. */
function exigirNivel(conta: banco.Conta): void {
  const guardado = banco.lerSave(conta.id);
  if (!guardado) throw new ErroConta('Comece sua jornada antes de entrar no Safari.');
  const xp = (JSON.parse(guardado.dados) as Record<string, unknown>).xpTreinador;
  if (!liberado('safari', nivelTreinador(typeof xp === 'number' && xp > 0 ? xp : 0), !!conta.admin)) throw new ErroConta(`O Safari abre no nível ${NIVEL_MINIMO.safari} de treinador.`, 403);
}

/** Compra o ticket extra de hoje (um por dia; vale só hoje). */
export function comprar(conta: banco.Conta) {
  exigirNivel(conta);
  banco.mudarSaves([conta.id], ([save]) => {
    const hoje = diaDoSafari(Date.now());
    if (ticketComprado(save.safari, hoje)) throw new ErroConta('Você já comprou o ticket extra de hoje.', 409);
    if (saldo(save.gold) < PRECO_ENTRADA_SAFARI_GOLD) throw new ErroConta('Você não tem Origin Coins suficientes para o ticket.');
    save.gold = saldo(save.gold) - PRECO_ENTRADA_SAFARI_GOLD;
    const aberto = lerSafariAberto(save.safari);
    save.safari = { dia: hoje, usadas: entradasUsadas(save.safari, hoje), comprada: true, ...(aberto ? { aberto } : {}) };
  });
  return resposta(conta.id);
}

/** Entra num Safari do tipo escolhido. Administradores entram quantas vezes quiserem (para testar), sem gastar entrada. */
export function entrar(conta: banco.Conta, dados: Record<string, unknown>) {
  const { tipo } = dados;
  if (typeof tipo !== 'string' || !TIPOS_SAFARI.includes(tipo)) throw new ErroConta('Escolha o tipo do Safari.');
  exigirNivel(conta);
  banco.mudarSaves([conta.id], ([save]) => {
    const hora = Date.now();
    const hoje = diaDoSafari(hora);
    if (lerSafariAberto(save.safari)) throw new ErroConta('Você já está num Safari. Termine ou saia dele antes de entrar em outro.', 409);
    const usadas = entradasUsadas(save.safari, hoje);
    const comprada = ticketComprado(save.safari, hoje);
    if (!conta.admin) {
      // VIP vale na hora de entrar (o prazo ainda vem do save)
      const vip = typeof save.vipAte === 'number' && save.vipAte > hora;
      const entrada = proximaEntrada(usadas, vip, comprada);
      if (!entrada) throw new ErroConta('Seus Tickets Safari de hoje acabaram.', 409);
      usadas.push(entrada);
    }
    save.safari = { dia: hoje, usadas, ...(comprada ? { comprada } : {}), aberto: { tipo, sala: 0, escolhido: false, salas: [] } };
  });
  return resposta(conta.id);
}

/**
 * Save que o jogo mandou (PUT /api/save): os tickets usados e o comprado valem os GUARDADOS (o navegador não zera a contagem),
 * e só existe Safari em andamento se o servidor abriu um (o jogo pode avançar as salas e fechar, não abrir).
 * `antes` = o save guardado (null numa jornada nova).
 */
export function proteger(save: Record<string, unknown>, antes: Record<string, unknown> | null): void {
  const guardado = antes?.safari as Record<string, unknown> | undefined;
  if (!guardado || typeof guardado !== 'object') return void delete save.safari;
  const doJogo = save.safari && typeof save.safari === 'object' ? (save.safari as Record<string, unknown>).aberto : null;
  const continua = lerSafariAberto(guardado) && doJogo && typeof doJogo === 'object';
  save.safari = { dia: guardado.dia, usadas: guardado.usadas, ...(guardado.comprada === true ? { comprada: true } : {}), ...(continua ? { aberto: doJogo } : {}) };
}
