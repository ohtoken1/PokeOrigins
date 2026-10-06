// Efeito de captura de cada Pokébola (regras da 8ª/9ª geração, adaptadas aos biomas).
import { Dex } from '@pkmn/sim';
import { especie } from './batalha/pokemon';

export interface ContextoCaptura {
  especieId: number;
  tipos: string[];
  velocidadeBase: number;
  /** peso em kg */
  pesoKg: number;
  nivel: number;
  genero: string;
  status: string | null;
  /** Pokémon do jogador em campo */
  especieAtivo: number;
  nivelAtivo: number;
  generoAtivo: string;
  /** turno atual da batalha (1 = primeiro) */
  turno: number;
  bioma: string;
  /** o jogador já tem essa espécie (time ou PC) */
  jaPossui: boolean;
}

export interface EfeitoBola {
  /** multiplicador da chance de captura */
  bonus: number;
  /** soma direta na taxa de captura (Heavy Ball) */
  ajusteTaxa: number;
  /** captura garantida (Master Ball) */
  garantida: boolean;
}

const evoluiComMoonStone = (numero: number) =>
  (especie(numero).evos ?? []).some((nome) => Dex.items.get(Dex.species.get(nome).evoItem ?? '').id === 'moonstone');

export function efeitoBola(id: string, c: ContextoCaptura): EfeitoBola {
  const r = (bonus: number, ajusteTaxa = 0, garantida = false): EfeitoBola => ({ bonus, ajusteTaxa, garantida });
  switch (id) {
    case 'masterball':
      return r(1, 0, true);
    case 'greatball':
    case 'safariball':
    case 'sportball':
      return r(1.5);
    case 'ultraball':
      return r(2);
    case 'levelball':
      return r(c.nivelAtivo >= 4 * c.nivel ? 8 : c.nivelAtivo >= 2 * c.nivel ? 4 : c.nivelAtivo > c.nivel ? 2 : 1);
    case 'lureball':
      return r(c.bioma === 'agua' ? 4 : 1);
    case 'moonball':
      return r(evoluiComMoonStone(c.especieId) ? 4 : 1);
    case 'loveball': {
      const opostos = (c.genero === 'M' && c.generoAtivo === 'F') || (c.genero === 'F' && c.generoAtivo === 'M');
      return r(c.especieId === c.especieAtivo && opostos ? 8 : 1);
    }
    case 'heavyball':
      return r(1, c.pesoKg < 100 ? -20 : c.pesoKg < 200 ? 0 : c.pesoKg < 300 ? 20 : 30);
    case 'fastball':
      return r(c.velocidadeBase >= 100 ? 4 : 1);
    case 'netball':
      return r(c.tipos.includes('water') || c.tipos.includes('bug') ? 3.5 : 1);
    case 'diveball':
      return r(c.bioma === 'agua' ? 3.5 : 1);
    case 'nestball':
      return r(c.nivel < 30 ? Math.max(1, (41 - c.nivel) / 10) : 1);
    case 'repeatball':
      return r(c.jaPossui ? 3.5 : 1);
    case 'timerball':
      return r(Math.min(4, 1 + ((c.turno - 1) * 1229) / 4096));
    case 'quickball':
      return r(c.turno === 1 ? 5 : 1);
    case 'duskball':
      return r(c.bioma === 'caverna' || c.bioma === 'torre' ? 3 : 1);
    case 'dreamball':
      return r(c.status === 'slp' ? 4 : 1);
    case 'beastball':
      return r(0.1); // ainda não há Ultra Beasts no jogo
    default:
      return r(1); // Poké, Premier, Luxury, Friend, Heal…
  }
}
