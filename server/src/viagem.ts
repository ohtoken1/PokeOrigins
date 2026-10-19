// Trem entre as regiões: o SERVIDOR cobra o ticket no save guardado, marca a hora de chegada pelo relógio dele e
// só troca a região quando o tempo passou (o jogo não consegue pular a espera). Jogadores comuns só mudam de
// região por aqui: o PUT /api/save deles não aceita outra região (`protegerRegiao`).
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { REGIOES } from '../../shared/regioes.ts';
import { GOLPES_DE_VIAGEM, quemSabeGolpe, lerViagem, precoDoTicket, tempoDaViagemMs, textoDoTempo, trechosEntre } from '../../shared/viagem.ts';

const ORDEM = REGIOES.map((r) => r.id);
const saldo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const nomeDe = (id: string) => REGIOES.find((r) => r.id === id)?.nome ?? id;

function resposta(contaId: number) {
  const guardado = banco.lerSave(contaId)!;
  return { save: JSON.parse(guardado.dados), versao: guardado.versao, agora: Date.now() };
}

/** Chegou a hora: troca a região e encerra a viagem (dentro de um `mudarSaves`). Devolve se concluiu. */
function concluirSeChegou(save: Record<string, unknown>, agora: number): boolean {
  const viagem = lerViagem(save.viagem);
  if (!viagem) {
    delete save.viagem;
    return false;
  }
  if (agora < viagem.chegaEm) return false;
  if (ORDEM.includes(viagem.para)) save.regiao = viagem.para;
  delete save.viagem;
  // conquistas do trem: quantas viagens e por quais regiões passou (saída e chegada)
  const antes = save.trem && typeof save.trem === 'object' ? (save.trem as { viagens?: unknown; regioes?: unknown }) : {};
  const regioes = new Set(Array.isArray(antes.regioes) ? antes.regioes.filter((r): r is string => ORDEM.includes(r as string)) : []);
  for (const r of [viagem.de, viagem.para]) if (ORDEM.includes(r)) regioes.add(r);
  save.trem = { viagens: saldo(antes.viagens) + 1, regioes: [...regioes] };
  return true;
}

/** Hora do servidor (o jogo acerta a contagem por ela). */
export const agora = () => ({ agora: Date.now() });

export function comprar(conta: banco.Conta, dados: Record<string, unknown>) {
  const { destino, moeda } = dados;
  const golpe = GOLPES_DE_VIAGEM.find((g) => g === moeda);
  if (moeda !== 'silver' && !golpe) throw new ErroConta('O ticket do trem é pago em Poké Dólares.');
  const regiao = REGIOES.find((r) => r.id === destino);
  if (!regiao || !regiao.disponivel) throw new ErroConta('Região inválida.');
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada antes de viajar.');
  banco.mudarSaves([conta.id], ([save]) => {
    const hora = Date.now();
    concluirSeChegou(save, hora);
    const emCurso = lerViagem(save.viagem);
    if (emCurso) throw new ErroConta(`Você já está viajando para ${nomeDe(emCurso.para)}.`, 409);
    const de = typeof save.regiao === 'string' ? save.regiao : '';
    if (!ORDEM.includes(de)) throw new ErroConta('Sua região atual é inválida.');
    if (de === regiao.id) throw new ErroConta(`Você já está em ${regiao.nome}.`);
    // VIP vale na hora da compra (o prazo ainda vem do save)
    const vip = typeof save.vipAte === 'number' && save.vipAte > hora;
    const preco = precoDoTicket(trechosEntre(ORDEM, de, regiao.id), vip);
    if (golpe) {
      // Fly/Surf: de graça, mesmo tempo do trem; o Pokémon tem de estar no time do save guardado
      if (!quemSabeGolpe(save.time, golpe)) throw new ErroConta(`Nenhum Pokémon do seu time sabe ${golpe === 'fly' ? 'Fly' : 'Surf'}.`);
    } else {
      if (saldo(save.silver) < preco) throw new ErroConta('Você não tem Poké Dólares suficientes para o ticket.');
      save.silver = saldo(save.silver) - preco;
    }
    save.viagem = { de, para: regiao.id, saiuEm: hora, chegaEm: hora + tempoDaViagemMs(ORDEM, de, regiao.id, vip) };
  });
  return resposta(conta.id);
}

export function chegar(conta: banco.Conta) {
  if (!banco.lerSave(conta.id)) throw new ErroConta('Você não está viajando.', 409);
  banco.mudarSaves([conta.id], ([save]) => {
    const viagem = lerViagem(save.viagem);
    if (!viagem) throw new ErroConta('Você não está viajando.', 409);
    const hora = Date.now();
    if (!concluirSeChegou(save, hora)) throw new ErroConta(`O trem ainda não chegou: faltam ${textoDoTempo(viagem.chegaEm - hora)}.`, 409);
  });
  return resposta(conta.id);
}

/**
 * Save que o jogo mandou (PUT /api/save) de uma conta comum: a região e a viagem valem as que estão guardadas
 * (só o trem muda). `antes` = o save guardado; sem ele (jornada nova) vale a região escolhida e nenhuma viagem.
 */
export function protegerRegiao(conta: banco.Conta, save: Record<string, unknown>, antes: Record<string, unknown> | null): void {
  if (conta.admin) return;
  if (!antes) return void delete save.viagem;
  save.regiao = antes.regiao;
  if (antes.viagem) save.viagem = antes.viagem;
  else delete save.viagem;
  // as viagens feitas também são do servidor
  if (antes.trem) save.trem = antes.trem;
  else delete save.trem;
}
