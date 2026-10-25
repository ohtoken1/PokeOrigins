// Batalha PvP entre dois jogadores: roda NO SERVIDOR (server/src/pvp.ts), com o mesmo simulador do Showdown e o
// mesmo motor do jogo. Cada jogador tem uma "visão" (BatalhaSelvagem em modo pvp): ele é o "jogador" e o outro é o
// "selvagem". O navegador só manda a escolha do turno ("move 1", "switch 3"); quem calcula tudo é o servidor.
// É a base do anti-trapaça do lançamento: no futuro as batalhas contra selvagens e NPCs podem vir para cá também.
import { Battle, Dex } from '@pkmn/sim';
import { BatalhaSelvagem, conjuntoShowdown, type EventoBatalha, type Pedido } from './motor';
import { curar, type PokemonIndividual } from './pokemon';
import { MemoriaIa, escolherAcaoIa, type NivelIa } from './ia';

export interface JogadorPvp {
  nome: string;
  time: PokemonIndividual[];
  /** nomes das espécies, na ordem do time (o servidor não tem os dados do jogo; o cliente manda junto do time) */
  nomes: string[];
}

/** O que o navegador de cada jogador precisa saber depois de cada turno (só o que aquele lado pode ver). */
export interface FotoPvp {
  pedido: Pedido;
  ativo: number;
  indices: number[];
  reservas: number[];
  atributos: ReturnType<BatalhaSelvagem['atributosEmCampo']>;
  campo: ReturnType<BatalhaSelvagem['campo']>;
  adversarioAtivo: number;
  golpesAdversario: ReturnType<BatalhaSelvagem['golpesUsadosAdversario']>;
  habilidadeRevelada: boolean;
  vencedor: 'jogador' | 'selvagem' | null;
}

/** Regras do Showdown ligadas durante a luta (Sleep Clause etc.). As de montar o time são conferidas antes. */
export type RegraPvp = 'Sleep Clause Mod';
/** Mecânicas liberadas (o Torneio pode desligar). Desligada = o botão não aparece e o servidor recusa. */
export interface MecanicasPvp { mega: boolean; dynamax: boolean; z: boolean; tera: boolean }
const TODAS: MecanicasPvp = { mega: true, dynamax: true, z: true, tera: true };

export class BatalhaPvp {
  readonly batalha: Battle;
  private visoes: [BatalhaSelvagem, BatalhaSelvagem];
  /** Os times da batalha (cópias; `timeFinal` devolve com HP, status e PP do fim). */
  private times: PokemonIndividual[][];

  /**
   * `curar`: quem entra curado (padrão: os dois). A Liga Pokémon (PvE no servidor) passa [false, true]: o time do
   * jogador entra como está (o desafio não cura entre as batalhas) e o do treinador, curado.
   */
  constructor(a: JogadorPvp, b: JogadorPvp, regras: RegraPvp[] = [], private mecanicas: MecanicasPvp = TODAS, curarTimes: [boolean, boolean] = [true, true]) {
    // cópias: o save de ninguém muda
    const times = [a, b].map((j, lado) =>
      j.time.map((p) => {
        const c = structuredClone(p);
        if (curarTimes[lado]) curar(c);
        return c;
      }),
    );
    this.times = times;
    // time sem curar (Liga) pode ter desmaiados: só os vivos entram no simulador (com o número original, P<i>)
    const vivos = times.map((t) => t.map((p, i) => ({ p, i })).filter((x) => x.p.hp > 0));
    if (vivos.some((v) => !v.length)) throw new Error('Nenhum Pokémon em condições de lutar');
    // o vencedor é reconhecido pelo nome: dois jogadores com o mesmo nome de treinador ganham um sufixo
    const nomes = [a.nome, a.nome === b.nome ? `${b.nome} (2)` : b.nome];
    const formato = `gen9customgame@@@${['HP Percentage Mod', ...regras].join(',')}`;
    this.batalha = new Battle({ formatid: formato as never, format: Dex.formats.get(formato, true) as never });
    // o formato de teste do Showdown mostra o HP exato dos dois lados; aqui cada um vê o do outro só em porcentagem
    this.batalha.reportExactHP = false;
    this.batalha.setPlayer('p1', { name: nomes[0], team: vivos[0].map(({ p, i }) => conjuntoShowdown(p, `P${i}`)) as never });
    this.batalha.setPlayer('p2', { name: nomes[1], team: vivos[1].map(({ p, i }) => conjuntoShowdown(p, `P${i}`)) as never });
    // Dynamax: o simulador só libera na 8ª geração; religamos para os dois (a Dynamax Band é conferida no pedido)
    for (const lado of [this.batalha.p1, this.batalha.p2]) {
      lado.dynamaxUsed = false;
      lado.canDynamaxNow = () => !lado.dynamaxUsed;
    }
    const visao = (eu: number, lado: 'p1' | 'p2') => {
      const outro = 1 - eu;
      const j = [a, b];
      return new BatalhaSelvagem(times[eu], j[eu].nomes, vivos[outro][0].p, j[outro].nomes[vivos[outro][0].i], 0, Math.random,
        { nome: nomes[outro], equipe: vivos[outro].map((x) => x.p), nomesEquipe: j[outro].nomes }, { batalha: this.batalha, lado });
    };
    this.visoes = [visao(0, 'p1'), visao(1, 'p2')];
  }

  /** Começa a batalha: devolve a entrada dos Pokémon vista por cada lado. */
  iniciar(): [EventoBatalha[], EventoBatalha[]] {
    return [this.visoes[0].iniciar(), this.visoes[1].eventosNovos()];
  }

  get terminou(): boolean {
    return this.batalha.ended;
  }

  /** Lado 0 ou 1 ainda precisa escolher neste turno? */
  precisaEscolher(lado: 0 | 1): boolean {
    return !this.batalha.ended && this.visoes[lado].pedido().tipo !== 'espera';
  }

  /**
   * Escolha de um lado: golpe (posição 1–4 e o especial) ou troca (posição no time). Devolve false se não vale
   * (golpe sem PP, Tera sem o Tera Orb, troca para desmaiado…). Quando os dois escolheram, o turno roda sozinho.
   */
  escolher(lado: 0 | 1, escolha: { tipo: 'golpe'; indice: number; especial: 'z' | 'tera' | 'mega' | 'dynamax' | null } | { tipo: 'troca'; posicao: number }): boolean {
    const v = this.visoes[lado];
    const pedido = this.pedido(lado);
    if (pedido.tipo === 'espera' || pedido.tipo === 'fim') return false;
    let comando: string;
    if (escolha.tipo === 'golpe') {
      if (pedido.tipo !== 'acao' || !Number.isInteger(escolha.indice) || escolha.indice < 1 || escolha.indice > pedido.golpes.length) return false;
      // os especiais seguem as mesmas regras da tela (item segurado), não só as do simulador
      if (escolha.especial === 'tera' && !pedido.tera) return false;
      if (escolha.especial === 'mega' && !pedido.mega) return false;
      if (escolha.especial === 'dynamax' && !pedido.dynamax) return false;
      if (escolha.especial === 'z' && !pedido.zGolpes?.[escolha.indice - 1]) return false;
      comando = v.comandoGolpe(escolha.indice, escolha.especial);
    } else {
      if (!v.indices.includes(escolha.posicao) || !(pedido.tipo === 'troca' || pedido.podeTrocar) || !v.reservasSaudaveis().includes(escolha.posicao)) return false;
      comando = v.comandoTroca(escolha.posicao);
    }
    return this.batalha.choose(lado === 0 ? 'p1' : 'p2', comando);
  }

  /**
   * Escolha automática do treinador NPC (Liga): troca para o próximo vivo quando precisa e, ao atacar, usa o golpe
   * IA no nível pedido (shared/batalha/ia.ts): Liga = médio, Nightmare = difícil.
   */
  escolherIa(lado: 0 | 1, nivel: NivelIa = 'dificil', aleatorio = Math.random): void {
    const id = lado === 0 ? 'p1' : 'p2';
    const s = this.batalha[id];
    if (s.requestState === 'switch') {
      const i = s.pokemon.findIndex((p) => !p.fainted && !p.isActive);
      if (i < 0 || !this.batalha.choose(id, `switch ${i + 1}`)) this.batalha.choose(id, 'default');
      return;
    }
    if (s.requestState !== 'move') return;
    this.memorias[lado] ??= new MemoriaIa();
    if (!escolherAcaoIa(this.batalha as never, s as never, this.batalha[lado === 0 ? 'p2' : 'p1'] as never, nivel, this.memorias[lado]!, aleatorio)) this.batalha.choose(id, 'default');
  }
  /** O que a IA de cada lado já viu (só lados de NPC). */
  private memorias: [MemoriaIa?, MemoriaIa?] = [];

  /** O time de um lado como terminou a batalha (HP, status, PP e frutas gastas). */
  timeFinal(lado: 0 | 1): PokemonIndividual[] {
    this.visoes[lado].sincronizar();
    return this.times[lado];
  }

  /** Desistência (ou tempo esgotado): o lado perde na hora. */
  desistir(lado: 0 | 1): void {
    if (!this.batalha.ended) this.batalha.lose(lado === 0 ? 'p1' : 'p2');
  }

  /** Os dois deixaram o tempo acabar: ninguém vence. */
  empatar(): void {
    if (!this.batalha.ended) this.batalha.tie();
  }

  /** Eventos novos (desde a última leitura) vistos por um lado. */
  eventos(lado: 0 | 1): EventoBatalha[] {
    return this.visoes[lado].eventosNovos();
  }

  /** Lado vencedor (0 ou 1), ou null enquanto não acabou. */
  get vencedor(): 0 | 1 | null {
    // empate (os dois deixaram o tempo acabar): sem vencedor
    if (!this.batalha.ended || !this.batalha.winner) return null;
    return this.visoes[0].vencedor === 'jogador' ? 0 : 1;
  }

  /** Pedido do lado, sem as mecânicas desligadas. */
  private pedido(lado: 0 | 1): Pedido {
    const p = this.visoes[lado].pedido();
    if (p.tipo !== 'acao') return p;
    const m = this.mecanicas;
    return { ...p, mega: m.mega && p.mega, dynamax: m.dynamax ? p.dynamax : null, zGolpes: m.z ? p.zGolpes : null, tera: m.tera ? p.tera : null };
  }

  foto(lado: 0 | 1): FotoPvp {
    const v = this.visoes[lado];
    const pedido = this.pedido(lado);
    return {
      pedido, ativo: v.ativo, indices: v.indices, reservas: pedido.tipo === 'fim' ? [] : v.reservasSaudaveis(),
      atributos: v.atributosEmCampo(), campo: v.campo(), adversarioAtivo: v.adversarioAtivo,
      golpesAdversario: v.golpesUsadosAdversario(), habilidadeRevelada: v.habilidadeSelvagemRevelada,
      vencedor: this.batalha.ended ? v.vencedor : null,
    };
  }
}
