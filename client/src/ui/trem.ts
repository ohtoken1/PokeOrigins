// Estação de trem da cidade: compra o ticket (silver ou gold) e escolhe a região. Quanto mais longe na ordem das
// regiões, mais a viagem demora. Quem cobra e conta o tempo é o servidor (client/src/viagem.ts).
import { REGIOES } from '../../../shared/regioes';
import { GOLPES_DE_VIAGEM, quemSabeGolpe, type MoedaTicket, precoDoTicket, tempoDaViagemMs, textoDoTempo, trechosEntre } from '../../../shared/viagem';
import { vipAtivo } from '../../../shared/vip';
import { ErroApi } from '../conta';
import type { PokemonDoJogador, Save } from '../estado';
import { pokemonPorId } from '../dados';
import { aoMudarViagem, comprarTicket, faltaDaViagem, ORDEM_DAS_REGIOES, viagemAtual } from '../viagem';
import { el } from './dom';
import { abrirJanela } from './janela';
import { valorEmMoeda } from './moeda';

const nomeDaRegiao = (id: string) => REGIOES.find((r) => r.id === id)?.nome ?? id;
const moeda = valorEmMoeda;

export function abrirEstacao(save: Save, aoMudar: () => void = () => {}): void {
  let destino: string | null = null;
  let ocupado = false;
  let aviso = '';
  /** Atualiza só o tempo que falta (sem refazer a janela). */
  let relogio = () => {};

  const janela = abrirJanela('Estação de trem', () => {
    const viagem = viagemAtual();
    if (viagem) {
      const falta = el('strong', { class: 'trem-relogio' });
      relogio = () => {
        const ms = faltaDaViagem();
        falta.textContent = ms > 0 ? textoDoTempo(ms) : 'Chegando…';
      };
      relogio();
      return el('div', { class: 'trem' },
        el('div', { class: 'trem-viajando' },
          el('small', {}, 'Viajando'),
          el('span', {}, `${nomeDaRegiao(viagem.de)} → ${nomeDaRegiao(viagem.para)}`),
          falta),
        el('p', { class: 'meta' }, 'Enquanto o trem não chega, você pode usar a cidade normalmente. Os mapas abrem quando a viagem terminar.'),
        el('p', { class: 'banco-aviso', role: 'status' }, aviso));
    }
    relogio = () => {};
    const vip = vipAtivo(save);
    const precoPara = (id: string) => precoDoTicket(trechosEntre(ORDEM_DAS_REGIOES, save.regiao, id), vip);
    const pagar = async (forma: MoedaTicket = 'silver') => {
      if (!destino || ocupado) return;
      ocupado = true;
      aviso = '';
      janela.redesenhar();
      try {
        const para = destino;
        await comprarTicket(para, forma);
        aviso = forma === 'fly' ? `Boa viagem! Você está voando para ${nomeDaRegiao(para)}.` : forma === 'surf' ? `Boa viagem! Você está surfando para ${nomeDaRegiao(para)}.` : `Boa viagem! O trem para ${nomeDaRegiao(para)} partiu.`;
        destino = null;
        aoMudar();
      } catch (e) {
        aviso = e instanceof ErroApi ? e.message : 'Não foi possível comprar o ticket agora.';
      }
      ocupado = false;
      janela.redesenhar();
    };
    return el('div', { class: 'trem' },
      el('div', { class: 'banco-saldo' }, el('small', {}, `Você está em ${nomeDaRegiao(save.regiao)}`), moeda('silver', save.silver), moeda('gold', save.gold)),
      el('p', { class: 'meta' }, `Escolha a região. Quanto mais longe, mais a viagem demora e mais caro é o ticket.${vip ? ' VIP: metade do tempo e metade do preço.' : ''}`),
      el('div', { class: 'trem-regioes', role: 'radiogroup', 'aria-label': 'Região de destino' },
        ...REGIOES.filter((r) => r.id !== save.regiao).map((r) =>
          el('button', {
            class: `trem-regiao ${r.id === destino ? 'ativa' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(r.id === destino), disabled: ocupado || !r.disponivel,
            onclick: () => {
              destino = r.id;
              aviso = '';
              janela.redesenhar();
            },
          }, el('strong', {}, r.nome), el('small', {}, `${textoDoTempo(tempoDaViagemMs(ORDEM_DAS_REGIOES, save.regiao, r.id, vip))} · `, valorEmMoeda('silver', precoPara(r.id)))))),
      el('p', { class: 'banco-aviso', role: 'status' }, aviso),
      el('div', { class: 'trem-pagar' },
        el('small', {}, destino ? `Ticket para ${nomeDaRegiao(destino)}` : 'Escolha uma região para comprar o ticket'),
        destino
          ? el('button', { class: 'botao', type: 'button', disabled: ocupado || save.silver < precoPara(destino), title: save.silver < precoPara(destino) ? 'Você não tem Poké Dólares suficientes' : '', onclick: () => pagar('silver') },
              'Pagar ', moeda('silver', precoPara(destino)))
          : null,
        ...(destino ? GOLPES_DE_VIAGEM : []).map((g) => {
          const p = quemSabeGolpe<PokemonDoJogador>(save.time, g);
          const nome = g === 'fly' ? 'Fly' : 'Surf';
          return p ? el('button', { class: 'botao', type: 'button', disabled: ocupado, title: `De graça, no mesmo tempo do trem`, onclick: () => pagar(g) }, `Usar ${nome} (${pokemonPorId(p.especieId).nome})`) : null;
        })));
  }, { classe: 'janela-banco', aoFechar: () => (clearInterval(tique), pararDeOuvir()) });

  const tique = window.setInterval(() => relogio(), 500);
  // a viagem começou ou terminou com a janela aberta
  const pararDeOuvir = aoMudarViagem(() => {
    if (!ocupado) janela.redesenhar();
  });
}
