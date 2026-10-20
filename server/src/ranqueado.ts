// PvP ranqueado (regras em shared/ranqueado.ts). O servidor cuida de tudo: fila por formato (Uber, OU, UU, RU), só
// nos horários abertos; a busca começa na divisão do jogador e abre uma para cada lado a cada 30 s; a batalha é a do
// PvP (server/src/pvp.ts, calculada aqui, com "uma mecânica só") e no fim soma/tira os pontos pela distância. A fila fica só na memória (servidor reiniciou = procura de novo).
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { atualizarElo, avisar, estaOnline } from './mundo.ts';
import { criarBatalha, emBatalha } from './pvp.ts';
import { problemasDoTimeNoTorneio } from './motorDoJogo.ts';
import {
  FORMATOS_RANQUEADO, MECANICAS_RANQUEADO, NOME_FORMATO, PONTOS_BEAST, VAGAS_MASTER,
  alcanceDaBusca, eloDe, melhorElo, janelaRanqueado, nomeDoElo, pontosDaPartida, regrasDoFormato, type FormatoRanqueado,
} from '../../shared/ranqueado.ts';

/** Posições que o ranking mostra. */
const POSICOES = 100;
/** Quem está procurando partida: conta → formato e desde quando. */
const fila = new Map<number, { formato: FormatoRanqueado; desde: number }>();

const lerFormato = (v: unknown): FormatoRanqueado => {
  if (!FORMATOS_RANQUEADO.includes(v as FormatoRanqueado)) throw new ErroConta('Formato inválido.');
  return v as FormatoRanqueado;
};
const timeGuardado = (contaId: number): Record<string, unknown>[] => {
  const s = banco.lerSave(contaId);
  const t = s ? (JSON.parse(s.dados) as { time?: unknown }).time : null;
  return Array.isArray(t) ? (t as Record<string, unknown>[]) : [];
};
const problemas = (contaId: number, formato: FormatoRanqueado) => problemasDoTimeNoTorneio(timeGuardado(contaId), regrasDoFormato(formato));

/** Elo de uma conta num formato (a Master Ball depende dos outros: os 3 primeiros com pontos de Beast). */
function eloDaConta(contaId: number, formato: FormatoRanqueado, pontos = banco.pontosRanqueado(contaId, formato)) {
  const master = pontos >= PONTOS_BEAST && banco.mastersRanqueado(formato, PONTOS_BEAST, VAGAS_MASTER).includes(contaId);
  return eloDe(pontos, master);
}

/** Os 4 elos de uma conta, com vitórias e derrotas (perfil e janela). */
export function elosDaConta(contaId: number) {
  const linhas = banco.ranqueadoDaConta(contaId);
  return Object.fromEntries(FORMATOS_RANQUEADO.map((f) => {
    const l = linhas.find((x) => x.formato === f);
    return [f, { ...eloDaConta(contaId, f, l?.pontos ?? 0), vitorias: l?.vitorias ?? 0, derrotas: l?.derrotas ?? 0 }];
  }));
}

/** Elo ao lado do nome no mapa: o melhor dos 4 (só tier já jogada). */
export const eloNoMapa = (contaId: number) => melhorElo(elosDaConta(contaId) as Parameters<typeof melhorElo>[0]);

export function estado(conta: banco.Conta) {
  const agora = Date.now();
  const naFila = Object.fromEntries(FORMATOS_RANQUEADO.map((f) => [f, [...fila.values()].filter((x) => x.formato === f).length]));
  return { agora, ...janelaRanqueado(agora), fila: fila.get(conta.id) ?? null, naFila, elos: elosDaConta(conta.id) };
}

/** Entrar na fila de um formato (um por vez). Administrador entra fora do horário (para testar). */
export function entrar(conta: banco.Conta, dados: Record<string, unknown>) {
  const formato = lerFormato(dados.formato);
  if (!janelaRanqueado(Date.now()).aberta && !conta.admin) throw new ErroConta('A fila do ranqueado está fechada agora.', 409);
  if (emBatalha(conta.id)) throw new ErroConta('Você já está numa batalha.', 409);
  const erros = problemas(conta.id, formato);
  if (erros.length) throw new ErroConta(`Seu time está fora das regras do ${NOME_FORMATO[formato]}: ${erros.join(' ')}`, 409);
  fila.set(conta.id, { formato, desde: Date.now() });
  avisar(conta.id, { t: 'ranqueado-fila', fila: fila.get(conta.id) });
  return estado(conta);
}

export function sair(conta: banco.Conta) {
  fila.delete(conta.id);
  avisar(conta.id, { t: 'ranqueado-fila', fila: null });
  return estado(conta);
}

/** Tira da fila e avisa o porquê. */
function tirar(contaId: number, texto: string): void {
  fila.delete(contaId);
  avisar(contaId, { t: 'ranqueado-fila', fila: null, texto });
}

/** `degraus`: a divisão de cada um quando a partida começou (vale para os pontos). */
function fimDaPartida(formato: FormatoRanqueado, a: number, b: number, degraus: [number, number], vencedor: number | null): void {
  if (vencedor === null) {
    for (const c of [a, b]) avisar(c, { t: 'ranqueado-resultado', formato, texto: `Ranqueado ${NOME_FORMATO[formato]}: empate. Os pontos não mudaram.` });
    return;
  }
  const [dv, dp] = vencedor === a ? degraus : [degraus[1], degraus[0]];
  const perdedor = vencedor === a ? b : a;
  const ganhou = pontosDaPartida(dv, dp).vitoria;
  const perdeu = pontosDaPartida(dp, dv).derrota;
  banco.transacao(() => {
    banco.resultadoRanqueado(vencedor, formato, ganhou, true);
    banco.resultadoRanqueado(perdedor, formato, -perdeu, false);
  });
  for (const [c, venceu] of [[vencedor, true], [perdedor, false]] as const) {
    atualizarElo(c);
    const e = eloDaConta(c, formato);
    avisar(c, {
      t: 'ranqueado-resultado', formato, venceu,
      texto: venceu
        ? `Ranqueado ${NOME_FORMATO[formato]}: vitória! +${ganhou} pontos. Agora: ${nomeDoElo(e)} (${e.pontos} pontos).`
        : `Ranqueado ${NOME_FORMATO[formato]}: derrota. −${perdeu} pontos. Agora: ${nomeDoElo(e)} (${e.pontos} pontos).`,
    });
  }
}

/** A cada 2 s: fecha a fila fora do horário, tira quem não pode jogar e junta os pares. */
function parear(): void {
  if (!fila.size) return;
  const aberta = janelaRanqueado(Date.now()).aberta;
  const lista = [...fila.entries()].sort((x, y) => x[1].desde - y[1].desde);
  for (const [contaId, f] of lista) {
    const conta = banco.contaPorId(contaId);
    if (!conta || !estaOnline(contaId)) fila.delete(contaId);
    else if (!aberta && !conta.admin) tirar(contaId, 'O horário do ranqueado acabou. A fila foi encerrada.');
    else if (problemas(contaId, f.formato).length) tirar(contaId, `Você saiu da fila: seu time ficou fora das regras do ${NOME_FORMATO[f.formato]}.`);
  }
  const usados = new Set<number>();
  const agora = Date.now();
  const restantes = lista.filter(([c]) => fila.has(c) && !emBatalha(c)).map(([c, f]) => ({ c, f, degrau: eloDaConta(c, f.formato).degrau, alcance: alcanceDaBusca(agora - f.desde) }));
  // quem espera há mais tempo escolhe primeiro; vale a busca maior dos dois (a de quem já esperou mais)
  for (let i = 0; i < restantes.length; i++) {
    const { c: a, f: fa, degrau: degrauA, alcance: alcanceA } = restantes[i];
    if (usados.has(a)) continue;
    const candidatos = restantes.slice(i + 1).filter((x) => !usados.has(x.c) && x.f.formato === fa.formato && Math.abs(x.degrau - degrauA) <= Math.max(alcanceA, x.alcance));
    // o mais perto primeiro
    candidatos.sort((x, y) => Math.abs(x.degrau - degrauA) - Math.abs(y.degrau - degrauA));
    for (const { c: b, degrau: degrauB } of candidatos) {
      const contaA = banco.contaPorId(a);
      const contaB = banco.contaPorId(b);
      if (!contaA || !contaB) continue;
      try {
        criarBatalha(contaA, contaB, {
          tipo: 'ranqueado', titulo: `Ranqueado ${NOME_FORMATO[fa.formato]}`, regras: ['Sleep Clause Mod'], mecanicas: MECANICAS_RANQUEADO,
          umaMecanica: true,
          aoFim: (v) => fimDaPartida(fa.formato, a, b, [degrauA, degrauB], v),
        });
      } catch {
        continue;
      }
      usados.add(a).add(b);
      fila.delete(a);
      fila.delete(b);
      for (const c of [a, b]) avisar(c, { t: 'ranqueado-fila', fila: null });
      break;
    }
  }
}
setInterval(parear, 2000).unref();

/** Ranking de um formato (só quem já jogou), com o elo de cada um. */
export function ranking(formato: unknown) {
  const f = lerFormato(formato);
  const masters = banco.mastersRanqueado(f, PONTOS_BEAST, VAGAS_MASTER);
  return {
    formato: f,
    lista: banco.listaRanqueado(f, POSICOES).map((l) => ({
      usuario: l.usuario, nome: typeof l.nome === 'string' && l.nome ? l.nome : l.usuario,
      vitorias: l.vitorias, derrotas: l.derrotas, ...eloDe(l.pontos, masters.includes(l.conta_id)),
    })),
  };
}

/** Elos de um jogador pelo usuário (perfil). */
export function elosDe(usuario: string) {
  const c = banco.contaPorUsuario(usuario);
  if (!c) throw new ErroConta('Jogador não encontrado.', 404);
  return { usuario: c.usuario, elos: elosDaConta(c.id) };
}
