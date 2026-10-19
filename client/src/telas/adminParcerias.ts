// Administração → Parceria (pedido do dono): códigos dos criadores de conteúdo. Cadastrar, descadastrar e
// recadastrar códigos; ver quanto foi doado com cada um (no mês e no total) e marcar o repasse feito no fim do mês.
// Quem guarda e soma é o servidor (server/src/parcerias.ts).
import { CRIADOR_MAX, type ParceriaPublica } from '../../../shared/parcerias';
import { api, ErroApi } from '../conta';
import { confirmar } from '../ui/confirmar';
import { el } from '../ui/dom';

type Resposta = { parcerias: ParceriaPublica[] };

const reais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (ms: number) => new Date(ms).toLocaleDateString('pt-BR');

export function secaoParcerias(): { elemento: HTMLElement; parar: () => void } {
  const campoCodigo = el('input', { type: 'text', class: 'db-busca', maxlength: 20, placeholder: 'Código (ex.: ASHGAMER)', 'aria-label': 'Código da parceria', autocomplete: 'off' }) as HTMLInputElement;
  const campoCriador = el('input', { type: 'text', class: 'db-busca', maxlength: CRIADOR_MAX, placeholder: 'Nome do criador de conteúdo', 'aria-label': 'Nome do criador' }) as HTMLInputElement;
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  const resumo = el('div', { class: 'parceria-resumo' });
  const lista = el('div', { class: 'parceria-lista' });
  const erro = (e: unknown) => void (aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.');
  // o código sai sempre em maiúsculas, sem espaços
  campoCodigo.addEventListener('input', () => (campoCodigo.value = campoCodigo.value.toUpperCase().replace(/[^A-Z0-9]/g, '')));

  const acao = async (url: string, pergunta: [string, string] | null, ok: string) => {
    if (pergunta && !(await confirmar(...pergunta))) return;
    try {
      desenhar(await api<Resposta>('POST', url));
      aviso.textContent = ok;
    } catch (e) {
      erro(e);
    }
  };

  const linha = (p: ParceriaPublica) => {
    const base = `/admin/parcerias/${encodeURIComponent(p.codigo)}`;
    return el('div', { class: `parceria-cartao ${p.ativo ? '' : 'inativa'}`, 'data-sem-traducao': '' },
      el('div', { class: 'parceria-topo' },
        el('strong', { class: 'parceria-codigo' }, p.codigo),
        el('span', {}, p.criador),
        el('span', { class: `parceria-status ${p.ativo ? 'ativa' : ''}` }, p.ativo ? 'Ativa' : 'Descadastrada')),
      el('div', { class: 'parceria-numeros' },
        el('div', {}, el('small', {}, 'Doado neste mês'), el('strong', {}, reais(p.doadoNoMes))),
        el('div', {}, el('small', {}, 'Falta repassar'), el('strong', { class: p.pendente > 0 ? 'parceria-pendente' : '' }, reais(p.pendente))),
        el('div', {}, el('small', {}, 'Total doado'), el('strong', {}, reais(p.doado))),
        el('div', {}, el('small', {}, 'Já repassado'), el('strong', {}, reais(p.repassado))),
        el('div', {}, el('small', {}, 'Usos do código'), el('strong', {}, p.usos.toLocaleString('pt-BR')))),
      el('small', { class: 'meta' }, `Cadastrada em ${data(p.criadoEm)}${p.ultimoRepasse ? ` · último repasse em ${data(p.ultimoRepasse)}` : ''}`),
      el('div', { class: 'parceria-botoes' },
        p.pendente > 0
          ? el('button', { class: 'botao', onclick: () => acao(`${base}/repasse`, ['Repasse feito', `Marcar como repassado ${reais(p.pendente)} para ${p.criador} (${p.codigo})? Faça o pagamento ao criador antes.`], `Repasse de ${reais(p.pendente)} para ${p.criador} registrado.`) }, `Marcar repasse feito (${reais(p.pendente)})`)
          : null,
        p.ativo
          ? el('button', { class: 'botao secundario', onclick: () => acao(`${base}/descadastrar`, ['Descadastrar', `Descadastrar o código ${p.codigo}? Ele para de funcionar nas doações, mas o histórico e o valor pendente continuam aqui.`], `Código ${p.codigo} descadastrado.`) }, 'Descadastrar')
          : el('button', { class: 'botao secundario', onclick: () => acao(`${base}/recadastrar`, null, `Código ${p.codigo} cadastrado de novo.`) }, 'Recadastrar')));
  };

  function desenhar(r: Resposta): void {
    const ativas = r.parcerias.filter((p) => p.ativo);
    const soma = (f: (p: ParceriaPublica) => number) => reais(r.parcerias.reduce((s, p) => s + f(p), 0));
    resumo.replaceChildren(
      el('div', {}, el('small', {}, 'Parcerias ativas'), el('strong', {}, String(ativas.length))),
      el('div', {}, el('small', {}, 'Doado neste mês'), el('strong', {}, soma((p) => p.doadoNoMes))),
      el('div', {}, el('small', {}, 'Falta repassar (todas)'), el('strong', {}, soma((p) => p.pendente))));
    lista.replaceChildren(...(r.parcerias.length ? r.parcerias.map(linha) : [el('p', { class: 'meta' }, 'Nenhuma parceria cadastrada ainda.')]));
  }

  const cadastrar = async () => {
    try {
      desenhar(await api<Resposta>('POST', '/admin/parcerias', { codigo: campoCodigo.value, criador: campoCriador.value }));
      aviso.textContent = `Código ${campoCodigo.value} cadastrado para ${campoCriador.value.trim()}.`;
      campoCodigo.value = '';
      campoCriador.value = '';
    } catch (e) {
      erro(e);
    }
  };

  void api<Resposta>('GET', '/admin/parcerias').then(desenhar, erro);

  const elemento = el('section', { class: 'admin-parcerias' },
    el('p', { class: 'sub' }, 'Códigos dos criadores de conteúdo. O jogador digita o código na página de doação e o valor doado fica somado aqui. No fim do mês, faça o pagamento ao criador e clique em "Marcar repasse feito". As doações só começam a contar quando o pagamento for ligado.'),
    el('h3', {}, 'Cadastrar parceria'),
    el('div', { class: 'parceria-form' }, campoCodigo, campoCriador, el('button', { class: 'botao', onclick: cadastrar }, 'Cadastrar')),
    aviso,
    resumo,
    el('h3', {}, 'Parcerias'),
    lista);
  return { elemento, parar: () => {} };
}
