// Mercado negro (server/src/mercado.ts, regras em shared/mercado.ts): chamadas do servidor e o vigia que busca
// o pagamento das vendas. Tudo que mexe no save é feito pelo servidor: o jogo salva antes de pedir e troca o save
// dele pelo que o servidor devolve.
import { itemDaLoja } from '../../shared/loja';
import type { AcertoMercado, AnuncioMercado, MoedaMercado, TipoAnuncio } from '../../shared/mercado';
import { nomeItemEquipado } from '../../shared/usoItens';
import { api } from './conta';
import { pokemonPorId } from './dados';
import { adotarSaveDoServidor, carregarSave, salvarAgora, type Save } from './estado';
import { aoAvisoDoServidor } from './online';
import { el } from './ui/dom';
import { nomeDaMoeda } from '../../shared/moedas';

export type ListaMercado = { anuncios: AnuncioMercado[]; meus: AnuncioMercado[]; pendentes: number; agora: number };
type ComSave = ListaMercado & { save: Save; versao: number };
export type NovoAnuncio = { tipo: TipoAnuncio; preco: number; moeda: MoedaMercado; uid?: number; item?: string; quantidade?: number };

export const nomeDoItem = (id: string): string => itemDaLoja(id)?.nome ?? nomeItemEquipado(id);
const numero = (n: number) => n.toLocaleString('pt-BR');

/** "Pikachu", "3x Potion" ou "50 gold". */
export function nomeDoAnunciado(a: { tipo: TipoAnuncio; especieId?: number; item?: string; quantidade?: number }): string {
  if (a.tipo === 'pokemon') return a.especieId ? pokemonPorId(a.especieId).nome : 'Pokémon';
  if (a.tipo === 'gold') return `${numero(a.quantidade ?? 0)} Origin Coins`;
  return `${numero(a.quantidade ?? 1)}x ${nomeDoItem(a.item ?? '')}`;
}

export const listaDoMercado = () => api<ListaMercado>('GET', '/mercado');

/** O servidor confere o save guardado: manda antes o que ainda não subiu e adota o save que volta. */
async function mudando(pedir: () => Promise<ComSave>): Promise<ListaMercado> {
  await salvarAgora();
  const r = await pedir();
  adotarSaveDoServidor(r.save, r.versao);
  return r;
}
export const anunciarNoMercado = (anuncio: NovoAnuncio) => mudando(() => api<ComSave>('POST', '/mercado', anuncio));
export const comprarNoMercado = (id: number) => mudando(() => api<ComSave>('POST', `/mercado/${id}/comprar`));
export const cancelarNoMercado = (id: number) => mudando(() => api<ComSave>('POST', `/mercado/${id}/cancelar`));

type Recebido = { acertos: AcertoMercado[]; save?: Save; versao?: number };

/** Busca o pagamento das vendas e o que venceu (ao abrir o jogo e quando o servidor avisa). Espera a batalha acabar. */
export function vigiarMercado(): void {
  const aviso = el('div', { class: 'aviso-anuncio aviso-entrega aviso-mercado', role: 'status', hidden: true });
  document.body.append(aviso);
  let relogio = 0;
  let esconder = 0;
  let buscando = false;
  const emBatalha = () => !!document.querySelector('.batalha-fundo');
  const depois = (ms: number) => {
    clearTimeout(relogio);
    relogio = window.setTimeout(() => void buscar(), ms);
  };
  async function buscar(): Promise<void> {
    if (buscando || !carregarSave()) return;
    if (emBatalha()) return depois(5000);
    buscando = true;
    try {
      const { pendentes } = await api<{ pendentes: number }>('GET', '/mercado/pendentes');
      if (!pendentes) return;
      await salvarAgora();
      if (emBatalha()) return depois(5000);
      const r = await api<Recebido>('POST', '/mercado/receber');
      if (!r.acertos.length || !r.save || r.versao === undefined) return;
      adotarSaveDoServidor(r.save, r.versao);
      aviso.replaceChildren(el('strong', {}, 'Mercado negro'), ...r.acertos.map((a) =>
        el('span', {}, a.motivo === 'vendido' ? `Vendeu ${nomeDoAnunciado(a)} por ${numero(a.valor ?? 0)} ${nomeDaMoeda(a.moeda, a.valor ?? 0)}`
        : a.motivo === 'pcCheio' ? `${nomeDoAnunciado(a)} não foi vendido e está esperando: seu PC está cheio. Libere espaço no PC para receber.`
        : `${nomeDoAnunciado(a)} voltou: ninguém comprou`)));
      aviso.hidden = false;
      clearTimeout(esconder);
      esconder = window.setTimeout(() => (aviso.hidden = true), 9000);
    } catch {
      // sem conexão ou save ocupado: tenta de novo daqui a pouco (o acerto continua guardado no servidor)
      depois(15000);
    } finally {
      buscando = false;
    }
  }
  aoAvisoDoServidor((msg) => {
    if (msg.t === 'mercado-acerto') void buscar();
  });
  void buscar();
}
