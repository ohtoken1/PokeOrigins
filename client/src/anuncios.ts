// Anúncios da staff (server/src/anuncios.ts): a lista fica guardada aqui e é buscada de novo quando o servidor
// avisa que mudou. O jogador lê no Mural de anúncios da cidade; a staff publica em Administração → Anúncios.
import type { Anuncio } from '../../shared/anuncios';
import { api, conta } from './conta';
import { aoAvisoDoServidor } from './online';
import { el } from './ui/dom';

let lista: Anuncio[] = [];
const ouvintes = new Set<() => void>();
const adotar = (nova: Anuncio[]) => {
  lista = nova;
  ouvintes.forEach((f) => f());
};

export const anuncios = () => lista;
export function aoMudarAnuncios(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
export const carregarAnuncios = async () => adotar(await api<Anuncio[]>('GET', '/anuncios'));
export const publicarAnuncio = async (titulo: string, texto: string) => adotar(await api<Anuncio[]>('POST', '/anuncios', { titulo, texto }));
export const apagarAnuncio = async (id: number) => adotar(await api<Anuncio[]>('DELETE', `/anuncios/${id}`));

// ---- o que este jogador já leu (fica no navegador: é só o selo de "novo") ----
const chaveVisto = () => `jogo-claude:anuncio-visto-${conta()?.id ?? 0}`;
function ultimoVisto(): number {
  try {
    return Number(localStorage.getItem(chaveVisto())) || 0;
  } catch {
    return 0;
  }
}
/** O anúncio ainda não foi lido no mural? */
export const anuncioNovo = (a: Anuncio) => a.id > ultimoVisto();
export const anunciosNovos = () => lista.filter(anuncioNovo).length;
/** O jogador abriu o mural: tudo o que está lá conta como lido. */
export function marcarAnunciosLidos(): void {
  try {
    localStorage.setItem(chaveVisto(), String(lista[0]?.id ?? 0));
  } catch {
    // sem armazenamento: o selo de "novo" volta ao recarregar
  }
  ouvintes.forEach((f) => f());
}

/** Liga os avisos do servidor (depois do login): anúncio novo mostra um aviso curto no canto. */
export function vigiarAnuncios(): void {
  const aviso = el('div', { class: 'aviso-anuncio', role: 'status', hidden: true });
  document.body.append(aviso);
  let relogio = 0;
  void carregarAnuncios().catch(() => {});
  aoAvisoDoServidor(async (msg) => {
    if (msg.t !== 'anuncios') return;
    const maisNovoAntes = lista[0]?.id ?? 0;
    await carregarAnuncios().catch(() => {});
    const novo = lista[0];
    // só avisa de anúncio NOVO (apagar um também muda a lista) e não para quem publicou
    if (!novo || novo.id <= maisNovoAntes || novo.autor === conta()?.usuario) return;
    aviso.replaceChildren(el('strong', {}, 'Novo anúncio no Mural da cidade'), el('span', {}, novo.titulo));
    aviso.hidden = false;
    clearTimeout(relogio);
    relogio = window.setTimeout(() => (aviso.hidden = true), 8000);
  });
}
