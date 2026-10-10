// Estação de trem da cidade: compra o ticket (silver ou gold) e escolhe a região. Quanto mais longe na ordem das
// regiões, mais a viagem demora. Quem cobra e conta o tempo é o servidor (client/src/viagem.ts).
import { REGIOES } from '../../../shared/regioes';
import { precoDoTicket, tempoDaViagemMs, textoDoTempo, type MoedaTicket } from '../../../shared/viagem';
import { vipAtivo } from '../../../shared/vip';
import { ErroApi } from '../conta';
import type { Save } from '../estado';
import { aoMudarViagem, comprarTicket, faltaDaViagem, ORDEM_DAS_REGIOES, viagemAtual } from '../viagem';
import { el } from './dom';
import { abrirJanela } from './janela';

const nomeDaRegiao = (id: string) => REGIOES.find((r) => r.id === id)?.nome ?? id;
const moeda = (tipo: MoedaTicket, valor: number) => el('span', { class: 'banco-moeda' }, el('span', { class: `icone-moeda moeda-${tipo}` }), el('strong', {}, valor.toLocaleString('pt-BR')), ` ${tipo}`);

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
    const pagar = (tipo: MoedaTicket) => async () => {
      if (!destino || ocupado) return;
      ocupado = true;
      aviso = '';
      janela.redesenhar();
      try {
        const para = destino;
        await comprarTicket(para, tipo);
        aviso = `Boa viagem! O trem para ${nomeDaRegiao(para)} partiu.`;
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
      el('p', { class: 'meta' }, `Escolha a região. Quanto mais longe, mais a viagem demora.${vip ? ' VIP: metade do tempo e metade do preço em silver.' : ''}`),
      el('div', { class: 'trem-regioes', role: 'radiogroup', 'aria-label': 'Região de destino' },
        ...REGIOES.filter((r) => r.id !== save.regiao).map((r) =>
          el('button', {
            class: `trem-regiao ${r.id === destino ? 'ativa' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(r.id === destino), disabled: ocupado || !r.disponivel,
            onclick: () => {
              destino = r.id;
              aviso = '';
              janela.redesenhar();
            },
          }, el('strong', {}, r.nome), el('small', {}, textoDoTempo(tempoDaViagemMs(ORDEM_DAS_REGIOES, save.regiao, r.id, vip)))))),
      el('p', { class: 'banco-aviso', role: 'status' }, aviso),
      el('div', { class: 'trem-pagar' },
        el('small', {}, destino ? `Ticket para ${nomeDaRegiao(destino)}` : 'Escolha uma região para comprar o ticket'),
        ...(['silver', 'gold'] as MoedaTicket[]).map((tipo) =>
          el('button', { class: 'botao', type: 'button', disabled: !destino || ocupado || save[tipo] < precoDoTicket(tipo, vip), title: save[tipo] < precoDoTicket(tipo, vip) ? `Você não tem ${tipo} suficiente` : '', onclick: pagar(tipo) },
            'Pagar ', moeda(tipo, precoDoTicket(tipo, vip))))));
  }, { classe: 'janela-banco', aoFechar: () => (clearInterval(tique), pararDeOuvir()) });

  const tique = window.setInterval(() => relogio(), 500);
  // a viagem começou ou terminou com a janela aberta
  const pararDeOuvir = aoMudarViagem(() => {
    if (!ocupado) janela.redesenhar();
  });
}
