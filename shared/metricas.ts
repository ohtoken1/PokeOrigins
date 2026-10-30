// Métricas do jogo para o Dashboard da Administração (pedido do dono, 20/10/2026). Cada save guarda, dia a dia
// (Brasília), o que aconteceu: Poké Dólares ganhos em batalha, capturas por categoria e compras do Pokémarket.
// O servidor junta os saves de todos para montar o painel. Ficam só os últimos `DIAS_GUARDADOS` dias.
// Sem imports: o servidor também lê.

export const DIAS_GUARDADOS = 31;

/** Dia de Brasília, "2026-10-20". */
export const diaDaMetrica = (agora: number) => new Date(agora - 3 * 3600_000).toISOString().slice(0, 10);

/** O que se conta num dia. `compras` = id do item → quantidade (Pokémarket; as lojas do servidor contam no banco). */
export interface MetricasDoDia {
  silver?: number;
  capturas?: number;
  shiny?: number;
  inicial?: number;
  lendario?: number;
  mitico?: number;
  ultra?: number;
  vitorias?: number;
  compras?: Record<string, number>;
}
export type ChaveMetrica = Exclude<keyof MetricasDoDia, 'compras'>;

type ComEstatisticas = { estatisticas?: object };

function doDia(save: ComEstatisticas, agora: number): MetricasDoDia {
  const est = (save.estatisticas ??= {}) as { porDia?: Record<string, MetricasDoDia> };
  const porDia = (est.porDia ??= {});
  const hoje = diaDaMetrica(agora);
  if (!porDia[hoje]) {
    porDia[hoje] = {};
    // só os últimos dias
    for (const dia of Object.keys(porDia).sort().slice(0, -DIAS_GUARDADOS)) delete porDia[dia];
  }
  return porDia[hoje];
}

/** Soma `n` numa métrica de hoje (quem chama salva o save). */
export function somarMetrica(save: ComEstatisticas, chave: ChaveMetrica, n = 1, agora = Date.now()): void {
  if (!(n > 0)) return;
  const d = doDia(save, agora);
  d[chave] = (d[chave] ?? 0) + n;
}

/** Conta uma compra de hoje (id do item → quantidade). */
export function somarCompra(save: ComEstatisticas, item: string, quantidade: number, agora = Date.now()): void {
  if (!(quantidade > 0)) return;
  const c = (doDia(save, agora).compras ??= {});
  c[item] = (c[item] ?? 0) + quantidade;
}

// ---- o que o Dashboard recebe do servidor
export interface NumeroPorPeriodo { hoje: number; semana: number; mes: number }
export interface LinhaContagem { nome: string; valor: number; extra?: string }
export interface Dashboard {
  geradoEm: number;
  jogadores: {
    contas: number; comSave: number; novasHoje: number; novasSemana: number; onlineAgora: number; picoHoje: number;
    ativosHoje: number; ativosSemana: number; ativosMes: number;
    /** minutos online por jogador ativo hoje (média) */
    minutosPorAtivoHoje: number;
    /** % das contas que voltaram no dia seguinte ao cadastro / na semana seguinte (só contas com idade suficiente) */
    retornoD1: number | null; retornoD7: number | null;
    /** jogadores ativos por dia, últimos 14 dias (do mais velho ao de hoje) */
    ativosPorDia: { dia: string; ativos: number; horas: number }[];
    /** "Por onde conheceu o jogo?" do cadastro (extra = os detalhes mais escritos: site, servidor, código) */
    comoConheceram: LinhaContagem[];
  };
  capturas: {
    total: Record<'capturas' | 'shiny' | 'inicial' | 'lendario' | 'mitico' | 'ultra', NumeroPorPeriodo>;
    /** Pokémon que existem hoje nos saves (de qualquer origem: captura, ovo, Orb, troca, staff) */
    existentes: Record<'pokemon' | 'shiny' | 'inicial' | 'lendario' | 'mitico' | 'ultra', number>;
  };
  economia: {
    silverTotal: number; silverMedio: number; silverMediano: number; goldTotal: number; goldMedio: number;
    cofre: { silver: number; gold: number };
    /** Poké Dólares ganhos em batalhas */
    silverGanho: NumeroPorPeriodo;
    /** Poké Dólares por hora online (ganhos em batalha ÷ horas online), hoje e nos últimos 7 dias */
    silverPorHoraHoje: number | null; silverPorHoraSemana: number | null;
    /** os 10 jogadores que mais ganharam por hora nos últimos 7 dias (com 1 h ou mais online) */
    maioresPorHora: LinhaContagem[];
  };
  compras: { semana: LinhaContagem[]; mes: LinhaContagem[] };
  progresso: {
    niveis: LinhaContagem[];
    regioes: LinhaContagem[];
    maisUsados: LinhaContagem[];
    insigniasMedia: number;
    vip: number;
  };
  sistemas: LinhaContagem[];
  /** Compras com dinheiro real (pagamento confirmado), por produto de PRODUTOS_DINHEIRO_REAL */
  dinheiroReal: {
    ligado: boolean;
    compradores: number;
    produtos: { id: string; nome: string; grupo: string; reais: number; semana: number; mes: number; total: number; centavos: number }[];
  };
}
