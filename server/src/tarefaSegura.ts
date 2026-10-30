/** Roda uma tarefa automática (as que repetem a cada tantos segundos): um erro só é registrado, nunca derruba o servidor. */
export function tarefaSegura(nome: string, tarefa: () => unknown): void {
  try {
    const r = tarefa();
    if (r instanceof Promise) r.catch((e) => console.error(`Tarefa ${nome} falhou`, e));
  } catch (e) {
    console.error(`Tarefa ${nome} falhou`, e);
  }
}
