// Ganchos do carregador do Node (registrados por importarShared.mjs): completam o ".ts" dos imports de shared/ e
// carregam JSON sem precisar do "with { type: 'json' }".
export async function resolve(especificador, contexto, proximo) {
  try {
    return await proximo(especificador, contexto);
  } catch (erro) {
    if (!/^\.{1,2}\//.test(especificador) || /\.[a-z]+$/i.test(especificador)) throw erro;
    try {
      return await proximo(especificador + '.ts', contexto);
    } catch {
      return proximo(especificador + '/index.ts', contexto);
    }
  }
}
export async function load(url, contexto, proximo) {
  if (url.endsWith('.json')) return proximo(url, { ...contexto, importAttributes: { type: 'json' } });
  return proximo(url, contexto);
}
