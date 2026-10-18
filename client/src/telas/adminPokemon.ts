// Administração → Dar Pokémon: monta um Pokémon do jeito que a staff quiser (espécie, nível, shiny, Nature, Ability,
// Tera Type, IVs, EVs e golpes, inclusive Egg Moves) e manda para um jogador. É o que dá uso ao item Vale Pokémon S.
// O servidor entrega como o "Dar item" (server/src/entregas.ts): na hora, se o jogador está online; senão, quando entrar.
import { Dex } from '@pkmn/sim';
import { ATRIBUTOS, EV_MAX_ATRIBUTO, EV_MAX_TOTAL, IV_MIN_SHINY, TIPOS_TERA, especie, golpesIniciais, hpMaximo, ppMaximo, type Atributo, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { tierIv } from '../../../shared/tierIv';
import { api, ErroApi } from '../conta';
import { todosOsPokemons } from '../dados';
import { darPokemonAoJogador } from '../entregas';
import { novoPokemon } from '../estado';
import { el, spritePokemon } from '../ui/dom';
import { confirmar } from '../ui/confirmar';

const ROTULOS: Record<Atributo, string> = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };

/** Todos os golpes que a espécie (ou uma forma anterior dela) aprende de algum jeito; `ovo` = só por Egg Move. */
function golpesDaEspecie(especieId: number): { id: string; nome: string; ovo: boolean }[] {
  const origensDe = new Map<string, string[]>();
  for (let s = especie(especieId); s?.exists; s = s.prevo ? Dex.species.get(s.prevo) : (null as never)) {
    const aprendidos = Dex.species.getLearnsetData(s.id as Parameters<typeof Dex.species.getLearnsetData>[0]).learnset ?? {};
    for (const [id, origens] of Object.entries(aprendidos)) origensDe.set(id, [...(origensDe.get(id) ?? []), ...origens]);
  }
  return [...origensDe]
    .filter(([id]) => Dex.moves.get(id).exists)
    .map(([id, origens]) => ({ id, nome: Dex.moves.get(id).name, ovo: origens.some((o) => o.endsWith('E')) && !origens.some((o) => /L\d+$/.test(o)) }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * Editor de Pokémon da staff. Sem opções: Administração → Dar Pokémon (escolhe o jogador). Com `destino`: o Pokémon
 * montado vai para outro lugar (o Cofre, em ui/eventos.ts) e o campo do jogador some.
 */
export function secaoDarPokemon(destino?: { botao: string; enviar: (p: PokemonIndividual, nome: string) => Promise<string>; nivelMaximo?: number }): { elemento: HTMLElement; parar: () => void } {
  const todos = todosOsPokemons();
  const nivelMax = destino?.nivelMaximo ?? 100;
  const campo = (atributos: Record<string, unknown>) => el('input', { class: 'db-busca', ...atributos }) as HTMLInputElement;
  const numero = (minimo: number, maximo: number, valor: number, rotulo: string) => campo({ type: 'number', min: minimo, max: maximo, step: 1, value: valor, 'aria-label': rotulo });
  const escolha = (rotulo: string) => el('select', { class: 'db-busca', 'aria-label': rotulo }) as HTMLSelectElement;
  const lido = (c: HTMLInputElement, minimo: number, maximo: number) => Math.max(minimo, Math.min(maximo, Math.floor(Number(c.value) || 0)));

  const listaPokemon = el('datalist', { id: 'adm-pokemons' }, ...todos.map((p) => el('option', { value: p.nome })));
  const listaJogadores = el('datalist', { id: 'adm-jogadores-pokemon' });
  const campoPokemon = campo({ type: 'text', list: 'adm-pokemons', placeholder: 'Nome do Pokémon', 'aria-label': 'Nome do Pokémon', autocomplete: 'off' });
  const campoNivel = numero(1, nivelMax, 50, 'Nível');
  const campoShiny = campo({ type: 'checkbox', 'aria-label': 'Shiny' });
  const campoNT = campo({ type: 'checkbox', 'aria-label': 'NT (inegociável)' });
  const campoNature = escolha('Nature');
  const campoAbility = escolha('Ability');
  const campoTera = escolha('Tera Type');
  const campoJogador = campo({ type: 'text', list: 'adm-jogadores-pokemon', placeholder: 'Usuário do jogador', 'aria-label': 'Usuário do jogador', autocomplete: 'off' });
  const ivs = Object.fromEntries(ATRIBUTOS.map((a) => [a, numero(0, 31, 31, `IV de ${ROTULOS[a]}`)])) as Record<Atributo, HTMLInputElement>;
  const evs = Object.fromEntries(ATRIBUTOS.map((a) => [a, numero(0, EV_MAX_ATRIBUTO, 0, `EV de ${ROTULOS[a]}`)])) as Record<Atributo, HTMLInputElement>;
  const golpes = [0, 1, 2, 3].map((i) => escolha(`Golpe ${i + 1}`));
  const previa = el('div', { class: 'adm-pk-previa' });
  const somaIvs = el('small', { class: 'meta' });
  const somaEvs = el('small', { class: 'meta' });
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });

  campoNature.replaceChildren(...Dex.natures.all().map((n) =>
    el('option', { value: n.name }, n.plus && n.minus ? `${n.name} (+${ROTULOS[n.plus as Atributo]} −${ROTULOS[n.minus as Atributo]})` : `${n.name} (neutra)`)));

  const escolhido = () => todos.find((p) => p.nome.toLowerCase() === campoPokemon.value.trim().toLowerCase());
  const valores = (campos: Record<Atributo, HTMLInputElement>, maximo: number) => Object.fromEntries(ATRIBUTOS.map((a) => [a, lido(campos[a], 0, maximo)])) as Record<Atributo, number>;

  /** A espécie mudou: Abilities, Tera Type e golpes passam a ser os dela. */
  const trocarEspecie = () => {
    const base = escolhido();
    if (!base) return previa.replaceChildren();
    const s = especie(base.id);
    campoAbility.replaceChildren(...(['0', '1', 'H'] as const).filter((c) => s.abilities[c]).map((c) => el('option', { value: s.abilities[c]! }, c === 'H' ? `${s.abilities[c]} (Hidden Ability)` : s.abilities[c]!)));
    campoTera.replaceChildren(el('option', { value: '' }, `Padrão (${s.types[0]})`), ...TIPOS_TERA.map((t) => el('option', { value: t }, t)));
    const lista = golpesDaEspecie(base.id);
    const iniciais = golpesIniciais(base.id, lido(campoNivel, 1, nivelMax)).map((g) => g.id);
    golpes.forEach((g, i) => g.replaceChildren(
      el('option', { value: '' }, '— nenhum —'),
      ...lista.map((m) => el('option', { value: m.id, selected: m.id === iniciais[i] }, m.ovo ? `${m.nome} (Egg Move)` : m.nome))));
    mostrar();
  };
  const mostrar = () => {
    const base = escolhido();
    const iv = valores(ivs, 31);
    const totalIv = Object.values(iv).reduce((s, n) => s + n, 0);
    const totalEv = Object.values(valores(evs, EV_MAX_ATRIBUTO)).reduce((s, n) => s + n, 0);
    somaIvs.textContent = `Soma ${totalIv} de 186 · tier ${tierIv({ ivs: iv })}`;
    somaEvs.textContent = `Total ${totalEv} de ${EV_MAX_TOTAL}${totalEv > EV_MAX_TOTAL ? ' — passou do limite!' : ''}`;
    previa.replaceChildren(...(base ? [spritePokemon(base, { shiny: campoShiny.checked, animado: false }), el('strong', {}, base.nome, campoShiny.checked ? ' ★' : '')] : []));
  };
  campoPokemon.addEventListener('input', trocarEspecie);
  campoShiny.addEventListener('change', mostrar);
  for (const c of [...Object.values(ivs), ...Object.values(evs)]) c.addEventListener('input', mostrar);
  const preencher = (campos: Record<Atributo, HTMLInputElement>, valor: number) => () => {
    for (const c of Object.values(campos)) c.value = String(valor);
    mostrar();
  };

  /** Cada IV sorteado do mínimo até 31: de 0 como num selvagem comum, de 15 como num shiny. */
  const sortearIvs = (minimo: number) => () => {
    for (const c of Object.values(ivs)) c.value = String(minimo + Math.floor(Math.random() * (32 - minimo)));
    mostrar();
  };

  // sugestões de jogadores enquanto digita (usuário ou nome de treinador)
  let relogio = 0;
  campoJogador.addEventListener('input', () => {
    clearTimeout(relogio);
    const termo = campoJogador.value.trim();
    if (termo.length < 2) return;
    relogio = window.setTimeout(async () => {
      try {
        const achados = await api<{ usuario: string; nome: string | null }[]>('GET', `/jogadores?busca=${encodeURIComponent(termo)}`);
        listaJogadores.replaceChildren(...achados.map((j) => el('option', { value: j.usuario }, j.nome ?? '')));
      } catch {
        // sem sugestões: o envio ainda confere o usuário
      }
    }, 250);
  });

  let enviando = false;
  const enviar = async () => {
    if (enviando) return;
    const base = escolhido();
    const usuario = campoJogador.value.trim();
    if (!base) return void (aviso.textContent = 'Escolha um Pokémon da lista.');
    const escolhidos = golpes.map((g) => g.value).filter(Boolean);
    if (!escolhidos.length) return void (aviso.textContent = 'Escolha pelo menos um golpe.');
    if (new Set(escolhidos).size !== escolhidos.length) return void (aviso.textContent = 'Há um golpe repetido.');
    const ev = valores(evs, EV_MAX_ATRIBUTO);
    if (Object.values(ev).reduce((s, n) => s + n, 0) > EV_MAX_TOTAL) return void (aviso.textContent = `Os EVs somam no máximo ${EV_MAX_TOTAL}.`);
    if (!usuario && !destino) return void (aviso.textContent = 'Diga para qual jogador vai.');

    const nivel = lido(campoNivel, 1, nivelMax);
    const shiny = campoShiny.checked;
    // o molde dá o que não se escolhe aqui (gênero, experiência do nível); o resto é o que está no formulário
    const p: PokemonIndividual = { ...novoPokemon(base.id, nivel, shiny), shiny, natureza: campoNature.value, habilidade: campoAbility.value, ivs: valores(ivs, 31), evs: ev, golpes: escolhidos.map((id) => ({ id, pp: ppMaximo(id) })) };
    if (campoTera.value) p.teraTipo = campoTera.value;
    if (campoNT.checked) p.inegociavel = true;
    p.hp = hpMaximo(p);
    const nome = `${base.nome}${shiny ? ' shiny' : ''} Nv. ${nivel}`;
    if (!(await confirmar('Confirmar', destino ? `${destino.botao}: ${nome}?` : `Dar ${nome} para ${usuario}?`))) return;
    enviando = true;
    aviso.textContent = '';
    try {
      if (destino) aviso.textContent = await destino.enviar(p, nome);
      else {
      const r = await darPokemonAoJogador(usuario, p, nome);
      aviso.textContent = `${nome} enviado para ${r.usuario}. Chega na hora se ele estiver online; senão, quando ele entrar.`;
      }
    } catch (e) {
      aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    enviando = false;
  };

  const grade = (campos: Record<Atributo, HTMLInputElement>) => el('div', { class: 'adm-pk-grade' }, ...ATRIBUTOS.map((a) => el('label', {}, el('small', {}, ROTULOS[a]), campos[a])));
  const atalho = (rotulo: string, acao: () => void) => el('button', { class: 'aba', type: 'button', onclick: acao }, rotulo);
  mostrar();

  return {
    parar: () => clearTimeout(relogio),
    elemento: el('section', { class: 'bonus-secao' },
      destino ? null : el('p', { class: 'sub' }, 'Monta um Pokémon e manda para um jogador. Ele recebe um aviso; o Pokémon vai para o time ou, se o time está cheio, para o PC, e já chega com os IVs avaliados.'),
      listaPokemon, listaJogadores,
      el('div', { class: 'cla-formulario adm-pk' },
        el('label', { class: 'cla-campo' }, 'Pokémon', campoPokemon),
        previa,
        el('div', { class: 'adm-pk-linha' },
          el('label', { class: 'cla-campo' }, 'Nível', campoNivel),
          el('label', { class: 'adm-pk-chave' }, campoShiny, 'Shiny'),
          el('label', { class: 'adm-pk-chave', title: 'Inegociável: não pode ser trocado nem vendido' }, campoNT, 'NT')),
        el('label', { class: 'cla-campo' }, 'Nature', campoNature),
        el('label', { class: 'cla-campo' }, 'Ability', campoAbility),
        el('label', { class: 'cla-campo' }, 'Tera Type', campoTera),
        el('div', { class: 'cla-campo' }, el('span', { class: 'adm-pk-titulo' }, 'IVs (0 a 31)', atalho('Todos 31', preencher(ivs, 31)), atalho('Todos 0', preencher(ivs, 0)), atalho('Aleatórios', sortearIvs(0)), atalho('Aleatórios 15+', sortearIvs(IV_MIN_SHINY))), grade(ivs), somaIvs),
        el('div', { class: 'cla-campo' }, el('span', { class: 'adm-pk-titulo' }, `EVs (0 a ${EV_MAX_ATRIBUTO}, total ${EV_MAX_TOTAL})`, atalho('Zerar', preencher(evs, 0))), grade(evs), somaEvs),
        el('div', { class: 'cla-campo' }, 'Golpes (os marcados com "Egg Move" só se aprendem por ovo)', el('div', { class: 'adm-pk-golpes' }, ...golpes)),
        destino ? null : el('label', { class: 'cla-campo' }, 'Jogador', campoJogador),
        el('button', { class: 'botao cla-botao-criar', onclick: () => void enviar() }, destino?.botao ?? 'Dar Pokémon')),
      aviso),
  };
}
