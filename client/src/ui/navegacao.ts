// Acesso à navegação entre telas para partes da interface que não recebem `navegar` (ex.: a ficha).
import type { Destino, Navegar } from '../main';
import { fecharTodasJanelas } from './janela';

let navegar: Navegar | undefined;

export function definirNavegacao(n: Navegar): void {
  navegar = n;
}

/** Fecha as janelas abertas (PC, bolsa, ficha…) e vai para a tela. */
export function irPara(destino: Destino): void {
  fecharTodasJanelas();
  navegar?.(destino);
}
