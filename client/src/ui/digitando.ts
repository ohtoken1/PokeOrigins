/** Alguém está escrevendo num campo (chat, busca da loja…): as teclas não andam com o personagem nem começam batalha. */
export function digitando(): boolean {
  const a = document.activeElement as HTMLElement | null;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
}
