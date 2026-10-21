// Batalha contra Pokémon selvagem usando o simulador do Pokémon Showdown (regras oficiais
// da 9ª geração: dano, tipos, golpes, habilidades, status). O Showdown não tem batalha
// selvagem, então captura e fuga são feitas aqui, com as fórmulas dos jogos originais.
import { especieComItem } from '../formas';
import { megaPorForma } from '../megas';
import { DYNAMAX_BAND, TERASTALLIZER_BAND } from '../loja';
import { Battle, Dex } from '@pkmn/sim';
import { AMIZADE_INICIAL, especie, ppComPPMax, ppMaximo, type PokemonIndividual } from './pokemon';
import { aplicarRemedio, usarRemedio, type Item } from '../itens';
import type { EfeitoBola } from '../bolas';

/** Mudanças de forma que nos jogos são só a troca da imagem, sem o brilho de transformação. */
const FORMAS_SEM_ANIMACAO = new Set(['Mimikyu-Busted', 'Mimikyu-Busted-Totem']);

export type Lado = 'jogador' | 'selvagem';

/** `registro`: frase para o chat lateral da batalha (se faltar, usa `texto`; null = não registra). */
export type EventoBatalha = (
  | { tipo: 'mensagem'; texto: string }
  /** `forma` = espécie no Showdown (ex.: "Giratina-Origin", "Arceus-Fire"), para o sprite da forma certa. */
  | { tipo: 'entrar'; lado: Lado; indice: number; hp: number; hpMax: number; forma: string; texto?: string }
  /** Terastalizou: o tipo vira o Tera Type (uma vez por batalha). */
  | { tipo: 'tera'; lado: Lado; teraTipo: string; texto: string }
  /** Megaevoluiu: `forma` = espécie Mega no Showdown ("Charizard-Mega-X"). */
  | { tipo: 'mega'; lado: Lado; forma: string; texto: string }
  /** Dynamax (3 turnos, HP dobrado, golpes viram Max Moves). `forma` = espécie Gigantamax no Showdown ("Charizard-Gmax") ou null. */
  | { tipo: 'dynamax'; lado: Lado; forma: string | null; texto: string }
  | { tipo: 'dynamaxFim'; lado: Lado; texto: string }
  /** Mudou de forma no meio da batalha (Primal Reversion…). */
  /** `semAnimacao`: só troca a imagem (ex.: o disfarce do Mimikyu quebrando não é uma transformação). */
  | { tipo: 'forma'; lado: Lado; forma: string; texto?: string; semAnimacao?: boolean }
  /** `semAnimacao`: o Showdown marcou "[still]" (ex.: 1º turno de Fly/Solar Beam, quem só se prepara). */
  | { tipo: 'golpe'; lado: Lado; alvo: Lado | null; golpe: string; tipoGolpe: string; categoria: string; texto: string; semAnimacao?: boolean }
  /** 1º turno de golpe de dois turnos (Fly, Dig, Solar Beam…): a tela mostra o Pokémon se preparando (voando, cavando, carregando). */
  | { tipo: 'preparar'; lado: Lado; golpe: string; tipoGolpe: string; texto: string }
  | { tipo: 'hp'; lado: Lado; hp: number; hpMax: number; texto?: string }
  | { tipo: 'status'; lado: Lado; status: string | null; texto?: string }
  | { tipo: 'impacto'; forte: boolean; texto: string }
  | { tipo: 'desmaio'; lado: Lado; texto: string }
  | { tipo: 'fim'; vencedor: Lado }
  /** Mudança de estágio de atributo (+1 Attack…); `definir` = valor absoluto (Belly Drum). */
  | { tipo: 'boost'; lado: Lado; atributo: string; quantidade: number; definir?: boolean; texto: string }
  /** Estágios zerados (Haze/Clear Smog); lado null = os dois. */
  | { tipo: 'zerarBoosts'; lado: Lado | null; texto?: string }
  /** Clima em campo (id do Showdown: RainDance, SunnyDay, Sandstorm, Snow…), null = acabou. */
  | { tipo: 'clima'; clima: string | null; texto?: string }
  /** Terreno em campo (Electric/Grassy/Misty/Psychic Terrain), null = acabou. */
  | { tipo: 'terreno'; terreno: string | null; texto?: string }
  /** Começou um turno novo (contador ao lado da janela). */
  | { tipo: 'turno'; numero: number }
  /**
   * Condição num lado do campo (id do Showdown: stealthrock, spikes, toxicspikes, stickyweb, reflect, tailwind…).
   * `ativa` false = acabou (Rapid Spin, Defog, fim dos turnos). Os hazards ficam desenhados no campo.
   */
  | { tipo: 'condicaoLado'; lado: Lado; condicao: string; ativa: boolean; texto: string }
  /** Court Change: os lados trocam as condições. */
  | { tipo: 'trocarCondicoes'; texto: string }
) & { registro?: string | null };

export interface OpcaoGolpe {
  indice: number;
  id: string;
  nome: string;
  tipo: string;
  categoria: string;
  pp: number;
  ppMax: number;
  desabilitado: boolean;
  /** O Max Move (ou G-Max Move) em que este golpe vira com Dynamax; só vem quando o Pokémon pode usar ou está usando. */
  max?: { id: string; nome: string; tipo: string; poder: number; desabilitado: boolean };
}

export type Pedido =
  /** `zGolpes[i]` = nome do Z-Move do golpe i (Pokémon segurando Z-Crystal), ou null. */
  /** `tera` = Tera Type se ainda pode terastalizar nesta batalha, ou null. `mega` = pode megaevoluir agora (Mega Stone certa). */
  /** `dynamax` = pode usar Dynamax agora (segurando a Dynamax Band; 'gigantamax' se a espécie tem a forma). `dinamaxado` = está em Dynamax (os golpes são os `max`). */
  | { tipo: 'acao'; golpes: OpcaoGolpe[]; podeTrocar: boolean; podeFugir: boolean; zGolpes: (string | null)[] | null; tera: string | null; mega: boolean; dynamax: 'dynamax' | 'gigantamax' | null; dinamaxado: boolean; tiposAlvo?: string[] }
  | { tipo: 'troca' }
  /** PvP: a vez é do outro jogador (ele está escolhendo, ou eu já escolhi). */
  | { tipo: 'espera' }
  | { tipo: 'fim' };

type PokemonSim = Battle['p1']['pokemon'][number];

const NOMES_STATUS: Record<string, string> = {
  brn: 'foi queimado',
  par: 'foi paralisado',
  slp: 'adormeceu',
  frz: 'foi congelado',
  psn: 'foi envenenado',
  tox: 'foi gravemente envenenado',
};
const CURA_STATUS: Record<string, string> = {
  brn: 'não está mais queimado',
  par: 'não está mais paralisado',
  slp: 'acordou',
  frz: 'descongelou',
  psn: 'não está mais envenenado',
  tox: 'não está mais envenenado',
};
const NOMES_ATRIBUTOS: Record<string, string> = {
  atk: 'Ataque',
  def: 'Defesa',
  spa: 'Ataque Especial',
  spd: 'Defesa Especial',
  spe: 'Velocidade',
  accuracy: 'Precisão',
  evasion: 'Evasão',
};
/** Terrenos (o nome do golpe fica em inglês, como os outros nomes de golpe). */
const TERRENOS: Record<string, string> = {
  'Electric Terrain': 'Electric Terrain',
  'Grassy Terrain': 'Grassy Terrain',
  'Misty Terrain': 'Misty Terrain',
  'Psychic Terrain': 'Psychic Terrain',
};

const CLIMAS: Record<string, string> = {
  RainDance: 'Começou a chover!',
  SunnyDay: 'O sol ficou muito forte!',
  Sandstorm: 'Uma tempestade de areia começou!',
  Snowscape: 'Começou a nevar!',
  Hail: 'Começou a cair granizo!',
  Snow: 'Começou a nevar!',
  DesolateLand: 'O sol ficou extremamente forte!',
  PrimordialSea: 'Começou uma chuva torrencial!',
  DeltaStream: 'Um vento misterioso protege os Pokémon voadores!',
  none: 'O clima voltou ao normal.',
};

/** Frase da condição de lado (hazards, Reflect, Tailwind…) começando ou acabando. */
function textoCondicaoLado(id: string, nome: string, lado: Lado, ativa: boolean): string {
  const onde = lado === 'jogador' ? 'do seu lado' : 'do lado adversário';
  const comeco: Record<string, string> = {
    stealthrock: `Pedras pontiagudas flutuam ${onde}!`,
    spikes: `Espinhos se espalharam no chão ${onde}!`,
    toxicspikes: `Espinhos venenosos se espalharam no chão ${onde}!`,
    stickyweb: `Uma teia pegajosa se espalhou no chão ${onde}!`,
    reflect: `Reflect protege ${onde} contra golpes físicos!`,
    lightscreen: `Light Screen protege ${onde} contra golpes especiais!`,
    auroraveil: `Aurora Veil protege ${onde}!`,
    tailwind: `O Tailwind soprou ${onde}!`,
    safeguard: `Safeguard protege ${onde} contra problemas de status!`,
    mist: `Mist protege ${onde} contra a perda de atributos!`,
  };
  const fim: Record<string, string> = {
    stealthrock: `As pedras pontiagudas sumiram ${onde}!`,
    spikes: `Os espinhos sumiram ${onde}!`,
    toxicspikes: `Os espinhos venenosos sumiram ${onde}!`,
    stickyweb: `A teia pegajosa sumiu ${onde}!`,
  };
  return (ativa ? comeco[id] : fim[id]) ?? (ativa ? `${nome} começou ${onde}!` : `${nome} acabou ${onde}.`);
}

export function conjuntoShowdown(p: PokemonIndividual, nome: string) {
  return {
    name: nome,
    // formas que dependem do item (Giratina-Origin, Arceus-Fire…): o simulador não troca sozinho
    species: especieComItem(p.especieId, p.item),
    happiness: p.amizade ?? AMIZADE_INICIAL,
    teraType: p.teraTipo ?? especie(p.especieId).types[0],
    // espécies com Gigantamax usam a forma e o G-Max Move ao dar Dynamax (sem "fator" especial: pedido do dono)
    gigantamax: !!especie(p.especieId).canGigantamax,
    level: p.nivel,
    moves: p.golpes.map((g) => g.id),
    ability: p.habilidade,
    nature: p.natureza,
    gender: p.genero === 'N' ? '' : p.genero,
    shiny: p.shiny,
    // itens nossos sem efeito no simulador (Exp. Share) não vão para ele
    item: p.item && Dex.items.get(p.item).exists ? p.item : '',
    ivs: p.ivs,
    evs: p.evs,
  };
}

/** Copia HP, status e PP salvos para o Pokémon do simulador (que começaria cheio). */
function aplicarEstado(sim: PokemonSim, p: PokemonIndividual) {
  sim.hp = Math.max(1, Math.min(p.hp, sim.maxhp));
  if (p.status) sim.setStatus(p.status, sim, null, true);
  for (const slot of sim.moveSlots) {
    const salvo = p.golpes.find((g) => g.id === slot.id);
    slot.maxpp = ppMaximo(slot.id);
    slot.pp = Math.min(salvo?.pp ?? slot.maxpp, slot.maxpp);
  }
}

export class BatalhaSelvagem {
  private batalha: Battle;
  private lidas = 0;
  /** Pokémon do jogador no simulador, na mesma ordem de `indices`. */
  private objetos: PokemonSim[];
  /**
   * Pokémon do adversário no simulador, na ordem do time dele (`adversarios`). O simulador REORDENA `p2.pokemon` a
   * cada troca (quem entra vai para a posição 0), então nunca usar a posição de lá como posição no time.
   */
  private objetosAdv: PokemonSim[];
  /** Posições no time do jogador de quem está na batalha (desmaiados ficam de fora). */
  readonly indices: number[];
  /** Posições no time de quem chegou a lutar (ganham experiência completa). */
  readonly participantes = new Set<number>();
  /** Pokémon do outro lado: o selvagem, ou o time do treinador NPC. */
  readonly adversarios: PokemonIndividual[];

  /** Golpes que cada Pokémon do adversário (posição no time dele) já usou nesta batalha, na ordem em que apareceram. */
  private golpesVistos = new Map<number, string[]>();

  /**
   * Golpes que o adversário em campo já mostrou, com quantos PP gastou. `ppMax` = PP com PP Max (pedido do dono:
   * mostrar sempre o máximo possível); `restantes` = ppMax − gastos. Os que ele ainda não usou ficam escondidos.
   */
  golpesUsadosAdversario(indice = this.adversarioAtivo): { id: string; nome: string; tipo: string; gastos: number; ppMax: number; restantes: number }[] {
    const sim = this.objetosAdv[indice];
    return (this.golpesVistos.get(indice) ?? []).map((id) => {
      const g = Dex.moves.get(id);
      const slot = sim?.moveSlots.find((s) => s.id === id);
      const gastos = slot ? Math.max(0, slot.maxpp - slot.pp) : 0;
      const ppMax = ppComPPMax(id);
      return { id, nome: g.name, tipo: g.type, gastos, ppMax, restantes: Math.max(0, ppMax - gastos) };
    });
  }

  /**
   * Atributos do seu Pokémon em campo como estão AGORA na batalha: com os estágios (+1 Attack do Bulk Up…) e a forma
   * atual (Mega), sem efeitos de item/ability. `estagio` = −6 a +6; `semEstagio` = o valor antes dos estágios (para mostrar "70 → 140").
   */
  atributosEmCampo(): Record<'atk' | 'def' | 'spa' | 'spd' | 'spe', { valor: number; estagio: number; semEstagio: number }> | null {
    const sim = this.eu.active[0];
    if (!sim || sim.fainted) return null;
    const ler = (a: 'atk' | 'def' | 'spa' | 'spd' | 'spe') => ({ valor: sim.getStat(a, false, true), estagio: sim.boosts[a] ?? 0, semEstagio: sim.getStat(a, true, true) });
    return { atk: ler('atk'), def: ler('def'), spa: ler('spa'), spd: ler('spd'), spe: ler('spe') };
  }

  /** Posição (no time do adversário) de quem está em campo do outro lado. */
  get adversarioAtivo(): number {
    const ativo = this.ele.active[0];
    return ativo ? Math.max(0, this.objetosAdv.indexOf(ativo)) : 0;
  }
  /** Lado de quem olha a batalha ('p1' fora do PvP). */
  private meuLado: 'p1' | 'p2' = 'p1';
  private get eu() {
    return this.batalha[this.meuLado];
  }
  private get ele() {
    return this.batalha[this.meuLado === 'p1' ? 'p2' : 'p1'];
  }
  private tentativasFuga = 0;
  private ignorarRecarga = false;

  constructor(
    private time: PokemonIndividual[],
    private nomes: string[],
    readonly selvagem: PokemonIndividual,
    private nomeSelvagem: string,
    /** Taxa de captura oficial da espécie (3 = lendário difícil, 255 = muito fácil). */
    private taxaCaptura: number,
    private aleatorio: () => number = Math.random,
    /** Duelo contra treinador NPC: o time dele (o `selvagem` é o primeiro) e os nomes. Sem captura nem fuga. */
    readonly treinador: { nome: string; equipe: PokemonIndividual[]; nomesEquipe: string[] } | null = null,
    /**
     * PvP (shared/batalha/pvp.ts): a batalha já existe com os dois jogadores e esta é a VISÃO de um dos lados
     * (`lado`): o "jogador" é ele e o "selvagem" é o outro jogador. Não cria batalha nem escolhe pelo adversário.
     */
    readonly pvp: { batalha: Battle; lado: 'p1' | 'p2' } | null = null,
  ) {
    this.indices = time.map((_, i) => i).filter((i) => time[i].hp > 0);
    if (this.indices.length === 0) throw new Error('Nenhum Pokémon em condições de lutar');

    this.adversarios = treinador ? treinador.equipe : [selvagem];
    if (pvp) {
      this.batalha = pvp.batalha;
      this.meuLado = pvp.lado;
    } else {
      this.batalha = new Battle({ formatid: 'gen9customgame' as never });
      this.batalha.setPlayer('p1', { name: 'Jogador', team: this.indices.map((i) => conjuntoShowdown(time[i], `P${i}`)) as never });
      this.batalha.setPlayer('p2', { name: treinador ? treinador.nome : 'Selvagem', team: this.adversarios.map((p, k) => conjuntoShowdown(p, `S${k}`)) as never });
      // Dynamax: o simulador só libera na 8ª geração; religamos para o jogador (a Dynamax Band é conferida em `pedido`).
      // Treinadores, líderes e selvagens não usam. (No PvP quem religa para os dois é a BatalhaPvp.)
      const ladoJogador = this.eu;
      ladoJogador.dynamaxUsed = false;
      ladoJogador.canDynamaxNow = () => !ladoJogador.dynamaxUsed;
    }
    this.objetos = this.eu.pokemon.slice();
    this.objetos.forEach((sim, k) => aplicarEstado(sim, time[this.indices[k]]));
    this.objetosAdv = this.ele.pokemon.slice();
    this.objetosAdv.forEach((sim, k) => aplicarEstado(sim, this.adversarios[k]));
  }

  /** Começa a batalha (sai da tela de "prévia de time") e devolve a entrada dos Pokémon. */
  iniciar(): EventoBatalha[] {
    this.lidas = this.batalha.log.length;
    this.batalha.makeChoices('default', 'default');
    return this.lerEventos();
  }

  // ---------- Boss (eventos): HP "infinito" e limite de turnos ----------
  private hpBoss = 0;
  private limiteTurnos = 0;
  /** dano direto acumulado e o último HP visto no log (queimadura, veneno e outros "[from]" não contam: tiram % da vida enorme) */
  private danoBoss = 0;
  private hpVistoBoss = 0;
  private lidasBoss = 0;
  /** Liga o modo boss (antes de `iniciar`): o adversário ganha uma vida enorme no simulador e a luta acaba no turno `turnos`. */
  modoBoss(turnos: number): void {
    const b = this.objetosAdv[0];
    this.hpBoss = 9_999_999;
    b.maxhp = b.baseMaxhp = b.hp = this.hpBoss;
    this.hpVistoBoss = this.hpBoss;
    this.limiteTurnos = turnos;
  }
  private contarDanoNoBoss(): void {
    const linhas = this.batalha.log;
    for (; this.lidasBoss < linhas.length; this.lidasBoss++) {
      const l = linhas[this.lidasBoss];
      const m = /^\|-(damage|heal|sethp)\|p2a: [^|]*\|(\d+)\//.exec(l);
      if (!m) continue;
      const hp = Number(m[2]);
      if (m[1] === 'damage' && !l.includes('[from]')) this.danoBoss += Math.max(0, this.hpVistoBoss - hp);
      this.hpVistoBoss = hp;
    }
  }
  /** Dano total causado no boss até agora. */
  get danoNoBoss(): number {
    if (!this.hpBoss) return 0;
    this.contarDanoNoBoss();
    return this.danoBoss;
  }
  /** No modo boss: passou do último turno. */
  get turnosAcabaram(): boolean {
    return this.limiteTurnos > 0 && this.batalha.turn > this.limiteTurnos;
  }

  get terminou(): boolean {
    return this.batalha.ended || this.turnosAcabaram;
  }

  get vencedor(): Lado | null {
    if (this.turnosAcabaram && !this.batalha.ended) return 'jogador';
    if (!this.batalha.ended) return null;
    return this.batalha.winner === this.eu.name ? 'jogador' : 'selvagem';
  }

  /** Posição no time do Pokémon do jogador que está em campo. */
  get ativo(): number {
    return this.indices[this.objetos.indexOf(this.eu.active[0])];
  }

  pedido(): Pedido {
    if (this.batalha.ended || this.turnosAcabaram) return { tipo: 'fim' };
    const req = this.eu.activeRequest as any;
    // PvP: esperando o outro jogador (ou eu já escolhi neste turno)
    if (!req || req.wait || (this.pvp && this.eu.isChoiceDone())) return { tipo: 'espera' };
    if (req?.forceSwitch) return { tipo: 'troca' };
    const ativo = req.active[0];
    const maximos = ativo.maxMoves?.maxMoves as { move: string; disabled?: boolean }[] | undefined;
    const golpes: OpcaoGolpe[] = ativo.moves.map((m: any, i: number) => {
      const golpe = Dex.moves.get(m.id);
      const max = maximos?.[i] ? Dex.moves.get(maximos[i].move) : null;
      return {
        // poder do Max Move: vem do golpe de origem (golpe de status vira Max Guard, sem poder)
        ...(max ? { max: { id: max.id, nome: max.name, tipo: max.type, poder: golpe.category === 'Status' ? 0 : (golpe.maxMove?.basePower ?? 0), desabilitado: !!maximos![i].disabled } } : {}),
        indice: i + 1,
        id: m.id,
        nome: golpe.name,
        tipo: golpe.type,
        categoria: golpe.category,
        pp: m.pp ?? 0,
        ppMax: m.maxpp ?? 0,
        desabilitado: !!m.disabled,
      };
    });
    const preso = !!(ativo.trapped || ativo.maybeTrapped);
    const zGolpes = Array.isArray(ativo.canZMove) ? (ativo.canZMove as ({ move: string } | null)[]).map((z) => z?.move ?? null) : null;
    // Terastal só segurando o Tera Orb (pedido do dono)
    const comBanda = this.time[this.ativo]?.item === TERASTALLIZER_BAND;
    const tera = comBanda && typeof ativo.canTerastallize === 'string' ? (ativo.canTerastallize as string) : null;
    // contra treinador não dá para fugir
    // Mega só com Mega Stone (sem o atalho do Rayquaza por Dragon Ascent: pedido do dono)
    const mega = !!ativo.canMegaEvo && !!this.eu.active[0]?.getItem().megaStone;
    // Dynamax só segurando a Dynamax Band, uma vez por batalha
    const dinamaxado = !!this.eu.active[0]?.volatiles['dynamax'];
    const dynamax = this.time[this.ativo]?.item === DYNAMAX_BAND && ativo.canDynamax && maximos ? (ativo.maxMoves.gigantamax ? 'gigantamax' : 'dynamax') : null;
    return { tipo: 'acao', golpes, podeTrocar: !preso && this.reservasSaudaveis().length > 0, podeFugir: !preso && !this.treinador, zGolpes, tera, mega, dynamax, dinamaxado, tiposAlvo: this.ele.active[0]?.getTypes() };
  }

  /** Posições no time dos Pokémon que podem entrar no lugar do atual. */
  reservasSaudaveis(): number[] {
    const ativo = this.eu.active[0];
    return this.objetos.filter((o) => o !== ativo && !o.fainted && o.hp > 0).map((o) => this.indices[this.objetos.indexOf(o)]);
  }

  /**
   * `especial`: 'z' = usar como Z-Move (Z-Crystal certo); 'tera' = terastalizar antes de atacar;
   * 'mega' = megaevoluir antes de atacar (Mega Stone certa); 'dynamax' = dar Dynamax antes de atacar (Dynamax Band).
   * Cada um: uma vez por batalha.
   */
  usarGolpe(indice: number, especial: 'z' | 'tera' | 'mega' | 'dynamax' | null = null): EventoBatalha[] {
    return this.jogar(this.comandoGolpe(indice, especial));
  }

  /** Texto da escolha no formato do Showdown (o PvP manda isso para o servidor conferir). */
  comandoGolpe(indice: number, especial: 'z' | 'tera' | 'mega' | 'dynamax' | null = null): string {
    const sufixo = { z: ' zmove', tera: ' terastallize', mega: ' mega', dynamax: ' dynamax' };
    return `move ${indice}${especial ? sufixo[especial] : ''}`;
  }
  comandoTroca(posicaoNoTime: number): string {
    const obj = this.objetos[this.indices.indexOf(posicaoNoTime)];
    return `switch ${this.eu.pokemon.indexOf(obj) + 1}`;
  }

  /** PvP: os eventos novos do log, vistos deste lado (quem faz as escolhas é a BatalhaPvp). */
  eventosNovos(): EventoBatalha[] {
    return this.lerEventos();
  }

  /** Clima e terreno em campo agora, com os turnos que faltam (null = não acaba sozinho, ex.: clima Primal). */
  campo(): { clima: string | null; turnosClima: number | null; terreno: string | null; turnosTerreno: number | null; lados?: { meu: boolean; nome: string; turnos: number }[] } {
    const f = this.batalha.field;
    // condições de lado com tempo (Reflect, Light Screen, Aurora Veil, Tailwind, Safeguard…)
    const lados: { meu: boolean; nome: string; turnos: number }[] = [];
    for (const [lado, meu] of [[this.eu, true], [this.ele, false]] as const) {
      for (const [id, estado] of Object.entries(lado.sideConditions ?? {})) {
        const turnos = (estado as { duration?: number }).duration;
        if (turnos) lados.push({ meu, nome: this.batalha.dex.conditions.get(id).name || id, turnos });
      }
    }
    const clima = f.weather ? f.getWeather().name : null;
    const terreno = f.terrain ? f.getTerrain().name : null;
    return {
      clima,
      turnosClima: clima && f.weatherState.duration ? f.weatherState.duration : null,
      terreno,
      turnosTerreno: terreno && f.terrainState.duration ? f.terrainState.duration : null,
      lados,
    };
  }

  trocar(posicaoNoTime: number): EventoBatalha[] {
    return this.jogar(this.comandoTroca(posicaoNoTime));
  }

  /**
   * Arremessa uma Pokébola (fórmula da 3ª/4ª geração, bônus de status da 5ª em diante).
   * Se falhar, o selvagem ataca de graça.
   */
  /** Tipos do Pokémon do adversário em campo agora (Terastal e mudanças de forma incluídos). */
  tiposDoAdversario(): string[] | undefined {
    const a = this.ele.active[0];
    return a && !a.fainted ? a.getTypes() : undefined;
  }

  /** Chance (0 a 1) de capturar com esta bola AGORA, sem arremessar (o cartão da bola na bolsa mostra). */
  chanceDeCaptura(bola: EfeitoBola, bonusExtra = 1): number {
    return bola.garantida ? 1 : this.contaDaCaptura(bola, bonusExtra).chance;
  }

  /** Fórmula da 3ª/4ª geração (bônus de status da 5ª): `b` = valor de cada checagem (null = captura garantida). */
  private contaDaCaptura(bola: EfeitoBola, bonusExtra: number): { b: number | null; chance: number } {
    const alvo = this.ele.active[0];
    const taxa = Math.max(1, Math.min(255, this.taxaCaptura + bola.ajusteTaxa));
    const bonusStatus = alvo.status === 'slp' || alvo.status === 'frz' ? 2.5 : alvo.status ? 1.5 : 1;
    const a = Math.floor((((3 * alvo.maxhp - 2 * alvo.hp) * taxa * bola.bonus) / (3 * alvo.maxhp)) * bonusStatus * bonusExtra);
    if (a >= 255) return { b: null, chance: 1 };
    // 4 checagens, chance final ≈ a/255 (igual ao Pokémon Database)
    const b = Math.floor(1048560 / (16711680 / Math.max(1, a)) ** 0.25);
    return { b, chance: Math.min(1, b / 65536) ** 4 };
  }

  /** `chance` = probabilidade (0 a 1) de capturar com esse arremesso (as 4 checagens de tremida). */
  /** `bonusExtra` multiplica a chance (VIP: 1,05 = +5% em cima da chance normal). */
  arremessarBola(bola: EfeitoBola, bonusExtra = 1): { capturou: boolean; tremidas: number; chance: number; eventos: EventoBatalha[] } {
    if (bola.garantida) return { capturou: true, tremidas: 3, chance: 1, eventos: [] };
    const { b, chance } = this.contaDaCaptura(bola, bonusExtra);
    let tremidas = 0;
    if (b === null) tremidas = 4;
    else while (tremidas < 4 && Math.floor(this.aleatorio() * 65536) < b) tremidas++;
    if (tremidas === 4) return { capturou: true, tremidas: 3, chance, eventos: [] };
    return { capturou: false, tremidas, chance, eventos: this.turnoGratisDoSelvagem() };
  }

  /**
   * Usa um remédio num Pokémon do time durante a batalha (gasta a vez). Devolve null se o item
   * não teria efeito. Pokémon que já começaram desmaiados não estão na batalha: o efeito vai direto pro save.
   */
  usarRemedio(posicaoNoTime: number, item: Item, nome: string): { mensagem: string; eventos: EventoBatalha[] } | null {
    const k = this.indices.indexOf(posicaoNoTime);
    if (k < 0) {
      const mensagem = usarRemedio(item, this.time[posicaoNoTime], nome);
      return mensagem ? { mensagem, eventos: this.turnoGratisDoSelvagem() } : null;
    }
    const sim = this.objetos[k];
    const r = aplicarRemedio(
      item,
      {
        hp: sim.fainted ? 0 : sim.hp,
        hpMax: sim.maxhp,
        status: sim.fainted ? null : sim.status || null,
        golpes: sim.baseMoveSlots.map((s) => ({ id: s.id, pp: s.pp, ppMax: s.maxpp })),
      },
      nome,
    );
    if (!r) return null;
    const efeito = { ...r.estado, mensagem: r.mensagem };
    for (const s of sim.baseMoveSlots) s.pp = efeito.golpes.find((g) => g.id === s.id)?.pp ?? s.pp;
    if (sim.fainted) {
      sim.fainted = false;
      sim.faintQueued = false;
      sim.status = '' as never;
      this.eu.pokemonLeft++;
    } else if (!efeito.status && sim.status) {
      sim.setStatus('');
    }
    sim.hp = efeito.hp;
    const eventos: EventoBatalha[] = [];
    if (sim === this.eu.active[0]) {
      eventos.push({ tipo: 'hp', lado: 'jogador', hp: sim.hp, hpMax: sim.maxhp }, { tipo: 'status', lado: 'jogador', status: sim.status || null });
    }
    return { mensagem: efeito.mensagem, eventos: [...eventos, ...this.turnoGratisDoSelvagem()] };
  }

  /** Status atual do selvagem (para a Dream Ball). */
  get statusSelvagem(): string | null {
    return this.ele.active[0]?.status || null;
  }

  /** Fórmula de fuga da 3ª/4ª geração. Se falhar, o selvagem ataca de graça. */
  fugir(): { fugiu: boolean; eventos: EventoBatalha[] } {
    this.tentativasFuga++;
    const A = this.eu.active[0].getStat('spe');
    const B = this.ele.active[0].getStat('spe');
    const chance = Math.floor((A * 128) / Math.max(1, B)) + 30 * this.tentativasFuga;
    // Run Away: fuga garantida (a habilidade do Pokémon em campo)
    if (this.eu.active[0].hasAbility('runaway')) return { fugiu: true, eventos: [] };
    if (A >= B || Math.floor(this.aleatorio() * 256) < chance) return { fugiu: true, eventos: [] };
    return { fugiu: false, eventos: this.turnoGratisDoSelvagem() };
  }

  /** Copia HP, status e PP do simulador de volta para o time e para o selvagem (se for capturado). */
  sincronizar(): void {
    const copiar = (sim: PokemonSim, p: PokemonIndividual) => {
      // quem termina a batalha em Dynamax guarda o HP na medida normal
      p.hp = sim.fainted ? 0 : sim.volatiles['dynamax'] ? sim.getUndynamaxedHP() : sim.hp;
      p.status = sim.fainted || !sim.status ? null : sim.status;
      // frutas comidas na batalha são gastas; os outros itens voltam ao dono no fim (como nos jogos atuais)
      if (p.item && !sim.item && Dex.items.get(p.item).isBerry) p.item = null;
      for (const g of p.golpes) {
        const slot = sim.baseMoveSlots.find((s) => s.id === g.id);
        if (slot) g.pp = slot.pp;
      }
    };
    this.objetos.forEach((sim, k) => copiar(sim, this.time[this.indices[k]]));
    this.objetosAdv.forEach((sim, k) => copiar(sim, this.adversarios[k]));
  }

  // ---------- interno ----------

  /** O jogador perde a vez (usou item ou falhou ao fugir): reaproveita a "recarga" do Hyper Beam. */
  private turnoGratisDoSelvagem(): EventoBatalha[] {
    this.eu.active[0].addVolatile('mustrecharge');
    this.ignorarRecarga = true;
    return this.jogar('move 1');
  }

  private jogar(escolha: string): EventoBatalha[] {
    this.escolherSelvagem();
    if (!this.batalha.choose(this.meuLado, escolha)) throw new Error(`Escolha inválida: ${escolha}`);
    return this.lerEventos();
  }

  private escolherSelvagem() {
    const lado = this.ele;
    if (lado.requestState === 'switch') return this.trocarAdversario();
    if (lado.requestState !== 'move') return;
    const golpes = ((lado.activeRequest as any).active[0].moves as any[])
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => !m.disabled && (m.pp === undefined || m.pp > 0));
    let escolhido = golpes.length ? golpes[Math.floor(this.aleatorio() * golpes.length)].i + 1 : 1;
    // treinador NPC: na maioria das vezes usa o golpe que mais machuca (tipo, STAB e poder)
    if (this.treinador && golpes.length && this.aleatorio() < 0.75) {
      const atacante = lado.active[0];
      const alvo = this.eu.active[0];
      const forca = (id: string) => {
        const g = Dex.moves.get(id);
        if (g.category === 'Status' || !alvo) return 15;
        if (!Dex.getImmunity(g.type, alvo.getTypes())) return 0;
        return (g.basePower || 50) * (atacante.hasType(g.type) ? 1.5 : 1) * 2 ** Dex.getEffectiveness(g.type, alvo.getTypes());
      };
      escolhido = golpes.reduce((a, b) => (forca(b.m.id) > forca(a.m.id) ? b : a)).i + 1;
    }
    this.batalha.choose('p2', `move ${escolhido}`);
  }

  /** O treinador NPC manda o próximo Pokémon (na ordem do time) quando o atual desmaia. */
  private trocarAdversario() {
    const lado = this.ele;
    const proximo = lado.pokemon.findIndex((p) => !p.fainted && !p.isActive);
    if (proximo >= 0) this.batalha.choose('p2', `switch ${proximo + 1}`);
  }

  private lerEventos(): EventoBatalha[] {
    const linhas = this.batalha.log.slice(this.lidas);
    this.lidas = this.batalha.log.length;
    const eventos = this.interpretar(linhas);
    // só o treinador precisa trocar (o Pokémon dele desmaiou): ele troca sozinho e a batalha segue
    while (!this.pvp && !this.batalha.ended && this.ele.requestState === 'switch' && this.eu.requestState !== 'switch') {
      this.trocarAdversario();
      const mais = this.batalha.log.slice(this.lidas);
      this.lidas = this.batalha.log.length;
      if (!mais.length) break;
      eventos.push(...this.interpretar(mais));
    }
    const ativo = this.eu.active[0];
    if (ativo && !ativo.fainted) this.participantes.add(this.ativo);
    return eventos;
  }

  private lado(ident: string): Lado {
    return ident.startsWith(this.meuLado) ? 'jogador' : 'selvagem';
  }

  private nome(ident: string): string {
    if (!ident) return '';
    const apelido = ident.split(': ')[1] ?? '';
    if (!ident.startsWith(this.meuLado)) return this.treinador ? `${this.treinador.nomesEquipe[Number(apelido.slice(1))] ?? apelido} de ${this.treinador.nome}` : `${this.nomeSelvagem} selvagem`;
    return this.nomes[Number(apelido.slice(1))] ?? apelido;
  }

  /**
   * A ability do selvagem só aparece para o jogador depois que ela age na batalha
   * (ex.: Intimidate baixando o Attack, Levitate dando imunidade, Rough Skin causando dano).
   */
  habilidadeSelvagemRevelada = false;

  private revelaHabilidadeSelvagem(comando: string, args: string[], de: string | undefined): boolean {
    const doOutro = (x: string | undefined) => !!x && /^p[12]/.test(x) && !x.startsWith(this.meuLado);
    if (comando === '-ability') return doOutro(args[0]);
    const deAbility = de?.startsWith('ability:') || args[1]?.startsWith('ability:');
    if (!deAbility) return false;
    // "[of] p2a: X" diz de quem é a ability; sem ele, é de quem aparece na linha
    const dono = args.find((a) => a.startsWith('[of]'))?.slice(4).trim() ?? args[0];
    return doOutro(dono);
  }

  /** HP de cada lado (para calcular o dano de cada golpe). */
  private hpLado: Record<Lado, { hp: number; max: number }> = { jogador: { hp: 0, max: 1 }, selvagem: { hp: 0, max: 1 } };
  /** Último golpe usado (para juntar "usou X" com o dano no chat lateral). */
  private ultimoGolpe: { quem: string; golpe: string; evento: EventoBatalha; acertos: number; avisos: string[] } | null = null;

  /** Guarda o aviso para o fim da frase do golpe (registro lateral); sem golpe em andamento, registra sozinho. */
  private avisoDoGolpe(aviso: string): string | null | undefined {
    if (!this.ultimoGolpe) return undefined;
    this.ultimoGolpe.avisos.push(aviso);
    return null;
  }

  private interpretar(linhas: string[]): EventoBatalha[] {
    const eventos: EventoBatalha[] = [];
    const porcento = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString('pt-BR')}%`;
    for (let i = 0; i < linhas.length; i++) {
      let linha = linhas[i];
      // "|split|p1" vem antes de duas versões da mesma linha (secreta e pública): a secreta (HP exato) só para o dono
      // daquele lado; no PvP o outro jogador lê a pública (HP em porcentagem)
      if (linha.startsWith('|split|')) {
        linha = linha.slice(7) === this.meuLado ? linhas[i + 1] : linhas[i + 2];
        i += 2;
      }
      if (!linha?.startsWith('|')) continue;
      const [comando, ...args] = linha.slice(1).split('|');
      const de = args.find((a) => a.startsWith('[from]'))?.slice(6).trim();
      const quem = this.nome(args[0]);
      if (this.revelaHabilidadeSelvagem(comando, args, de)) this.habilidadeSelvagemRevelada = true;

      switch (comando) {
        case 'switch':
        case 'drag': {
          const lado = this.lado(args[0]);
          const [hp, hpMax] = args[2].split(' ')[0].split('/').map(Number);
          const indice = Number(args[0].split(': ')[1].slice(1)) || 0;
          this.hpLado[lado] = { hp, max: hpMax ?? hp };
          eventos.push({
            tipo: 'entrar', lado, indice, hp, hpMax: hpMax ?? hp, forma: args[1].split(',')[0],
            texto: lado === 'jogador' ? `Vai, ${quem}!` : this.treinador ? `${this.treinador.nome} enviou ${this.treinador.nomesEquipe[indice]}!` : undefined,
            // o primeiro do treinador já é anunciado pela tela ("X enviou Y!"); só as trocas vão para o registro
            registro: lado === 'jogador' ? `Vai, ${quem}!` : this.treinador && indice > 0 ? `${this.treinador.nome} enviou ${this.treinador.nomesEquipe[indice]}!` : null,
          });
          break;
        }
        case '-sidestart':
        case '-sideend': {
          const nomeCondicao = args[1].replace(/^move: /, '');
          const condicao = Dex.toID(nomeCondicao);
          const ladoC = this.lado(args[0]);
          const ativa = comando === '-sidestart';
          eventos.push({ tipo: 'condicaoLado', lado: ladoC, condicao, ativa, texto: textoCondicaoLado(condicao, nomeCondicao, ladoC, ativa) });
          break;
        }
        case '-swapsideconditions':
          eventos.push({ tipo: 'trocarCondicoes', texto: 'Os efeitos dos dois lados do campo trocaram de lugar!' });
          break;
        case 'turn':
          this.ultimoGolpe = null;
          eventos.push({ tipo: 'turno', numero: Number(args[0]), registro: null });
          break;
        case 'detailschange':
        case '-formechange': {
          const forma = args[1].split(',')[0];
          const mega = comando === 'detailschange' ? megaPorForma(forma) : undefined;
          // Mega Evolução: o "|-mega|" que vem logo depois só repete a informação
          if (mega) eventos.push({ tipo: 'mega', lado: this.lado(args[0]), forma, texto: `${quem} megaevoluiu em ${mega.nome}!` });
          else eventos.push({ tipo: 'forma', lado: this.lado(args[0]), forma, semAnimacao: FORMAS_SEM_ANIMACAO.has(forma) });
          break;
        }
        case '-primal':
          eventos.push({ tipo: 'mensagem', texto: `${quem} fez a Primal Reversion e voltou à sua forma primitiva!` });
          break;
        case '-terastallize':
          eventos.push({ tipo: 'tera', lado: this.lado(args[0]), teraTipo: args[1], texto: `${quem} terastalizou! Agora é do tipo ${args[1]}!` });
          break;
        case '-zpower':
          eventos.push({ tipo: 'mensagem', texto: `${quem} se cercou de Z-Power!` });
          break;
        case '-item': {
          // item revelado (Air Balloon, Frisk…) ou trocado (Trick, Thief)
          const item = Dex.items.get(args[1]).name;
          if (de?.startsWith('move: ')) eventos.push({ tipo: 'mensagem', texto: `${quem} recebeu ${item}!` });
          else if (item === 'Air Balloon') eventos.push({ tipo: 'mensagem', texto: `${quem} está flutuando com um Air Balloon!` });
          else eventos.push({ tipo: 'mensagem', texto: `${quem} está segurando ${item}!` });
          break;
        }
        case '-enditem': {
          // item gasto (Focus Sash, White Herb, fruta comida, Air Balloon estourado…) ou perdido (Knock Off)
          const item = Dex.items.get(args[1]).name;
          let texto = `${quem} usou ${item}!`;
          if (args.includes('[eat]')) texto = `${quem} comeu ${item}!`;
          else if (item === 'Air Balloon') texto = `O Air Balloon de ${quem} estourou!`;
          else if (de?.startsWith('move: ')) texto = `${quem} perdeu ${item}!`;
          else if (de === 'stealeat') texto = `${this.nome(args.find((a) => a.startsWith('[of]'))?.slice(4).trim() ?? '')} comeu ${item}!`;
          eventos.push({ tipo: 'mensagem', texto });
          break;
        }
        case 'move': {
          const golpe = Dex.moves.get(args[1]);
          const evento: EventoBatalha = {
            tipo: 'golpe',
            lado: this.lado(args[0]),
            alvo: args[2] ? this.lado(args[2]) : null,
            golpe: golpe.id,
            tipoGolpe: golpe.type,
            categoria: golpe.category,
            texto: `${quem} usou ${golpe.name}!`,
            semAnimacao: args.includes('[still]'),
          };
          eventos.push(evento);
          this.ultimoGolpe = { quem, golpe: golpe.name, evento, acertos: 0, avisos: [] };
          // golpe do adversário fica "conhecido" (Struggle não conta: não é golpe dele). A posição vem do próprio log
          // ("p2a: S1" = 2º do time): quando o log é lido, o simulador já pode ter trocado para o próximo Pokémon
          if (evento.lado === 'selvagem' && golpe.id !== 'struggle') {
            const indice = Number(args[0].split(': ')[1]?.slice(1)) || 0;
            const vistos = this.golpesVistos.get(indice) ?? [];
            if (!vistos.includes(golpe.id)) this.golpesVistos.set(indice, [...vistos, golpe.id]);
          }
          break;
        }
        case '-damage':
        case '-heal':
        case '-sethp': {
          const [hpTexto] = args[1].split(' ');
          const [hp, hpMax] = hpTexto.split('/').map(Number);
          const ladoHp = this.lado(args[0]);
          const antes = this.hpLado[ladoHp];
          const max = hpMax || antes.max || 1;
          this.hpLado[ladoHp] = { hp: hp || 0, max };
          let texto: string | undefined;
          let registro: string | undefined;
          if (de === 'brn') texto = `${quem} foi ferido pela queimadura!`;
          else if (de === 'psn' || de === 'tox') texto = `${quem} foi ferido pelo veneno!`;
          else if (de === 'Recoil') texto = `${quem} sofreu dano de recuo!`;
          else if (de === 'confusion') texto = 'Ele se feriu na confusão!';
          else if (de === 'drain') texto = `${this.nome(args.find((a) => a.startsWith('[of]'))?.slice(4).trim() ?? '')} teve a energia drenada!`;
          else if (de?.startsWith('item: ')) {
            const item = de.slice(6);
            const dono = args.find((a) => a.startsWith('[of]'))?.slice(4).trim();
            if (comando === '-heal') texto = `${quem} recuperou HP com ${item}!`;
            else if (dono) texto = `${quem} foi ferido pelo ${item} de ${this.nome(dono)}!`;
            else texto = `${quem} perdeu HP por causa do ${item}!`;
          }
          else if (de?.startsWith('pokemon: Mimikyu')) texto = `O disfarce de ${quem} foi desfeito!`;
          else if (de === 'Sandstorm' || de === 'Hail') texto = `${quem} foi atingido pelo clima!`;
          else if (de) texto = `${quem} foi afetado por ${de.replace(/^(move|ability): /, '')}!`;
          else if (comando === '-damage' && antes.hp > (hp || 0)) {
            // dano de golpe: quanto tirou e quanto isso é da vida máxima
            const dano = antes.hp - (hp || 0);
            const parte = porcento((dano / max) * 100);
            texto = `${quem} perdeu ${dano} de HP (${parte} da vida)!`;
            const g = this.ultimoGolpe;
            if (g) {
              g.acertos++;
              const avisos = g.avisos.length ? ` — ${g.avisos.splice(0).join(', ')}` : '';
              if (g.acertos === 1) {
                g.evento.registro = null;
                registro = `${g.quem} usou ${g.golpe} e causou ${dano} de dano (${parte} da vida)${avisos}`;
              } else registro = `${g.golpe} acertou de novo: ${dano} de dano (${parte} da vida)${avisos}`;
            }
          }
          if (texto && comando === '-damage' && !registro && antes.hp > (hp || 0)) {
            registro = `${texto.replace(/!$/, '')} (${antes.hp - (hp || 0)} de dano, ${porcento(((antes.hp - (hp || 0)) / max) * 100)} da vida)`;
          }
          // desmaiado vem como "0 fnt" (sem o máximo): usa o máximo guardado
          eventos.push({ tipo: 'hp', lado: ladoHp, hp: hp || 0, hpMax: max, texto, registro });
          break;
        }
        case 'faint':
          eventos.push({ tipo: 'desmaio', lado: this.lado(args[0]), texto: `${quem} desmaiou!` });
          break;
        // no registro lateral, "super efetivo"/"não é muito efetivo"/"crítico" vão no fim da frase do golpe
        case '-supereffective':
          eventos.push({ tipo: 'impacto', forte: true, texto: 'É super efetivo!', registro: this.avisoDoGolpe('super efetivo') });
          break;
        case '-resisted':
          eventos.push({ tipo: 'mensagem', texto: 'Não é muito efetivo...', registro: this.avisoDoGolpe('não é muito efetivo') });
          break;
        case '-immune':
          eventos.push({ tipo: 'mensagem', texto: `Não afeta ${quem}...` });
          break;
        case '-crit':
          eventos.push({ tipo: 'impacto', forte: true, texto: 'Um golpe crítico!', registro: this.avisoDoGolpe('crítico') });
          break;
        case '-miss':
          eventos.push({ tipo: 'mensagem', texto: `${quem} errou o ataque!` });
          break;
        case '-fail':
          eventos.push({ tipo: 'mensagem', texto: 'Mas falhou!' });
          break;
        case '-ohko':
          eventos.push({ tipo: 'impacto', forte: true, texto: 'É um nocaute instantâneo!' });
          break;
        case '-hitcount':
          eventos.push({ tipo: 'mensagem', texto: `Acertou ${args[1]} vez(es)!` });
          break;
        case '-status':
          eventos.push({ tipo: 'status', lado: this.lado(args[0]), status: args[1], texto: `${quem} ${NOMES_STATUS[args[1]] ?? args[1]}!` });
          break;
        case '-curestatus':
          eventos.push({ tipo: 'status', lado: this.lado(args[0]), status: null, texto: `${quem} ${CURA_STATUS[args[1]] ?? 'se curou'}!` });
          break;
        case 'cant': {
          const motivo = args[1];
          if (motivo === 'recharge' && this.ignorarRecarga) {
            this.ignorarRecarga = false;
            break;
          }
          const textos: Record<string, string> = {
            slp: `${quem} está dormindo profundamente.`,
            par: `${quem} está paralisado! Não consegue se mover!`,
            frz: `${quem} está congelado!`,
            flinch: `${quem} recuou de medo!`,
            recharge: `${quem} precisa recarregar!`,
          };
          eventos.push({ tipo: 'mensagem', texto: textos[motivo] ?? `${quem} não conseguiu se mover!` });
          break;
        }
        case '-boost':
        case '-unboost': {
          const n = Number(args[2]);
          const sobe = comando === '-boost';
          const atributo = NOMES_ATRIBUTOS[args[1]] ?? args[1];
          // cada frase inteira, sem pedaços colados: é assim que a tradução (client/src/idioma.ts) consegue reconhecer
          const texto =
            n === 0 ? (sobe ? `${atributo} de ${quem} não pode mais aumentar!` : `${atributo} de ${quem} não pode mais diminuir!`)
            : n >= 3 ? (sobe ? `${atributo} de ${quem} aumentou drasticamente!` : `${atributo} de ${quem} diminuiu drasticamente!`)
            : n === 2 ? (sobe ? `${atributo} de ${quem} aumentou muito!` : `${atributo} de ${quem} diminuiu muito!`)
            : sobe ? `${atributo} de ${quem} aumentou!` : `${atributo} de ${quem} diminuiu!`;
          eventos.push({ tipo: 'boost', lado: this.lado(args[0]), atributo: args[1], quantidade: sobe ? n : -n, texto });
          break;
        }
        case '-setboost':
          eventos.push({ tipo: 'boost', lado: this.lado(args[0]), atributo: args[1], quantidade: Number(args[2]), definir: true, texto: `${NOMES_ATRIBUTOS[args[1]] ?? args[1]} de ${quem} foi ao máximo!` });
          break;
        case '-clearboost':
          eventos.push({ tipo: 'zerarBoosts', lado: this.lado(args[0]), texto: `Os atributos de ${quem} voltaram ao normal!` });
          break;
        case '-clearallboost':
          eventos.push({ tipo: 'zerarBoosts', lado: null, texto: 'Os atributos de todos voltaram ao normal!' });
          break;
        case '-fieldstart':
        case '-fieldend': {
          const terreno = args[0].replace(/^move: /, '');
          const nome = TERRENOS[terreno];
          if (!nome) break;
          if (comando === '-fieldstart') eventos.push({ tipo: 'terreno', terreno, texto: `${nome} cobriu o campo de batalha!` });
          else eventos.push({ tipo: 'terreno', terreno: null, texto: `${nome} sumiu do campo.` });
          break;
        }
        case '-start': {
          const efeito = args[1].replace(/^move: /, '');
          if (efeito === 'Dynamax') {
            const lado = this.lado(args[0]);
            const sim = lado === 'jogador' ? this.eu.active[0] : this.ele.active[0];
            const giga = args[2] === 'Gmax';
            eventos.push({ tipo: 'dynamax', lado, forma: giga && sim ? `${sim.species.name}-Gmax` : null, texto: giga ? `${quem} ficou gigante: Gigantamax!` : `${quem} ficou gigante: Dynamax!` });
          } else if (efeito === 'confusion') eventos.push({ tipo: 'mensagem', texto: `${quem} ficou confuso!` });
          else if (efeito === 'Leech Seed') eventos.push({ tipo: 'mensagem', texto: `${quem} foi semeado!` });
          else if (efeito === 'Substitute') eventos.push({ tipo: 'mensagem', texto: `${quem} criou um substituto!` });
          break;
        }
        case '-ability': {
          // Ability anunciada: Trace (copiou a do outro), Pressure, Mold Breaker, Skill Swap…
          const habilidade = args[1];
          const dono = args.find((a) => a.startsWith('[of]'))?.slice(4).trim();
          if (de === 'ability: Trace' && dono) eventos.push({ tipo: 'mensagem', texto: `${quem} copiou a Ability ${habilidade} de ${this.nome(dono)} com Trace!` });
          else if (de) eventos.push({ tipo: 'mensagem', texto: `${quem} agora tem a Ability ${habilidade}! (${de.replace(/^(move|ability|item): /, '')})` });
          else eventos.push({ tipo: 'mensagem', texto: `Ability de ${quem}: ${habilidade}!` });
          break;
        }
        case '-activate':
          if (args[1] === 'confusion') eventos.push({ tipo: 'mensagem', texto: `${quem} está confuso!` });
          else if (args[1] === 'ability: Disguise') eventos.push({ tipo: 'mensagem', texto: `O disfarce de ${quem} serviu de isca!` });
          break;
        case '-end':
          if (args[1] === 'Dynamax') eventos.push({ tipo: 'dynamaxFim', lado: this.lado(args[0]), texto: `${quem} voltou ao tamanho normal.` });
          else if (args[1] === 'confusion') eventos.push({ tipo: 'mensagem', texto: `${quem} não está mais confuso!` });
          break;
        case '-weather':
          if (!args.includes('[upkeep]')) eventos.push({ tipo: 'clima', clima: args[0] === 'none' ? null : args[0], texto: CLIMAS[args[0]] });
          break;
        case '-prepare': {
          const g = Dex.moves.get(args[1]);
          eventos.push({ tipo: 'preparar', lado: this.lado(args[0]), golpe: g.id, tipoGolpe: g.type, texto: `${quem} está se preparando!` });
          break;
        }
        case 'win':
          eventos.push({ tipo: 'fim', vencedor: args[0] === this.eu.name ? 'jogador' : 'selvagem' });
          break;
      }
    }
    return eventos;
  }
}
