// Administração → Torneio: a staff escolhe as regras do torneio das 18h30 (tier, limites de lendários/míticos/UB e
// mecânicas), abre um torneio na hora para testar e cancela o que estiver em andamento (devolve as entradas).
import { NOME_MECANICA, NOME_TIER, TIERS_TORNEIO, sortearRegras, textoDasRegras, type MecanicasTorneio, type RegrasTorneio } from '../../../shared/torneioRegras';
import { api, ErroApi } from '../conta';
import { el } from '../ui/dom';
import { confirmar } from '../ui/confirmar';

export function secaoTorneio(): { elemento: HTMLElement; parar: () => void } {
  let regras: RegrasTorneio = sortearRegras();
  let aviso = '';
  const caixa = el('section', { class: 'bonus-secao admin-torneio' });
  const pedir = async (metodo: 'GET' | 'POST', caminho: string, corpo?: unknown, feito = '') => {
    try {
      const r = await api<{ regras?: RegrasTorneio | null }>(metodo, caminho, corpo);
      if (r.regras) regras = r.regras;
      aviso = feito;
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    desenhar();
  };
  const limite = (rotulo: string, chave: 'lendarios' | 'miticos' | 'ub') =>
    el('label', {}, `${rotulo} `,
      el('select', { class: 'db-busca', onchange: (e: Event) => ((regras = { ...regras, [chave]: (e.target as HTMLSelectElement).value === '' ? null : Number((e.target as HTMLSelectElement).value) }), desenhar()) },
        ...[['', 'Sem limite'], ['0', 'Proibidos'], ['1', 'Até 1'], ['2', 'Até 2'], ['3', 'Até 3']].map(([v, t]) => el('option', { value: v, selected: String(regras[chave] ?? '') === v }, t))));

  function desenhar() {
    caixa.replaceChildren(
      el('p', { class: 'sub' }, 'O torneio das 12h30 tem as regras sorteadas pelo sistema. O das 18h30 usa as regras salvas aqui (sem regras salvas, também sorteia).'),
      el('p', { class: 'amigos-aviso', role: 'status' }, aviso),
      el('h3', {}, 'Regras do torneio das 18h30'),
      el('div', { class: 'admin-torneio-campos' },
        el('label', {}, 'Tier ', el('select', { class: 'db-busca', onchange: (e: Event) => ((regras = { ...regras, tier: (e.target as HTMLSelectElement).value as RegrasTorneio['tier'] }), desenhar()) },
          ...TIERS_TORNEIO.map((t) => el('option', { value: t, selected: t === regras.tier }, NOME_TIER[t])))),
        limite('Lendários', 'lendarios'), limite('Míticos', 'miticos'), limite('Ultra Beasts', 'ub'),
        ...(Object.keys(NOME_MECANICA) as (keyof MecanicasTorneio)[]).map((m) =>
          el('label', {}, el('input', { type: 'checkbox', checked: regras.mecanicas[m], onchange: (e: Event) => ((regras = { ...regras, mecanicas: { ...regras.mecanicas, [m]: (e.target as HTMLInputElement).checked } }), desenhar()) }), ` ${NOME_MECANICA[m]}`))),
      el('ul', { class: 'torneio-regras' }, ...textoDasRegras(regras).map((t) => el('li', {}, t))),
      el('div', { class: 'liga-nome' },
        el('button', { class: 'botao', onclick: () => void pedir('POST', '/admin/torneio', { regras }, 'Regras salvas para o torneio das 18h30.') }, 'Salvar para as 18h30'),
        el('button', { class: 'botao secundario', onclick: () => ((regras = sortearRegras()), desenhar()) }, 'Sortear'),
        el('button', { class: 'botao secundario', onclick: async () => (await confirmar('Confirmar', 'Abrir um torneio AGORA com estas regras? (inscrição de 5 minutos, para testes)')) && void pedir('POST', '/admin/torneio/abrir', { regras }, 'Torneio aberto! As inscrições fecham em 5 minutos.') }, 'Abrir torneio agora'),
        el('button', { class: 'botao perigo', onclick: async () => (await confirmar('Confirmar', 'Cancelar o torneio em andamento? As entradas são devolvidas.')) && void pedir('POST', '/admin/torneio/cancelar', {}, 'Torneio cancelado.') }, 'Cancelar torneio atual')));
  }
  desenhar();
  void pedir('GET', '/admin/torneio');
  return { elemento: caixa, parar: () => {} };
}
