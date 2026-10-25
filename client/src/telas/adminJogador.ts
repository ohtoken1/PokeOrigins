// Administração → Ver jogador (pedido do dono, 24/10/2026): a staff olha a conta de um jogador — dados da conta,
// moedas, progresso, time, PC e bolsa — para entender como ela está. SÓ LEITURA: o save vem do servidor
// (GET /api/admin/jogador/:usuario, server/src/adminJogador.ts) e nada desta tela muda a conta.
import { TODOS_OS_ITENS, nomeCategoriaItem } from '../../../shared/loja';
import { numeroDeBoxes, TAMANHO_BOX } from '../../../shared/pc';
import { progressoTreinador } from '../../../shared/treinador';
import { tierIv } from '../../../shared/tierIv';
import { power } from '../../../shared/batalha/pokemon';
import { regiaoPorId } from '../../../shared/regioes';
import { api, ErroApi } from '../conta';
import { pokemonPorId } from '../dados';
import { nomeDaBox, type Save } from '../estado';
import { el, spritePokemon } from '../ui/dom';
import { iconeItem } from '../ui/iconeItem';
import { resumoAoPassar } from '../ui/resumo';

interface Resposta {
  conta: { id: number; usuario: string; email: string; criadaEm: number; admin: boolean; online: boolean };
  save: Save | null;
  versao: number | null;
}
type Aba = 'resumo' | 'time' | 'pc' | 'bolsa';
type PokemonDoSave = Save['time'][number];

const data = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const n = (x: number | null | undefined) => (x ?? 0).toLocaleString('pt-BR');

/** Cartão pequeno de um Pokémon: sprite, nome, nível; passar o mouse mostra o resumo completo. */
function cartao(p: PokemonDoSave): HTMLElement {
  let nome = `#${p.especieId}`;
  let sprite: HTMLElement | string = '';
  try {
    const base = pokemonPorId(p.especieId);
    nome = base.nome;
    sprite = spritePokemon(base, { animado: false, shiny: p.shiny });
  } catch {
    /* espécie não carregada */
  }
  const avaliado = p.ivsFaixa || p.ivsRevelados;
  const c = el('div', { class: 'adm-jog-pk' },
    sprite,
    el('strong', {}, `${p.ovo ? 'Ovo' : nome}${p.shiny ? ' ★' : ''}`),
    el('small', { class: 'meta' }, `Nv. ${p.nivel} · ${avaliado ? `tier ${tierIv(p)}` : 'não avaliado'} · ⚡${power(p)}`),
    el('small', { class: 'meta' }, [p.uid ? `#${String(p.uid).padStart(6, '0')}` : '', p.inegociavel ? '🔒 NT' : '', p.trancado ? 'trancado' : '', p.origem ? `origem: ${p.origem}` : ''].filter(Boolean).join(' · ')));
  resumoAoPassar(c, () => p);
  return c;
}

let ultimaBusca = '';

export function secaoVerJogador(): { elemento: HTMLElement; parar: () => void } {
  const listaJogadores = el('datalist', { id: 'adm-ver-jogadores' });
  const campo = el('input', { type: 'text', class: 'db-busca', list: 'adm-ver-jogadores', placeholder: 'Usuário do jogador', 'aria-label': 'Usuário do jogador', autocomplete: 'off', value: ultimaBusca }) as HTMLInputElement;
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  const corpo = el('div', { class: 'adm-jog-corpo' });
  let dados: Resposta | null = null;
  let aba: Aba = 'resumo';
  let box = 0;

  // sugestões de contas enquanto digita (usuário ou nome de treinador)
  let relogio = 0;
  campo.addEventListener('input', () => {
    clearTimeout(relogio);
    const termo = campo.value.trim();
    if (termo.length < 2) return;
    relogio = window.setTimeout(async () => {
      try {
        const achados = await api<{ usuario: string; nome: string | null }[]>('GET', `/jogadores?busca=${encodeURIComponent(termo)}`);
        listaJogadores.replaceChildren(...achados.map((j) => el('option', { value: j.usuario }, j.nome ?? '')));
      } catch {
        // sem sugestões
      }
    }, 250);
  });

  async function buscar(): Promise<void> {
    const usuario = campo.value.trim();
    if (!usuario) return void (aviso.textContent = 'Digite o usuário do jogador.');
    ultimaBusca = usuario;
    aviso.textContent = 'Carregando…';
    try {
      dados = await api<Resposta>('GET', `/admin/jogador/${encodeURIComponent(usuario)}`);
      aviso.textContent = '';
      box = 0;
      desenhar();
    } catch (e) {
      dados = null;
      aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
      corpo.replaceChildren();
    }
  }
  campo.addEventListener('keydown', (e) => e.key === 'Enter' && void buscar());

  function linhas(pares: [string, string | HTMLElement][]): HTMLElement {
    return el('dl', { class: 'adm-jog-dados' }, ...pares.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
  }

  function resumo(r: Resposta, s: Save): HTMLElement {
    const t = progressoTreinador(s.xpTreinador ?? 0);
    const vip = s.vipAte && s.vipAte > Date.now() ? `até ${data(s.vipAte)}` : 'não';
    const est = (s.estatisticas ?? {}) as Record<string, unknown>;
    return el('div', {},
      el('h3', {}, 'Conta'),
      linhas([
        ['Usuário', r.conta.usuario],
        ['E-mail', r.conta.email],
        ['Conta criada em', data(r.conta.criadaEm)],
        ['Online agora', r.conta.online ? '🟢 sim' : 'não'],
        ['Administrador', r.conta.admin ? 'sim' : 'não'],
        ['Versão do save', String(r.versao ?? '—')],
      ]),
      el('h3', {}, 'Treinador'),
      linhas([
        ['Nome', s.aparencia?.nome ?? '—'],
        ['Nível de treinador', `${t.nivel} (${n(s.xpTreinador)} XP)`],
        ['Região', regiaoPorId(s.regiao)?.nome ?? s.regiao],
        ['VIP', vip],
        ['Insígnias', String(s.insignias?.length ?? 0)],
        ['Pokédex', `${s.capturados?.length ?? 0} capturados · ${s.vistos?.length ?? 0} vistos · ${s.capturadosShiny?.length ?? 0} shiny`],
        ['Passos', n(s.passos)],
        ['Título', s.titulo ?? '—'],
      ]),
      el('h3', {}, 'Moedas'),
      linhas([
        ['Poké Dólares', n(s.silver)],
        ['Origin Coins', n(s.gold)],
        ['Fragmentos Temporais', n(s.fragmentos)],
        ['League Coins', n(s.leagueCoins)],
        ['League Coins Nightmare', n(s.leagueCoinsNightmare)],
        ['Pontos de guilda', n(s.pontosGuilda)],
      ]),
      el('h3', {}, 'Estatísticas'),
      linhas(Object.entries(est).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, n(v as number)])));
  }

  function time(s: Save): HTMLElement {
    return el('div', { class: 'adm-jog-grade' }, ...(s.time.length ? s.time.map(cartao) : [el('p', { class: 'meta' }, 'Time vazio.')]));
  }

  function pc(s: Save): HTMLElement {
    const total = numeroDeBoxes(s);
    const naBox = s.caixa.filter((p) => (p.box ?? 0) === box).sort((a, b) => (a.casa ?? 0) - (b.casa ?? 0));
    return el('div', {},
      el('p', { class: 'meta' }, `${s.caixa.length} Pokémon no PC, em ${total} boxes de ${TAMANHO_BOX}.`),
      el('nav', { class: 'admin-abas adm-jog-boxes' }, ...Array.from({ length: total }, (_, i) => {
        const qtd = s.caixa.filter((p) => (p.box ?? 0) === i).length;
        return el('button', { class: `aba ${i === box ? 'ativa' : ''}`, onclick: () => ((box = i), desenhar()) }, `${nomeDaBox(s, i)} (${qtd})`);
      })),
      el('div', { class: 'adm-jog-grade' }, ...(naBox.length ? naBox.map(cartao) : [el('p', { class: 'meta' }, 'Box vazia.')])));
  }

  function bolsa(s: Save): HTMLElement {
    const itens = Object.entries(s.itens ?? {}).filter(([, q]) => q > 0);
    if (!itens.length) return el('p', { class: 'meta' }, 'Bolsa vazia.');
    const grupos = new Map<string, HTMLElement[]>();
    for (const [id, q] of itens) {
      const item = TODOS_OS_ITENS.find((i) => i.id === id);
      const categoria = item ? nomeCategoriaItem(item.categoria) : 'Outros';
      const nt = s.itensNt?.[id] ?? 0;
      const naBolsaSkin = s.skinsNaBolsa?.[id];
      grupos.set(categoria, [...(grupos.get(categoria) ?? []), el('div', { class: 'adm-jog-item' },
        item ? iconeItem(item) : el('span', { class: 'meta' }, '?'),
        el('span', {}, item?.nome ?? id),
        el('strong', {}, `×${n(q)}`),
        nt ? el('small', { class: 'meta' }, `(${nt} NT)`) : '',
        naBolsaSkin !== undefined ? el('small', { class: 'meta' }, `(${naBolsaSkin} na bolsa)`) : '')]);
    }
    return el('div', {}, ...[...grupos].map(([g, lista]) => el('div', {}, el('h3', {}, g), el('div', { class: 'adm-jog-itens' }, ...lista))));
  }

  function desenhar(): void {
    if (!dados) return void corpo.replaceChildren();
    const s = dados.save;
    if (!s) return void corpo.replaceChildren(el('p', { class: 'meta' }, `${dados.conta.usuario} ainda não começou o jogo (sem save).`), resumoDaConta());
    const abas: [Aba, string][] = [['resumo', 'Resumo'], ['time', `Time (${s.time.length})`], ['pc', `PC (${s.caixa.length})`], ['bolsa', 'Bolsa']];
    corpo.replaceChildren(
      el('nav', { class: 'admin-abas' }, ...abas.map(([id, nome]) => el('button', { class: `aba ${id === aba ? 'ativa' : ''}`, onclick: () => ((aba = id), desenhar()) }, nome))),
      aba === 'resumo' ? resumo(dados, s) : aba === 'time' ? time(s) : aba === 'pc' ? pc(s) : bolsa(s));
  }
  const resumoDaConta = () => linhas([['E-mail', dados!.conta.email], ['Conta criada em', data(dados!.conta.criadaEm)], ['Online agora', dados!.conta.online ? '🟢 sim' : 'não']]);

  if (ultimaBusca) void buscar();
  return {
    parar: () => clearTimeout(relogio),
    elemento: el('section', { class: 'bonus-secao adm-jogador' },
      el('p', { class: 'sub' }, 'Veja a conta de um jogador: dados, moedas, time, PC e bolsa. Só leitura: nada aqui muda a conta. Passe o mouse num Pokémon para ver tudo dele.'),
      listaJogadores,
      el('div', { class: 'cla-formulario admin-dar-item' },
        el('label', { class: 'cla-campo' }, 'Jogador', campo),
        el('button', { class: 'botao', onclick: () => void buscar() }, 'Ver conta')),
      aviso,
      corpo),
  };
}
