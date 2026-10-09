// Modo desempenho (Opções): para computadores e celulares mais fracos. Desliga os enfeites que mais pesam
// (nuvens, folhas, pássaros, vaga-lumes, moradores e Pokémon passeando) e desenha o jogo na resolução normal
// (sem o dobro de pixels que tira o serrilhado). Guardado no navegador, vale para todos os saves.
const CHAVE = 'jogo-claude:desempenho';

export function modoDesempenho(): boolean {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

export function mudarModoDesempenho(ligado: boolean): void {
  try {
    localStorage.setItem(CHAVE, ligado ? '1' : '0');
  } catch {
    /* sem localStorage: fica só nesta visita */
  }
}
