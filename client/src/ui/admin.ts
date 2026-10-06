import { TICKETS } from '../../../shared/tickets';
// Painel de administrador (aba na esquerda) para testar encontros: shiny, lendários, chance por passo,
// Pokémon e nível forçados. Provisório: sem login; os ajustes ficam só neste navegador.
import { AJUSTES_PADRAO, CHANCE_SHINY, type AjustesEncontro } from '../../../shared/encontros';
import { NIVEL_MAX_TREINADOR, nivelTreinador, xpTotalParaNivel } from '../../../shared/treinador';
import { todosOsPokemons } from '../dados';
import { carregarSave, salvar } from '../estado';
import { el } from './dom';

const CHAVE = 'jogo-claude:admin';
const CHAVE_POKEDEX = 'jogo-claude:admin-pokedex';

/** Teste: mostra a Pokédex inteira, mesmo os Pokémon ainda não vistos. */
export function pokedexRevelada(): boolean {
  try {
    return localStorage.getItem(CHAVE_POKEDEX) === 'sim';
  } catch {
    return false;
  }
}
const ouvintes = new Set<() => void>();
/** Chamado quando o painel muda o save (a tela atual precisa recarregar). */
let aoMudarSave: (() => void) | undefined;

let ajustes: AjustesEncontro = carregar();

function carregar(): AjustesEncontro {
  try {
    const salvos = { ...AJUSTES_PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') };
    // o padrão antigo de shiny (1/512) foi trocado: segue o padrão novo
    if (Math.abs(salvos.chanceShiny - 1 / 512) < 1e-12) salvos.chanceShiny = AJUSTES_PADRAO.chanceShiny;
    return salvos;
  } catch {
    return { ...AJUSTES_PADRAO };
  }
}

export function ajustesAdmin(): AjustesEncontro {
  return ajustes;
}

/** Avisa quando um ajuste muda; devolve a função para parar de ouvir. */
export function aoMudarAdmin(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function mudar(parcial: Partial<AjustesEncontro>) {
  ajustes = { ...ajustes, ...parcial };
  localStorage.setItem(CHAVE, JSON.stringify(ajustes));
  ouvintes.forEach((fn) => fn());
}

const OPCOES_SHINY: [string, number][] = [
  ['Nunca', 0],
  [`Normal (1/${Math.round(1 / CHANCE_SHINY)})`, CHANCE_SHINY],
  ['1/100', 1 / 100],
  ['1/10', 1 / 10],
  ['1/2', 1 / 2],
  ['Sempre', 1],
];
const OPCOES_LENDARIO: [string, number][] = [
  ['Nunca', 0],
  ['Normal (1×)', 1],
  ['10×', 10],
  ['100×', 100],
  ['1000×', 1000],
];

function seletor(opcoes: [string, number][], atual: number, aoEscolher: (v: number) => void): HTMLSelectElement {
  const s = el('select', {}, ...opcoes.map(([nome, v]) => el('option', { value: v, selected: Math.abs(v - atual) < 1e-9 }, nome))) as HTMLSelectElement;
  // valor salvo que não está na lista (ex.: padrão mudou): mostra mesmo assim
  if (!opcoes.some(([, v]) => Math.abs(v - atual) < 1e-9)) s.append(el('option', { value: atual, selected: true }, `${atual}`));
  s.addEventListener('change', () => aoEscolher(Number(s.value)));
  return s;
}

function campo(rotulo: string, ...controles: (HTMLElement | string)[]): HTMLElement {
  return el('label', { class: 'admin-campo' }, el('span', {}, rotulo), ...controles);
}

function conteudo(): HTMLElement[] {
  const a = ajustes;

  const chancePasso = el('input', { type: 'range', min: 0, max: 100, value: Math.round(a.chancePorPasso * 100) }) as HTMLInputElement;
  const valorPasso = el('strong', {}, `${chancePasso.value}%`);
  chancePasso.addEventListener('input', () => (valorPasso.textContent = `${chancePasso.value}%`));
  chancePasso.addEventListener('change', () => mudar({ chancePorPasso: Number(chancePasso.value) / 100 }));

  const soLendarios = el('input', { type: 'checkbox', checked: a.soLendarios }) as HTMLInputElement;
  soLendarios.addEventListener('change', () => mudar({ soLendarios: soLendarios.checked }));

  // todos os Pokémon da região, incluindo lendários e os que não aparecem no mapa
  const especie = el(
    'select',
    {},
    el('option', { value: '' }, '— sorteio normal —'),
    ...todosOsPokemons().map((p) => el('option', { value: p.id, selected: p.id === a.especie }, `#${p.id} ${p.nome}${p.lendario || p.mitico ? ' ★' : ''}`)),
  ) as HTMLSelectElement;
  especie.addEventListener('change', () => mudar({ especie: especie.value ? Number(especie.value) : null }));

  const nivel = el('input', { type: 'number', min: 1, max: 100, placeholder: 'normal', value: a.nivel ?? '' }) as HTMLInputElement;
  nivel.addEventListener('change', () => {
    const n = Math.round(Number(nivel.value));
    mudar({ nivel: nivel.value && n >= 1 ? Math.min(100, n) : null });
  });

  // nível de treinador: grava no save e redesenha a tela atual
  const save = carregarSave();
  const nivelTreinadorCampo = el('input', { type: 'number', min: 1, max: NIVEL_MAX_TREINADOR, value: save ? nivelTreinador(save.xpTreinador) : 1, disabled: !save }) as HTMLInputElement;
  const aplicarNivel = el('button', { class: 'botao secundario', disabled: !save }, 'Aplicar') as HTMLButtonElement;
  aplicarNivel.addEventListener('click', () => {
    const atual = carregarSave();
    if (!atual) return;
    const n = Math.max(1, Math.min(NIVEL_MAX_TREINADOR, Math.round(Number(nivelTreinadorCampo.value) || 1)));
    atual.xpTreinador = xpTotalParaNivel(n);
    salvar(atual);
    aoMudarSave?.();
  });

  return [
    el('h4', {}, 'Treinador'),
    campo(`Nível de treinador (1–${NIVEL_MAX_TREINADOR})`, el('div', { class: 'admin-linha' }, nivelTreinadorCampo, aplicarNivel)),
    el('h4', {}, 'Moedas'),
    ...(['gold', 'silver'] as const).map((moeda) => {
      const campoQtd = el('input', { type: 'number', min: 1, value: 1000, disabled: !save }) as HTMLInputElement;
      const dar = el('button', { class: 'botao secundario', disabled: !save }, 'Adicionar') as HTMLButtonElement;
      dar.addEventListener('click', () => {
        const atual = carregarSave();
        if (!atual) return;
        atual[moeda] = Math.max(0, atual[moeda] + Math.round(Number(campoQtd.value) || 0));
        salvar(atual);
        aoMudarSave?.();
      });
      return campo(`${moeda === 'gold' ? 'Gold' : 'Silver'} (tem ${save ? save[moeda].toLocaleString('pt-BR') : 0})`, el('div', { class: 'admin-linha' }, campoQtd, dar));
    }),
    el('h4', {}, 'Tickets'),
    ...TICKETS.map((t) =>
      el(
        'button',
        {
          class: 'botao secundario',
          disabled: !save,
          onclick: () => {
            const atual = carregarSave();
            if (!atual) return;
            atual.itens[t.id] = (atual.itens[t.id] ?? 0) + 1;
            salvar(atual);
            aoMudarSave?.();
          },
        },
        `+1 ${t.nome}`,
      ),
    ),
    el('h4', {}, 'Pokédex'),
    (() => {
      const caixa = el('input', { type: 'checkbox', checked: pokedexRevelada() }) as HTMLInputElement;
      caixa.addEventListener('change', () => {
        try {
          localStorage.setItem(CHAVE_POKEDEX, caixa.checked ? 'sim' : 'nao');
        } catch {
          /* ignora */
        }
        aoMudarSave?.();
      });
      return el('label', { class: 'admin-check' }, caixa, ' Habilitar todos os Pokémon da Pokédex');
    })(),
    el('h4', {}, 'Encontros'),
    campo('Chance de shiny', seletor(OPCOES_SHINY, a.chanceShiny, (v) => mudar({ chanceShiny: v }))),
    campo('Lendários, míticos e Ultra Beasts', seletor(OPCOES_LENDARIO, a.multLendario, (v) => mudar({ multLendario: v }))),
    el('label', { class: 'admin-check' }, soLendarios, ' Só lendários do bioma'),
    campo('Encontro por passo', valorPasso, chancePasso),
    campo('Pokémon forçado', especie),
    campo('Nível forçado', nivel),
    el('button', { class: 'botao secundario', onclick: () => mudar({ ...AJUSTES_PADRAO }) }, 'Restaurar padrão'),

    el('p', { class: 'admin-nota' }, 'Ajustes de teste: valem só neste navegador. Login de administrador virá depois.'),
  ];
}

/** Cria a aba fixa na esquerda (uma vez, no início do jogo). */
export function montarPainelAdmin(recarregarTela: () => void) {
  aoMudarSave = () => {
    recarregarTela();
    desenhar();
  };
  const corpo = el('div', { class: 'admin-corpo' });
  const painel = el('aside', { class: 'admin-painel' }, el('h3', {}, 'Administrador'), corpo);
  const aba = el('button', { class: 'admin-aba', title: 'Painel de administrador' }, '⚙ Admin');
  const desenhar = () => corpo.replaceChildren(...conteudo());
  aba.addEventListener('click', () => {
    // ao abrir, mostra os valores atuais (ex.: nível de treinador depois de batalhas)
    if (painel.classList.toggle('aberto')) desenhar();
    aba.classList.toggle('aberto');
  });
  // teclas digitadas no painel não andam com o personagem
  painel.addEventListener('keydown', (e) => e.stopPropagation());
  aoMudarAdmin(() => {
    // só redesenha se a mudança não veio de um controle em uso (ex.: Restaurar padrão)
    if (!painel.contains(document.activeElement) || document.activeElement?.tagName === 'BUTTON') desenhar();
  });
  desenhar();
  document.body.append(aba, painel);
}
