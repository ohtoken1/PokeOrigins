// Prêmios dos eventos editáveis pela staff (Administração → Prêmios, pedido do dono 24/10/2026). SEM imports.
// Cada evento tem o seu padrão no arquivo dele (eventosRegras, torneioRegras, liga, recompensas); aqui fica só o que a
// staff MUDOU (seção ausente = vale o padrão). O servidor guarda em eventos_estado `premios-eventos`
// (server/src/ajustes.ts) e todos recebem por GET /api/ajustes.

/** Um prêmio: id do item ou saldo (`silver`, `gold`, `fragmentos`…) ou sorteio (`mint`, `charm`, `orb`). */
export interface Premio { id: string; nome: string; quantidade: number }
/** Fatia de roleta: o prêmio + a chance (as chances de uma roleta somam 1). */
export interface Fatia extends Premio { chance: number }
export interface PremioLiga { silver: number; porVitoria: number; bonus: number }

export interface AjustesPremios {
  ninho?: { silver: number; roleta: Fatia[] };
  /** `lugares` = 1º, 2º e 3º (as medalhas e a roleta do 1º continuam automáticas). */
  torneio?: { lugares: Premio[][]; roleta: Fatia[] };
  bossGlobal?: { top: Premio[][]; ate10: Premio[]; participar: Premio[] };
  bossGuilda?: { participar: number; podio: number[]; ate10: number };
  captura?: Premio[];
  liga?: { normal: PremioLiga; nightmare: PremioLiga };
  login7?: Premio[][];
  login30?: Premio[][];
  doacao?: { gold: number; premios: Premio[] }[];
  loteria?: { poteInicial: number };
  /** conteúdo do Kit de pré-registro (shared/kitPreRegistro.ts); vazio = ainda não definido */
  kitPreRegistro?: Premio[];
}
export type SecaoPremios = keyof AjustesPremios;

let ajustes: AjustesPremios = {};
export const ajustesPremios = (): AjustesPremios => ajustes;
export const definirAjustesPremios = (a: AjustesPremios | null | undefined) => void (ajustes = a ?? {});

/** Conteúdo do Kit de pré-registro (vazio até a staff definir em Administração → Prêmios). */
export const conteudoKitPreRegistro = (): Premio[] => ajustes.kitPreRegistro ?? [];

/** Ids que viram um item sorteado na hora (um por unidade). */
export const PREMIOS_ALEATORIOS = ['mint', 'charm', 'orb'];
