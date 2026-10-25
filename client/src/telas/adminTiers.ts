// Administração → Tiers (pedido do dono, 24/10/2026): a staff muda a tier de um Pokémon ou de uma Mega (UBER, OU,
// UU, RU, NU, NFE, LC) sem programador. Vale na hora para todos: Database, Pokédex e regras do Torneio e do Ranqueado
// (o servidor também aplica). "Padrão" volta ao que está em shared/data/tiers-do-jogo.json (ou à sugestão).
import { Dex } from '@pkmn/sim';
import { ORDEM_TIERS, ajustesDosTiers, tierDaFormaMega, tierDoPokemon, tierMegaOriginal, tierOriginal } from '../../../shared/tiers';
import { MEGAS } from '../../../shared/megas';
import { adotarAjustes, aoMudarAjustes, type Ajustes } from '../ajustesJogo';
import { api, ErroApi } from '../conta';
import { pokemonPorId, todosOsPokemons } from '../dados';
import { el, spritePokemon } from '../ui/dom';

type Alvo = { tipo: 'pokemon'; numero: number; nome: string } | { tipo: 'mega'; forma: string; nome: string; especie: number };

export function secaoTiers(): { elemento: HTMLElement; parar: () => void } {
  const todos = todosOsPokemons();
  const opcoes: Alvo[] = [
    ...todos.map((p): Alvo => ({ tipo: 'pokemon', numero: p.id, nome: p.nome })),
    ...MEGAS.map((m): Alvo => ({ tipo: 'mega', forma: m.forma, nome: m.nome, especie: m.especie })),
  ];
  const caixa = el('section', { class: 'bonus-secao admin-tiers' });
  const lista = el('datalist', { id: 'adm-tiers-pk' }, ...opcoes.map((o) => el('option', { value: o.nome })));
  const busca = el('input', { type: 'text', class: 'db-busca', list: 'adm-tiers-pk', placeholder: 'Nome do Pokémon ou da Mega', 'aria-label': 'Pokémon', autocomplete: 'off' }) as HTMLInputElement;
  const painel = el('div', { class: 'adm-biomas-painel' });
  const ativos = el('div', { class: 'ban-lista' });
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  let alvo: Alvo | null = null;

  const atual = (a: Alvo) => (a.tipo === 'pokemon' ? tierDoPokemon(a.numero) : tierDaFormaMega(a.forma, Dex.species.get(a.forma)));
  const original = (a: Alvo) => (a.tipo === 'pokemon' ? tierOriginal(a.numero) : tierMegaOriginal(a.forma, Dex.species.get(a.forma)));

  async function gravar(a: Alvo, tier: string): Promise<void> {
    try {
      adotarAjustes(await api<Ajustes>('POST', '/admin/tiers', a.tipo === 'pokemon' ? { numero: a.numero, tier } : { forma: a.forma, tier }));
      aviso.textContent = tier ? `${a.nome} agora é ${tier}.` : `${a.nome} voltou à tier padrão (${original(a)}).`;
    } catch (e) {
      aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
  }

  function desenharPainel(): void {
    if (!alvo) return void painel.replaceChildren(el('p', { class: 'meta' }, 'Escolha um Pokémon ou uma Mega.'));
    const a = alvo;
    const seletor = el('select', { class: 'db-busca', 'aria-label': 'Tier' },
      el('option', { value: '' }, `Padrão (${original(a)})`),
      ...ORDEM_TIERS.map((t) => el('option', { value: t, selected: atual(a) === t && atual(a) !== original(a) }, t))) as HTMLSelectElement;
    painel.replaceChildren(
      el('div', { class: 'admin-ginasio-lider' },
        spritePokemon(pokemonPorId(a.tipo === 'pokemon' ? a.numero : a.especie), { animado: false }),
        el('div', {}, el('h3', {}, a.nome), el('small', { class: 'meta' }, `Tier agora: ${atual(a)} · padrão: ${original(a)}`))),
      el('div', { class: 'cla-formulario' },
        el('label', { class: 'cla-campo' }, 'Tier', seletor),
        el('button', { class: 'botao', onclick: () => gravar(a, seletor.value) }, 'Salvar tier')));
  }

  function desenharAtivos(): void {
    const aj = ajustesDosTiers();
    const linhas: [Alvo, string][] = [
      ...Object.entries(aj.pokemon).map(([n, t]): [Alvo, string] => {
        let nome = `#${n}`;
        try {
          nome = pokemonPorId(Number(n)).nome;
        } catch {
          /* espécie que não está mais carregada */
        }
        return [{ tipo: 'pokemon', numero: Number(n), nome }, t];
      }),
      ...Object.entries(aj.megas).map(([f, t]): [Alvo, string] => [{ tipo: 'mega', forma: f, nome: MEGAS.find((m) => m.forma === f)?.nome ?? f, especie: MEGAS.find((m) => m.forma === f)?.especie ?? 1 }, t]),
    ];
    ativos.replaceChildren(...(linhas.length
      ? linhas.map(([a, t]) => el('div', { class: 'ban-cartao' },
          el('div', { class: 'ban-topo' }, el('strong', {}, a.nome), el('span', { class: 'meta' }, `${original(a)} → ${t}`)),
          el('button', { class: 'botao secundario', onclick: () => gravar(a, '') }, 'Voltar ao padrão')))
      : [el('p', { class: 'meta' }, 'Nenhuma tier mudada: todas são as do Smogon (ou a sugestão).')]));
  }

  busca.addEventListener('input', () => {
    const achado = opcoes.find((o) => o.nome.toLowerCase() === busca.value.trim().toLowerCase());
    if (!achado) return;
    alvo = achado;
    aviso.textContent = '';
    desenharPainel();
  });
  const redesenhar = () => {
    desenharPainel();
    desenharAtivos();
  };
  redesenhar();
  const parar = aoMudarAjustes(() => caixa.isConnected && redesenhar());
  caixa.append(
    el('p', { class: 'sub' }, 'Mude a tier de um Pokémon ou de uma Mega. Vale na hora para todos: Database, Pokédex e regras do Torneio e do PvP Ranqueado.'),
    lista,
    el('label', { class: 'cla-campo' }, 'Pokémon ou Mega', busca),
    painel,
    aviso,
    el('h2', { class: 'anuncios-titulo' }, 'Tiers mudadas'),
    ativos);
  return { elemento: caixa, parar };
}
