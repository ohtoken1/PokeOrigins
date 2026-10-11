// Conquistas no jogo: confere o progresso de cada uma pelo save, marca as concluídas, entrega a recompensa na
// hora e mostra o aviso. A lista e as recompensas ficam em shared/conquistas.ts.
import { CONQUISTAS, CONQUISTAS_CONTADAS, textoRecompensa, type Conquista, type EstadoConquistas } from '../../shared/conquistas';
import { TIPOS_DOS_CHARMS } from '../../shared/charms';
import { ehLendario } from '../../shared/encontros';
import { ehParadoxo, formaRegional } from '../../shared/formasRegionais';
import { LIDERES, lideresDaRegiao } from '../../shared/ginasios';
import { REGIOES } from '../../shared/regioes';
import { tierIv } from '../../shared/tierIv';
import { nivelTreinador } from '../../shared/treinador';
import { TREINADORES_NPC } from '../../shared/treinadoresNpc';
import { especie } from '../../shared/batalha/pokemon';
import type { PokemonBase } from '../../shared/tipos';
import { pokemonPorId, todosOsPokemons } from './dados';
import { aoSalvar, carregarSave, salvar, type PokemonDoJogador, type Save } from './estado';
import { el } from './ui/dom';

/** Coisas feitas uma vez que o save não mostra sozinho. */
export type MarcaConquista =
  | 'charm' | 'cuboPassado' | 'cuboFuturo' | 'ticketEpico' | 'ticketLendario' | 'ticketMitico' | 'ovoLendario'
  | 'lendarioEscapou' | 'lendarioUltraball' | 'mega' | 'tera' | 'dynamax' | 'guildaEntrou' | 'guildaCriou' | 'guildaMax';

const estadoDe = (save: Save): EstadoConquistas => {
  const e = (save.conquistas ??= { feitas: {}, marcas: {} });
  e.feitas ??= {};
  e.marcas ??= {};
  return e;
};

/** Anota que algo aconteceu (quem chama salva o save em seguida; a conferência roda a cada salvar). */
export function marcarConquista(save: Save, marca: MarcaConquista): void {
  const marcas = estadoDe(save).marcas;
  marcas[marca] = (marcas[marca] ?? 0) + 1;
}
/**
 * Marcas que vêm de fora do save (a guilda mora no servidor): quem sabe responde aqui e a conferência anota.
 * Assim a marca não se perde quando o save é trocado pelo do servidor.
 */
let marcasVivas: () => Partial<Record<MarcaConquista, boolean>> = () => ({});
export const definirMarcasVivas = (fn: typeof marcasVivas) => void (marcasVivas = fn);
let pedirConferencia: (esperaMs: number) => void = () => {};
/** Pede uma conferência daqui a pouco (algo mudou fora do save). */
export const conferirConquistasLogo = (esperaMs = 400) => pedirConferencia(esperaMs);

// ---- listas da Pokédex por região (montadas uma vez)
let listas: { dex: Record<string, number[]>; comuns: Record<string, number[]> } | null = null;
const regiaoDo = (p: PokemonBase): string | undefined => formaRegional(p.id)?.regiao ?? REGIOES.find((r) => p.id >= r.pokedex[0] && p.id <= r.pokedex[1])?.id;
/** "Comum" para a Pokédex shiny: fora lendários, míticos, Ultra Beasts e os Pokémon do passado/futuro. */
const ehComum = (p: PokemonBase) => !ehLendario(p) && !ehParadoxo(especie(p.id).name);
function listasDaDex() {
  if (listas) return listas;
  listas = { dex: {}, comuns: {} };
  for (const p of todosOsPokemons()) {
    const regiao = regiaoDo(p);
    if (!regiao) continue;
    (listas.dex[regiao] ??= []).push(p.id);
    if (ehComum(p)) (listas.comuns[regiao] ??= []).push(p.id);
  }
  return listas;
}

export interface Progresso {
  valor: number;
  meta: number;
}
const sim = (ok: boolean): Progresso => ({ valor: ok ? 1 : 0, meta: 1 });
const contar = (ids: number[], tem: Set<number>): Progresso => ({ valor: ids.filter((id) => tem.has(id)).length, meta: Math.max(1, ids.length) });

/** Tudo o que as contas usam, lido do save uma vez por conferência. */
function contexto(save: Save) {
  const meus: PokemonDoJogador[] = [...save.time, ...save.caixa];
  const lendario = (p: PokemonDoJogador) => ehLendario(pokemonPorId(p.especieId));
  return {
    save,
    meus,
    lendario,
    capturados: new Set(save.capturados),
    shiny: new Set(save.capturadosShiny ?? []),
    insignias: new Set(save.insignias ?? []),
    marcas: estadoDe(save).marcas,
    feitas: estadoDe(save).feitas,
    nivel: nivelTreinador(save.xpTreinador),
  };
}
type Contexto = ReturnType<typeof contexto>;

/** Só vale Pokémon capturado pelo próprio jogador (ovo, ticket e troca têm `origem`). */
const capturadoPorMim = (p: PokemonDoJogador) => !p.origem && !p.inegociavel;
const naoTrocado = (p: PokemonDoJogador) => p.origem !== 'troca';

const FIXAS: Record<string, (x: Contexto) => Progresso> = {
  'ginasios-todos': (x) => ({ valor: LIDERES.filter((l) => x.insignias.has(l.id)).length, meta: LIDERES.length }),
  'dex-todos': (x) => contar(Object.values(listasDaDex().dex).flat(), x.capturados),
  'shiny-todos': (x) => contar(Object.values(listasDaDex().comuns).flat(), x.shiny),
  'pokemon-splus': (x) => sim(x.meus.some((p) => capturadoPorMim(p) && tierIv(p) === 'S+')),
  'shiny-splus': (x) => sim(x.meus.some((p) => capturadoPorMim(p) && p.shiny && tierIv(p) === 'S+')),
  'lendario-ultraball': (x) => sim(!!x.marcas.lendarioUltraball),
  'lendario-s': (x) => sim(x.meus.some((p) => naoTrocado(p) && x.lendario(p) && ['S', 'S+'].includes(tierIv(p)))),
  'lendario-shiny': (x) => sim(x.meus.some((p) => naoTrocado(p) && x.lendario(p) && p.shiny)),
  'lendario-escapou': (x) => sim(!!x.marcas.lendarioEscapou),
  'ovo-lendario': (x) => sim(!!x.marcas.ovoLendario),
  'duelos-todos': (x) => ({ valor: TREINADORES_NPC.filter((t) => (x.save.duelosVencidos ?? []).includes(t.id)).length, meta: TREINADORES_NPC.length }),
  mega: (x) => sim(!!x.marcas.mega),
  dynamax: (x) => sim(!!x.marcas.dynamax),
  tera: (x) => sim(!!x.marcas.tera),
  'nivel-100': (x) => sim(x.meus.some((p) => p.nivel >= 100)),
  'time-100': (x) => ({ valor: Math.min(6, x.meus.filter((p) => p.nivel >= 100).length), meta: 6 }),
  'treinador-5': (x) => ({ valor: Math.min(5, x.nivel), meta: 5 }),
  'treinador-10': (x) => ({ valor: Math.min(10, x.nivel), meta: 10 }),
  'treinador-15': (x) => ({ valor: Math.min(15, x.nivel), meta: 15 }),
  'treinador-20': (x) => ({ valor: Math.min(20, x.nivel), meta: 20 }),
  'treinador-25': (x) => ({ valor: Math.min(25, x.nivel), meta: 25 }),
  'silver-500k': (x) => ({ valor: x.save.silver, meta: 500_000 }),
  'silver-1kk': (x) => ({ valor: x.save.silver, meta: 1_000_000 }),
  'silver-50kk': (x) => ({ valor: x.save.silver, meta: 50_000_000 }),
  'gold-500': (x) => ({ valor: x.save.gold, meta: 500 }),
  'gold-1000': (x) => ({ valor: x.save.gold, meta: 1000 }),
  'gold-10000': (x) => ({ valor: x.save.gold, meta: 10_000 }),
  charmeiro: (x) => sim(!!x.marcas.charm),
  galante: (x) => ({ valor: TIPOS_DOS_CHARMS.filter((t) => (x.save.charmsUsados ?? []).includes(t)).length, meta: TIPOS_DOS_CHARMS.length }),
  'cubo-passado': (x) => sim(!!x.marcas.cuboPassado),
  'cubo-futuro': (x) => sim(!!x.marcas.cuboFuturo),
  'ticket-epico': (x) => sim(!!x.marcas.ticketEpico),
  'ticket-lendario': (x) => sim(!!x.marcas.ticketLendario),
  'ticket-mitico': (x) => sim(!!x.marcas.ticketMitico),
  'trem-1': (x) => sim((x.save.trem?.viagens ?? 0) >= 1),
  'trem-todas': (x) => ({ valor: REGIOES.filter((r) => (x.save.trem?.regioes ?? []).includes(r.id)).length, meta: REGIOES.length }),
  'guilda-entrar': (x) => sim(!!x.marcas.guildaEntrou),
  'guilda-criar': (x) => sim(!!x.marcas.guildaCriou),
  'guilda-max': (x) => sim(!!x.marcas.guildaMax),
};

function progressoCom(c: Conquista, x: Contexto): Progresso {
  if (c.parte !== undefined) return { valor: CONQUISTAS_CONTADAS.filter((o) => x.feitas[o.id]).length, meta: Math.ceil(CONQUISTAS_CONTADAS.length * c.parte) };
  if (c.regiao && c.grupo === 'ginasios') {
    const lideres = lideresDaRegiao(c.regiao);
    return { valor: lideres.filter((l) => x.insignias.has(l.id)).length, meta: Math.max(1, lideres.length) };
  }
  if (c.regiao && c.grupo === 'pokedex') return contar(listasDaDex().dex[c.regiao] ?? [], x.capturados);
  if (c.regiao && c.grupo === 'shiny') return contar(listasDaDex().comuns[c.regiao] ?? [], x.shiny);
  return FIXAS[c.id]?.(x) ?? { valor: 0, meta: 1 };
}

/** Progresso de todas as conquistas (para a tela). */
export function progressoDasConquistas(save: Save): { conquista: Conquista; valor: number; meta: number; feita: boolean }[] {
  const x = contexto(save);
  return CONQUISTAS.map((conquista) => {
    const feita = !!x.feitas[conquista.id];
    const p = progressoCom(conquista, x);
    return { conquista, meta: p.meta, valor: feita ? p.meta : Math.min(p.meta, p.valor), feita };
  });
}

function entregar(save: Save, c: Conquista): void {
  const r = c.recompensa;
  if (r.tipo === 'item') save.itens[r.id] = (save.itens[r.id] ?? 0) + r.quantidade;
  else if (r.tipo === 'silver') save.silver += r.quantidade;
  else if (r.tipo === 'fragmentos') save.fragmentos = (save.fragmentos ?? 0) + r.quantidade;
  // bônus e títulos valem pela conquista estar concluída (não guardam nada a mais)
}

/** Confere tudo; devolve as conquistas concluídas agora (já com a recompensa entregue). */
export function conferirConquistas(save: Save): Conquista[] {
  const novas: Conquista[] = [];
  // as de "X% das conquistas" podem fechar por causa das outras: repete até não fechar mais nada
  for (let volta = 0; volta < 5; volta++) {
    const x = contexto(save);
    const agora = CONQUISTAS.filter((c) => {
      if (x.feitas[c.id]) return false;
      const p = progressoCom(c, x);
      return p.valor >= p.meta;
    });
    if (!agora.length) break;
    for (const c of agora) {
      x.feitas[c.id] = Date.now();
      entregar(save, c);
      novas.push(c);
    }
  }
  return novas;
}

// ---- aviso na tela
let caixa: HTMLElement | null = null;
const fila: Conquista[][] = [];
let mostrando = false;
function mostrarProximo(): void {
  const lote = fila.shift();
  if (!lote || !caixa) return void (mostrando = false);
  mostrando = true;
  caixa.replaceChildren(
    el('strong', {}, lote.length > 1 ? `${lote.length} conquistas concluídas!` : 'Conquista concluída!'),
    ...lote.slice(0, 3).map((c) => el('span', {}, el('b', {}, c.nome), ` · ${textoRecompensa(c.recompensa)}`)),
    lote.length > 3 ? el('small', {}, `e mais ${lote.length - 3}. Veja em Minha conta → Conquistas.`) : '',
  );
  caixa.hidden = false;
  setTimeout(() => {
    if (caixa) caixa.hidden = true;
    setTimeout(mostrarProximo, 300);
  }, 6000);
}

const aoConcluirFns: (() => void)[] = [];
/** Avisado quando alguma conquista é concluída (a tela das conquistas se redesenha). */
export const aoConcluirConquista = (fn: () => void) => {
  aoConcluirFns.push(fn);
  return () => void aoConcluirFns.splice(aoConcluirFns.indexOf(fn), 1);
};

/** Liga a conferência: uma vez agora e de novo logo depois de cada salvamento. */
export function vigiarConquistas(): void {
  caixa = el('div', { class: 'aviso-conquista', role: 'status', hidden: true });
  document.body.append(caixa);
  let relogio: ReturnType<typeof setTimeout> | undefined;
  let conferindo = false;
  const conferir = () => {
    const save = carregarSave();
    if (!save || conferindo) return;
    conferindo = true;
    try {
      const marcas = estadoDe(save).marcas;
      for (const [marca, vale] of Object.entries(marcasVivas())) if (vale && !marcas[marca]) marcas[marca] = 1;
      const novas = conferirConquistas(save);
      if (novas.length) {
        salvar(save);
        fila.push(novas);
        if (!mostrando) mostrarProximo();
        aoConcluirFns.forEach((fn) => fn());
      }
    } finally {
      conferindo = false;
    }
  };
  pedirConferencia = (esperaMs) => {
    if (conferindo) return;
    clearTimeout(relogio);
    relogio = setTimeout(conferir, esperaMs);
  };
  aoSalvar(() => pedirConferencia(400));
  conferir();
}
