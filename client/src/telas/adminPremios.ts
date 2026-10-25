// Administração → Prêmios (pedido do dono, 24/10/2026): a staff muda os prêmios dos eventos sem programador —
// trocar item, quantidade, acrescentar ou tirar prêmios, mudar as chances das roletas. Cada evento é uma aba; "Salvar"
// manda para o servidor (server/src/ajustes.ts → gravarPremios) e vale na hora; "Voltar ao padrão" desfaz.
import { ajustesPremios, conteudoKitPreRegistro, type AjustesPremios, type Fatia, type Premio, type SecaoPremios } from '../../../shared/premiosEventos';
import { PONTOS_GUILDA_ATE_10, PONTOS_GUILDA_PARTICIPAR, PONTOS_GUILDA_PODIO, poteInicial, premioNinho, premiosBossGlobalPadrao, premiosCaptura, roletaNinho } from '../../../shared/eventosRegras';
import { premiosTorneio, roletaTorneio } from '../../../shared/torneioRegras';
import { premioLiga } from '../../../shared/liga';
import { metasDoacao, premiosLogin, premiosLoginTrinta } from '../../../shared/recompensas';
import { TODOS_OS_ITENS } from '../../../shared/loja';
import { adotarAjustes, aoMudarAjustes, type Ajustes } from '../ajustesJogo';
import { api, ErroApi } from '../conta';
import { el } from '../ui/dom';
import { confirmar } from '../ui/confirmar';

/** Saldos e sorteios que também podem ser prêmio (além dos itens). */
const ESPECIAIS: { id: string; nome: string }[] = [
  { id: 'silver', nome: 'Poké Dólares' },
  { id: 'gold', nome: 'Origin Coins' },
  { id: 'fragmentos', nome: 'Fragmentos Temporais' },
  { id: 'league-coins', nome: 'League Coins' },
  { id: 'league-coins-nightmare', nome: 'League Coins Nightmare' },
  { id: 'pontos-guilda', nome: 'Pontos de guilda' },
  { id: 'vip-dias', nome: 'Dias de VIP' },
  { id: 'mint', nome: 'Mint aleatória' },
  { id: 'charm', nome: 'Charm aleatório' },
  { id: 'orb', nome: 'Orb aleatória' },
];
const OPCOES = [...ESPECIAIS, ...TODOS_OS_ITENS.map((i) => ({ id: i.id, nome: i.nome }))];
const porNome = new Map(OPCOES.map((o) => [o.nome.toLowerCase(), o]));
const nomeDoId = (id: string) => OPCOES.find((o) => o.id === id)?.nome ?? id;

const ABAS: { id: SecaoPremios; nome: string; ajuda: string }[] = [
  { id: 'ninho', nome: 'Ninho', ajuda: 'Poké Dólares por vencer + a roleta (as chances somam 100%).' },
  { id: 'torneio', nome: 'Torneio', ajuda: 'Prêmios do 1º, 2º e 3º lugar. As medalhas e a roleta do campeão são dadas sempre.' },
  { id: 'bossGlobal', nome: 'Boss global', ajuda: 'Prêmios por posição no dano: 1º, 2º, 3º, do 4º ao 10º e de quem só participou.' },
  { id: 'bossGuilda', nome: 'Boss da guilda', ajuda: 'Pontos de guilda para cada membro que lutou: por participar + extra pela posição da guilda.' },
  { id: 'captura', nome: 'Evento de captura', ajuda: 'Prêmios de quem ganhar o evento.' },
  { id: 'liga', nome: 'Liga', ajuda: 'League Coins por treinador vencido, bônus por vencer todos e Poké Dólares.' },
  { id: 'login7', nome: 'Login 7 dias', ajuda: 'Prêmio de cada dia do login de boas-vindas (saem NT).' },
  { id: 'login30', nome: 'Login 30 dias', ajuda: 'Prêmio de cada dia do login dos 30 dias (saem NT).' },
  { id: 'doacao', nome: 'Doação acumulada', ajuda: 'Metas de Origin Coins doadas no trimestre e o prêmio de cada uma.' },
  { id: 'loteria', nome: 'Loteria', ajuda: 'Prêmio com que a loteria começa e recomeça.' },
  { id: 'kitPreRegistro', nome: 'Kit de pré-registro', ajuda: 'O que vem no Kit de pré-registro (chega pelo Correio quando a conta pré-registrada é liberada; abre pela Bolsa). Aparece também na tela de pré-registro. Tudo sai NT.' },
];

/** O que vale hoje (o que a staff mudou ou o padrão), já no formato da seção. */
function valorAtual(secao: SecaoPremios): unknown {
  const a = ajustesPremios();
  switch (secao) {
    case 'ninho': return { silver: premioNinho(), roleta: roletaNinho() };
    case 'torneio': return { lugares: premiosTorneio(), roleta: roletaTorneio() };
    case 'bossGlobal': return a.bossGlobal ?? premiosBossGlobalPadrao();
    case 'bossGuilda': return a.bossGuilda ?? { participar: PONTOS_GUILDA_PARTICIPAR, podio: PONTOS_GUILDA_PODIO, ate10: PONTOS_GUILDA_ATE_10 };
    case 'captura': return premiosCaptura();
    case 'liga': {
      const so = (l: 'normal' | 'nightmare') => ({ silver: premioLiga(l).silver, porVitoria: premioLiga(l).porVitoria, bonus: premioLiga(l).bonus });
      return { normal: so('normal'), nightmare: so('nightmare') };
    }
    case 'login7': return premiosLogin();
    case 'login30': return premiosLoginTrinta();
    case 'doacao': return metasDoacao();
    case 'loteria': return { poteInicial: poteInicial() };
    case 'kitPreRegistro': return conteudoKitPreRegistro();
  }
}

let abaAberta: SecaoPremios = 'ninho';

export function secaoPremios(): { elemento: HTMLElement; parar: () => void } {
  const caixa = el('section', { class: 'bonus-secao admin-premios' });
  const listaItens = el('datalist', { id: 'adm-premios-itens' }, ...OPCOES.map((o) => el('option', { value: o.nome })));
  let aba = abaAberta;
  let rascunho: Record<string, unknown> = structuredClone(valorAtual(aba)) as Record<string, unknown>;
  let mexido = false;
  let aviso = '';

  const numero = (valor: number, mudar: (n: number) => void, min = 0, rotulo = 'Quantidade') => {
    const c = el('input', { type: 'number', class: 'db-busca adm-premio-num', min, step: 1, value: valor, 'aria-label': rotulo }) as HTMLInputElement;
    c.addEventListener('input', () => ((mexido = true), mudar(Math.max(min, Math.floor(Number(c.value) || 0)))));
    return c;
  };

  /** Uma linha de prêmio: item (busca), nome mostrado, quantidade e, na roleta, a chance em %. */
  function linha(p: Premio | Fatia, tirar: () => void, aoMudar: () => void): HTMLElement {
    const item = el('input', { type: 'text', class: 'db-busca', list: 'adm-premios-itens', value: nomeDoId(p.id), 'aria-label': 'Item', autocomplete: 'off' }) as HTMLInputElement;
    const nome = el('input', { type: 'text', class: 'db-busca', value: p.nome, maxlength: 60, 'aria-label': 'Nome mostrado' }) as HTMLInputElement;
    item.addEventListener('change', () => {
      const o = porNome.get(item.value.trim().toLowerCase());
      if (!o) return void (item.value = nomeDoId(p.id));
      p.id = o.id;
      p.nome = nome.value = o.nome;
      mexido = true;
    });
    nome.addEventListener('input', () => ((p.nome = nome.value), (mexido = true)));
    const chance = 'chance' in p
      ? (() => {
          const c = el('input', { type: 'number', class: 'db-busca adm-premio-num', min: 0, max: 100, step: 0.001, value: +(p.chance * 100).toFixed(4), 'aria-label': 'Chance (%)' }) as HTMLInputElement;
          c.addEventListener('input', () => ((p.chance = (Number(c.value) || 0) / 100), (mexido = true), aoMudar()));
          return el('label', { class: 'adm-premio-campo' }, el('small', {}, 'Chance %'), c);
        })()
      : null;
    return el('div', { class: 'adm-premio-linha' },
      el('label', { class: 'adm-premio-campo largo' }, el('small', {}, 'Item'), item),
      el('label', { class: 'adm-premio-campo largo' }, el('small', {}, 'Nome mostrado'), nome),
      el('label', { class: 'adm-premio-campo' }, el('small', {}, 'Quantidade'), numero(p.quantidade, (n) => (p.quantidade = Math.max(1, n)), 1)),
      chance,
      el('button', { class: 'botao perigo', title: 'Tirar', onclick: () => ((mexido = true), tirar(), desenhar()) }, '✕'));
  }

  /** Lista de prêmios com "+ Prêmio". */
  function editorLista(titulo: string, lista: Premio[]): HTMLElement {
    return el('div', { class: 'adm-premio-grupo' },
      el('strong', {}, titulo),
      ...lista.map((p, i) => linha(p, () => lista.splice(i, 1), () => undefined)),
      lista.length ? '' : el('p', { class: 'meta' }, 'Nenhum prêmio.'),
      el('button', { class: 'aba', onclick: () => ((mexido = true), lista.push({ id: 'pokeball', nome: 'Poké Ball', quantidade: 1 }), desenhar()) }, '+ Prêmio'));
  }

  /** Roleta: fatias com chance; mostra a soma (precisa dar 100%). */
  function editorRoleta(titulo: string, fatias: Fatia[]): HTMLElement {
    const soma = el('small', { class: 'meta' });
    const contar = () => {
      const total = fatias.reduce((s, f) => s + f.chance, 0) * 100;
      soma.textContent = `Soma das chances: ${total.toFixed(3)}%${Math.abs(total - 100) > 0.05 ? ' — precisa dar 100%!' : ' ✔'}`;
    };
    contar();
    return el('div', { class: 'adm-premio-grupo' },
      el('strong', {}, titulo),
      ...fatias.map((f, i) => linha(f, () => fatias.splice(i, 1), contar)),
      soma,
      el('button', { class: 'aba', onclick: () => ((mexido = true), fatias.push({ id: 'pokeball', nome: 'Poké Ball', quantidade: 1, chance: 0 }), desenhar()) }, '+ Fatia'));
  }

  const campoNumero = (rotulo: string, obj: Record<string, number>, chave: string, min = 0) =>
    el('label', { class: 'adm-premio-campo' }, el('small', {}, rotulo), numero(obj[chave], (n) => (obj[chave] = n), min, rotulo));

  /** Lista de dias (logins): cada dia é uma lista de prêmios. */
  const editorDias = (dias: Premio[][]) => el('div', {}, ...dias.map((d, i) => editorLista(`Dia ${i + 1}`, d)));

  function corpo(): HTMLElement {
    const r = rascunho as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    switch (aba) {
      case 'ninho': return el('div', {}, el('div', { class: 'adm-premio-grupo' }, campoNumero('Poké Dólares por vencer', r, 'silver')), editorRoleta('Roleta do Ninho', r.roleta));
      case 'torneio': return el('div', {}, ...['1º lugar', '2º lugar', '3º lugar'].map((t, i) => editorLista(t, r.lugares[i])), editorRoleta('Roleta do Torneio (só o campeão)', r.roleta));
      case 'bossGlobal': return el('div', {}, ...['1º', '2º', '3º'].map((t, i) => editorLista(`${t} lugar`, r.top[i])), editorLista('4º ao 10º', r.ate10), editorLista('Do 11º em diante (participação)', r.participar));
      case 'bossGuilda': {
        const podio = r.podio as number[];
        return el('div', { class: 'adm-premio-grupo' },
          campoNumero('Por participar', r, 'participar'),
          ...['1º', '2º', '3º'].map((t, i) => el('label', { class: 'adm-premio-campo' }, el('small', {}, `Extra ${t} lugar`), numero(podio[i], (n) => (podio[i] = n)))),
          campoNumero('Extra do 4º ao 10º', r, 'ate10'));
      }
      case 'captura': return editorLista('Prêmios do vencedor', rascunho as unknown as Premio[]);
      case 'liga': return el('div', {}, ...(['normal', 'nightmare'] as const).map((l) => el('div', { class: 'adm-premio-grupo' },
        el('strong', {}, l === 'normal' ? 'Liga Pokémon' : 'Liga Nightmare'),
        campoNumero('League Coins por vitória', r[l], 'porVitoria'),
        campoNumero('Bônus por vencer todos', r[l], 'bonus'),
        campoNumero('Poké Dólares por vencer todos', r[l], 'silver'))));
      case 'login7':
      case 'login30': return editorDias(rascunho as unknown as Premio[][]);
      case 'doacao': {
        const metas = rascunho as unknown as { gold: number; premios: Premio[] }[];
        return el('div', {},
          ...metas.map((m, i) => el('div', { class: 'adm-premio-meta' },
            el('div', { class: 'adm-premio-linha' },
              el('label', { class: 'adm-premio-campo' }, el('small', {}, 'Meta (Origin Coins)'), numero(m.gold, (n) => (m.gold = Math.max(1, n)), 1)),
              el('button', { class: 'botao perigo', onclick: () => ((mexido = true), metas.splice(i, 1), desenhar()) }, 'Tirar meta')),
            editorLista(`Prêmios da meta ${i + 1}`, m.premios))),
          el('button', { class: 'aba', onclick: () => ((mexido = true), metas.push({ gold: (metas.at(-1)?.gold ?? 0) + 1000, premios: [] }), desenhar()) }, '+ Meta'));
      }
      case 'loteria': return el('div', { class: 'adm-premio-grupo' }, campoNumero('Prêmio inicial (Poké Dólares)', r, 'poteInicial', 1));
      case 'kitPreRegistro': return editorLista('Itens do kit', rascunho as unknown as Premio[]);
    }
  }

  async function salvar(valor: unknown, mensagem: string): Promise<void> {
    try {
      adotarAjustes(await api<Ajustes>('POST', '/admin/premios', { secao: aba, valor }));
      rascunho = structuredClone(valorAtual(aba)) as Record<string, unknown>;
      mexido = false;
      aviso = mensagem;
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    desenhar();
  }

  function desenhar(): void {
    abaAberta = aba;
    const info = ABAS.find((a) => a.id === aba)!;
    const mudado = ajustesPremios()[aba as keyof AjustesPremios] !== undefined;
    caixa.replaceChildren(
      el('p', { class: 'sub' }, 'Mude os prêmios dos eventos. Item = qualquer item do jogo, um saldo (Poké Dólares, Origin Coins…) ou um sorteio (Mint, Charm, Orb aleatória). Salvar vale na hora para os próximos prêmios.'),
      listaItens,
      el('nav', { class: 'admin-abas' }, ...ABAS.map((a) => el('button', {
        class: `aba ${a.id === aba ? 'ativa' : ''}`,
        onclick: async () => {
          if (a.id === aba) return;
          if (mexido && !(await confirmar('Prêmios', 'Você mudou prêmios sem salvar. Sair desta aba e perder as mudanças?'))) return;
          aba = a.id;
          rascunho = structuredClone(valorAtual(aba)) as Record<string, unknown>;
          mexido = false;
          aviso = '';
          desenhar();
        },
      }, `${a.nome}${ajustesPremios()[a.id] !== undefined ? ' ✎' : ''}`))),
      el('p', { class: 'meta' }, `${info.ajuda} ${mudado ? 'Esta aba está MUDADA pela staff (✎).' : 'Esta aba está com os prêmios padrão do jogo.'}`),
      el('p', { class: 'amigos-aviso', role: 'status' }, aviso),
      corpo(),
      el('div', { class: 'adm-premio-acoes' },
        el('button', { class: 'botao', onclick: () => salvar(rascunho, `Prêmios de ${info.nome} salvos.`) }, 'Salvar'),
        el('button', { class: 'botao secundario', onclick: () => ((rascunho = structuredClone(valorAtual(aba)) as Record<string, unknown>), (mexido = false), (aviso = 'Mudanças descartadas.'), desenhar()) }, 'Descartar mudanças'),
        mudado ? el('button', { class: 'botao secundario', onclick: async () => (await confirmar('Prêmios', `Voltar os prêmios de ${info.nome} ao padrão do jogo?`)) && salvar(null, `${info.nome} voltou ao padrão.`) }, 'Voltar ao padrão') : ''));
  }

  desenhar();
  // outra pessoa da staff salvou: só redesenha se aqui não há mudanças por salvar
  const parar = aoMudarAjustes(() => {
    if (!caixa.isConnected || mexido) return;
    rascunho = structuredClone(valorAtual(aba)) as Record<string, unknown>;
    desenhar();
  });
  return { elemento: caixa, parar };
}
