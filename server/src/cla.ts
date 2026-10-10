// Clãs: criar (custa gold, conferido no save guardado), entrar/pedir entrada, cargos (líder, vice-líder, membro),
// nível de 1 a 10 com XP somado por TODOS os membros (o jogo só mostra a porcentagem) e chat do clã (mundo.ts).
// O servidor é o juiz: cada ação confere de novo o cargo de quem pede, e o que mexe em mais de uma linha do
// banco roda como uma mudança só (banco.transacao), para nunca ficar pela metade.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisar, esquecerChatDoCla, estaOnline, limparTexto, mandarHistoricoDoCla } from './mundo.ts';
import {
  chaveDoNomeCla, DESCRICAO_CLA_MAX, lerBandeira, limparNomeCla, MISSOES_CLA, NIVEL_MAX_CLA, NOME_CLA_VALIDO, PRECO_CRIAR_CLA_GOLD,
  VAGAS_CLA, xpParaSubirCla,
} from '../../shared/cla.ts';

const MAX_PEDIDOS_POR_CONTA = 5;
/**
 * Freio do XP: o número ainda vem do jogo (as batalhas rodam no navegador), então cada membro só consegue
 * entregar até `XP_POR_MINUTO` em média, com uma reserva para batalhas grandes. Quem joga normalmente não chega
 * perto; quem tentar mandar números inventados fica preso a esse ritmo. Some quando as batalhas forem no servidor.
 */
const XP_POR_MINUTO = 100_000;
const XP_RESERVA_MAX = 500_000;
const reservas = new Map<number, { xp: number; em: number }>();

type Cargo = 'lider' | 'vice' | 'membro';
const cargoDe = (cla: banco.Cla, m: banco.MembroCla): Cargo => (m.id === cla.lider ? 'lider' : m.vice ? 'vice' : 'membro');
const progressoDe = (cla: banco.Cla) => (cla.nivel >= NIVEL_MAX_CLA ? 100 : Math.min(99.9, Math.floor((cla.xp / xpParaSubirCla(cla.nivel)) * 1000) / 10));
function bandeiraDe(cla: banco.Cla) {
  try {
    return lerBandeira(JSON.parse(cla.bandeira));
  } catch {
    return null;
  }
}

/** O que aparece nas listas e no perfil dos membros. */
export const resumo = (cla: banco.Cla, membros: number) => ({
  id: cla.id, nome: cla.nome, bandeira: bandeiraDe(cla), nivel: cla.nivel, aberto: !!cla.aberto, membros, vagas: VAGAS_CLA,
});
export function resumoDaConta(contaId: number) {
  const cla = banco.claDaConta(contaId);
  if (!cla) return null;
  const membros = banco.membrosDoCla(cla.id);
  const eu = membros.find((m) => m.id === contaId);
  return { ...resumo(cla, membros.length), cargo: eu ? cargoDe(cla, eu) : 'membro' };
}

function detalhe(cla: banco.Cla, conta: banco.Conta) {
  const membros = banco.membrosDoCla(cla.id);
  const eu = membros.find((m) => m.id === conta.id);
  const meuCargo = eu ? cargoDe(cla, eu) : null;
  const total = membros.reduce((s, m) => s + m.xp_dado, 0);
  const ordem: Record<Cargo, number> = { lider: 0, vice: 1, membro: 2 };
  return {
    ...resumo(cla, membros.length),
    descricao: cla.descricao,
    criadoEm: cla.criado_em,
    progresso: progressoDe(cla),
    // missões do nível atual: o progresso é do clã inteiro (todos os membros somam)
    missoes: (MISSOES_CLA[cla.nivel] ?? []).map((m) => ({ ...m, feita: false })),
    meuCargo,
    membros: membros
      .map((m) => ({
        usuario: m.usuario, nome: m.nome || m.usuario, cargo: cargoDe(cla, m),
        // só os membros veem quem do clã está online
        online: !!eu && estaOnline(m.id),
        // parte do XP do clã que veio deste membro (sem mostrar o número)
        parte: total ? Math.round((m.xp_dado / total) * 100) : 0,
      }))
      .sort((a, b) => ordem[a.cargo] - ordem[b.cargo]),
    // pedidos de entrada: só para quem pode responder
    pedidos: meuCargo === 'lider' || meuCargo === 'vice' ? banco.pedidosDoCla(cla.id).map((p) => ({ usuario: p.usuario, nome: p.nome || p.usuario })) : [],
  };
}

/** Avisa o jogo de todos os membros (e de mais alguém, se preciso) para buscar o clã de novo. */
function atualizar(claId: number, ...outros: number[]): void {
  for (const id of new Set([...banco.membrosDoCla(claId).map((m) => m.id), ...outros])) avisar(id, { t: 'cla' });
}

/**
 * Clã cujo líder não é mais membro (a conta foi apagada, por exemplo): o vice-líder mais antigo assume, senão
 * o membro mais antigo; sem ninguém, o clã acaba. Roda ao ligar o servidor e de tempos em tempos.
 */
export function consertar(): void {
  for (const cla of banco.clasSemLider()) {
    const membros = banco.membrosDoCla(cla.id);
    if (!membros.length) {
      banco.apagarCla(cla.id);
      esquecerChatDoCla(cla.id);
      continue;
    }
    const novo = membros.find((m) => m.vice) ?? membros[0];
    banco.transacao(() => {
      banco.mudarLiderDoCla(cla.id, novo.id);
      banco.mudarViceDoCla(novo.id, false);
    });
    atualizar(cla.id);
  }
  // reservas de XP paradas há muito tempo já estariam cheias: não precisam ficar guardadas
  const agora = Date.now();
  for (const [id, r] of reservas) if (agora - r.em > 10 * 60 * 1000) reservas.delete(id);
}

export function meu(conta: banco.Conta) {
  const cla = banco.claDaConta(conta.id);
  return { cla: cla ? detalhe(cla, conta) : null, pedidos: cla ? [] : banco.pedidosDeClaDaConta(conta.id) };
}

export const listar = (busca: string) => banco.listarClas(chaveDoNomeCla(busca)).filter((c) => c.membros > 0).map((c) => resumo(c, c.membros));

export function ver(conta: banco.Conta, id: number) {
  const cla = banco.claPorId(id);
  if (!cla) throw new ErroConta('Clã não encontrado.', 404);
  return detalhe(cla, conta);
}

const lerDescricao = (d: unknown) => limparTexto(d).slice(0, DESCRICAO_CLA_MAX);

export function criar(conta: banco.Conta, dados: Record<string, unknown>) {
  if (banco.claDaConta(conta.id)) throw new ErroConta('Você já está em um clã.');
  const nome = typeof dados.nome === 'string' ? limparNomeCla(dados.nome) : '';
  if (!NOME_CLA_VALIDO.test(nome)) throw new ErroConta('Nome do clã: de 3 a 16 letras ou números.');
  const bandeira = lerBandeira(dados.bandeira);
  if (!bandeira) throw new ErroConta('Bandeira inválida.');
  const chave = chaveDoNomeCla(nome);
  if (banco.claPorChave(chave)) throw new ErroConta('Já existe um clã com este nome.', 409);
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada antes de criar um clã.');
  // cobra o gold no save guardado (o jogo salva antes de pedir) e cria o clã na mesma mudança:
  // ou as duas coisas acontecem, ou nenhuma
  banco.mudarSaves([conta.id], ([save]) => {
    const gold = typeof save.gold === 'number' && Number.isFinite(save.gold) ? save.gold : 0;
    if (gold < PRECO_CRIAR_CLA_GOLD) throw new ErroConta(`Criar um clã custa ${PRECO_CRIAR_CLA_GOLD} gold.`);
    save.gold = gold - PRECO_CRIAR_CLA_GOLD;
    banco.criarCla(nome, chave, JSON.stringify(bandeira), lerDescricao(dados.descricao), dados.aberto !== false, conta.id);
  });
  mandarHistoricoDoCla(conta.id);
  return meu(conta);
}

/** Clã aberto: entra na hora. Fechado: fica um pedido para o líder ou vice-líder aceitar. */
export function entrar(conta: banco.Conta, id: number) {
  if (banco.claDaConta(conta.id)) throw new ErroConta('Você já está em um clã.');
  const cla = banco.claPorId(id);
  if (!cla) throw new ErroConta('Clã não encontrado.', 404);
  if (banco.membrosDoCla(id).length >= VAGAS_CLA) throw new ErroConta('Este clã está cheio.');
  if (cla.aberto) {
    banco.transacao(() => banco.entrarNoCla(conta.id, id));
    mandarHistoricoDoCla(conta.id);
  } else {
    const meus = banco.pedidosDeClaDaConta(conta.id);
    if (!meus.includes(id) && meus.length >= MAX_PEDIDOS_POR_CONTA) throw new ErroConta('Você já tem pedidos demais esperando resposta.');
    banco.pedirEntradaNoCla(id, conta.id);
  }
  atualizar(id);
  return meu(conta);
}

export function cancelarPedido(conta: banco.Conta, id: number) {
  banco.tirarPedidoDoCla(id, conta.id);
  atualizar(id);
  return meu(conta);
}

/** O clã da conta, exigindo o cargo (líder, ou líder/vice). */
function meuClaComo(conta: banco.Conta, ...cargos: Cargo[]) {
  const cla = banco.claDaConta(conta.id);
  if (!cla) throw new ErroConta('Você não está em um clã.');
  const membros = banco.membrosDoCla(cla.id);
  const eu = membros.find((m) => m.id === conta.id);
  const cargo = eu ? cargoDe(cla, eu) : 'membro';
  if (!cargos.includes(cargo)) throw new ErroConta(cargos.length > 1 ? 'Só o líder ou o vice-líder pode fazer isso.' : 'Só o líder pode fazer isso.', 403);
  return { cla, membros, cargo };
}
function membroAlvo(cla: banco.Cla, membros: banco.MembroCla[], conta: banco.Conta, usuario: string) {
  const alvo = membros.find((m) => m.usuario.toLowerCase() === usuario.toLowerCase());
  if (!alvo) throw new ErroConta('Este jogador não está no clã.', 404);
  if (alvo.id === conta.id) throw new ErroConta('Este é você.');
  return { alvo, cargo: cargoDe(cla, alvo) };
}

export function responderPedido(conta: banco.Conta, usuario: string, aceitar: boolean) {
  const { cla, membros } = meuClaComo(conta, 'lider', 'vice');
  const pedido = banco.pedidosDoCla(cla.id).find((p) => p.usuario.toLowerCase() === usuario.toLowerCase());
  if (!pedido) throw new ErroConta('Este pedido não existe mais.', 404);
  if (aceitar) {
    if (membros.length >= VAGAS_CLA) throw new ErroConta('O clã está cheio.');
    if (banco.claDaConta(pedido.id)) {
      banco.tirarPedidoDoCla(cla.id, pedido.id);
      throw new ErroConta('Este jogador já entrou em outro clã.', 409);
    }
    banco.transacao(() => banco.entrarNoCla(pedido.id, cla.id));
    mandarHistoricoDoCla(pedido.id);
  } else banco.tirarPedidoDoCla(cla.id, pedido.id);
  atualizar(cla.id, pedido.id);
  return meu(conta);
}

/** Líder expulsa qualquer um; vice-líder só membros comuns. */
export function expulsar(conta: banco.Conta, usuario: string) {
  const { cla, membros, cargo } = meuClaComo(conta, 'lider', 'vice');
  const { alvo, cargo: cargoAlvo } = membroAlvo(cla, membros, conta, usuario);
  if (cargo === 'vice' && cargoAlvo !== 'membro') throw new ErroConta('O vice-líder só pode expulsar membros comuns.', 403);
  banco.sairDoCla(alvo.id);
  reservas.delete(alvo.id);
  mandarHistoricoDoCla(alvo.id);
  atualizar(cla.id, alvo.id);
  return meu(conta);
}

/** Líder muda o cargo de um membro: 'vice', 'membro' ou 'lider' (passa a liderança e vira vice-líder). */
export function mudarCargo(conta: banco.Conta, usuario: string, cargo: unknown) {
  const { cla, membros } = meuClaComo(conta, 'lider');
  const { alvo } = membroAlvo(cla, membros, conta, usuario);
  if (cargo === 'lider') {
    banco.transacao(() => {
      banco.mudarLiderDoCla(cla.id, alvo.id);
      banco.mudarViceDoCla(alvo.id, false);
      banco.mudarViceDoCla(conta.id, true);
    });
  } else if (cargo === 'vice' || cargo === 'membro') banco.mudarViceDoCla(alvo.id, cargo === 'vice');
  else throw new ErroConta('Cargo inválido.');
  atualizar(cla.id);
  return meu(conta);
}

export function editar(conta: banco.Conta, dados: Record<string, unknown>) {
  const { cla } = meuClaComo(conta, 'lider');
  const bandeira = dados.bandeira === undefined ? bandeiraDe(cla) : lerBandeira(dados.bandeira);
  if (!bandeira) throw new ErroConta('Bandeira inválida.');
  const descricao = dados.descricao === undefined ? cla.descricao : lerDescricao(dados.descricao);
  const aberto = typeof dados.aberto === 'boolean' ? dados.aberto : !!cla.aberto;
  banco.editarCla(cla.id, JSON.stringify(bandeira), descricao, aberto);
  atualizar(cla.id);
  return meu(conta);
}

/** Sair: se o líder sai, a liderança vai para o vice-líder mais antigo (ou o membro mais antigo); sozinho, o clã acaba. */
export function sair(conta: banco.Conta) {
  const cla = banco.claDaConta(conta.id);
  if (!cla) throw new ErroConta('Você não está em um clã.');
  const outros = banco.membrosDoCla(cla.id).filter((m) => m.id !== conta.id);
  const pedidos = banco.pedidosDoCla(cla.id).map((p) => p.id);
  banco.transacao(() => {
    banco.sairDoCla(conta.id);
    if (!outros.length) banco.apagarCla(cla.id);
    else if (cla.lider === conta.id) {
      const novo = outros.find((m) => m.vice) ?? outros[0];
      banco.mudarLiderDoCla(cla.id, novo.id);
      banco.mudarViceDoCla(novo.id, false);
    }
  });
  if (!outros.length) esquecerChatDoCla(cla.id);
  reservas.delete(conta.id);
  mandarHistoricoDoCla(conta.id);
  for (const id of [...outros.map((m) => m.id), ...pedidos]) avisar(id, { t: 'cla' });
  return meu(conta);
}

/** XP que os Pokémon do membro ganharam em batalha: soma no clã (todos os membros enchem a mesma barra). */
export function darXp(conta: banco.Conta, bruto: unknown) {
  const cla = banco.claDaConta(conta.id);
  if (!cla) return { nivel: 0, progresso: 0 };
  const pedido = Number.isSafeInteger(bruto) && (bruto as number) > 0 ? (bruto as number) : 0;
  // freio: só passa o que a reserva deste membro tem (enche com o tempo)
  const agora = Date.now();
  const reserva = reservas.get(conta.id) ?? { xp: XP_POR_MINUTO, em: agora };
  reserva.xp = Math.min(XP_RESERVA_MAX, reserva.xp + ((agora - reserva.em) / 60_000) * XP_POR_MINUTO);
  reserva.em = agora;
  const xp = Math.floor(Math.min(pedido, reserva.xp));
  reserva.xp -= xp;
  reservas.set(conta.id, reserva);
  if (xp <= 0) return { nivel: cla.nivel, progresso: progressoDe(cla) };

  const nivelAntes = cla.nivel;
  banco.transacao(() => {
    banco.somarXpDoMembro(conta.id, xp);
    if (cla.nivel >= NIVEL_MAX_CLA) return;
    cla.xp += xp;
    // sobe enquanto tiver XP (as missões do nível, quando existirem, também terão de estar feitas)
    while (cla.nivel < NIVEL_MAX_CLA && cla.xp >= xpParaSubirCla(cla.nivel) && !(MISSOES_CLA[cla.nivel] ?? []).length) {
      cla.xp -= xpParaSubirCla(cla.nivel);
      cla.nivel++;
    }
    if (cla.nivel >= NIVEL_MAX_CLA) cla.xp = 0;
    // com missões pendentes a barra para cheia até cumprirem
    else cla.xp = Math.min(cla.xp, xpParaSubirCla(cla.nivel));
    banco.mudarProgressoDoCla(cla.id, cla.nivel, cla.xp);
  });
  if (cla.nivel !== nivelAntes) atualizar(cla.id);
  return { nivel: cla.nivel, progresso: progressoDe(cla) };
}
