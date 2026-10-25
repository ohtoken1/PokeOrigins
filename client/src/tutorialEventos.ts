// Ponte entre o jogo e o tutorial (client/src/tutorial.ts), sem imports, para qualquer tela poder avisar o que o
// jogador fez ("abriu o PC", "capturou", "plantou um Apricorn"…) sem criar ciclo de imports. O tutorial confere se
// era a missão do Professor da vez.

export type EventoTutorial =
  | 'bolsa' | 'bioma' | 'derrotou' | 'capturou' | 'cidade' | 'pc' | 'ficha'
  | 'arena' | 'recompensas' | 'plantouApricorn' | 'craftBola' | 'craftCharm' | 'mercado' | 'creche' | 'suspeito'
  | 'torneio' | 'guildas' | 'safari' | 'liga';

const ouvintes = new Set<(e: EventoTutorial) => void>();
export function tutorialFez(e: EventoTutorial): void {
  for (const f of ouvintes) f(e);
}
export const ouvirTutorial = (f: (e: EventoTutorial) => void) => void ouvintes.add(f);

/** Tela aberta agora (o quadro da missão esconde o "Ir até lá" quando o jogador já está lá). */
let tela = '';
let aoMudarTela: (() => void) | null = null;
export const telaAtual = () => tela;
export function definirTela(t: string): void {
  tela = t;
  aoMudarTela?.();
}
export const ouvirTela = (f: () => void) => void (aoMudarTela = f);

// "Ir até lá": a cidade (telas/cidade.ts) se registra enquanto está na tela e anda até o lugar pedido
let irNaCidade: ((acao: string) => boolean) | null = null;
let pendente: string | null = null;
/** A cidade entrou (fn) ou saiu (null) da tela; se havia um "Ir até lá" esperando, ele é feito agora. */
export function definirIrNaCidade(fn: ((acao: string) => boolean) | null): void {
  irNaCidade = fn;
  if (fn && pendente) {
    const acao = pendente;
    // a cena do mapa leva um instante para ficar pronta
    let tentativas = 0;
    const tentar = () => {
      if (irNaCidade?.(acao)) pendente = null;
      else if (++tentativas < 20 && irNaCidade) setTimeout(tentar, 300);
    };
    setTimeout(tentar, 300);
  }
}
/** Anda até um lugar da cidade; devolve false se a cidade não está na tela (o tutorial abre a cidade antes). */
export function irAteNaCidade(acao: string): boolean {
  pendente = acao;
  if (!irNaCidade) return false;
  definirIrNaCidade(irNaCidade);
  return true;
}
