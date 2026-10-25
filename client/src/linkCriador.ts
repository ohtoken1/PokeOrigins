// Link de divulgação dos criadores de conteúdo (pedido do dono, 24/10/2026): quem abre /c/CODIGO vai para a página de
// pré-registro com o código já preenchido, e a conta criada fica ligada a esse criador (server/src/parcerias.ts).
// Vale o ÚLTIMO link clicado antes de criar a conta (cada clique troca o guardado); depois de criada, a conta não
// muda mais de criador. O código fica guardado neste navegador por `VALIDADE_MS`.
import { LINK_CRIADOR, lerCodigoParceria } from '../../shared/parcerias';
import { api } from './conta';

const CHAVE = 'jogo-claude:criador';
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;

export interface CriadorDoLink { codigo: string; criador: string; em: number }

function guardar(c: CriadorDoLink | null): void {
  try {
    if (c) localStorage.setItem(CHAVE, JSON.stringify(c));
    else localStorage.removeItem(CHAVE);
  } catch {
    // navegador sem armazenamento: o código só não fica guardado
  }
}

/** O criador do último link aberto neste navegador (ou null). */
export function criadorDoLink(): CriadorDoLink | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as CriadorDoLink | null;
    if (c && lerCodigoParceria(c.codigo) && Date.now() - c.em < VALIDADE_MS) return c;
  } catch {
    // guardado estragado: some
  }
  guardar(null);
  return null;
}

/** Depois de criar a conta: o código já ficou na conta, não precisa mais. */
export const esquecerCriador = () => guardar(null);

/**
 * Se a página foi aberta por /c/CODIGO: conta o clique no servidor, guarda o criador e troca o endereço para
 * /pre-registro (a página de pré-registro abre a seguir). Código que não existe = não guarda nada.
 */
export async function lerLinkDeCriador(): Promise<void> {
  const m = location.pathname.match(LINK_CRIADOR);
  if (!m) return;
  history.replaceState(null, '', '/pre-registro');
  const codigo = m[1].toUpperCase();
  try {
    const r = await api<{ codigo: string; criador: string }>('POST', '/parcerias/clique', { codigo });
    guardar({ codigo: r.codigo, criador: r.criador, em: Date.now() });
  } catch {
    // código inexistente/descadastrado ou servidor fora do ar: segue sem criador
  }
}
