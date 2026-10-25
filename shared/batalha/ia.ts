// IA dos treinadores NPC (pedido do dono, 24/10/2026), em três níveis. Regra do dono: a IA só usa o que um
// jogador também saberia — tipos, vida em %, status e mudanças de atributo visíveis, e o que APRENDEU na própria
// batalha (ex.: usou um golpe Ground, não pegou por causa do Levitate → não usa Ground de novo nesse Pokémon).
// Nunca lê IVs, EVs, Nature, Ability escondida nem golpes do jogador.
// • facil  = a de sempre: 75% o golpe que mais machuca (poder × STAB × tipo), 25% um golpe qualquer.
// • medio  = como o fácil, mas 85%, nunca usa golpe que derruba ele mesmo e lembra das imunidades que viu.
// • dificil = tudo do médio + conta de dano estimada (com os atributos que a espécie costuma ter: IV 15, sem EV),
//   finaliza quem dá para derrubar (com prioridade se for mais lento), usa golpes de status com critério
//   (aumentar atributos, curar, Toxic/Will-O-Wisp/Thunder Wave/sono, Stealth Rock, Reflect…) e troca de Pokémon
//   quando está em grande desvantagem de tipo.
// Selvagens continuam escolhendo ao acaso (motor.ts).
import { Dex } from '@pkmn/sim';

export type NivelIa = 'facil' | 'medio' | 'dificil';

/** O que a IA viu na batalha: por Pokémon do adversário (nome no log), os tipos de golpe que não pegaram nele. */
export class MemoriaIa {
  private lidas = 0;
  readonly imunes = new Map<string, Set<string>>();
  ultimaTroca = -99;

  /** Lê o log novo da batalha. `meu` = 'p1' ou 'p2' (o lado da IA). */
  atualizar(log: string[], meu: string): void {
    let golpe: { tipo: string; alvo: string } | null = null;
    for (; this.lidas < log.length; this.lidas++) {
      const partes = log[this.lidas].split('|');
      const comando = partes[1];
      if (comando === 'move') {
        const usuario = partes[2] ?? '';
        golpe = usuario.startsWith(meu) && partes[4] ? { tipo: Dex.moves.get(partes[3]).type, alvo: nomeDoIdent(partes[4]) } : null;
        continue;
      }
      if (comando === 'turn' || comando === 'upkeep') golpe = null;
      if (!golpe || !partes[2] || nomeDoIdent(partes[2]) !== golpe.alvo || partes[2].startsWith(meu)) continue;
      const linha = log[this.lidas];
      // "não afetou" (tipo ou Ability), ou uma Ability que absorve o golpe (Water Absorb, Flash Fire, Sap Sipper…)
      if (comando === '-immune' || (/\[from\] ability: /.test(linha) && /^\|-(heal|boost|immune)\|/.test(linha)) || (comando === '-start' && /ability: Flash Fire/.test(linha))) {
        const lista = this.imunes.get(golpe.alvo) ?? new Set<string>();
        lista.add(golpe.tipo);
        this.imunes.set(golpe.alvo, lista);
      }
    }
  }
  imuneA(alvo: string, tipo: string): boolean {
    return this.imunes.get(alvo)?.has(tipo) ?? false;
  }
}
const nomeDoIdent = (ident: string) => ident.split(': ').slice(1).join(': ').trim();

// ---------- tipos mínimos do simulador (o que a IA lê) ----------
interface PokemonSim {
  name: string; level: number; hp: number; maxhp: number; status: string; fainted: boolean; isActive: boolean;
  species: { name: string; baseStats: Record<string, number> }; boosts: Record<string, number>;
  getTypes(): string[]; hasType(t: string): boolean; getStat(s: string, semEstagios?: boolean, semModificar?: boolean): number;
}
interface LadoSim {
  id: string; pokemon: PokemonSim[]; active: PokemonSim[]; requestState: string;
  activeRequest: unknown; sideConditions: Record<string, unknown>;
}
interface BatalhaSim { log: string[]; turn: number; choose(lado: string, escolha: string): boolean }
type GolpeDisponivel = { id: string; i: number };

/** Golpes que derrubam (ou tiram tudo de) quem usa. */
const SE_MATA = new Set(['explosion', 'selfdestruct', 'mistyexplosion', 'memento', 'healingwish', 'lunardance', 'finalgambit', 'destinybond']);
const seMata = (id: string) => SE_MATA.has(id) || !!Dex.moves.get(id).selfdestruct;

const BOOST_LIMITE = 2;
/** Atributo do próprio Pokémon com os estágios, sem os efeitos de Ability/item (que só valem dentro de um golpe). */
const atributo = (p: PokemonSim, stat: string) => p.getStat(stat, false, true);
const ehDano = (id: string) => Dex.moves.get(id).category !== 'Status';

/** Atributo estimado do adversário: o que a espécie costuma ter no nível (IV 15, sem EV, Nature neutra). */
function estimado(p: PokemonSim, stat: string): number {
  const base = Dex.species.get(p.species.name).baseStats as Record<string, number>;
  const b = base[stat] ?? 80;
  if (stat === 'hp') return Math.floor(((2 * b + 15) * p.level) / 100) + p.level + 10;
  const valor = Math.floor(((2 * b + 15) * p.level) / 100) + 5;
  const est = p.boosts[stat] ?? 0;
  return Math.floor(valor * (est >= 0 ? (2 + est) / 2 : 2 / (2 - est)));
}

/** Dano estimado (em PV) de um golpe da IA no adversário, sem conhecer os IVs/EVs dele. */
function danoEstimado(eu: PokemonSim, alvo: PokemonSim, id: string): number {
  const g = Dex.moves.get(id);
  if (g.category === 'Status') return 0;
  if (!Dex.getImmunity(g.type, alvo.getTypes())) return 0;
  if (g.damage === 'level') return eu.level;
  if (typeof g.damage === 'number') return g.damage;
  if (g.ohko) return 0;
  const fisico = g.category === 'Physical';
  const ataque = atributo(eu, fisico ? 'atk' : 'spa');
  const defesa = Math.max(1, estimado(alvo, fisico ? 'def' : 'spd'));
  const poder = g.basePower || 60;
  let dano = Math.floor(Math.floor((Math.floor((2 * eu.level) / 5 + 2) * poder * ataque) / defesa) / 50) + 2;
  dano *= eu.hasType(g.type) ? 1.5 : 1;
  dano *= 2 ** Dex.getEffectiveness(g.type, alvo.getTypes());
  if (fisico && eu.status === 'brn') dano *= 0.5;
  if (Array.isArray(g.multihit)) dano *= 3;
  else if (typeof g.multihit === 'number') dano *= g.multihit;
  return dano * 0.925 * ((g.accuracy === true ? 100 : g.accuracy) / 100);
}

/** Pontuação de golpe de status (0 a 1) com o que se vê na batalha. */
function notaDeStatus(id: string, eu: PokemonSim, alvo: PokemonSim, meuLado: LadoSim, ladoDele: LadoSim): number {
  const g = Dex.moves.get(id);
  const vidaMinha = eu.hp / eu.maxhp;
  // cura própria
  if (g.heal || g.flags?.heal) return vidaMinha < 0.45 ? 0.9 : vidaMinha < 0.65 ? 0.4 : 0;
  // aumentar os próprios atributos (Swords Dance, Nasty Plot, Dragon Dance…)
  if (g.target === 'self' && g.boosts) {
    const stats = Object.keys(g.boosts);
    if (vidaMinha < 0.6 || stats.every((s) => (eu.boosts[s] ?? 0) >= BOOST_LIMITE)) return 0;
    return stats.some((s) => (eu.boosts[s] ?? 0) === 0) ? 0.7 : 0.45;
  }
  // status no adversário (Toxic, Will-O-Wisp, Thunder Wave, Spore…)
  if (g.status) {
    if (alvo.status || !Dex.getImmunity(g.type, alvo.getTypes())) return 0;
    if (g.flags?.powder && alvo.hasType('Grass')) return 0;
    if ((g.status === 'tox' || g.status === 'psn') && (alvo.hasType('Poison') || alvo.hasType('Steel'))) return 0;
    if (g.status === 'brn' && alvo.hasType('Fire')) return 0;
    if (g.status === 'par' && alvo.hasType('Electric')) return 0;
    if (g.status === 'slp') return 0.85;
    if (g.status === 'tox') return 0.6;
    if (g.status === 'brn') {
      const base = Dex.species.get(alvo.species.name).baseStats;
      return base.atk > base.spa ? 0.65 : 0.3;
    }
    if (g.status === 'par') return estimado(alvo, 'spe') > atributo(eu, 'spe') ? 0.55 : 0.3;
    return 0.35;
  }
  // armadilhas no campo dele (Stealth Rock, Spikes…): só uma vez, e se ele ainda tem quem trocar
  if (g.sideCondition && g.target === 'foeSide') {
    const vivos = ladoDele.pokemon.filter((p) => !p.fainted).length;
    return ladoDele.sideConditions[Dex.toID(g.sideCondition)] || vivos < 2 ? 0 : 0.6;
  }
  // barreiras no meu campo (Reflect, Light Screen, Aurora Veil)
  if (g.sideCondition && (g.target === 'allySide' || g.target === 'self')) return meuLado.sideConditions[Dex.toID(g.sideCondition)] ? 0 : 0.4;
  if (g.stallingMove) return 0.05;
  return 0.1;
}

/** Vale trocar? Devolve a posição (em `lado.pokemon`) do Pokémon para entrar, ou -1. */
function trocaBoa(lado: LadoSim, alvo: PokemonSim, eu: PokemonSim, melhorNota: number, memoria: MemoriaIa, turno: number): number {
  if (turno - memoria.ultimaTroca < 3 || eu.hp / eu.maxhp < 0.3 || melhorNota >= 0.5) return -1;
  const tiposDele = alvo.getTypes();
  const sofre = (p: PokemonSim) => Math.max(...tiposDele.map((t) => (Dex.getImmunity(t, p.getTypes()) ? 2 ** Dex.getEffectiveness(t, p.getTypes()) : 0)));
  if (sofre(eu) < 2) return -1;
  // entra quem leva no máximo dano normal dos tipos dele (e menos do que o atual)
  let melhor = -1;
  let menor = 1;
  lado.pokemon.forEach((p, i) => {
    if (p.fainted || p.isActive || p.hp / p.maxhp < 0.5) return;
    const s = sofre(p);
    if (s <= menor) [melhor, menor] = [i, s];
  });
  return melhor;
}

/**
 * Escolhe a ação do treinador NPC no lado `meu` ('p1' ou 'p2') e manda para o simulador.
 * Devolve false se não conseguiu (quem chama manda 'default').
 */
export function escolherAcaoIa(batalha: BatalhaSim, meu: LadoSim, dele: LadoSim, nivel: NivelIa, memoria: MemoriaIa, aleatorio: () => number = Math.random): boolean {
  memoria.atualizar(batalha.log, meu.id);
  const golpes: GolpeDisponivel[] = ((((meu.activeRequest as { active?: { moves: { id: string; disabled?: boolean; pp?: number }[] }[] } | null)?.active?.[0]?.moves) ?? [])
    .map((m, i) => ({ id: m.id, i, ok: !m.disabled && (m.pp === undefined || m.pp > 0) })))
    .filter((g) => g.ok);
  if (!golpes.length) return false;
  const eu = meu.active[0];
  const alvo = dele.active[0];
  const usar = (g: GolpeDisponivel) => batalha.choose(meu.id, `move ${g.i + 1}`);
  const aoAcaso = (lista: GolpeDisponivel[]) => lista[Math.floor(aleatorio() * lista.length)];
  if (!eu || !alvo) return usar(aoAcaso(golpes));
  const nomeAlvo = alvo.name;
  const aprendeuImune = (id: string) => nivel !== 'facil' && ehDano(id) && memoria.imuneA(nomeAlvo, Dex.moves.get(id).type);

  // ---- fácil e médio: o golpe que mais machuca, pelo poder ----
  if (nivel !== 'dificil') {
    const permitidos = nivel === 'medio' ? golpes.filter((g) => !seMata(g.id)) : golpes;
    const lista = permitidos.length ? permitidos : golpes;
    if (aleatorio() >= (nivel === 'medio' ? 0.85 : 0.75)) return usar(aoAcaso(lista));
    const forca = (id: string) => {
      const g = Dex.moves.get(id);
      if (aprendeuImune(id)) return 0;
      if (g.category === 'Status') return 15;
      if (!Dex.getImmunity(g.type, alvo.getTypes())) return 0;
      return (g.basePower || 50) * (eu.hasType(g.type) ? 1.5 : 1) * 2 ** Dex.getEffectiveness(g.type, alvo.getTypes());
    };
    return usar(lista.reduce((a, b) => (forca(b.id) > forca(a.id) ? b : a)));
  }

  // ---- difícil ----
  const vidaDele = (alvo.hp / alvo.maxhp) * estimado(alvo, 'hp');
  const souMaisLento = atributo(eu, 'spe') < estimado(alvo, 'spe');
  const vidaMinha = eu.hp / eu.maxhp;
  const nota = (g: GolpeDisponivel): number => {
    const m = Dex.moves.get(g.id);
    if (aprendeuImune(g.id)) return 0;
    if (seMata(g.id) && vidaMinha >= 0.25) return 0;
    if (m.category === 'Status') return notaDeStatus(g.id, eu, alvo, meu, dele);
    const dano = danoEstimado(eu, alvo, g.id);
    if (dano <= 0) return 0;
    // derruba: prefere quem age primeiro (prioridade quando é mais lento) e o mais certeiro
    if (dano * 0.85 >= vidaDele) return 2 + (souMaisLento && m.priority > 0 ? 1 : 0) + (m.accuracy === true ? 0.1 : m.accuracy / 1000);
    return Math.min(1, dano / Math.max(1, vidaDele)) * 0.95;
  };
  const notas = golpes.map((g) => ({ g, n: nota(g) }));
  const melhor = notas.reduce((a, b) => (b.n > a.n ? b : a));
  // trocar quando está em grande desvantagem e não ameaça o adversário
  if (melhor.n < 2 && meu.requestState === 'move') {
    const i = trocaBoa(meu, alvo, eu, melhor.n, memoria, batalha.turn);
    if (i >= 0 && batalha.choose(meu.id, `switch ${i + 1}`)) {
      memoria.ultimaTroca = batalha.turn;
      return true;
    }
  }
  // 10% das vezes um dos bons, para não ficar previsível
  const bons = notas.filter((x) => x.n > 0 && x.n >= melhor.n * 0.6);
  if (bons.length > 1 && aleatorio() < 0.1) return usar(aoAcaso(bons.map((x) => x.g)));
  return usar(melhor.n > 0 ? melhor.g : aoAcaso(golpes));
}
