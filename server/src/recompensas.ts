// Recompensas de login e de doação acumulada (pedido do dono). Tudo decidido aqui: o jogo só pergunta
// (`GET /api/recompensas`), avisa que entrou (`POST /api/recompensas/login`) e pede para o VIP recuperar um dia
// (`POST /api/recompensas/recuperar`). Prêmios pelo Correio. Regras e prêmios em shared/recompensas.ts.
// - Login das contas novas: nos 7 primeiros dias da conta, cada dia em que entra anda uma casinha.
// - Login dos 30 dias: os 30 primeiros dias do servidor; cada dia tem o seu prêmio, quem não entra naquele dia perde
//   (VIP recupera até 3). Ninguém liga nem desliga: depois do dia 30 ele deixa de existir.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import * as correio from './correio.ts';
import { lerNome } from './entregas.ts';
import { itemAleatorio, nomeDoItem } from './motorDoJogo.ts';
import { liberado } from '../../shared/trancas.ts';
import { nivelTreinador } from '../../shared/treinador.ts';
import { avisar } from './mundo.ts';
import {
  diaBrasilia, diasEntre, DIAS_LOGIN, DIAS_LOGIN_TRINTA, INICIO_LOGIN_TRINTA, metasDoacao, premiosLogin, premiosLoginTrinta,
  RECUPERACOES_VIP, trimestreDoacao, type EstadoRecompensas, type PremioRecompensa,
} from '../../shared/recompensas.ts';

type ProgressoLogin = { dia: number; ultimo: string };
type ProgressoTrinta = { pegos: number[]; recuperacoes: number };
const DIA_MS = 24 * 60 * 60 * 1000;
const NT = '(não podem ser trocados)';

// moedas (Poké Dólares, Origin Coins) não têm como ser NT; `mint`/`charm`/`orb` = um sorteio por unidade, juntando os iguais.
// Usado por todo prêmio editável pela staff (shared/premiosEventos.ts): logins, doação, Evento de captura, Boss, Torneio.
export function anexosDePremios(premios: PremioRecompensa[], nt = false) {
  const lista: correio.Anexo[] = [];
  for (const x of premios) {
    if (x.id !== 'mint' && x.id !== 'charm' && x.id !== 'orb') {
      lista.push(correio.anexoItem(x.id, x.nome, x.quantidade, nt && x.id !== 'silver' && x.id !== 'gold'));
      continue;
    }
    const sorteados = new Map<string, number>();
    for (let i = 0; i < x.quantidade; i++) {
      const id = itemAleatorio(x.id);
      sorteados.set(id, (sorteados.get(id) ?? 0) + 1);
    }
    for (const [id, q] of sorteados) lista.push(correio.anexoItem(id, nomeDoItem(id), q, nt));
  }
  return lista;
}

/** Último dia (Brasília) da janela de 7 dias da conta. */
const fimLoginDaConta = (conta: banco.Conta) => {
  const d = new Date(Date.parse(`${diaBrasilia(conta.criada_em)}T00:00:00-03:00`) + DIA_MS * DIAS_LOGIN);
  return d.getTime();
};

/**
 * Primeiro dia do Login dos 30 dias ("2026-10-09"): a constante ou, sem ela, o dia em que a primeira conta foi criada.
 * Fica guardado (`inicio-servidor`) na primeira vez: apagar ou mexer em contas depois não muda o dia.
 */
function inicioTrinta(): string | null {
  if (INICIO_LOGIN_TRINTA) return INICIO_LOGIN_TRINTA;
  const salvo = banco.lerEvento<string>('inicio-servidor');
  if (salvo) return salvo;
  const quando = banco.primeiraContaCriadaEm();
  if (quando === null) return null;
  banco.gravarEvento('inicio-servidor', diaBrasilia(quando));
  return diaBrasilia(quando);
}
/** Que dia do Login dos 30 dias é hoje (1 a 30), ou null se ainda não começou ou já acabou. */
function diaDoTrinta(hoje = diaBrasilia()): number | null {
  const inicio = inicioTrinta();
  if (!inicio) return null;
  const n = diasEntre(inicio, hoje) + 1;
  return n >= 1 && n <= DIAS_LOGIN_TRINTA ? n : null;
}

const progressoLogin = (contaId: number) => banco.progressoRecompensa<ProgressoLogin>(contaId, 'login') ?? { dia: 0, ultimo: '' };
const progressoTrinta = (contaId: number) => banco.progressoRecompensa<ProgressoTrinta>(contaId, 'trinta') ?? { pegos: [], recuperacoes: 0 };

/** Nível de treinador pelo save guardado. */
function nivelDaConta(contaId: number): number {
  const guardado = banco.lerSave(contaId);
  const xp = guardado ? (JSON.parse(guardado.dados) as { xpTreinador?: unknown }).xpTreinador : 0;
  return nivelTreinador(typeof xp === 'number' && xp > 0 ? xp : 0);
}

function vipAgora(contaId: number): boolean {
  const guardado = banco.lerSave(contaId);
  if (!guardado) return false;
  const vipAte = (JSON.parse(guardado.dados) as { vipAte?: unknown }).vipAte;
  return typeof vipAte === 'number' && vipAte > Date.now();
}

/** O jogador entrou hoje: anda a casinha do login da conta nova e pega o prêmio do dia dos 30 dias. */
export function registrarLogin(conta: banco.Conta) {
  if (!banco.lerSave(conta.id)) return { ...estado(conta), novos: [] };
  const hoje = diaBrasilia();
  const novos: { evento: 'login' | 'trinta'; dia: number }[] = [];
  // trava de nível (shared/trancas.ts): abaixo dela a casinha não anda e o dia dos 30 é perdido
  const nivel = nivelDaConta(conta.id);
  const podeLogin = liberado('loginBoasVindas', nivel, !!conta.admin);
  const podeTrinta = liberado('loginTrinta', nivel, !!conta.admin);
  banco.transacao(() => {
    // login da conta nova
    const l = progressoLogin(conta.id);
    if (podeLogin && Date.now() < fimLoginDaConta(conta) && l.ultimo !== hoje && l.dia < premiosLogin().length) {
      const dia = l.dia + 1;
      banco.gravarProgressoRecompensa(conta.id, 'login', { dia, ultimo: hoje });
      correio.enviar(conta.id, `Login de boas-vindas: dia ${dia}`,
        `Bem-vindo ao PokeOrigins! Nos 7 primeiros dias da sua conta, cada dia em que você entra vale um prêmio. Este é o ${dia} de ${premiosLogin().length}. Os prêmios são NT ${NT}.`,
        anexosDePremios(premiosLogin()[dia - 1], true), 'eventos');
      novos.push({ evento: 'login', dia });
    }
    // login dos 30 dias
    const n = diaDoTrinta(hoje);
    const t = progressoTrinta(conta.id);
    if (podeTrinta && n !== null && !t.pegos.includes(n)) {
      banco.gravarProgressoRecompensa(conta.id, 'trinta', { ...t, pegos: [...t.pegos, n] });
      correio.enviar(conta.id, `Login dos 30 dias: dia ${n}`,
        `Obrigado por entrar hoje! Este é o prêmio do dia ${n} de ${DIAS_LOGIN_TRINTA}. Entre todos os dias: o prêmio de um dia em que você não entrar é perdido. Os prêmios são NT ${NT}.`,
        anexosDePremios(premiosLoginTrinta()[n - 1], true), 'eventos');
      novos.push({ evento: 'trinta', dia: n });
    }
  });
  return { ...estado(conta), novos };
}

/** VIP recupera o prêmio de um dia que perdeu no Login dos 30 dias (até RECUPERACOES_VIP vezes). */
export function recuperar(conta: banco.Conta, dados: Record<string, unknown>) {
  const dia = dados.dia;
  const hoje = diaDoTrinta();
  if (hoje === null) throw new ErroConta('O Login dos 30 dias não está acontecendo.', 409);
  if (typeof dia !== 'number' || !Number.isInteger(dia) || dia < 1 || dia >= hoje) throw new ErroConta('Só dá para recuperar um dia que já passou.');
  if (!vipAgora(conta.id)) throw new ErroConta('Só jogadores VIP podem recuperar prêmios perdidos.', 403);
  banco.transacao(() => {
    const t = progressoTrinta(conta.id);
    if (t.pegos.includes(dia)) throw new ErroConta('Você já pegou o prêmio desse dia.', 409);
    if (t.recuperacoes >= RECUPERACOES_VIP) throw new ErroConta(`Você já usou as ${RECUPERACOES_VIP} recuperações.`, 409);
    banco.gravarProgressoRecompensa(conta.id, 'trinta', { pegos: [...t.pegos, dia], recuperacoes: t.recuperacoes + 1 });
    correio.enviar(conta.id, `Login dos 30 dias: dia ${dia} (recuperado)`,
      `Vantagem VIP: você recuperou o prêmio do dia ${dia}. Recuperações usadas: ${t.recuperacoes + 1} de ${RECUPERACOES_VIP}. Os prêmios são NT ${NT}.`,
      anexosDePremios(premiosLoginTrinta()[dia - 1], true), 'eventos');
  });
  return estado(conta);
}

/** Como estão os logins e a doação acumulada desta conta. */
export function estado(conta: banco.Conta): EstadoRecompensas {
  const hoje = diaBrasilia();
  const l = progressoLogin(conta.id);
  const fimLogin = fimLoginDaConta(conta);
  const t = progressoTrinta(conta.id);
  const tri = trimestreDoacao();
  return {
    login: { fim: Date.now() < fimLogin ? fimLogin : null, dia: l.dia, hoje: l.ultimo === hoje },
    trinta: { inicio: inicioTrinta() ?? hoje, diaAtual: diaDoTrinta(hoje), pegos: t.pegos, recuperacoes: t.recuperacoes, vip: vipAgora(conta.id) },
    doacao: { trimestre: tri.id, fim: tri.fim, gold: banco.doadoNoPeriodo(conta.id, tri.inicio, tri.fim), metas: banco.metasPremiadas(conta.id, tri.id) },
  };
}

/**
 * Soma uma doação confirmada ao acumulado do trimestre e manda pelo Correio o prêmio de cada meta que passou.
 * Chamar SÓ quando o pagamento for confirmado (ou pela staff, em doação manual / teste). `gold` = Origin Coins.
 */
export function somarDoacao(contaId: number, gold: number, origem: string): void {
  if (!Number.isSafeInteger(gold) || gold <= 0) return;
  const t = trimestreDoacao();
  banco.transacao(() => {
    // primeira doação da conta: carta de agradecimento com a marca da conquista "Faça uma doação"
    if (banco.doadoNoPeriodo(contaId, 0, Number.MAX_SAFE_INTEGER) === 0)
      correio.enviar(contaId, 'Obrigado pela doação!', 'Obrigado por apoiar o PokeOrigins! Sua primeira doação liberou a conquista "Faça uma doação" (Minha conta → Conquistas).', [correio.anexoMarca('doou')], 'doacoes');
    banco.registrarDoacaoAcumulada(contaId, gold, origem);
    const total = banco.doadoNoPeriodo(contaId, t.inicio, t.fim);
    for (const meta of metasDoacao()) {
      if (total < meta.gold || !banco.marcarMetaPremiada(contaId, t.id, meta.gold)) continue;
      correio.enviar(contaId, `Doação acumulada: ${meta.gold.toLocaleString('pt-BR')} Origin Coins`,
        `Obrigado por apoiar o PokeOrigins! Você passou de ${meta.gold.toLocaleString('pt-BR')} Origin Coins doadas neste trimestre e ganhou este prêmio.`,
        anexosDePremios(meta.premios, false), 'doacoes');
    }
  });
  avisar(contaId, { t: 'recompensas' });
}

// ---- staff (Administração → Eventos) ----
/** Staff soma uma doação no acumulado de um jogador (doação manual ou teste). Não dá Origin Coins: isso vai pelo Correio. */
export function doacaoManual(conta: banco.Conta, dados: Record<string, unknown>) {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
  const alvo = banco.contaPorUsuario(lerNome(dados.usuario));
  if (!alvo) throw new ErroConta('Jogador não encontrado.', 404);
  const gold = dados.gold;
  if (typeof gold !== 'number' || !Number.isSafeInteger(gold) || gold < 1 || gold > 1_000_000) throw new ErroConta('Valor inválido (1 a 1.000.000 Origin Coins).');
  somarDoacao(alvo.id, gold, `staff:${conta.usuario}`);
  const t = trimestreDoacao();
  return { jogador: alvo.usuario, acumulado: banco.doadoNoPeriodo(alvo.id, t.inicio, t.fim) };
}
