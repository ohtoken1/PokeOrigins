// Ajustes do jogo feitos pela staff sem programador (pedido do dono, 24/10/2026):
// • Biomas: mover uma linha evolutiva de bioma, tirar dos mapas ou fazer aparecer também em outra região
//   (aplicado em shared/encontros.ts pelo jogo; chaves = número da forma base da linha).
// • Ginásios: times dos líderes nas dificuldades Média e Difícil (shared/ginasiosDificuldade.ts).
// • Tiers: tier de Pokémon e Megas por cima de shared/data/tiers-do-jogo.json (vale no Torneio e no Ranqueado).
// • Prêmios dos eventos (shared/premiosEventos.ts): o servidor usa na hora de premiar.
// Tudo em eventos_estado; mudou = {t:'ajustes'} para todos (o jogo busca de novo).
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisarTodos } from './mundo.ts';
import { lerPokemon } from './entregas.ts';
import { aplicarAjustesTiers } from './motorDoJogo.ts';
import { definirAjustesPremios, type AjustesPremios } from '../../shared/premiosEventos.ts';
import { DIFICULDADES_MANUAIS, POKEMON_POR_TIME_GINASIO, type DificuldadeManual } from '../../shared/ginasiosDificuldade.ts';

interface AjustesBiomas { mover: Record<string, string>; fora: number[]; extra: Record<string, string[]> }
type TimesGinasio = Record<DificuldadeManual, Record<string, { pokemon: Record<string, unknown>[] }>>;

const BIOMAS_VALIDOS = ['grama', 'agua', 'vulcao', 'caverna', 'torre', 'pico'];
const MAX_AJUSTES = 2000;

const biomas = (): AjustesBiomas => banco.lerEvento<AjustesBiomas>('ajustes-biomas') ?? { mover: {}, fora: [], extra: {} };
const ginasios = (): TimesGinasio => ({ media: {}, dificil: {}, ...(banco.lerEvento<TimesGinasio>('ginasios-times') ?? {}) });

interface AjustesTiers { pokemon: Record<string, string>; megas: Record<string, string> }
const TIERS_VALIDAS = ['UBER', 'OU', 'UU', 'RU', 'NU', 'NFE', 'LC'];
const tiers = (): AjustesTiers => banco.lerEvento<AjustesTiers>('ajustes-tiers') ?? { pokemon: {}, megas: {} };
const premios = (): AjustesPremios => banco.lerEvento<AjustesPremios>('premios-eventos') ?? {};

/** Ao ligar o servidor: os ajustes guardados passam a valer aqui também. */
export function aplicarAoLigar(): void {
  aplicarAjustesTiers(tiers());
  definirAjustesPremios(premios());
}

const exigirStaff = (conta: banco.Conta) => {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
};
const numeroValido = (k: string) => /^\d{1,5}$/.test(k);

/** O que o jogo precisa (qualquer conta): ajustes dos biomas e os times de Médio/Difícil. */
export function ler() {
  return { biomas: biomas(), ginasios: ginasios(), tiers: tiers(), premios: premios() };
}

/** Grava a lista inteira de ajustes dos biomas (a tela manda tudo de uma vez). */
export function gravarBiomas(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const b = (dados.biomas ?? {}) as Record<string, unknown>;
  const invalido = () => new ErroConta('Ajustes de bioma inválidos.');
  const mover: Record<string, string> = {};
  for (const [k, v] of Object.entries((b.mover ?? {}) as Record<string, unknown>)) {
    if (!numeroValido(k) || typeof v !== 'string' || !BIOMAS_VALIDOS.includes(v)) throw invalido();
    mover[k] = v;
  }
  const fora = Array.isArray(b.fora) ? b.fora : [];
  if (!fora.every((n) => Number.isInteger(n) && n > 0 && n < 100000)) throw invalido();
  const extra: Record<string, string[]> = {};
  for (const [k, v] of Object.entries((b.extra ?? {}) as Record<string, unknown>)) {
    if (!numeroValido(k) || !Array.isArray(v) || !v.every((r) => typeof r === 'string' && /^[a-z]{3,12}$/.test(r))) throw invalido();
    if (v.length) extra[k] = [...new Set(v as string[])];
  }
  if (Object.keys(mover).length + fora.length + Object.keys(extra).length > MAX_AJUSTES) throw new ErroConta('Ajustes demais.');
  banco.gravarEvento('ajustes-biomas', { mover, fora: [...new Set(fora as number[])], extra });
  avisarTodos({ t: 'ajustes' });
  return ler();
}

/** Grava o time de um líder numa dificuldade (até 6 Pokémon; lista vazia = sem time, o líder fica "em breve"). */
export function gravarGinasio(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const dificuldade = dados.dificuldade as DificuldadeManual;
  if (!DIFICULDADES_MANUAIS.includes(dificuldade)) throw new ErroConta('Dificuldade inválida.');
  const lider = typeof dados.lider === 'string' && /^[a-z0-9]{1,30}$/.test(dados.lider) ? dados.lider : null;
  if (!lider) throw new ErroConta('Líder inválido.');
  const lista = Array.isArray(dados.pokemon) ? dados.pokemon : [];
  if (lista.length > POKEMON_POR_TIME_GINASIO) throw new ErroConta(`No máximo ${POKEMON_POR_TIME_GINASIO} Pokémon por time.`);
  const t = ginasios();
  if (lista.length) t[dificuldade][lider] = { pokemon: lista.map((x) => lerPokemon(x, 100, true) as unknown as Record<string, unknown>) };
  else delete t[dificuldade][lider];
  banco.gravarEvento('ginasios-times', t);
  avisarTodos({ t: 'ajustes' });
  return ler();
}

/** Muda (ou volta ao padrão, com tier vazia) a tier de um Pokémon (`numero`) ou de uma Mega (`forma`). */
export function gravarTier(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const t = tiers();
  const tier = typeof dados.tier === 'string' ? dados.tier : '';
  if (tier && !TIERS_VALIDAS.includes(tier)) throw new ErroConta('Tier inválida.');
  if (typeof dados.numero === 'number' && Number.isInteger(dados.numero) && dados.numero > 0 && dados.numero < 100000) {
    if (tier) t.pokemon[dados.numero] = tier;
    else delete t.pokemon[dados.numero];
  } else if (typeof dados.forma === 'string' && /^[A-Za-z0-9 .'%:-]{1,40}$/.test(dados.forma)) {
    if (tier) t.megas[dados.forma] = tier;
    else delete t.megas[dados.forma];
  } else throw new ErroConta('Pokémon inválido.');
  banco.gravarEvento('ajustes-tiers', t);
  aplicarAjustesTiers(t);
  avisarTodos({ t: 'ajustes' });
  return ler();
}

// ---------- prêmios dos eventos ----------
const SECOES_PREMIOS = ['ninho', 'torneio', 'bossGlobal', 'bossGuilda', 'captura', 'liga', 'login7', 'login30', 'doacao', 'loteria', 'kitPreRegistro'] as const;
type Secao = (typeof SECOES_PREMIOS)[number];
const invalido = (o: string) => new ErroConta(`Prêmios inválidos: ${o}.`);
const inteiro = (v: unknown, o: string, min = 0, max = 100_000_000) => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw invalido(o);
  return v;
};
function premio(v: unknown, o: string) {
  const p = (v ?? {}) as Record<string, unknown>;
  if (typeof p.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(p.id)) throw invalido(`${o} (item)`);
  if (typeof p.nome !== 'string' || !p.nome.trim() || p.nome.length > 60) throw invalido(`${o} (nome)`);
  return { id: p.id, nome: p.nome.trim(), quantidade: inteiro(p.quantidade, `${o} (quantidade)`, 1) };
}
const lista = (v: unknown, o: string, max = 20) => {
  if (!Array.isArray(v) || v.length > max) throw invalido(o);
  return v.map((x, i) => premio(x, `${o} ${i + 1}`));
};
const listas = (v: unknown, o: string, max: number) => {
  if (!Array.isArray(v) || !v.length || v.length > max) throw invalido(o);
  return v.map((x, i) => lista(x, `${o} ${i + 1}`));
};
function roleta(v: unknown, o: string) {
  if (!Array.isArray(v) || v.length < 2 || v.length > 20) throw invalido(`${o}: de 2 a 20 fatias`);
  const fatias = v.map((x, i) => {
    const c = (x as Record<string, unknown>)?.chance;
    if (typeof c !== 'number' || !(c > 0) || c > 1) throw invalido(`${o}: chance da fatia ${i + 1}`);
    return { ...premio(x, `${o} fatia ${i + 1}`), chance: c };
  });
  const soma = fatias.reduce((s, f) => s + f.chance, 0);
  if (Math.abs(soma - 1) > 0.0005) throw new ErroConta(`As chances da ${o} precisam somar 100% (agora: ${(soma * 100).toFixed(2)}%).`);
  return fatias;
}
const liga = (v: unknown, o: string) => {
  const l = (v ?? {}) as Record<string, unknown>;
  return { silver: inteiro(l.silver, `${o} Poké Dólares`), porVitoria: inteiro(l.porVitoria, `${o} por vitória`, 0, 1000), bonus: inteiro(l.bonus, `${o} bônus`, 0, 10000) };
};
function lerSecao(secao: Secao, v: unknown): unknown {
  const o = (v ?? {}) as Record<string, unknown>;
  switch (secao) {
    case 'ninho': {
      // a Roleta do Ninho é entregue pelo jogo: só itens, Poké Dólares, Origin Coins, Fragmentos e sorteios
      const fatias = roleta(o.roleta, 'Roleta do Ninho');
      if (fatias.some((f) => ['league-coins', 'league-coins-nightmare', 'pontos-guilda', 'vip-dias'].includes(f.id))) throw new ErroConta('Na Roleta do Ninho não dá para usar League Coins, Pontos de guilda nem Dias de VIP.');
      return { silver: inteiro(o.silver, 'Ninho'), roleta: fatias };
    }
    case 'torneio': return { lugares: listas(o.lugares, 'Torneio lugar', 3), roleta: roleta(o.roleta, 'Roleta do Torneio') };
    case 'bossGlobal': return { top: listas(o.top, 'Boss top', 3), ate10: lista(o.ate10, 'Boss 4º–10º'), participar: lista(o.participar, 'Boss participação') };
    case 'bossGuilda': {
      if (!Array.isArray(o.podio) || o.podio.length !== 3) throw invalido('Boss da guilda pódio');
      return { participar: inteiro(o.participar, 'participar', 0, 1000), podio: o.podio.map((n) => inteiro(n, 'pódio', 0, 1000)), ate10: inteiro(o.ate10, '4º–10º', 0, 1000) };
    }
    case 'captura': return lista(v, 'Evento de captura');
    case 'liga': return { normal: liga(o.normal, 'Liga'), nightmare: liga(o.nightmare, 'Nightmare') };
    case 'login7': return listas(v, 'Login dia', 7);
    case 'login30': return listas(v, 'Login dos 30 dias, dia', 30);
    case 'doacao': {
      if (!Array.isArray(v) || !v.length || v.length > 30) throw invalido('Doação');
      return v.map((m, i) => ({ gold: inteiro((m as Record<string, unknown>)?.gold, `meta ${i + 1}`, 1), premios: lista((m as Record<string, unknown>)?.premios, `meta ${i + 1}`) }))
        .sort((a, b) => a.gold - b.gold);
    }
    case 'loteria': return { poteInicial: inteiro(o.poteInicial, 'Loteria', 1) };
    case 'kitPreRegistro': {
      // o kit é aberto pela Bolsa (no jogo): itens, Poké Dólares, Origin Coins, Fragmentos e sorteios
      const itens = lista(v, 'Kit de pré-registro', 30);
      if (itens.some((f) => ['league-coins', 'league-coins-nightmare', 'pontos-guilda', 'vip-dias'].includes(f.id))) throw new ErroConta('No Kit de pré-registro não dá para usar League Coins, Pontos de guilda nem Dias de VIP.');
      return itens;
    }
  }
}

/** Grava uma seção de prêmios (`valor: null` = volta ao padrão do jogo). */
export function gravarPremios(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const secao = dados.secao as Secao;
  if (!SECOES_PREMIOS.includes(secao)) throw new ErroConta('Evento inválido.');
  const p = premios() as Record<string, unknown>;
  if (dados.valor === null) delete p[secao];
  else p[secao] = lerSecao(secao, dados.valor);
  banco.gravarEvento('premios-eventos', p);
  definirAjustesPremios(p as AjustesPremios);
  avisarTodos({ t: 'ajustes' });
  return ler();
}
