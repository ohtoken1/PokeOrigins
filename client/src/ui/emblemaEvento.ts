// Emblemas dos eventos (pedido do dono, 29/10/2026: "algo bem legal" no lugar dos emojis; prévia aprovada em
// fora_github/previa-emblemas-eventos.html). Medalhão com aro dourado que brilha girando, a cor do evento no miolo
// (`--t1/--t2/--t3` de `.tema-<id>`), um reflexo que passa e um desenho próprio animado. CSS em `.emblema-evento`.
// O tamanho vem da variável `--tam` (banner, abas, agenda e painel da staff ajustam no CSS).
import type { IdEvento } from './temaEvento';

const DESENHOS: Record<IdEvento, string> = {
  torneio:
    '<path class="ee-ch" d="M20 10h24v12c0 9-5 15-12 15s-12-6-12-15z"/><path class="ee-tr" d="M20 14h-7c0 7 3 11 8 12M44 14h7c0 7-3 11-8 12"/><path class="ee-ch" d="M28 37h8v8h-8z"/><path class="ee-ch" d="M21 45h22v7H21z"/><path class="ee-cl ee-a-brilho" d="M38 13l1.5 3.5L43 18l-3.5 1.5L38 23l-1.5-3.5L33 18l3.5-1.5z"/>',
  ranqueado:
    '<g class="ee-a-espadaE"><path class="ee-ch" d="M14 12l4-2 22 26-4 4z"/><path class="ee-tr" d="M32 40l6 6M30 46l10-10"/></g><g class="ee-a-espadaD"><path class="ee-ch" d="M50 12l-4-2-22 26 4 4z"/><path class="ee-tr" d="M32 40l-6 6M34 46L24 36"/></g><path class="ee-cl ee-a-faisca" d="M32 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>',
  liga:
    '<g class="ee-a-flutua"><path class="ee-ch" d="M10 46l-3-26 13 10 12-18 12 18 13-10-3 26z"/><path class="ee-tr" d="M10 52h44"/><circle class="ee-cl" cx="32" cy="34" r="3.5"/><circle class="ee-cl" cx="20" cy="38" r="2.5"/><circle class="ee-cl" cx="44" cy="38" r="2.5"/></g><path class="ee-cl ee-a-brilho" d="M48 8l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3z"/>',
  nightmare:
    '<path class="ee-ch" d="M32 8c-12 0-20 8-20 19 0 6 3 11 7 14v8h26v-8c4-3 7-8 7-14C52 16 44 8 32 8z"/><path class="ee-a-olho" d="M19 28c2-4 8-4 10 1-2 4-8 4-10-1zM45 28c-2-4-8-4-10 1 2 4 8 4 10-1z"/><path class="ee-tr" d="M29 38l3-4 3 4M26 49v6M32 49v6M38 49v6"/>',
  boss:
    '<g class="ee-a-chifre"><path class="ee-ch" d="M14 26C8 18 10 8 16 5c-1 8 3 12 8 14M50 26c6-8 4-18-2-21 1 8-3 12-8 14"/><path class="ee-ch" d="M14 28c0-8 8-12 18-12s18 4 18 12v6c0 10-8 18-18 18S14 44 14 34z"/></g><path class="ee-cl" d="M21 30l8 4-8 3zM43 30l-8 4 8 3z"/><path class="ee-tr" d="M24 44l4-3 4 3 4-3 4 3"/>',
  outbreak:
    '<path class="ee-ch ee-a-chama" d="M32 56c-11 0-18-7-18-17 0-9 6-14 9-22 3 4 4 8 4 11 2-6 6-12 13-18 0 9 10 15 10 28 0 11-7 18-18 18z"/><path class="ee-cl ee-a-chama2" d="M32 56c-5 0-8-3-8-8 0-4 3-7 5-11 1 3 2 5 4 6 1-3 3-5 5-7 1 5 3 7 3 12 0 5-4 8-9 8z"/>',
  ninho:
    '<g class="ee-a-ovo"><path class="ee-cl" d="M32 8c-7 0-12 11-12 19 0 7 5 12 12 12s12-5 12-12c0-8-5-19-12-19z"/><path d="M24 22l4 3 4-3 4 3 4-3" fill="none" stroke="var(--t2)" stroke-width="2.5" stroke-linejoin="round"/></g><path class="ee-ch" d="M8 36c2 12 12 20 24 20s22-8 24-20z"/><path class="ee-tr" d="M12 42c6 3 12 0 18 3s14 1 22-3M14 49c8 2 14-1 20 1s10 0 14-2"/>',
  captura:
    '<circle class="ee-tr ee-a-onda" cx="32" cy="32" r="22"/><circle class="ee-ch" cx="32" cy="32" r="18"/><path class="ee-cl" d="M14 32a18 18 0 0 1 36 0z" opacity=".95" style="fill: #e8483f"/><path class="ee-tr" d="M14 32h12M38 32h12"/><circle class="ee-cl" cx="32" cy="32" r="6"/><circle cx="32" cy="32" r="6" fill="none" stroke="#1a0606" stroke-width="2.5"/>',
  cofre:
    '<rect class="ee-ch" x="8" y="10" width="48" height="44" rx="5"/><circle class="ee-tr" cx="32" cy="33" r="13"/><g class="ee-a-dial"><circle class="ee-cl" cx="32" cy="33" r="6"/><path class="ee-tr" d="M32 20v5M45 33h-5M32 46v-5M19 33h5"/></g><path class="ee-tr" d="M12 56v3M52 56v3"/>',
  loteria:
    '<circle class="ee-ch" cx="32" cy="32" r="22"/><g class="ee-a-roda"><path class="ee-cl" d="M32 32V10a22 22 0 0 1 19 11z"/><path class="ee-cl" d="M32 32l-19 11a22 22 0 0 1 0-22z" opacity=".55"/><path class="ee-cl" d="M32 32l0 22a22 22 0 0 1-19-11z" opacity=".85"/><path class="ee-tr" d="M32 10v44M13 21l38 22M13 43l38-22"/></g><circle class="ee-ou" cx="32" cy="32" r="5"/><path class="ee-ou" d="M28 4h8l-4 8z"/>',
  expedicao:
    '<circle class="ee-ch" cx="32" cy="32" r="22"/><circle class="ee-tr" cx="32" cy="32" r="16" stroke-dasharray="2 5"/><path class="ee-tr" d="M32 8v5M32 51v5M8 32h5M51 32h5"/><g class="ee-a-agulha"><path class="ee-cl" d="M32 14l5 18h-10z" style="fill: #ff6b5a"/><path class="ee-cl" d="M32 50l-5-18h10z"/></g><circle class="ee-ou" cx="32" cy="32" r="3"/>',
  safari:
    '<path class="ee-ch ee-a-folhaE" d="M32 54C14 52 6 38 10 20c12 4 20 14 22 34z"/><path class="ee-ch ee-a-folhaD" d="M32 54c18-2 26-16 22-34-12 4-20 14-22 34z"/><path class="ee-ch" d="M32 54C24 40 24 22 32 8c8 14 8 32 0 46z"/><path class="ee-tr" d="M32 54V18"/>',
};

/**
 * Quanto cada desenho anda (em unidades do viewBox de 64) para o centro dele cair no centro do medalhão (medido pela
 * caixa do desenho). Vai como `translate` no próprio <svg>: as animações (que giram em volta de pontos do viewBox) não mudam.
 * Loteria: só metade, porque a setinha de cima faz parte do desenho e a roda é que precisa ficar no meio.
 */
const AJUSTE: Partial<Record<IdEvento, [number, number]>> = {
  torneio: [0, 1], ranqueado: [0, 4], liga: [0, 1], nightmare: [0, 0.5], boss: [0, 3.5], outbreak: [-1.2, -2.8], cofre: [0, -2.5], loteria: [0, 1.5], safari: [0, 1],
};
const emPorcento = (n: number) => `${((n / 64) * 100).toFixed(2)}%`;

export function emblemaEvento(id: IdEvento): HTMLElement {
  const s = document.createElement('span');
  s.className = `emblema-evento tema-${id}`;
  s.setAttribute('aria-hidden', 'true');
  const [dx, dy] = AJUSTE[id] ?? [0, 0];
  s.innerHTML = `<svg viewBox="0 0 64 64" style="translate: ${emPorcento(dx)} ${emPorcento(dy)}">${DESENHOS[id]}</svg><span class="emblema-evento-reflexo"></span>`;
  return s;
}
