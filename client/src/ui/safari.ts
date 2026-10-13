// Janela do NPC Safari (cidade): os Tickets Safari de hoje ficam no meio da barra do título (com o "+" para comprar
// o extra por gold); embaixo, escolhe o tipo e entra. Com um Safari em andamento, oferece continuar ou abandonar.
// Regras em shared/safari.ts.
import { POKEMON_POR_SALA, PRECO_ENTRADA_SAFARI_GOLD, SALAS_SAFARI, TIPOS_SAFARI, faltaParaVirarODia } from '../../../shared/safari';
import { nomeTipo } from '../../../shared/traducao';
import { textoDoTempo } from '../../../shared/viagem';
import { ErroApi } from '../conta';
import type { Save } from '../estado';
import type { Navegar } from '../main';
import { comprarTicketDoSafari, entrarNoSafari, fecharSafari, safariAberto, ticketsDeHoje } from '../safari';
import { corTipo, el } from './dom';
import { abrirJanela } from './janela';
import { iconeTicketEvento } from './ticketEvento';

/** Ticket Safari: o ticket de evento com o S (ui/ticketEvento.ts). */
export const iconeTicketSafari = () => iconeTicketEvento('S', 'Ticket Safari');

export function abrirSafari(save: Save, navegar: Navegar, aoMudar: () => void = () => {}): void {
  let tipo: string | null = null;
  let ocupado = false;
  let aviso = '';
  let abandonando = false;
  /** o "+" pede um segundo clique antes de gastar o gold */
  let comprando = false;

  const ir = () => {
    janela.fechar();
    navegar({ tela: 'safari' });
  };

  // tickets de hoje, no meio da barra do título: "1/1" (2/2 com VIP) e o "+" que compra mais um por gold
  const contador = el('div', { class: 'safari-tickets' });
  const desenharContador = () => {
    const { restam, total, comprada, livre } = ticketsDeHoje(save);
    contador.classList.toggle('vazio', !livre && restam === 0);
    contador.title = livre ? 'Administrador: entra sem gastar ticket' : `Tickets Safari de hoje: ${restam} de ${total}. Voltam à meia-noite.`;
    const semGold = save.gold < PRECO_ENTRADA_SAFARI_GOLD;
    contador.replaceChildren(
      iconeTicketSafari(),
      el('strong', { 'aria-label': livre ? 'Tickets livres' : `${restam} de ${total} tickets` }, livre ? '∞' : `${restam}/${total}`),
      livre || comprada
        ? ''
        : el('button', {
            class: 'safari-mais', type: 'button', disabled: ocupado || semGold,
            'aria-label': `Comprar mais 1 Ticket Safari por ${PRECO_ENTRADA_SAFARI_GOLD} Origin Coins`,
            title: semGold ? 'Você não tem Origin Coins suficientes' : `Comprar mais 1 ticket por ${PRECO_ENTRADA_SAFARI_GOLD} Origin Coins (vale só hoje)`,
            onclick: async () => {
              if (ocupado) return;
              if (!comprando) {
                comprando = true;
                window.setTimeout(() => {
                  comprando = false;
                  desenharContador();
                }, 4000);
                return desenharContador();
              }
              comprando = false;
              ocupado = true;
              aviso = '';
              janela.redesenhar();
              try {
                await comprarTicketDoSafari();
                aviso = 'Ticket Safari comprado! Ele vale até a meia-noite de hoje.';
                aoMudar();
              } catch (e) {
                aviso = e instanceof ErroApi ? e.message : 'Não foi possível comprar o ticket agora.';
              }
              ocupado = false;
              janela.redesenhar();
            },
          }, comprando ? `Pagar ${PRECO_ENTRADA_SAFARI_GOLD} Origin Coins?` : '+'),
    );
  };

  const janela = abrirJanela('Safari', () => {
    desenharContador();
    const aberto = safariAberto(save);
    if (aberto)
      return el('div', { class: 'safari' },
        el('div', { class: 'safari-andamento' },
          el('small', {}, 'Safari em andamento'),
          el('strong', {}, `Safari de ${nomeTipo(aberto.tipo)}`),
          el('span', {}, `Sala ${aberto.sala + 1} de ${SALAS_SAFARI}`)),
        el('p', { class: 'banco-aviso', role: 'status' }, aviso),
        el('div', { class: 'safari-botoes' },
          el('button', { class: 'botao', type: 'button', onclick: ir }, 'Continuar'),
          el('button', {
            class: 'botao perigo', type: 'button',
            onclick: () => {
              if (!abandonando) {
                abandonando = true;
                return janela.redesenhar();
              }
              fecharSafari(save);
              abandonando = false;
              janela.redesenhar();
            },
          }, abandonando ? 'Abandonar mesmo? O ticket não volta' : 'Abandonar')));

    const { restam, comprada, livre } = ticketsDeHoje(save);
    const podeEntrar = livre || restam > 0;
    const semTicket = podeEntrar ? '' : comprada ? 'Seus tickets de hoje acabaram. Volte amanhã!' : 'Seus tickets de hoje acabaram. Compre mais um no + lá em cima ou volte amanhã.';
    return el('div', { class: 'safari' },
      el('p', { class: 'meta' }, `Escolha um tipo. São ${SALAS_SAFARI} salas só suas, cada uma com ${POKEMON_POR_SALA} Pokémon desse tipo andando: clique em um para batalhar, os outros vão embora e a saída de cima abre. Aqui shiny e Pokémon raros aparecem 10× mais que nos mapas. Cada Safari gasta 1 ticket.`),
      livre ? null : el('small', { class: 'safari-relogio' }, `Os tickets voltam em ${textoDoTempo(faltaParaVirarODia(Date.now()))}`),
      el('div', { class: 'safari-tipos', role: 'radiogroup', 'aria-label': 'Tipo do Safari' },
        ...TIPOS_SAFARI.map((t) =>
          el('button', {
            class: `safari-tipo ${t === tipo ? 'ativo' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(t === tipo), disabled: ocupado, style: { '--cor-tipo': corTipo(t) },
            onclick: () => {
              tipo = t;
              aviso = '';
              janela.redesenhar();
            },
          }, nomeTipo(t)))),
      el('p', { class: 'banco-aviso', role: 'status' }, aviso || semTicket),
      el('button', {
        class: 'botao', type: 'button', disabled: !tipo || ocupado || !podeEntrar,
        onclick: async () => {
          if (!tipo || ocupado) return;
          ocupado = true;
          aviso = '';
          janela.redesenhar();
          try {
            await entrarNoSafari(tipo);
            return ir();
          } catch (e) {
            aviso = e instanceof ErroApi ? e.message : 'Não foi possível entrar no Safari agora.';
          }
          ocupado = false;
          janela.redesenhar();
        },
      }, tipo ? `Entrar no Safari de ${nomeTipo(tipo)}` : 'Escolha um tipo'));
  }, { classe: 'janela-banco', noTopo: contador });
}
