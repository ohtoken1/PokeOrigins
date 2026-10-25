// Ajustes feitos pela staff no servidor (server/src/ajustes.ts): biomas (aplicados nos encontros por
// definirAjustesBiomas), os times de Médio/Difícil dos ginásios, as tiers (shared/tiers.ts) e os prêmios dos eventos
// (shared/premiosEventos.ts). Buscados ao abrir e a cada {t:'ajustes'}.
import { definirAjustesBiomas, type AjustesBiomas } from '../../shared/encontros';
import type { DificuldadeManual } from '../../shared/ginasiosDificuldade';
import type { PokemonIndividual } from '../../shared/batalha/pokemon';
import { definirAjustesTiers, type AjustesTiers } from '../../shared/tiers';
import { definirAjustesPremios, type AjustesPremios } from '../../shared/premiosEventos';
import { api } from './conta';
import { aoAvisoDoServidor } from './online';

export type TimesGinasio = Record<DificuldadeManual, Record<string, { pokemon: PokemonIndividual[] }>>;
export interface Ajustes { biomas: AjustesBiomas; ginasios: TimesGinasio; tiers?: AjustesTiers; premios?: AjustesPremios }

let times: TimesGinasio = { media: {}, dificil: {} };
const ouvintes = new Set<() => void>();

/** Time que a staff montou para o líder nessa dificuldade (vazio = ainda não montado). */
export const timeDoGinasio = (d: DificuldadeManual, lider: string): PokemonIndividual[] => times[d][lider]?.pokemon ?? [];
export const timesDosGinasios = (): TimesGinasio => times;
export function aoMudarAjustes(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Usado também pela Administração depois de gravar (a resposta já traz tudo). */
export function adotarAjustes(a: Ajustes): void {
  definirAjustesBiomas(a.biomas);
  definirAjustesTiers(a.tiers);
  definirAjustesPremios(a.premios);
  times = { media: a.ginasios?.media ?? {}, dificil: a.ginasios?.dificil ?? {} };
  ouvintes.forEach((f) => f());
}

async function buscar(): Promise<void> {
  try {
    adotarAjustes(await api<Ajustes>('GET', '/ajustes'));
  } catch {
    // sem conexão: fica com os de antes (ou o padrão do jogo)
  }
}

export function vigiarAjustes(): void {
  void buscar();
  aoAvisoDoServidor((msg) => void (msg.t === 'ajustes' && buscar()));
}
