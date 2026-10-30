// Administração → Banco (pedido do dono): o que o cofre do banco da cidade tem guardado, e a staff muda as quantias.
// O banco só troca o que tem no cofre (shared/cambio.ts); cada mudança da staff fica no histórico (server/src/cambio.ts).
import { COFRE_MAXIMO, GOLD_CUSTA_SILVER, GOLD_VALE_SILVER, type Cofre } from '../../../shared/cambio';
import { api, ErroApi } from '../conta';
import { avisar } from '../ui/avisos';
import { confirmar } from '../ui/confirmar';
import { el } from '../ui/dom';
import { valorEmMoeda } from '../ui/moeda';

type Registro = { quando: number; por: string; antes: Cofre; depois: Cofre };
type Resposta = { cofre: Cofre; historico: Registro[] };

const num = (n: number) => n.toLocaleString('pt-BR');
const dataHora = (ms: number) => new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function secaoBanco(): { elemento: HTMLElement; parar: () => void } {
  const campo = (rotulo: string) => el('input', { type: 'number', min: 0, max: COFRE_MAXIMO, step: 1, class: 'db-busca', 'aria-label': rotulo }) as HTMLInputElement;
  const campoSilver = campo('Poké Dólares no cofre');
  const campoGold = campo('Origin Coins no cofre');
  const agora = el('div', { class: 'parceria-resumo' }, el('p', { class: 'meta' }, 'Carregando…'));
  const historico = el('div', {});
  const botao = el('button', { class: 'botao', type: 'button' }, 'Salvar cofre') as HTMLButtonElement;
  let atual: Cofre | null = null;

  const desenhar = (r: Resposta) => {
    atual = r.cofre;
    campoSilver.value = String(r.cofre.silver);
    campoGold.value = String(r.cofre.gold);
    agora.replaceChildren(
      el('div', {}, el('small', {}, 'Poké Dólares no cofre'), el('strong', {}, valorEmMoeda('silver', r.cofre.silver))),
      el('div', {}, el('small', {}, 'Origin Coins no cofre'), el('strong', {}, valorEmMoeda('gold', r.cofre.gold))),
      el('div', {}, el('small', {}, 'Dá para comprar dos jogadores'), el('strong', {}, `${num(Math.floor(r.cofre.silver / GOLD_VALE_SILVER))} Origin Coins`)),
    );
    historico.replaceChildren(...(r.historico.length
      ? [el('table', { class: 'parceria-tabela' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Quando'), el('th', {}, 'Quem'), el('th', {}, 'Poké Dólares'), el('th', {}, 'Origin Coins'))),
        el('tbody', {}, ...r.historico.map((h) => el('tr', {},
          el('td', {}, dataHora(h.quando)), el('td', {}, h.por),
          el('td', {}, `${num(h.antes.silver)} → ${num(h.depois.silver)}`),
          el('td', {}, `${num(h.antes.gold)} → ${num(h.depois.gold)}`)))))]
      : [el('p', { class: 'meta' }, 'Ninguém da staff mudou o cofre ainda.')]));
  };
  const erro = (e: unknown) => avisar(e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.', 'erro');
  const carregar = () => api<Resposta>('GET', '/admin/cofre').then(desenhar, erro);

  botao.addEventListener('click', async () => {
    const silver = Number(campoSilver.value);
    const gold = Number(campoGold.value);
    const valido = (v: number) => Number.isSafeInteger(v) && v >= 0 && v <= COFRE_MAXIMO;
    if (!valido(silver) || !valido(gold)) return avisar(`Use números inteiros de 0 a ${num(COFRE_MAXIMO)}.`, 'erro');
    if (atual && silver === atual.silver && gold === atual.gold) return avisar('O cofre já está com esses valores.');
    if (!(await confirmar('Mudar o cofre do banco?', `O cofre fica com ${num(silver)} Poké Dólares e ${num(gold)} Origin Coins. A mudança vale na hora para todos os jogadores.`))) return;
    botao.disabled = true;
    try {
      desenhar(await api<Resposta>('POST', '/admin/cofre', { silver, gold }));
      avisar('Cofre do banco atualizado.', 'ok');
    } catch (e) {
      erro(e);
    } finally {
      botao.disabled = false;
    }
  });
  void carregar();

  return {
    elemento: el('section', { class: 'bonus-secao', 'data-sem-traducao': '' },
      el('p', { class: 'sub' }, 'O cofre do banco da cidade. O banco só troca o que tem guardado: o que os jogadores pagam entra no cofre e o que recebem sai dele.'),
      el('p', { class: 'meta' }, `Hoje: comprar 1 Origin Coin custa ${num(GOLD_CUSTA_SILVER)} Poké Dólares; vender 1 Origin Coin dá ${num(GOLD_VALE_SILVER)} Poké Dólares.`),
      el('h2', {}, 'Agora'),
      agora,
      el('h2', {}, 'Mudar as quantias'),
      el('label', { class: 'cla-campo' }, 'Poké Dólares no cofre', campoSilver),
      el('label', { class: 'cla-campo' }, 'Origin Coins no cofre', campoGold),
      botao,
      el('h2', {}, 'Histórico da staff'),
      historico),
    parar: () => {},
  };
}
