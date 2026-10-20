// Administração → Dashboard (pedido do dono, 20/10/2026): números para acompanhar o jogo. Quem calcula é o servidor
// (server/src/dashboard.ts, GET /api/admin/dashboard), que guarda o resultado por um minuto.
import type { Dashboard, LinhaContagem, NumeroPorPeriodo } from '../../../shared/metricas';
import { api, ErroApi } from '../conta';
import { el } from '../ui/dom';

const n = (v: number) => v.toLocaleString('pt-BR');
const pct = (v: number | null) => (v === null ? '—' : `${v.toLocaleString('pt-BR')}%`);

/** Cartão de um número grande, com uma linha pequena embaixo. */
const cartao = (titulo: string, valor: string, detalhe = '') =>
  el('div', { class: 'dash-cartao' }, el('small', {}, titulo), el('strong', {}, valor), detalhe ? el('span', { class: 'meta' }, detalhe) : '');

/** Linha com hoje / 7 dias / 30 dias. */
const linhaPeriodo = (nome: string, p: NumeroPorPeriodo, existentes?: number) =>
  el('tr', {}, el('th', {}, nome), el('td', {}, n(p.hoje)), el('td', {}, n(p.semana)), el('td', {}, n(p.mes)), existentes === undefined ? '' : el('td', {}, n(existentes)));

/** Lista com barras proporcionais ao maior valor. */
function barras(lista: LinhaContagem[], vazio: string, formato = n): HTMLElement {
  if (!lista.length) return el('p', { class: 'meta' }, vazio);
  const maior = Math.max(1, ...lista.map((l) => l.valor));
  return el('div', { class: 'dash-barras' }, ...lista.map((l) =>
    el('div', { class: 'dash-barra' },
      el('span', { class: 'dash-barra-nome' }, l.nome, l.extra ? el('small', { class: 'meta' }, ` · ${l.extra}`) : ''),
      el('span', { class: 'dash-barra-trilho' }, el('span', { class: 'dash-barra-cheio', style: `width:${Math.max(2, (l.valor / maior) * 100)}%` })),
      el('strong', {}, formato(l.valor)))));
}

const bloco = (titulo: string, ajuda: string, ...filhos: (Node | string)[]) =>
  el('section', { class: 'dash-bloco' }, el('h2', {}, titulo), ajuda ? el('p', { class: 'meta' }, ajuda) : '', ...filhos);

const reais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Compras com dinheiro real: cada pacote de Origin Coins, VIP e Founder, quantas vezes foi comprado e quanto rendeu. */
function blocoDinheiroReal(r: Dashboard['dinheiroReal']): HTMLElement {
  const total = r.produtos.reduce((s, p) => s + p.centavos, 0);
  const grupos = [...new Set(r.produtos.map((p) => p.grupo))];
  return bloco('Compras com dinheiro real', r.ligado ? 'Só compras com o pagamento confirmado.' : 'O pagamento ainda não está ligado: a lista já está pronta e começa a contar quando ele ligar.',
    el('div', { class: 'dash-cartoes' },
      cartao('Arrecadado (total)', reais(total), `${n(r.produtos.reduce((s, p) => s + p.total, 0))} compras`),
      cartao('Últimos 30 dias', n(r.produtos.reduce((s, p) => s + p.mes, 0)), `compras · 7 dias: ${n(r.produtos.reduce((s, p) => s + p.semana, 0))}`),
      cartao('Jogadores que compraram', n(r.compradores))),
    el('table', { class: 'dash-tabela dash-tabela-larga' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Produto'), el('th', {}, 'Preço'), el('th', {}, '7 dias'), el('th', {}, '30 dias'), el('th', {}, 'Total'), el('th', {}, 'Arrecadado'))),
      ...grupos.map((g) => el('tbody', {},
        el('tr', { class: 'dash-grupo' }, el('th', { colspan: '6' }, g)),
        ...r.produtos.filter((p) => p.grupo === g).map((p) => el('tr', {},
          el('th', {}, p.nome), el('td', {}, p.reais ? reais(p.reais * 100) : '—'), el('td', {}, n(p.semana)), el('td', {}, n(p.mes)), el('td', {}, n(p.total)), el('td', {}, reais(p.centavos))))))));
}

function desenhar(d: Dashboard): HTMLElement[] {
  const j = d.jogadores;
  const e = d.economia;
  const c = d.capturas;
  const dia = (s: string) => s.slice(8, 10) + '/' + s.slice(5, 7);
  const maxAtivos = Math.max(1, ...j.ativosPorDia.map((x) => x.ativos));
  return [
    bloco('Jogadores', 'Tempo online medido pelo servidor (jogo aberto). Retorno = contas que voltaram 1 dia / 7 dias depois do cadastro (só contas criadas depois que a contagem começou).',
      el('div', { class: 'dash-cartoes' },
        cartao('Online agora', n(j.onlineAgora), `pico de hoje: ${n(j.picoHoje)}`),
        cartao('Ativos hoje', n(j.ativosHoje), `${n(j.minutosPorAtivoHoje)} min por jogador`),
        cartao('Ativos (7 dias)', n(j.ativosSemana), `30 dias: ${n(j.ativosMes)}`),
        cartao('Contas', n(j.contas), `${n(j.comSave)} com jornada começada`),
        cartao('Contas novas', n(j.novasHoje), `hoje · 7 dias: ${n(j.novasSemana)}`),
        cartao('Retorno D1', pct(j.retornoD1), `D7: ${pct(j.retornoD7)}`)),
      el('div', { class: 'dash-grafico', role: 'img', 'aria-label': 'Jogadores ativos por dia' }, ...j.ativosPorDia.map((x) =>
        el('div', { class: 'dash-coluna', title: `${dia(x.dia)}: ${x.ativos} jogadores, ${x.horas} h online` },
          el('small', {}, String(x.ativos)),
          el('span', { class: 'dash-coluna-barra', style: `height:${(x.ativos / maxAtivos) * 100}%` }),
          el('small', { class: 'meta' }, dia(x.dia)))))),

    bloco('Capturas', 'Hoje, 7 dias e 30 dias = capturas em batalha (Safari incluso). "Existem hoje" = Pokémon nos times e PCs de todos, vindos de qualquer lugar (captura, ovo, Orb, troca, staff).',
      el('table', { class: 'dash-tabela' },
        el('thead', {}, el('tr', {}, el('th', {}, ''), el('th', {}, 'Hoje'), el('th', {}, '7 dias'), el('th', {}, '30 dias'), el('th', {}, 'Existem hoje'))),
        el('tbody', {},
          linhaPeriodo('Todas', c.total.capturas, c.existentes.pokemon),
          linhaPeriodo('✨ Shiny', c.total.shiny, c.existentes.shiny),
          linhaPeriodo('Iniciais', c.total.inicial, c.existentes.inicial),
          linhaPeriodo('Lendários', c.total.lendario, c.existentes.lendario),
          linhaPeriodo('Míticos', c.total.mitico, c.existentes.mitico),
          linhaPeriodo('Ultra Beasts', c.total.ultra, c.existentes.ultra)))),

    bloco('Economia', 'Poké Dólares ganhos = recompensas de batalhas (duelos, ginásios). Por hora = ganhos ÷ horas online (precisa de pelo menos 30 min online no período).',
      el('div', { class: 'dash-cartoes' },
        cartao('Poké Dólares por hora', e.silverPorHoraSemana === null ? '—' : n(e.silverPorHoraSemana), `7 dias · hoje: ${e.silverPorHoraHoje === null ? '—' : n(e.silverPorHoraHoje)}`),
        cartao('Ganhos em batalha', n(e.silverGanho.hoje), `hoje · 7 dias: ${n(e.silverGanho.semana)}`),
        cartao('Poké Dólares no jogo', n(e.silverTotal), `média ${n(e.silverMedio)} · mediana ${n(e.silverMediano)}`),
        cartao('Origin Coins no jogo', n(e.goldTotal), `média ${n(e.goldMedio)} por jogador`),
        cartao('Cofre do Banco', n(e.cofre.silver), `Poké Dólares · ${n(e.cofre.gold)} Origin Coins`)),
      el('h3', {}, 'Quem mais ganha por hora (7 dias, 1 h online ou mais)'),
      barras(e.maioresPorHora, 'Ainda sem jogadores com 1 hora online nos últimos 7 dias.')),

    bloco('Itens mais comprados', 'Pokémarket e lojas do servidor (Loja do dia, Premium, Lojas da Liga, Loja da guilda). Quantidade de unidades.',
      el('div', { class: 'dash-duas' },
        el('div', {}, el('h3', {}, 'Últimos 7 dias'), barras(d.compras.semana, 'Nenhuma compra nos últimos 7 dias.')),
        el('div', {}, el('h3', {}, 'Últimos 30 dias'), barras(d.compras.mes, 'Nenhuma compra nos últimos 30 dias.')))),

    bloco('Progresso dos jogadores', '',
      el('div', { class: 'dash-cartoes' },
        cartao('Insígnias por jogador', d.progresso.insigniasMedia.toLocaleString('pt-BR'), 'média'),
        cartao('VIP ativo agora', n(d.progresso.vip), 'jogadores')),
      el('div', { class: 'dash-duas' },
        el('div', {}, el('h3', {}, 'Nível de treinador'), barras(d.progresso.niveis, 'Sem jogadores.')),
        el('div', {}, el('h3', {}, 'Onde estão (região)'), barras(d.progresso.regioes, 'Sem jogadores.'))),
      el('h3', {}, 'Pokémon mais usados nos times'),
      barras(d.progresso.maisUsados, 'Sem times.')),

    blocoDinheiroReal(d.dinheiroReal),

    bloco('Sistemas', '', barras(d.sistemas, '')),
  ];
}

export function secaoDashboard(): { elemento: HTMLElement; parar: () => void } {
  const corpo = el('div', { class: 'dash-corpo' }, el('p', { class: 'meta' }, 'Carregando…'));
  const quando = el('small', { class: 'meta' });
  const carregar = async () => {
    try {
      const d = await api<Dashboard>('GET', '/admin/dashboard');
      corpo.replaceChildren(...desenhar(d));
      quando.textContent = `Atualizado às ${new Date(d.geradoEm).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })} (os números são recalculados a cada minuto).`;
    } catch (e) {
      corpo.replaceChildren(el('p', { class: 'amigos-aviso' }, e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.'));
    }
  };
  void carregar();
  const relogio = setInterval(carregar, 60_000);
  const elemento = el('section', { class: 'admin-dashboard', 'data-sem-traducao': '' },
    el('div', { class: 'dash-topo' },
      el('p', { class: 'sub' }, 'Números do jogo para a equipe acompanhar. Contagens dia a dia começaram em 20/10/2026: antes disso não há registro.'),
      el('button', { class: 'botao secundario', onclick: () => void carregar() }, 'Atualizar')),
    quando,
    corpo);
  return { elemento, parar: () => clearInterval(relogio) };
}
