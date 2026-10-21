// Teclas dos atalhos, que o jogador pode trocar (pedido do dono: pelo F1 ou em Opções). Ficam no navegador
// (`jogo-claude:teclas`); sem nada guardado valem as de PADRAO. Esc e F1 são fixas; W, A, S, D e as setas são de andar.

export type GrupoTecla = 'jogo' | 'batalha';
export interface AcaoTecla {
  id: string;
  nome: string;
  grupo: GrupoTecla;
  padrao: string;
}

export const ACOES_TECLA: AcaoTecla[] = [
  { id: 'bolsa', nome: 'Bolsa', grupo: 'jogo', padrao: 'i' },
  { id: 'pc', nome: 'PC', grupo: 'jogo', padrao: 'p' },
  { id: 'pokedex', nome: 'Pokédex', grupo: 'jogo', padrao: 'x' },
  { id: 'correio', nome: 'Correio', grupo: 'jogo', padrao: 'c' },
  { id: 'eventos', nome: 'Comunidade → Eventos', grupo: 'jogo', padrao: 'e' },
  { id: 'cura', nome: 'Centro Pokémon (cura)', grupo: 'jogo', padrao: 'h' },
  { id: 'mapas', nome: 'Voltar ao jogo (mapa onde estava)', grupo: 'jogo', padrao: 'm' },
  { id: 'chat', nome: 'Escrever no chat', grupo: 'jogo', padrao: 't' },
  { id: 'lutarSelvagem', nome: 'Lutar contra o Pokémon selvagem', grupo: 'jogo', padrao: ' ' },
  { id: 'lutar', nome: 'Lutar', grupo: 'batalha', padrao: 'f' },
  { id: 'golpe1', nome: 'Golpe 1', grupo: 'batalha', padrao: '1' },
  { id: 'golpe2', nome: 'Golpe 2', grupo: 'batalha', padrao: '2' },
  { id: 'golpe3', nome: 'Golpe 3', grupo: 'batalha', padrao: '3' },
  { id: 'golpe4', nome: 'Golpe 4', grupo: 'batalha', padrao: '4' },
  { id: 'bolsaBatalha', nome: 'Bolsa', grupo: 'batalha', padrao: 'b' },
  { id: 'pokemon', nome: 'Trocar de Pokémon', grupo: 'batalha', padrao: 'q' },
  { id: 'fugir', nome: 'Fugir / Desistir', grupo: 'batalha', padrao: 'r' },
  { id: 'passar', nome: 'Passar a mensagem', grupo: 'batalha', padrao: ' ' },
];

/** Teclas que não podem virar atalho (andar, fechar, lista de atalhos). */
const RESERVADAS = new Set(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'F1', 'Tab']);

const CHAVE = 'jogo-claude:teclas';
let trocadas: Record<string, string> = {};
try {
  const v = JSON.parse(localStorage.getItem(CHAVE) ?? '{}');
  if (v && typeof v === 'object') trocadas = v;
} catch {}

const gravar = () => {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(trocadas));
  } catch {}
};

/** A tecla do evento no formato guardado: letra/número/espaço em minúscula; as outras pelo nome (Enter, F2…). */
export const teclaDoEvento = (e: KeyboardEvent): string => (e.key.length === 1 ? e.key.toLowerCase() : e.key);

export const teclaDe = (id: string): string => trocadas[id] ?? ACOES_TECLA.find((a) => a.id === id)?.padrao ?? '';

/** Ação do grupo que usa esta tecla (null = nenhuma). */
export function acaoDaTecla(tecla: string, grupo: GrupoTecla): string | null {
  return ACOES_TECLA.find((a) => a.grupo === grupo && teclaDe(a.id) === tecla)?.id ?? null;
}

/** Nome para mostrar ("Espaço", "Enter", "I"). */
export function nomeDaTecla(tecla: string): string {
  if (tecla === ' ') return 'Espaço';
  return tecla.length === 1 ? tecla.toUpperCase() : tecla;
}

/**
 * Troca a tecla de uma ação. Se outra ação do mesmo grupo já usava essa tecla, as duas trocam entre si.
 * Devolve o motivo se não pode.
 */
export function mudarTecla(id: string, tecla: string): string | null {
  if (RESERVADAS.has(tecla) || RESERVADAS.has(tecla.toLowerCase())) return 'Essa tecla é reservada (andar, Esc, F1, Tab).';
  const acao = ACOES_TECLA.find((a) => a.id === id);
  if (!acao) return 'Atalho desconhecido.';
  const outra = ACOES_TECLA.find((a) => a.id !== id && a.grupo === acao.grupo && teclaDe(a.id) === tecla);
  if (outra) trocadas[outra.id] = teclaDe(id);
  trocadas[id] = tecla;
  // o que voltou ao padrão não precisa ficar guardado
  for (const a of ACOES_TECLA) if (trocadas[a.id] === a.padrao) delete trocadas[a.id];
  gravar();
  return null;
}

export function restaurarTeclas(): void {
  trocadas = {};
  gravar();
}

/** Enquanto o jogador escolhe uma tecla nova, nenhum atalho age. */
export let escolhendoTecla = false;
export const marcarEscolhendo = (v: boolean) => (escolhendoTecla = v);
