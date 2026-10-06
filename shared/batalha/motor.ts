// Batalha contra Pokémon selvagem usando o simulador do Pokémon Showdown (regras oficiais
// da 9ª geração: dano, tipos, golpes, habilidades, status). O Showdown não tem batalha
// selvagem, então captura e fuga são feitas aqui, com as fórmulas dos jogos originais.
import { Battle, Dex } from '@pkmn/sim';
import { especie, ppMaximo, type PokemonIndividual } from './pokemon';
import { efeitoRemedio, usarRemedio, type Item } from '../itens';

export type Lado = 'jogador' | 'selvagem';

export type EventoBatalha =
  | { tipo: 'mensagem'; texto: string }
  | { tipo: 'entrar'; lado: Lado; indice: number; hp: number; hpMax: number; texto?: string }
  | { tipo: 'golpe'; lado: Lado; alvo: Lado | null; golpe: string; tipoGolpe: string; categoria: string; texto: string }
  | { tipo: 'hp'; lado: Lado; hp: number; hpMax: number; texto?: string }
  | { tipo: 'status'; lado: Lado; status: string | null; texto?: string }
  | { tipo: 'impacto'; forte: boolean; texto: string }
  | { tipo: 'desmaio'; lado: Lado; texto: string }
  | { tipo: 'fim'; vencedor: Lado };

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
  | { tipo: 'acao'; golpes: OpcaoGolpe[]; podeTrocar: boolean; podeFugir: boolean }
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
const CLIMAS: Record<string, string> = {
  RainDance: 'Começou a chover!',
  SunnyDay: 'O sol ficou muito forte!',
  Sandstorm: 'Uma tempestade de areia começou!',
  Snowscape: 'Começou a nevar!',
  Hail: 'Começou a cair granizo!',
  none: 'O clima voltou ao normal.',
};

function conjuntoShowdown(p: PokemonIndividual, nome: string) {
  return {
    name: nome,
    species: especie(p.especieId).name,
    level: p.nivel,
    moves: p.golpes.map((g) => g.id),
    ability: p.habilidade,
    nature: p.natureza,
    gender: p.genero === 'N' ? '' : p.genero,
    shiny: p.shiny,
    item: '',
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
  ) {
    this.indices = time.map((_, i) => i).filter((i) => time[i].hp > 0);
    if (this.indices.length === 0) throw new Error('Nenhum Pokémon em condições de lutar');

    this.batalha = new Battle({ formatid: 'gen9customgame' as never });
    this.batalha.setPlayer('p1', { name: 'Jogador', team: this.indices.map((i) => conjuntoShowdown(time[i], `P${i}`)) as never });
    this.batalha.setPlayer('p2', { name: 'Selvagem', team: [conjuntoShowdown(selvagem, 'S0')] as never });
    this.objetos = this.batalha.p1.pokemon.slice();
    this.objetos.forEach((sim, k) => aplicarEstado(sim, time[this.indices[k]]));
    aplicarEstado(this.batalha.p2.pokemon[0], selvagem);
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
    return { tipo: 'acao', golpes, podeTrocar: !preso && this.reservasSaudaveis().length > 0, podeFugir: !preso };
  }

  /** Posições no time dos Pokémon que podem entrar no lugar do atual. */
  reservasSaudaveis(): number[] {
    const ativo = this.batalha.p1.active[0];
    return this.objetos.filter((o) => o !== ativo && !o.fainted && o.hp > 0).map((o) => this.indices[this.objetos.indexOf(o)]);
  }

  usarGolpe(indice: number): EventoBatalha[] {
    return this.jogar(`move ${indice}`);
  }

  trocar(posicaoNoTime: number): EventoBatalha[] {
    const obj = this.objetos[this.indices.indexOf(posicaoNoTime)];
    return this.jogar(`switch ${this.batalha.p1.pokemon.indexOf(obj) + 1}`);
  }

  /**
   * Arremessa uma Pokébola (fórmula da 3ª/4ª geração, bônus de status da 5ª em diante).
   * Se falhar, o selvagem ataca de graça.
   */
  arremessarBola(bonusBola: number): { capturou: boolean; tremidas: number; eventos: EventoBatalha[] } {
    const alvo = this.batalha.p2.active[0];
    const taxa = this.taxaCaptura;
    const bonusStatus = alvo.status === 'slp' || alvo.status === 'frz' ? 2.5 : alvo.status ? 1.5 : 1;
    const a = Math.floor((((3 * alvo.maxhp - 2 * alvo.hp) * taxa * bonusBola) / (3 * alvo.maxhp)) * bonusStatus);

    let tremidas = 0;
    if (a >= 255) tremidas = 4;
    else {
      const b = Math.floor(65536 / (255 / Math.max(1, a)) ** 0.1875);
      while (tremidas < 4 && Math.floor(this.aleatorio() * 65536) < b) tremidas++;
    }
    if (tremidas === 4) return { capturou: true, tremidas: 3, eventos: [] };
    return { capturou: false, tremidas, eventos: this.turnoGratisDoSelvagem() };
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
    const efeito = efeitoRemedio(item, { hp: sim.fainted ? 0 : sim.hp, hpMax: sim.maxhp, status: sim.fainted ? null : sim.status || null }, nome);
    if (!efeito) return null;
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
      for (const g of p.golpes) {
        const slot = sim.baseMoveSlots.find((s) => s.id === g.id);
        if (slot) g.pp = slot.pp;
      }
    };
    this.objetos.forEach((sim, k) => copiar(sim, this.time[this.indices[k]]));
    copiar(this.batalha.p2.pokemon[0], this.selvagem);
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
    if (lado.requestState !== 'move') return;
    const golpes = ((lado.activeRequest as any).active[0].moves as any[])
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => !m.disabled && (m.pp === undefined || m.pp > 0));
    const escolhido = golpes.length ? golpes[Math.floor(this.aleatorio() * golpes.length)].i + 1 : 1;
    this.batalha.choose('p2', `move ${escolhido}`);
  }

  private lerEventos(): EventoBatalha[] {
    const linhas = this.batalha.log.slice(this.lidas);
    this.lidas = this.batalha.log.length;
    const eventos = this.interpretar(linhas);
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
    if (ident.startsWith('p2')) return `${this.nomeSelvagem} selvagem`;
    return this.nomes[Number(apelido.slice(1))] ?? apelido;
  }

  private interpretar(linhas: string[]): EventoBatalha[] {
    const eventos: EventoBatalha[] = [];
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

      switch (comando) {
        case 'switch':
        case 'drag': {
          const lado = this.lado(args[0]);
          const [hp, hpMax] = args[2].split(' ')[0].split('/').map(Number);
          const indice = lado === 'jogador' ? Number(args[0].split(': ')[1].slice(1)) : 0;
          eventos.push({ tipo: 'entrar', lado, indice, hp, hpMax: hpMax ?? hp, texto: lado === 'jogador' ? `Vai, ${quem}!` : undefined });
          break;
        }
        case 'move': {
          const golpe = Dex.moves.get(args[1]);
          eventos.push({
            tipo: 'golpe',
            lado: this.lado(args[0]),
            alvo: args[2] ? this.lado(args[2]) : null,
            golpe: golpe.id,
            tipoGolpe: golpe.type,
            categoria: golpe.category,
            texto: `${quem} usou ${golpe.name}!`,
          });
          break;
        }
        case '-damage':
        case '-heal':
        case '-sethp': {
          const [hpTexto] = args[1].split(' ');
          const [hp, hpMax] = hpTexto.split('/').map(Number);
          let texto: string | undefined;
          if (de === 'brn') texto = `${quem} foi ferido pela queimadura!`;
          else if (de === 'psn' || de === 'tox') texto = `${quem} foi ferido pelo veneno!`;
          else if (de === 'Recoil') texto = `${quem} sofreu dano de recuo!`;
          else if (de === 'confusion') texto = 'Ele se feriu na confusão!';
          else if (de === 'drain') texto = `${this.nome(args.find((a) => a.startsWith('[of]'))?.slice(4).trim() ?? '')} teve a energia drenada!`;
          else if (de?.startsWith('item: ')) texto = `${quem} recuperou HP com ${de.slice(6)}!`;
          else if (de === 'Sandstorm' || de === 'Hail') texto = `${quem} foi atingido pelo clima!`;
          else if (de) texto = `${quem} foi afetado por ${de.replace(/^(move|ability): /, '')}!`;
          eventos.push({ tipo: 'hp', lado: this.lado(args[0]), hp: hp || 0, hpMax: hpMax ?? 0, texto });
          break;
        }
        case 'faint':
          eventos.push({ tipo: 'desmaio', lado: this.lado(args[0]), texto: `${quem} desmaiou!` });
          break;
        case '-supereffective':
          eventos.push({ tipo: 'impacto', forte: true, texto: 'É super efetivo!' });
          break;
        case '-resisted':
          eventos.push({ tipo: 'mensagem', texto: 'Não é muito efetivo...' });
          break;
        case '-immune':
          eventos.push({ tipo: 'mensagem', texto: `Não afeta ${quem}...` });
          break;
        case '-crit':
          eventos.push({ tipo: 'impacto', forte: true, texto: 'Um golpe crítico!' });
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
          eventos.push({ tipo: 'mensagem', texto: `${NOMES_ATRIBUTOS[args[1]] ?? args[1]} de ${quem}${intensidade}!` });
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
          if (!args.includes('[upkeep]') && CLIMAS[args[0]]) eventos.push({ tipo: 'mensagem', texto: CLIMAS[args[0]] });
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
