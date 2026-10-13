// Materiais de craft (pedido do dono; o sistema de craft vem depois, com a planilha dele): as Energies, uma por
// tipo, e os Apricorns. Por enquanto são só itens: caem nas batalhas e saem dos tickets.
import { TIPOS_DOS_CHARMS } from './charms';

/** Os 18 tipos, em minúsculas (os mesmos dos charms). */
export const TIPOS_DAS_ENERGIAS = TIPOS_DOS_CHARMS;
export type TipoEnergia = (typeof TIPOS_DAS_ENERGIAS)[number];

/** Chance de ganhar a Energy do tipo principal de um selvagem ao derrotar ou capturar (regra do dono). */
export const CHANCE_ENERGIA = 0.1;

export const idEnergia = (tipo: string) => `energy-${tipo}`;
/** "Fire Energy" (nomes de itens e de tipos ficam em inglês). */
export const nomeEnergia = (tipo: string) => `${tipo[0].toUpperCase()}${tipo.slice(1)} Energy`;
/** A Energy que um Pokémon solta: a do PRIMEIRO tipo dele (null se o tipo não tem Energy). */
export const energiaDoPokemon = (tipos: string[]): string | null => ((TIPOS_DAS_ENERGIAS as readonly string[]).includes(tipos[0]) ? idEnergia(tipos[0]) : null);
/** Sorteia se o selvagem soltou a Energy dele (id do item) ou nada. */
export const sortearEnergia = (tipos: string[], aleatorio = Math.random): string | null => (aleatorio() < CHANCE_ENERGIA ? energiaDoPokemon(tipos) : null);

/** Apricorns dos jogos (imagens da PokéAPI: sprites/items/<cor>-apricorn.png). */
export const CORES_DOS_APRICORNS = ['red', 'blue', 'yellow', 'green', 'pink', 'white', 'black'] as const;
export const idApricorn = (cor: string) => `apricorn-${cor}`;
export const nomeApricorn = (cor: string) => `${cor[0].toUpperCase()}${cor.slice(1)} Apricorn`;
