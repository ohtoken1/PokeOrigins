// Dashboard da Administração (pedido do dono, 20/10/2026): números para acompanhar o jogo — jogadores ativos,
// capturas raras, Poké Dólares por hora, itens mais comprados, progresso. Só para administradores.
// De onde vêm:
// - tempo online: medido AQUI, a cada minuto, por quem está ligado no /ws (tabela `atividade`);
// - capturas, Poké Dólares ganhos e compras do Pokémarket: contados no save de cada jogador, dia a dia
//   (`save.estatisticas.porDia`, shared/metricas.ts) — ainda vêm do navegador, como o resto do save;
// - compras das lojas do servidor e vendas do Mercado negro: contadas aqui (`metricas_dia`).
// O resultado fica guardado por um minuto (ler todos os saves é pesado).
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { contasOnline } from './mundo.ts';
import { categoriaDaEspecie, nomeDaEspecie, nomeDoItem } from './motorDoJogo.ts';
import { diaDaMetrica, type Dashboard, type LinhaContagem, type MetricasDoDia, type NumeroPorPeriodo } from '../../shared/metricas.ts';
import { nivelTreinador } from '../../shared/treinador.ts';
import { PRODUTOS_LIGA, PRODUTOS_PREMIUM } from '../../shared/lojasEspeciais.ts';
import { TITULOS_EXTRAS } from '../../shared/conquistas.ts';
import { produtosDaGuilda, mesDaLoja } from '../../shared/lojaGuilda.ts';
import { DOACOES_LIGADAS, PRODUTOS_DINHEIRO_REAL } from '../../shared/doacao.ts';
import { COMO_CONHECEU } from '../../shared/comoConheceu.ts';

const MINUTO = 60_000;
const DIA = 86_400_000;

/** A cada minuto: soma 1 minuto para cada conta online e anota o pico do dia. */
export function contarMinuto(agora = Date.now()): void {
  const dia = diaDaMetrica(agora);
  // contas ADM não contam (nem no tempo online nem no pico)
  const admins = banco.idsAdmin();
  const online = contasOnline().filter((id) => !admins.has(id));
  // nunca deixa um erro daqui derrubar o servidor (roda num intervalo, fora de qualquer pedido)
  try {
    banco.transacao(() => {
      for (const id of online) banco.somarAtividade(id, dia, MINUTO);
      banco.registrarPicoOnline(dia, online.length);
    });
  } catch (e) {
    console.error('Dashboard: falha ao contar o minuto online', e);
  }
}

/**
 * Compra com dinheiro real CONFIRMADA pelo serviço de pagamento (chamar junto com o crédito, quando o pagamento for
 * ligado; nunca pelo navegador). `produto` = id de PRODUTOS_DINHEIRO_REAL (shared/doacao.ts).
 */
export const registrarCompraReal = (contaId: number, produto: string, centavos: number) => banco.gravarCompraReal(contaId, produto, centavos);

/**
 * Conta algo que aconteceu no servidor (compra numa loja do servidor, venda no Mercado negro…). `conta` = quem fez:
 * conta ADM não entra no Dashboard (pedido do dono: os testes da equipe sujavam os números).
 */
export const contar = (chave: string, valor = 1, conta?: { admin: number | boolean }) => {
  if (conta?.admin) return;
  banco.somarMetricaDoServidor(diaDaMetrica(Date.now()), chave, valor);
};

const NOME_LOJA: Record<string, string> = {
  pokemarket: 'Pokémarket', dia: 'Loja do dia', premium: 'Premium', liga: 'Loja da Liga', nightmare: 'Loja Nightmare', guilda: 'Loja da guilda',
};

/** Nome do que foi comprado: item do jogo, produto das lojas especiais, título ou o inicial da Loja da guilda. */
function nomeDaCompra(id: string): string {
  if (id.startsWith('inicial-')) return `${nomeDaEspecie(Number(id.slice('inicial-'.length)))} (inicial do mês)`;
  const especial = [...PRODUTOS_PREMIUM, ...PRODUTOS_LIGA, ...produtosDaGuilda(mesDaLoja(Date.now()))].find((p) => p.id === id && p.nome) as { nome?: string } | undefined;
  return especial?.nome ?? TITULOS_EXTRAS.find((t) => t.id === id)?.nome ?? nomeDoItem(id);
}

let guardado: Dashboard | null = null;

/** Respostas do "Por onde conheceu o jogo?", com os 3 detalhes mais escritos de cada uma. */
function comoConheceram(): LinhaContagem[] {
  const porTipo = new Map<string, { valor: number; detalhes: string[] }>();
  for (const l of banco.contagemComoConheceu()) {
    const t = porTipo.get(l.tipo) ?? { valor: 0, detalhes: [] };
    t.valor += l.n;
    if (l.detalhe && t.detalhes.length < 3) t.detalhes.push(`${l.detalhe} (${l.n})`);
    porTipo.set(l.tipo, t);
  }
  return [...porTipo.entries()].sort((a, b) => b[1].valor - a[1].valor).map(([tipo, t]) => ({
    nome: COMO_CONHECEU.find((o) => o.id === tipo)?.nome ?? tipo, valor: t.valor, extra: t.detalhes.length ? t.detalhes.join(', ') : undefined,
  }));
}

export function painel(conta: banco.Conta): Dashboard {
  if (!conta.admin) throw new ErroConta('Só a administração pode ver isso.', 403);
  const agora = Date.now();
  if (guardado && agora - guardado.geradoEm < MINUTO) return guardado;
  guardado = montar(agora);
  return guardado;
}

function montar(agora: number): Dashboard {
  const dia = (atras: number) => diaDaMetrica(agora - atras * DIA);
  const hoje = dia(0);
  const inicioSemana = dia(6);
  const inicioMes = dia(29);
  const periodo = (d: string): (keyof NumeroPorPeriodo)[] => (d === hoje ? ['hoje', 'semana', 'mes'] : d >= inicioSemana ? ['semana', 'mes'] : d >= inicioMes ? ['mes'] : []);
  const zero = (): NumeroPorPeriodo => ({ hoje: 0, semana: 0, mes: 0 });

  // contas ADM ficam fora de todos os números (pedido do dono)
  const admins = banco.idsAdmin();

  // ---- tempo online
  const atividade = banco.atividadeDesde(inicioMes).filter((a) => !admins.has(a.conta_id));
  const msPorConta = { hoje: new Map<number, number>(), semana: new Map<number, number>(), mes: new Map<number, number>() };
  const porDia = new Map<string, { contas: Set<number>; ms: number }>();
  for (const a of atividade) {
    for (const p of periodo(a.dia)) msPorConta[p].set(a.conta_id, (msPorConta[p].get(a.conta_id) ?? 0) + a.ms);
    const d = porDia.get(a.dia) ?? { contas: new Set(), ms: 0 };
    d.contas.add(a.conta_id);
    d.ms += a.ms;
    porDia.set(a.dia, d);
  }
  const soma = (m: Map<number, number>) => [...m.values()].reduce((s, v) => s + v, 0);

  // ---- saves
  const contas = banco.contasParaDashboard().filter((c) => !admins.has(c.id));
  const capturas = { capturas: zero(), shiny: zero(), inicial: zero(), lendario: zero(), mitico: zero(), ultra: zero() };
  const existentes = { pokemon: 0, shiny: 0, inicial: 0, lendario: 0, mitico: 0, ultra: 0 };
  const silverGanho = zero();
  const silverSemanaPorConta = new Map<number, { nome: string; silver: number }>();
  const compras = { semana: new Map<string, number>(), mes: new Map<string, number>() };
  const silvers: number[] = [];
  let goldTotal = 0;
  const niveis = new Map<string, number>();
  const regioes = new Map<string, number>();
  const usados = new Map<number, number>();
  let insignias = 0;
  let vip = 0;
  let comSave = 0;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  for (const c of contas) {
    if (!c.dados) continue;
    let s: Record<string, unknown>;
    try {
      s = JSON.parse(c.dados);
    } catch {
      continue;
    }
    comSave++;
    silvers.push(num(s.silver));
    goldTotal += num(s.gold);
    if (num(s.vipAte) > agora) vip++;
    insignias += Array.isArray(s.insignias) ? s.insignias.length : 0;
    const nivel = nivelTreinador(num(s.xpTreinador));
    const faixa = nivel >= 21 ? '21–25' : `${Math.floor((nivel - 1) / 5) * 5 + 1}–${Math.floor((nivel - 1) / 5) * 5 + 5}`;
    niveis.set(faixa, (niveis.get(faixa) ?? 0) + 1);
    if (typeof s.regiao === 'string') regioes.set(s.regiao, (regioes.get(s.regiao) ?? 0) + 1);
    const time = Array.isArray(s.time) ? (s.time as Record<string, unknown>[]) : [];
    const caixa = Array.isArray(s.caixa) ? (s.caixa as Record<string, unknown>[]) : [];
    for (const p of time) if (!p.ovo) usados.set(num(p.especieId), (usados.get(num(p.especieId)) ?? 0) + 1);
    for (const p of [...time, ...caixa]) {
      if (p.ovo) continue;
      existentes.pokemon++;
      if (p.shiny) existentes.shiny++;
      const cat = categoriaDaEspecie(num(p.especieId));
      if (cat) existentes[cat]++;
    }
    // métricas dia a dia do save
    const est = (s.estatisticas ?? {}) as { porDia?: Record<string, MetricasDoDia> };
    for (const [d, m] of Object.entries(est.porDia ?? {})) {
      const ps = periodo(d);
      if (!ps.length || !m || typeof m !== 'object') continue;
      for (const p of ps) {
        for (const k of Object.keys(capturas) as (keyof typeof capturas)[]) capturas[k][p] += num(m[k]);
        silverGanho[p] += num(m.silver);
      }
      if (ps.includes('semana')) {
        const linha = silverSemanaPorConta.get(c.id) ?? { nome: c.usuario, silver: 0 };
        linha.silver += num(m.silver);
        silverSemanaPorConta.set(c.id, linha);
      }
      for (const [item, q] of Object.entries(m.compras ?? {})) {
        for (const p of ps) if (p !== 'hoje') compras[p].set(`pokemarket:${item}`, (compras[p].get(`pokemarket:${item}`) ?? 0) + num(q));
      }
    }
  }

  // ---- contadores do servidor (lojas do servidor, Mercado negro, banco)
  const servidor = new Map<string, number>();
  for (const m of banco.metricasDoServidorDesde(inicioMes)) {
    const ps = periodo(m.dia);
    if (m.chave.startsWith('compra:')) {
      const chave = m.chave.slice('compra:'.length);
      for (const p of ps) if (p !== 'hoje') compras[p].set(chave, (compras[p].get(chave) ?? 0) + m.valor);
    } else if (ps.includes('semana')) servidor.set(m.chave, (servidor.get(m.chave) ?? 0) + m.valor);
  }
  const topCompras = (m: Map<string, number>): LinhaContagem[] => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([chave, valor]) => {
    const [loja, ...resto] = chave.split(':');
    const item = resto.join(':');
    return { nome: nomeDaCompra(item), valor, extra: NOME_LOJA[loja] ?? loja };
  });

  // ---- retorno: só contas criadas depois que a contagem de atividade começou (antes não há registro)
  const diasAtivos = new Map(banco.diasAtivosPorConta().filter((l) => !admins.has(l.conta_id)).map((l) => [l.conta_id, l.dias.split(',')]));
  const primeiroRegistro = [...diasAtivos.values()].flat().sort()[0];
  const retorno = (dias: number): number | null => {
    if (!primeiroRegistro) return null;
    const elegiveis = contas.filter((c) => diaDaMetrica(c.criada_em) >= primeiroRegistro && agora - c.criada_em >= dias * DIA);
    if (!elegiveis.length) return null;
    const voltaram = elegiveis.filter((c) => {
      const alvo = diaDaMetrica(c.criada_em + dias * DIA);
      return (diasAtivos.get(c.id) ?? []).some((d) => d >= alvo);
    }).length;
    return Math.round((voltaram / elegiveis.length) * 1000) / 10;
  };

  const horas = (ms: number) => ms / 3_600_000;
  const porHora = (silver: number, ms: number) => (ms >= 30 * MINUTO ? Math.round(silver / horas(ms)) : null);
  silvers.sort((a, b) => a - b);
  const silverTotal = silvers.reduce((s, v) => s + v, 0);
  const ordenar = (m: Map<string, number>, nome = (k: string) => k): LinhaContagem[] => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, valor]) => ({ nome: nome(k), valor }));
  const ordemNivel = ['1–5', '6–10', '11–15', '16–20', '21–25'];

  return {
    geradoEm: agora,
    jogadores: {
      contas: contas.length,
      comSave,
      novasHoje: contas.filter((c) => diaDaMetrica(c.criada_em) === hoje).length,
      novasSemana: contas.filter((c) => diaDaMetrica(c.criada_em) >= inicioSemana).length,
      onlineAgora: contasOnline().filter((id) => !admins.has(id)).length,
      picoHoje: banco.picoOnline(hoje),
      ativosHoje: msPorConta.hoje.size,
      ativosSemana: msPorConta.semana.size,
      ativosMes: msPorConta.mes.size,
      minutosPorAtivoHoje: msPorConta.hoje.size ? Math.round(soma(msPorConta.hoje) / msPorConta.hoje.size / MINUTO) : 0,
      retornoD1: retorno(1),
      retornoD7: retorno(7),
      comoConheceram: comoConheceram(),
      ativosPorDia: Array.from({ length: 14 }, (_, i) => dia(13 - i)).map((d) => ({ dia: d, ativos: porDia.get(d)?.contas.size ?? 0, horas: Math.round(horas(porDia.get(d)?.ms ?? 0) * 10) / 10 })),
    },
    capturas: { total: capturas, existentes },
    economia: {
      silverTotal,
      silverMedio: comSave ? Math.round(silverTotal / comSave) : 0,
      silverMediano: silvers.length ? silvers[Math.floor(silvers.length / 2)] : 0,
      goldTotal,
      goldMedio: comSave ? Math.round(goldTotal / comSave) : 0,
      cofre: banco.lerCofre() ?? { silver: 0, gold: 0 },
      silverGanho,
      silverPorHoraHoje: porHora(silverGanho.hoje, soma(msPorConta.hoje)),
      silverPorHoraSemana: porHora(silverGanho.semana, soma(msPorConta.semana)),
      maioresPorHora: [...silverSemanaPorConta.entries()]
        .map(([id, l]) => ({ nome: l.nome, ms: msPorConta.semana.get(id) ?? 0, silver: l.silver }))
        .filter((l) => l.ms >= 60 * MINUTO)
        .map((l) => ({ nome: l.nome, valor: Math.round(l.silver / horas(l.ms)), extra: `${Math.round(horas(l.ms) * 10) / 10} h online` }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10),
    },
    compras: { semana: topCompras(compras.semana), mes: topCompras(compras.mes) },
    progresso: {
      niveis: ordemNivel.map((n) => ({ nome: `Nível ${n}`, valor: niveis.get(n) ?? 0 })),
      regioes: ordenar(regioes, (r) => r.charAt(0).toUpperCase() + r.slice(1)),
      maisUsados: ordenar(new Map([...usados.entries()].map(([id, n]) => [String(id), n]))).slice(0, 10).map((l) => ({ ...l, nome: nomeDaEspecie(Number(l.nome)) })),
      insigniasMedia: comSave ? Math.round((insignias / comSave) * 10) / 10 : 0,
      vip,
    },
    dinheiroReal: (() => {
      const resumo = new Map(banco.resumoComprasReais(agora - 7 * DIA, agora - 30 * DIA).map((l) => [l.produto, l]));
      const produtos = PRODUTOS_DINHEIRO_REAL.map((p) => {
        const l = resumo.get(p.id);
        return { ...p, semana: l?.semana ?? 0, mes: l?.mes ?? 0, total: l?.total ?? 0, centavos: l?.centavos ?? 0 };
      });
      // compras de produtos que saíram da lista continuam aparecendo
      for (const [id, l] of resumo) if (!produtos.some((p) => p.id === id)) produtos.push({ id, nome: id, grupo: 'Outros', reais: 0, semana: l.semana, mes: l.mes, total: l.total, centavos: l.centavos });
      return { ligado: DOACOES_LIGADAS, compradores: banco.compradoresReais(), produtos };
    })(),
    sistemas: [
      { nome: 'Guildas', valor: banco.contarLinhas('clas') },
      { nome: 'Jogadores em guildas', valor: banco.contarLinhas('cla_membros', 'WHERE conta_id NOT IN (SELECT id FROM contas WHERE admin = 1)') },
      { nome: 'Amizades', valor: banco.contarLinhas('amizades', 'WHERE aceita = 1') },
      { nome: 'Anúncios no Mercado negro agora', valor: banco.contarLinhas('mercado', "WHERE status = 'ativo' AND vendedor NOT IN (SELECT id FROM contas WHERE admin = 1)") },
      { nome: 'Vendas no Mercado negro (7 dias)', valor: servidor.get('mercado-vendas') ?? 0 },
      { nome: 'Taxa do Mercado negro que saiu do jogo (7 dias)', valor: servidor.get('mercado-taxa') ?? 0, extra: 'Poké Dólares + Origin Coins' },
      { nome: 'Trocas no Banco (7 dias)', valor: servidor.get('cambio-trocas') ?? 0 },
      { nome: 'Jogadores no PvP Ranqueado', valor: banco.contarLinhas('ranqueado', 'WHERE vitorias + derrotas > 0 AND conta_id NOT IN (SELECT id FROM contas WHERE admin = 1)') },
    ],
  };
}
