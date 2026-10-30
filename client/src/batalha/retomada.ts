// Voltar para a batalha depois de recarregar a página (pedido do dono): as batalhas que rodam no navegador (selvagem,
// Safari, Ninho, Boss, Duelos e Ginásios) ficam anotadas no SAVE enquanto duram: a semente do sorteio, o começo
// (time, adversário) e cada ação do jogador. Ao abrir o jogo, a tela de onde a batalha saiu abre de novo e a batalha
// é refeita igualzinha (o simulador e o nosso sorteio saem da mesma semente), parando no mesmo turno. Recarregar não
// sorteia nada de novo: não dá para trocar o Pokémon escolhido nem o resultado de um golpe.
import { biomaPorId, type Bioma } from '../../../shared/biomas';
import type { EfeitoBola } from '../../../shared/bolas';
import type { PokemonIndividual } from '../../../shared/batalha/pokemon';
import type { ItemId } from '../../../shared/itens';
import type { Destino } from '../main';
import type { PokemonDoJogador, Save } from '../estado';
import type { OpcoesBatalha } from './telaBatalha';

/** De onde a batalha saiu (a tela que a abre de novo e cuida do fim dela). */
export type ContextoBatalha =
  | { tipo: 'selvagem'; regiao: string; bioma: string }
  | { tipo: 'ninho'; regiao: string; bioma: string; slot: number; lendario: boolean; nome: string; especieId: number }
  | { tipo: 'safari' }
  | { tipo: 'boss' }
  | { tipo: 'duelo'; npc: string }
  | { tipo: 'ginasio'; lider: string; dificuldade: string };

/** Uma ação do jogador, na ordem em que aconteceu. */
export type AcaoGravada =
  | { t: 'golpe'; i: number; e: 'z' | 'tera' | 'mega' | 'dynamax' | null }
  | { t: 'troca'; pos: number }
  | { t: 'bola'; bola: ItemId; efeito: EfeitoBola; bonus: number }
  | { t: 'remedio'; pos: number; item: ItemId }
  | { t: 'fugir' };

/** O que um Pokémon do time tinha no começo da batalha (o que a batalha muda). */
type FotoDoMembro = { uid: number | undefined; hp: number; status: PokemonIndividual['status']; item: string | null | undefined; golpes: { id: string; pp: number }[] };

export interface BatalhaAberta {
  versao: 1;
  contexto: ContextoBatalha;
  semente: string;
  bioma: string;
  fundo: string;
  selvagem: PokemonIndividual;
  treinador: NonNullable<OpcoesBatalha['treinador']> | null;
  boss: { turnos: number } | null;
  time: FotoDoMembro[];
  acoes: AcaoGravada[];
  criadaEm: number;
}

const copia = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const fotoDoTime = (time: PokemonDoJogador[]): FotoDoMembro[] =>
  time.map((p) => ({ uid: p.uid, hp: p.hp, status: p.status, item: p.item, golpes: p.golpes.map((g) => ({ id: g.id, pp: g.pp })) }));

/** Anota a batalha que está começando (quem chama salva). */
export function anotarBatalha(save: Save, dados: Omit<BatalhaAberta, 'versao' | 'acoes' | 'criadaEm' | 'time'>): BatalhaAberta {
  const anotada: BatalhaAberta = { versao: 1, ...copia(dados), time: fotoDoTime(save.time), acoes: [], criadaEm: Date.now() };
  save.batalhaAberta = anotada;
  return anotada;
}

/**
 * Volta o time ao estado do começo da batalha (HP, status, item, PP). Falso se o time não é mais o mesmo (outro
 * Pokémon, outra ordem): aí não dá para refazer a batalha.
 */
export function restaurarTime(save: Save, foto: FotoDoMembro[]): boolean {
  if (foto.length !== save.time.length || foto.some((f, i) => f.uid !== save.time[i].uid)) return false;
  foto.forEach((f, i) => {
    const p = save.time[i];
    p.hp = f.hp;
    p.status = f.status;
    p.item = f.item ?? null;
    for (const g of p.golpes) g.pp = f.golpes.find((x) => x.id === g.id)?.pp ?? g.pp;
  });
  return true;
}

/** A batalha anotada, se for do tipo pedido. */
export function batalhaParaRetomar<T extends ContextoBatalha['tipo']>(save: Save, tipo: T): (BatalhaAberta & { contexto: Extract<ContextoBatalha, { tipo: T }> }) | null {
  const b = save.batalhaAberta;
  return b && b.versao === 1 && b.contexto?.tipo === tipo ? (b as never) : null;
}

/** Esquece a batalha anotada (não deu para voltar a ela; quem chama salva). */
export function descartarBatalha(save: Save): void {
  delete save.batalhaAberta;
}

/** O que passar para `abrirBatalha` para refazer a batalha anotada (o resto, `aoTerminar`, vem da tela). */
export function opcoesDaRetomada(b: BatalhaAberta): { selvagem: PokemonIndividual; treinador?: NonNullable<OpcoesBatalha['treinador']>; bioma: Bioma; retomada: BatalhaAberta } {
  const treinador = b.treinador ? copia(b.treinador) : undefined;
  return { selvagem: treinador ? treinador.equipe[0] : copia(b.selvagem), treinador, bioma: biomaPorId(b.bioma), retomada: b };
}

/** Para qual tela ir ao abrir o jogo com uma batalha anotada. */
export function destinoDaBatalha(b: BatalhaAberta): Destino {
  const c = b.contexto;
  if (c.tipo === 'selvagem' || c.tipo === 'ninho') return { tela: 'bioma', biomaId: c.bioma };
  if (c.tipo === 'safari') return { tela: 'safari' };
  if (c.tipo === 'duelo') return { tela: 'duelos' };
  if (c.tipo === 'ginasio') return { tela: 'ginasios' };
  return { tela: 'cidade' };
}
