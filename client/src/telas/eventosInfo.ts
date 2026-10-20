// Comunidade → Eventos (pedido do dono): tela só informativa. Mostra o que está acontecendo agora, a agenda de hoje
// (horário de Brasília, relógio do servidor) e a lista de todos os eventos com onde, quando e prêmios. Mais para
// frente cada evento ganha um guia aqui.
import { DURACAO_JANELA_MS, JANELAS_RANQUEADO, janelaRanqueado } from '../../../shared/ranqueado';
import type { Tela } from '../main';
import { api } from '../conta';
import { aoAvisoDoServidor } from '../online';
import { outbreakAtual, HORAS_OUTBREAK } from '../outbreak';
import { ninhoAtual } from '../ninho';
import { REGIOES } from '../../../shared/regioes';
import { FECHA_VENDAS, HORA_SORTEIO, INTERVALO_NINHO_MS, slotDoNinho } from '../../../shared/eventosRegras';
import { HORARIOS_TORNEIO, ABRE_ANTES_MS, NOMES_RODADAS } from '../../../shared/torneioRegras';
import { agoraDoServidor } from '../ui/relogio';
import { el } from '../ui/dom';
import { EVENTOS, bannerEvento, textoTrancaDoEvento, type IdEvento } from '../ui/temaEvento';

interface EstadoEventos {
  boss: { tipo: string; nome: string; fim: number; ativo: boolean } | null;
  captura: { nome: string; fim: number; ativo: boolean } | null;
  cofre: { aberto: boolean; premio: string } | null;
  loteria: { pote: number; vendendo: boolean; pausada: boolean };
}
interface EstadoTorneio { torneio: { fase: string; rodada: number; inscritos: unknown[] } | null }

const BRASILIA_MS = -3 * 3600_000;
const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
const falta = (ms: number) => {
  const min = Math.max(0, Math.ceil(ms / 60_000));
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
};
/** Meia-noite de hoje em Brasília (ms). */
const inicioDoDia = (agora: number) => {
  const br = new Date(agora + BRASILIA_MS);
  return Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate()) - BRASILIA_MS;
};
const nomeDaRegiao = (id: string) => REGIOES.find((r) => r.id === id)?.nome ?? id;

export const telaEventosInfo: Tela = (raiz) => {
  let eventos: EstadoEventos | null = null;
  let torneio: EstadoTorneio | null = null;
  const conteudo = el('div', { class: 'tela-eventos-info' });
  raiz.append(el('main', { class: 'tela' }, conteudo));

  const carregar = async () => {
    [eventos, torneio] = await Promise.all([
      api<EstadoEventos>('GET', '/eventos').catch(() => eventos),
      api<EstadoTorneio>('GET', '/torneio').catch(() => torneio),
    ]);
    desenhar();
  };

  /** Eventos que estão valendo agora, com o que falta e onde. */
  function ativos(agora: number): HTMLElement[] {
    const lista: { id: IdEvento; titulo?: string; subtitulo: string; selo: string }[] = [];
    const o = outbreakAtual(agora);
    if (o) lista.push({ id: 'outbreak', titulo: `Outbreak de ${o.nome}`, subtitulo: `${nomeDaRegiao(o.regiao)} · ${o.bioma.nome}`, selo: `● ${falta(o.fim - agora)}` });
    const n = ninhoAtual();
    if (n) lista.push({ id: 'ninho', titulo: `Ninho de ${n.nome}`, subtitulo: `${nomeDaRegiao(n.regiao)} · ${n.bioma.nome}`, selo: `● ${falta(n.servidor.fim - agora)}` });
    const t = torneio?.torneio;
    if (t && t.fase !== 'fim' && t.fase !== 'cancelado')
      lista.push({ id: 'torneio', subtitulo: t.fase === 'inscricao' ? `Inscrições abertas na Arena: ${t.inscritos.length}/16` : t.fase === 'aguardando' ? 'Inscrições fechadas: a disputa já vai começar' : `Em disputa: ${NOMES_RODADAS[t.rodada] ?? ''}`, selo: '● AO VIVO' });
    const r = janelaRanqueado(agora);
    if (r.aberta) lista.push({ id: 'ranqueado', subtitulo: 'Fila aberta na Arena da cidade', selo: `● ${falta(r.fimEm! - agora)}` });
    if (eventos?.boss?.ativo) lista.push({ id: 'boss', titulo: eventos.boss.tipo === 'global' ? 'Boss global' : 'Boss da guilda', subtitulo: `${eventos.boss.nome} na gaiola da cidade`, selo: `● ${falta(eventos.boss.fim - agora)}` });
    if (eventos?.captura?.ativo) lista.push({ id: 'captura', subtitulo: `Espécie: ${eventos.captura.nome}`, selo: `● ${falta(eventos.captura.fim - agora)}` });
    if (eventos?.cofre?.aberto) lista.push({ id: 'cofre', subtitulo: `Prêmio: ${eventos.cofre.premio}`, selo: '● AO VIVO' });
    if (eventos?.loteria.vendendo) lista.push({ id: 'loteria', subtitulo: `Prêmio acumulado: ${eventos.loteria.pote.toLocaleString('pt-BR')} Poké Dólares`, selo: '● Vendas abertas' });
    return lista.map((a) => bannerEvento(a.id, { titulo: a.titulo, subtitulo: a.subtitulo, selo: { texto: a.selo, estado: 'ativo' } }));
  }

  /**
   * Agenda das próximas 24 horas (hoje e amanhã), em ordem de horário: o que acabou nas últimas 3 horas fica apagado,
   * o que está valendo aparece como "Agora" e o próximo, destacado.
   */
  function agenda(agora: number): HTMLElement {
    const hoje = inicioDoDia(agora);
    const itens: { id: IdEvento; inicio: number; fim: number; texto: string; amanha: boolean; desdeMeiaNoite?: boolean }[] = [];
    for (const dia of [hoje, hoje + 24 * 3600_000]) {
      const as = (h: number, m = 0) => dia + (h * 60 + m) * 60_000;
      const amanha = dia !== hoje;
      for (const h of HORARIOS_TORNEIO) {
        const comeca = as(h.hora, h.minuto);
        itens.push({ id: 'torneio', inicio: comeca - ABRE_ANTES_MS, fim: comeca, texto: `Inscrição do Torneio das ${hora(comeca)} (${h.tipo === 'staff' ? 'regras da staff' : 'regras sorteadas'})`, amanha });
        itens.push({ id: 'torneio', inicio: comeca, fim: comeca + 1, texto: `Torneio das ${hora(comeca)}`, amanha });
      }
      for (const j of JANELAS_RANQUEADO) itens.push({ id: 'ranqueado', inicio: as(j.hora, j.minuto), fim: as(j.hora, j.minuto) + DURACAO_JANELA_MS, texto: 'Fila do PvP Ranqueado (1 hora)', amanha });
      for (const h of HORAS_OUTBREAK) itens.push({ id: 'outbreak', inicio: as(h), fim: as(h + 1), texto: 'Outbreak (1 hora)', amanha });
      itens.push({ id: 'loteria', inicio: as(0), fim: as(FECHA_VENDAS.hora, FECHA_VENDAS.minuto), texto: 'Venda de bilhetes da Loteria', amanha, desdeMeiaNoite: true });
      itens.push({ id: 'loteria', inicio: as(HORA_SORTEIO.hora, HORA_SORTEIO.minuto), fim: as(HORA_SORTEIO.hora, HORA_SORTEIO.minuto) + 60_000, texto: 'Sorteio da Loteria', amanha });
    }
    const proximoNinho = (slotDoNinho(agora) + 1) * INTERVALO_NINHO_MS;
    itens.push({ id: 'ninho', inicio: proximoNinho, fim: proximoNinho + 1, texto: 'Próximo Ninho (um a cada 20 minutos)', amanha: proximoNinho >= hoje + 24 * 3600_000 });
    const janela = itens.filter((i) => i.fim > agora - 3 * 3600_000 && i.inicio < agora + 24 * 3600_000).sort((a, b) => a.inicio - b.inicio);
    const proximo = janela.find((i) => i.inicio > agora);
    return el('ul', { class: 'eventos-agenda' }, ...janela.map((i) => {
      const estado = i.fim <= agora ? 'passou' : i.inicio <= agora ? 'agora' : i === proximo ? 'proximo' : '';
      // a venda da Loteria começa à meia-noite: mostra só o fim
      const horario = i.desdeMeiaNoite ? `até ${hora(i.fim)}` : i.fim - i.inicio > 60_000 ? `${hora(i.inicio)}–${hora(i.fim)}` : hora(i.inicio);
      return el('li', { class: `tema-${i.id} ${estado}` },
        el('span', { class: 'hora' }, i.amanha ? `Amanhã ${horario}` : horario),
        el('span', { 'aria-hidden': 'true' }, EVENTOS[i.id].emblema),
        el('span', {}, i.texto),
        el('span', { class: 'estado' }, estado === 'passou' ? 'Já passou' : estado === 'agora' ? 'Agora' : estado === 'proximo' ? `Em ${falta(i.inicio - agora)}` : ''));
    }));
  }

  const cartao = (id: IdEvento) => {
    const e = EVENTOS[id];
    return el('article', { class: `evento-cartao tema-${id}` },
      bannerEvento(id),
      el('dl', {},
        el('dt', {}, 'O que é'), el('dd', {}, e.descricao),
        el('dt', {}, 'Onde'), el('dd', {}, e.onde),
        el('dt', {}, 'Quando'), el('dd', {}, e.quando),
        el('dt', {}, 'Prêmios'), el('dd', {}, e.premios),
        el('dt', {}, 'Requisito'), el('dd', {}, textoTrancaDoEvento(e))),
      el('p', { class: 'evento-guia' }, '📖 Guia completo: em breve'));
  };

  function desenhar() {
    const agora = agoraDoServidor();
    const lista = ativos(agora);
    conteudo.replaceChildren(
      el('h1', {}, '📅 Eventos'),
      el('p', { class: 'eventos-relogio' }, `Agora em Brasília: ${hora(agora)}. Todos os horários seguem o relógio do servidor.`),
      el('section', {}, el('h2', {}, '🔴 Acontecendo agora'),
        lista.length ? el('div', { class: 'eventos-ativos' }, ...lista) : el('p', { class: 'eventos-nenhum' }, 'Nenhum evento acontecendo agora. Veja os próximos horários abaixo.')),
      el('section', {}, el('h2', {}, '🗓️ Próximas 24 horas'), agenda(agora)),
      el('section', {}, el('h2', {}, '📜 Todos os eventos'),
        el('div', { class: 'eventos-lista' }, ...(Object.keys(EVENTOS) as IdEvento[]).map(cartao))));
  }

  desenhar();
  void carregar();
  const relogio = setInterval(desenhar, 30_000);
  const parar = aoAvisoDoServidor((msg) => {
    if (msg.t === 'eventos' || msg.t === 'torneio') void carregar();
  });
  return () => {
    clearInterval(relogio);
    parar();
  };
};
