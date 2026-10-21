// Onde o jogador estava (pedido do dono): ao sair para Pokédex, Database, Eventos… e voltar pelo "Jogar" (ou M),
// ele volta ao mesmo mapa e ao mesmo tile, não ao centro da cidade. Fica na sessionStorage (vale também ao recarregar a aba).
import type { Destino } from './main';
import { carregarSave } from './estado';

const CHAVE = 'jogo-claude:lugar';
type Guardado = { destino?: Destino; posicoes: Record<string, { x: number; y: number }> };

function ler(): Guardado {
  try {
    const v = JSON.parse(sessionStorage.getItem(CHAVE) ?? 'null');
    if (v && typeof v === 'object' && v.posicoes && typeof v.posicoes === 'object') return v;
  } catch {}
  return { posicoes: {} };
}
const estado = ler();
let gravarDepois: number | undefined;
function gravar() {
  clearTimeout(gravarDepois);
  gravarDepois = window.setTimeout(() => {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {}
  }, 300);
}

/** Telas que são "lugares" do jogo (para onde o Jogar volta). */
export function lembrarLugar(destino: Destino): void {
  if (destino.tela !== 'cidade' && destino.tela !== 'bioma' && destino.tela !== 'regiao' && destino.tela !== 'safari') return;
  estado.destino = destino;
  gravar();
}

/** Último lugar em que o jogador estava (padrão: a cidade). */
export function ultimoLugar(): Destino {
  const d = estado.destino;
  // viajando de trem, os mapas ficam fechados
  if (!d || ((d.tela === 'bioma' || d.tela === 'regiao') && carregarSave()?.viagem)) return { tela: 'cidade' };
  return d;
}

/** Tile em que o jogador estava no mapa `chave` (a sala online: "cidade", "kanto:grama"…). */
export function posicaoSalva(chave: string): { x: number; y: number } | null {
  return estado.posicoes[chave] ?? null;
}
export function salvarPosicao(chave: string, x: number, y: number): void {
  estado.posicoes[chave] = { x, y };
  gravar();
}
