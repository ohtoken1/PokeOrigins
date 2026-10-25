// Administração → Biomas (pedido do dono, 24/10/2026): a staff mexe em onde cada linha evolutiva aparece sem
// programador: mover de bioma, tirar dos mapas (e do Safari) ou fazer aparecer também em outra região.
// Vale para a linha inteira (a chave é a forma base). Gravado no servidor (server/src/ajustes.ts) e aplicado nos
// encontros de todos (shared/encontros.ts → montarTabela).
import { BIOMAS } from '../../../shared/biomas';
import { REGIOES } from '../../../shared/regioes';
import { ajustesDosBiomas, biomaDoPokemon, formaBaseDe, type AjustesBiomas } from '../../../shared/encontros';
import type { PokemonBase } from '../../../shared/tipos';
import { adotarAjustes, aoMudarAjustes, type TimesGinasio } from '../ajustesJogo';
import { api, ErroApi } from '../conta';
import { pokemonPorId, pokemonsDaRegiao, todosOsPokemons } from '../dados';
import { el, spritePokemon } from '../ui/dom';

const nomeBioma = (id: string) => BIOMAS.find((b) => b.id === id)?.nome ?? id;
const nomeRegiao = (id: string) => REGIOES.find((r) => r.id === id)?.nome ?? id;
const regiaoDe = (p: PokemonBase) => REGIOES.find((r) => pokemonsDaRegiao(r.id).some((x) => x.id === p.id))?.id ?? null;

export function secaoBiomas(): { elemento: HTMLElement; parar: () => void } {
  const todos = todosOsPokemons();
  const caixa = el('section', { class: 'bonus-secao admin-biomas' });
  const lista = el('datalist', { id: 'adm-biomas-pk' }, ...todos.map((p) => el('option', { value: p.nome })));
  const busca = el('input', { type: 'text', class: 'db-busca', list: 'adm-biomas-pk', placeholder: 'Nome do Pokémon (qualquer forma da linha)', 'aria-label': 'Pokémon', autocomplete: 'off' }) as HTMLInputElement;
  const painel = el('div', { class: 'adm-biomas-painel' });
  const atuais = el('div', { class: 'ban-lista' });
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  let base: PokemonBase | null = null;

  async function gravar(f: (a: AjustesBiomas) => void, mensagem: string): Promise<void> {
    const a = structuredClone(ajustesDosBiomas());
    f(a);
    try {
      adotarAjustes(await api<{ biomas: AjustesBiomas; ginasios: TimesGinasio }>('POST', '/admin/biomas', { biomas: a }));
      aviso.textContent = mensagem;
    } catch (e) {
      aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
  }

  /** A linha inteira (forma base + todas que vêm dela), para mostrar. */
  const linhaDe = (b: PokemonBase) => todos.filter((p) => formaBaseDe(p, todos).id === b.id);

  function desenharPainel(): void {
    if (!base) return void painel.replaceChildren(el('p', { class: 'meta' }, 'Escolha um Pokémon para ver e mudar onde a linha dele aparece.'));
    const b = base;
    const a = ajustesDosBiomas();
    const k = String(b.id);
    const padrao = biomaDoPokemon(b);
    const origem = regiaoDe(b);
    const seletorBioma = el('select', { class: 'db-busca', 'aria-label': 'Bioma' },
      el('option', { value: '' }, `Padrão (${padrao ? nomeBioma(padrao) : 'nenhum'})`),
      ...BIOMAS.map((x) => el('option', { value: x.id, selected: a.mover[k] === x.id }, x.nome))) as HTMLSelectElement;
    const fora = a.fora.includes(b.id);
    const extras = a.extra[k] ?? [];
    painel.replaceChildren(
      el('div', { class: 'mini-time' }, ...linhaDe(b).map((p) => spritePokemon(p, { animado: false }))),
      el('p', {}, el('strong', {}, `Linha de ${b.nome}`), ` · região de origem: ${origem ? nomeRegiao(origem) : 'nenhuma (só cadastrado)'} · bioma agora: ${fora ? 'fora dos mapas' : nomeBioma(a.mover[k] ?? padrao ?? '')}`),
      el('div', { class: 'cla-formulario' },
        el('label', { class: 'cla-campo' }, 'Bioma', seletorBioma),
        el('button', { class: 'botao', onclick: () => gravar((x) => (seletorBioma.value ? (x.mover[k] = seletorBioma.value) : delete x.mover[k]), seletorBioma.value ? `Linha de ${b.nome} movida para ${nomeBioma(seletorBioma.value)}.` : `Linha de ${b.nome} voltou ao bioma padrão.`) }, 'Salvar bioma'),
        el('label', { class: 'adm-pk-chave' },
          el('input', { type: 'checkbox', checked: fora, onchange: (ev: Event) => {
            const marcado = (ev.target as HTMLInputElement).checked;
            void gravar((x) => (x.fora = marcado ? [...x.fora, b.id] : x.fora.filter((n) => n !== b.id)), marcado ? `Linha de ${b.nome} tirada dos mapas e do Safari.` : `Linha de ${b.nome} voltou aos mapas.`);
          } }),
          'Fora dos mapas (não aparece solto nem no Safari)'),
        el('div', { class: 'cla-campo' }, 'Aparece também nas regiões:',
          el('div', { class: 'adm-biomas-regioes' }, ...REGIOES.filter((r) => r.disponivel && r.id !== origem).map((r) =>
            el('label', { class: 'adm-pk-chave' },
              el('input', { type: 'checkbox', checked: extras.includes(r.id), onchange: (ev: Event) => {
                const marcado = (ev.target as HTMLInputElement).checked;
                void gravar((x) => {
                  const lista = (x.extra[k] ?? []).filter((id) => id !== r.id);
                  if (marcado) lista.push(r.id);
                  if (lista.length) x.extra[k] = lista;
                  else delete x.extra[k];
                }, marcado ? `Linha de ${b.nome} agora aparece também em ${r.nome}.` : `Linha de ${b.nome} saiu de ${r.nome}.`);
              } }),
              r.nome))))),
    );
  }

  function desenharAtuais(): void {
    const a = ajustesDosBiomas();
    const nome = (k: string | number) => {
      try {
        return pokemonPorId(Number(k)).nome;
      } catch {
        return `#${k}`;
      }
    };
    const linhas: [string, string, (x: AjustesBiomas) => void][] = [
      ...Object.entries(a.mover).map(([k, v]): [string, string, (x: AjustesBiomas) => void] => [nome(k), `movido para ${nomeBioma(v)}`, (x) => delete x.mover[k]]),
      ...a.fora.map((n): [string, string, (x: AjustesBiomas) => void] => [nome(n), 'fora dos mapas', (x) => (x.fora = x.fora.filter((m) => m !== n))]),
      ...Object.entries(a.extra).map(([k, rs]): [string, string, (x: AjustesBiomas) => void] => [nome(k), `também em ${rs.map(nomeRegiao).join(', ')}`, (x) => delete x.extra[k]]),
    ];
    atuais.replaceChildren(...(linhas.length
      ? linhas.map(([quem, oque, desfazer]) => el('div', { class: 'ban-cartao' },
          el('div', { class: 'ban-topo' }, el('strong', {}, `Linha de ${quem}`), el('span', { class: 'meta' }, oque)),
          el('button', { class: 'botao secundario', onclick: () => gravar(desfazer, `Ajuste da linha de ${quem} desfeito.`) }, 'Desfazer')))
      : [el('p', { class: 'meta' }, 'Nenhum ajuste: todos os Pokémon estão no lugar padrão.')]));
  }

  busca.addEventListener('input', () => {
    const p = todos.find((x) => x.nome.toLowerCase() === busca.value.trim().toLowerCase());
    if (!p) return;
    base = formaBaseDe(p, todos);
    aviso.textContent = '';
    desenharPainel();
  });
  const redesenhar = () => {
    desenharPainel();
    desenharAtuais();
  };
  redesenhar();
  const parar = aoMudarAjustes(() => caixa.isConnected && redesenhar());
  caixa.append(
    el('p', { class: 'sub' }, 'Mude onde uma linha evolutiva aparece. Vale para a linha toda e chega a todos os jogadores na hora. Lendários, iniciais e raros continuam com a chance de sempre.'),
    lista,
    el('label', { class: 'cla-campo' }, 'Pokémon', busca),
    painel,
    aviso,
    el('h2', { class: 'anuncios-titulo' }, 'Ajustes ativos'),
    atuais);
  return { elemento: caixa, parar };
}
