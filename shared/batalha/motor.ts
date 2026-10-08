// Batalha contra Pokémon selvagem usando o simulador do Pokémon Showdown (regras oficiais
// da 9ª geração: dano, tipos, golpes, habilidades, status). O Showdown não tem batalha
// selvagem, então captura e fuga são feitas aqui, com as fórmulas dos jogos originais.
import { especieComItem } from '../formas';
import { megaPorForma } from '../megas';
import { Battle, Dex } from '@pkmn/sim';
import { AMIZADE_INICIAL, especie, ppMaximo, type PokemonIndividual } from './pokemon';
import { aplicarRemedio, usarRemedio, type Item } from '../itens';
import type { EfeitoBola } from '../bolas';

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
  /** Mudou de forma no meio da batalha (Primal Reversion…). */
  | { tipo: 'forma'; lado: Lado; forma: string; texto?: string }
  | { tipo: 'golpe'; lado: Lado; alvo: Lado | null; golpe: string; tipoGolpe: string; categoria: string; texto: string }
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
}

export type Pedido =
  /** `zGolpes[i]` = nome do Z-Move do golpe i (Pokémon segurando Z-Crystal), ou null. */
  /** `tera` = Tera Type se ainda pode terastalizar nesta batalha, ou null. `mega` = pode megaevoluir agora (Mega Stone certa). */
  | { tipo: 'acao'; golpes: OpcaoGolpe[]; podeTrocar: boolean; podeFugir: boolean; zGolpes: (string | null)[] | null; tera: string | null; mega: boolean }
  | { tipo: 'troca' }
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

function conjuntoShowdown(p: PokemonIndividual, nome: string) {
  return {
    name: nome,
    // formas que dependem do item (Giratina-Origin, Arceus-Fire…): o simulador não troca sozinho
    species: especieComItem(p.especieId, p.item),
    happiness: p.amizade ?? AMIZADE_INICIAL,
    teraType: p.teraTipo ?? especie(p.especieId).types[0],
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
  /** Posições no time do jogador de quem está na batalha (desmaiados ficam de fora). */
  readonly indices: number[];
  /** Posições no time de quem chegou a lutar (ganham experiência completa). */
  readonly participantes = new Set<number>();
  /** Pokémon do outro lado: o selvagem, ou o time do treinador NPC. */
  readonly adversarios: PokemonIndividual[];

  /** Posição (no time do adversário) de quem está em campo do outro lado. */
  get adversarioAtivo(): number {
    const ativo = this.batalha.p2.active[0];
    return ativo ? Math.max(0, this.batalha.p2.pokemon.indexOf(ativo)) : 0;
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
  ) {
    this.indices = time.map((_, i) => i).filter((i) => time[i].hp > 0);
    if (this.indices.length === 0) throw new Error('Nenhum Pokémon em condições de lutar');

    this.batalha = new Battle({ formatid: 'gen9customgame' as never });
    this.batalha.setPlayer('p1', { name: 'Jogador', team: this.indices.map((i) => conjuntoShowdown(time[i], `P${i}`)) as never });
    this.adversarios = treinador ? treinador.equipe : [selvagem];
    this.batalha.setPlayer('p2', { name: treinador ? treinador.nome : 'Selvagem', team: this.adversarios.map((p, k) => conjuntoShowdown(p, `S${k}`)) as never });
    this.objetos = this.batalha.p1.pokemon.slice();
    this.objetos.forEach((sim, k) => aplicarEstado(sim, time[this.indices[k]]));
    this.batalha.p2.pokemon.forEach((sim, k) => aplicarEstado(sim, this.adversarios[k]));
  }

  /** Começa a batalha (sai da tela de "prévia de time") e devolve a entrada dos Pokémon. */
  iniciar(): EventoBatalha[] {
    this.lidas = this.batalha.log.length;
    this.batalha.makeChoices('default', 'default');
    return this.lerEventos();
  }

  get terminou(): boolean {
    return this.batalha.ended;
  }

  get vencedor(): Lado | null {
    if (!this.batalha.ended) return null;
    return this.batalha.winner === 'Jogador' ? 'jogador' : 'selvagem';
  }

  /** Posição no time do Pokémon do jogador que está em campo. */
  get ativo(): number {
    return this.indices[this.objetos.indexOf(this.batalha.p1.active[0])];
  }

  pedido(): Pedido {
    if (this.batalha.ended) return { tipo: 'fim' };
    const req = this.batalha.p1.activeRequest as any;
    if (req?.forceSwitch) return { tipo: 'troca' };
    const ativo = req.active[0];
    const golpes: OpcaoGolpe[] = ativo.moves.map((m: any, i: number) => {
      const golpe = Dex.moves.get(m.id);
      return {
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
    const tera = typeof ativo.canTerastallize === 'string' ? (ativo.canTerastallize as string) : null;
    // contra treinador não dá para fugir
    // Mega só com Mega Stone (sem o atalho do Rayquaza por Dragon Ascent: pedido do dono)
    const mega = !!ativo.canMegaEvo && !!this.batalha.p1.active[0]?.getItem().megaStone;
    return { tipo: 'acao', golpes, podeTrocar: !preso && this.reservasSaudaveis().length > 0, podeFugir: !preso && !this.treinador, zGolpes, tera, mega };
  }

  /** Posições no time dos Pokémon que podem entrar no lugar do atual. */
  reservasSaudaveis(): number[] {
    const ativo = this.batalha.p1.active[0];
    return this.objetos.filter((o) => o !== ativo && !o.fainted && o.hp > 0).map((o) => this.indices[this.objetos.indexOf(o)]);
  }

  /**
   * `especial`: 'z' = usar como Z-Move (Z-Crystal certo); 'tera' = terastalizar antes de atacar;
   * 'mega' = megaevoluir antes de atacar (Mega Stone certa). Cada um: uma vez por batalha.
   */
  usarGolpe(indice: number, especial: 'z' | 'tera' | 'mega' | null = null): EventoBatalha[] {
    const sufixo = { z: ' zmove', tera: ' terastallize', mega: ' mega' };
    return this.jogar(`move ${indice}${especial ? sufixo[especial] : ''}`);
  }

  /** Clima e terreno em campo agora, com os turnos que faltam (null = não acaba sozinho, ex.: clima Primal). */
  campo(): { clima: string | null; turnosClima: number | null; terreno: string | null; turnosTerreno: number | null } {
    const f = this.batalha.field;
    const clima = f.weather ? f.getWeather().name : null;
    const terreno = f.terrain ? f.getTerrain().name : null;
    return {
      clima,
      turnosClima: clima && f.weatherState.duration ? f.weatherState.duration : null,
      terreno,
      turnosTerreno: terreno && f.terrainState.duration ? f.terrainState.duration : null,
    };
  }

  trocar(posicaoNoTime: number): EventoBatalha[] {
    const obj = this.objetos[this.indices.indexOf(posicaoNoTime)];
    return this.jogar(`switch ${this.batalha.p1.pokemon.indexOf(obj) + 1}`);
  }

  /**
   * Arremessa uma Pokébola (fórmula da 3ª/4ª geração, bônus de status da 5ª em diante).
   * Se falhar, o selvagem ataca de graça.
   */
  /** `chance` = probabilidade (0 a 1) de capturar com esse arremesso (as 4 checagens de tremida). */
  arremessarBola(bola: EfeitoBola): { capturou: boolean; tremidas: number; chance: number; eventos: EventoBatalha[] } {
    if (bola.garantida) return { capturou: true, tremidas: 3, chance: 1, eventos: [] };
    const alvo = this.batalha.p2.active[0];
    const bonusBola = bola.bonus;
    const taxa = Math.max(1, Math.min(255, this.taxaCaptura + bola.ajusteTaxa));
    const bonusStatus = alvo.status === 'slp' || alvo.status === 'frz' ? 2.5 : alvo.status ? 1.5 : 1;
    const a = Math.floor((((3 * alvo.maxhp - 2 * alvo.hp) * taxa * bonusBola) / (3 * alvo.maxhp)) * bonusStatus);

    let tremidas = 0;
    let chance = 1;
    if (a >= 255) tremidas = 4;
    else {
      // 3ª/4ª geração: 4 checagens, chance final ≈ a/255 (igual ao Pokémon Database)
      const b = Math.floor(1048560 / (16711680 / Math.max(1, a)) ** 0.25);
      chance = Math.min(1, b / 65536) ** 4;
      while (tremidas < 4 && Math.floor(this.aleatorio() * 65536) < b) tremidas++;
    }
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
      this.batalha.p1.pokemonLeft++;
    } else if (!efeito.status && sim.status) {
      sim.setStatus('');
    }
    sim.hp = efeito.hp;
    const eventos: EventoBatalha[] = [];
    if (sim === this.batalha.p1.active[0]) {
      eventos.push({ tipo: 'hp', lado: 'jogador', hp: sim.hp, hpMax: sim.maxhp }, { tipo: 'status', lado: 'jogador', status: sim.status || null });
    }
    return { mensagem: efeito.mensagem, eventos: [...eventos, ...this.turnoGratisDoSelvagem()] };
  }

  /** Status atual do selvagem (para a Dream Ball). */
  get statusSelvagem(): string | null {
    return this.batalha.p2.active[0]?.status || null;
  }

  /** Fórmula de fuga da 3ª/4ª geração. Se falhar, o selvagem ataca de graça. */
  fugir(): { fugiu: boolean; eventos: EventoBatalha[] } {
    this.tentativasFuga++;
    const A = this.batalha.p1.active[0].getStat('spe');
    const B = this.batalha.p2.active[0].getStat('spe');
    const chance = Math.floor((A * 128) / Math.max(1, B)) + 30 * this.tentativasFuga;
    if (A >= B || Math.floor(this.aleatorio() * 256) < chance) return { fugiu: true, eventos: [] };
    return { fugiu: false, eventos: this.turnoGratisDoSelvagem() };
  }

  /** Copia HP, status e PP do simulador de volta para o time e para o selvagem (se for capturado). */
  sincronizar(): void {
    const copiar = (sim: PokemonSim, p: PokemonIndividual) => {
      p.hp = sim.fainted ? 0 : sim.hp;
      p.status = sim.fainted || !sim.status ? null : sim.status;
      // frutas comidas na batalha são gastas; os outros itens voltam ao dono no fim (como nos jogos atuais)
      if (p.item && !sim.item && Dex.items.get(p.item).isBerry) p.item = null;
      for (const g of p.golpes) {
        const slot = sim.baseMoveSlots.find((s) => s.id === g.id);
        if (slot) g.pp = slot.pp;
      }
    };
    this.objetos.forEach((sim, k) => copiar(sim, this.time[this.indices[k]]));
    this.batalha.p2.pokemon.forEach((sim, k) => copiar(sim, this.adversarios[k]));
  }

  // ---------- interno ----------

  /** O jogador perde a vez (usou item ou falhou ao fugir): reaproveita a "recarga" do Hyper Beam. */
  private turnoGratisDoSelvagem(): EventoBatalha[] {
    this.batalha.p1.active[0].addVolatile('mustrecharge');
    this.ignorarRecarga = true;
    return this.jogar('move 1');
  }

  private jogar(escolha: string): EventoBatalha[] {
    this.escolherSelvagem();
    if (!this.batalha.choose('p1', escolha)) throw new Error(`Escolha inválida: ${escolha}`);
    return this.lerEventos();
  }

  private escolherSelvagem() {
    const lado = this.batalha.p2;
    if (lado.requestState === 'switch') return this.trocarAdversario();
    if (lado.requestState !== 'move') return;
    const golpes = ((lado.activeRequest as any).active[0].moves as any[])
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => !m.disabled && (m.pp === undefined || m.pp > 0));
    let escolhido = golpes.length ? golpes[Math.floor(this.aleatorio() * golpes.length)].i + 1 : 1;
    // treinador NPC: na maioria das vezes usa o golpe que mais machuca (tipo, STAB e poder)
    if (this.treinador && golpes.length && this.aleatorio() < 0.75) {
      const atacante = lado.active[0];
      const alvo = this.batalha.p1.active[0];
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
    const lado = this.batalha.p2;
    const proximo = lado.pokemon.findIndex((p) => !p.fainted && !p.isActive);
    if (proximo >= 0) this.batalha.choose('p2', `switch ${proximo + 1}`);
  }

  private lerEventos(): EventoBatalha[] {
    const linhas = this.batalha.log.slice(this.lidas);
    this.lidas = this.batalha.log.length;
    const eventos = this.interpretar(linhas);
    // só o treinador precisa trocar (o Pokémon dele desmaiou): ele troca sozinho e a batalha segue
    while (!this.batalha.ended && this.batalha.p2.requestState === 'switch' && this.batalha.p1.requestState !== 'switch') {
      this.trocarAdversario();
      const mais = this.batalha.log.slice(this.lidas);
      this.lidas = this.batalha.log.length;
      if (!mais.length) break;
      eventos.push(...this.interpretar(mais));
    }
    const ativo = this.batalha.p1.active[0];
    if (ativo && !ativo.fainted) this.participantes.add(this.ativo);
    return eventos;
  }

  private lado(ident: string): Lado {
    return ident.startsWith('p1') ? 'jogador' : 'selvagem';
  }

  private nome(ident: string): string {
    if (!ident) return '';
    const apelido = ident.split(': ')[1] ?? '';
    if (ident.startsWith('p2')) return this.treinador ? `${this.treinador.nomesEquipe[Number(apelido.slice(1))] ?? apelido} de ${this.treinador.nome}` : `${this.nomeSelvagem} selvagem`;
    return this.nomes[Number(apelido.slice(1))] ?? apelido;
  }

  /**
   * A ability do selvagem só aparece para o jogador depois que ela age na batalha
   * (ex.: Intimidate baixando o Attack, Levitate dando imunidade, Rough Skin causando dano).
   */
  habilidadeSelvagemRevelada = false;

  private revelaHabilidadeSelvagem(comando: string, args: string[], de: string | undefined): boolean {
    if (comando === '-ability') return args[0]?.startsWith('p2') ?? false;
    const deAbility = de?.startsWith('ability:') || args[1]?.startsWith('ability:');
    if (!deAbility) return false;
    // "[of] p2a: X" diz de quem é a ability; sem ele, é de quem aparece na linha
    const dono = args.find((a) => a.startsWith('[of]'))?.slice(4).trim() ?? args[0];
    return dono?.startsWith('p2') ?? false;
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
      // "|split|p1" vem antes de duas versões da mesma linha (secreta e pública): fica a secreta
      if (linha.startsWith('|split|')) {
        linha = linhas[i + 1];
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
          else eventos.push({ tipo: 'forma', lado: this.lado(args[0]), forma });
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
          };
          eventos.push(evento);
          this.ultimoGolpe = { quem, golpe: golpe.name, evento, acertos: 0, avisos: [] };
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
          const verbo = comando === '-boost' ? 'aumentou' : 'diminuiu';
          const intensidade = n === 0 ? ` não pode mais ${comando === '-boost' ? 'aumentar' : 'diminuir'}` : n >= 3 ? ` ${verbo} drasticamente` : n === 2 ? ` ${verbo} muito` : ` ${verbo}`;
          eventos.push({ tipo: 'boost', lado: this.lado(args[0]), atributo: args[1], quantidade: comando === '-boost' ? n : -n, texto: `${NOMES_ATRIBUTOS[args[1]] ?? args[1]} de ${quem}${intensidade}!` });
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
          if (efeito === 'confusion') eventos.push({ tipo: 'mensagem', texto: `${quem} ficou confuso!` });
          else if (efeito === 'Leech Seed') eventos.push({ tipo: 'mensagem', texto: `${quem} foi semeado!` });
          else if (efeito === 'Substitute') eventos.push({ tipo: 'mensagem', texto: `${quem} criou um substituto!` });
          break;
        }
        case '-activate':
          if (args[1] === 'confusion') eventos.push({ tipo: 'mensagem', texto: `${quem} está confuso!` });
          break;
        case '-end':
          if (args[1] === 'confusion') eventos.push({ tipo: 'mensagem', texto: `${quem} não está mais confuso!` });
          break;
        case '-weather':
          if (!args.includes('[upkeep]')) eventos.push({ tipo: 'clima', clima: args[0] === 'none' ? null : args[0], texto: CLIMAS[args[0]] });
          break;
        case '-prepare':
          eventos.push({ tipo: 'mensagem', texto: `${quem} está se preparando!` });
          break;
        case 'win':
          eventos.push({ tipo: 'fim', vencedor: args[0] === 'Jogador' ? 'jogador' : 'selvagem' });
          break;
      }
    }
    return eventos;
  }
}
