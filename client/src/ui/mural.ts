// Mural de anúncios da cidade: os avisos que a staff publicou (Administração → Anúncios), os mais novos primeiro.
import type { Anuncio } from '../../../shared/anuncios';
import { anuncioNovo, anuncios, aoMudarAnuncios, carregarAnuncios, marcarAnunciosLidos } from '../anuncios';
import { el } from './dom';
import { abrirJanela } from './janela';

const quando = (ms: number) => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Cartão de um anúncio (também usado na lista da Administração, com botões extras). */
export function cartaoAnuncio(a: Anuncio, novo = false, ...extras: (HTMLElement | null)[]): HTMLElement {
  return el('article', { class: `anuncio${novo ? ' novo' : ''}` },
    el('header', {}, el('h3', {}, a.titulo, novo ? el('span', { class: 'anuncio-selo' }, 'Novo') : null), ...extras),
    el('p', { class: 'anuncio-texto' }, a.texto),
    el('small', {}, `${quando(a.criadoEm)} · por ${a.autor}`));
}

export function abrirMural(): void {
  // os que eram novos ao abrir continuam marcados enquanto a janela está aberta
  let novos = new Set(anuncios().filter(anuncioNovo).map((a) => a.id));
  let erro = '';
  const janela = abrirJanela('Mural de anúncios', () => {
    const lista = anuncios();
    return el('div', { class: 'mural' },
      erro ? el('p', { class: 'meta' }, erro) : null,
      ...(lista.length ? lista.map((a) => cartaoAnuncio(a, novos.has(a.id))) : [el('p', { class: 'meta' }, 'Nenhum anúncio no mural por enquanto.')]));
  }, { classe: 'janela-mural', aoFechar: () => parar() });
  const parar = aoMudarAnuncios(() => janela.redesenhar());
  // busca de novo ao abrir (pode ter mudado com o jogo fora do ar) e marca como lido
  carregarAnuncios().then(() => {
    novos = new Set([...novos, ...anuncios().filter(anuncioNovo).map((a) => a.id)]);
    marcarAnunciosLidos();
  }, () => {
    erro = 'Sem conexão com o servidor: mostrando os anúncios que já tinham chegado.';
    janela.redesenhar();
  });
}
