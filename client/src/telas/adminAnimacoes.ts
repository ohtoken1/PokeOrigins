// Administração → Animações (pedido do dono, 25/10/2026): um palco igual ao da batalha para ver a animação de qualquer
// golpe, acertando, errando ou só a parte de preparo (1º turno), do lado do jogador ou do adversário. Mostra de onde
// vem cada animação (própria do Showdown, nossa, emprestada de outro golpe ou genérica) e toca todas em sequência.
import { Dex } from '@pkmn/sim';
import { animarGolpeOriginal } from '../batalha/efeitosGolpes';
import { carregarAnimacoes } from '../batalha/animShowdown';
import { origemDaAnimacao, type Origem } from '../batalha/animsNossas';
import { pokemonPorId } from '../dados';
import { el, spritePokemon } from '../ui/dom';

type Filtro = 'todos' | 'propria' | 'nossa' | 'copia' | 'generica' | 'sem';
const NOME_FILTRO: Record<Filtro, string> = { todos: 'Todos', propria: 'Próprias', nossa: 'Nossas', copia: 'Copiadas', generica: 'Genéricas', sem: 'Sem animação' };
const GOLPES = Dex.moves.all().filter((g) => g.exists && !g.isNonstandard && !g.isMax && !g.isZ).sort((a, b) => a.name.localeCompare(b.name));
const DOIS_TURNOS = new Set(GOLPES.filter((g) => g.flags.charge).map((g) => g.id));

const textoOrigem = (o: Origem | undefined): string =>
  !o ? '…' : o.tipo === 'propria' ? 'Animação própria (Showdown)' : o.tipo === 'nossa' ? 'Animação nossa (feita para o PokeOrigins)'
    : o.tipo === 'copia' ? `Copiada de ${Dex.moves.get(o.de).name}` : o.tipo === 'generica' ? `Genérica do Showdown (${o.de})` : 'Sem animação: usa a nossa simples, pelo tipo';

export function secaoAnimacoes(): { elemento: HTMLElement; parar: () => void } {
  let filtro: Filtro = 'todos';
  let indice = 0;
  let tocando = false;
  let emSequencia = false;
  let invertido = false;
  const lista = () => GOLPES.filter((g) => filtro === 'todos' || origemDaAnimacao.get(g.id)?.tipo === filtro);

  // o mesmo palco da batalha: Charizard de costas (jogador) e Blastoise de frente (adversário)
  const spriteJogador = spritePokemon(pokemonPorId(6), { costas: true, palco: true });
  spriteJogador.classList.add('sprite', 'sprite-jogador');
  const spriteSelvagem = spritePokemon(pokemonPorId(9), { palco: true });
  spriteSelvagem.classList.add('sprite', 'sprite-selvagem');
  const arena = el('div', { class: 'arena', style: { '--chao': '#7cc06a', '--zona': '#5ea24e' } },
    el('div', { class: 'lugar lugar-selvagem' }, spriteSelvagem),
    el('div', { class: 'lugar lugar-jogador' }, spriteJogador));

  const titulo = el('strong', { class: 'anim-titulo' });
  const origem = el('small', { class: 'meta' });
  const contador = el('small', { class: 'meta' });
  const busca = el('input', { type: 'search', class: 'db-busca', placeholder: 'Buscar golpe (nome em inglês)', 'aria-label': 'Buscar golpe', list: 'anim-golpes' }) as HTMLInputElement;
  const opcoes = el('datalist', { id: 'anim-golpes' }, ...GOLPES.map((g) => el('option', { value: g.name })));
  const abas = el('nav', { class: 'admin-abas' });

  const atual = () => lista()[indice];
  const desenhar = () => {
    const l = lista();
    indice = Math.max(0, Math.min(indice, l.length - 1));
    const g = l[indice];
    titulo.textContent = g ? `${g.name} · ${g.type} · ${g.category}${DOIS_TURNOS.has(g.id) ? ' · dois turnos' : ''}` : 'Nenhum golpe neste filtro';
    origem.textContent = g ? textoOrigem(origemDaAnimacao.get(g.id)) : '';
    contador.textContent = l.length ? `${indice + 1} de ${l.length}` : '';
    abas.replaceChildren(...(Object.keys(NOME_FILTRO) as Filtro[]).map((f) => {
      const n = f === 'todos' ? GOLPES.length : GOLPES.filter((x) => origemDaAnimacao.get(x.id)?.tipo === f).length;
      return el('button', { class: `aba ${f === filtro ? 'ativa' : ''}`, onclick: () => ((filtro = f), (indice = 0), desenhar()) }, `${NOME_FILTRO[f]} (${n})`);
    }));
  };

  const tocar = async (modo: 'acerta' | 'erra' | 'preparo') => {
    const g = atual();
    if (!g || tocando) return;
    tocando = true;
    const [atacante, defensor] = invertido ? [spriteSelvagem, spriteJogador] : [spriteJogador, spriteSelvagem];
    try {
      await animarGolpeOriginal(arena, atacante, g.target === 'self' ? null : defensor, g.id, g.type, g.category, defensor, { errou: modo === 'erra', preparo: modo === 'preparo' });
    } finally {
      tocando = false;
    }
  };
  const ir = (passo: number) => {
    indice = (indice + passo + lista().length) % Math.max(1, lista().length);
    desenhar();
  };
  const sequencia = async () => {
    emSequencia = !emSequencia;
    botaoSequencia.textContent = emSequencia ? '⏸ Parar' : '▶ Tocar todos daqui';
    while (emSequencia && atual()) {
      desenhar();
      await tocar('acerta');
      await new Promise((r) => setTimeout(r, 500));
      if (!emSequencia) break;
      if (indice >= lista().length - 1) break;
      indice++;
    }
    emSequencia = false;
    botaoSequencia.textContent = '▶ Tocar todos daqui';
  };
  const botaoSequencia = el('button', { class: 'botao secundario', onclick: () => void sequencia() }, '▶ Tocar todos daqui') as HTMLButtonElement;

  busca.addEventListener('change', () => {
    const nome = busca.value.trim().toLowerCase();
    filtro = 'todos';
    const i = GOLPES.findIndex((g) => g.name.toLowerCase() === nome || g.id === nome.replace(/[^a-z0-9]/g, ''));
    if (i >= 0) indice = i;
    desenhar();
    if (i >= 0) void tocar('acerta');
  });

  const elemento = el('section', { class: 'bonus-secao admin-animacoes', 'data-sem-traducao': '' },
    el('p', { class: 'sub' }, 'Veja a animação de qualquer golpe como fica na batalha. "Errando" mostra o golpe saindo ao lado do alvo; "Preparo" é o 1º turno dos golpes de dois turnos (Solar Beam, Fly…). Golpe com animação copiada ou genérica ganha um estouro na cor do próprio tipo.'),
    abas,
    el('div', { class: 'anim-controles' }, busca, opcoes),
    el('div', { class: 'anim-palco batalha' }, arena),
    el('div', { class: 'anim-info' }, titulo, origem, contador),
    el('div', { class: 'adm-premio-acoes' },
      el('button', { class: 'botao secundario', onclick: () => ir(-1) }, '◀ Anterior'),
      el('button', { class: 'botao', onclick: () => void tocar('acerta') }, 'Tocar (acerta)'),
      el('button', { class: 'botao secundario', onclick: () => void tocar('erra') }, 'Tocar errando'),
      el('button', { class: 'botao secundario', onclick: () => void tocar('preparo') }, 'Preparo (1º turno)'),
      el('button', { class: 'botao secundario', onclick: () => ir(1) }, 'Próximo ▶'),
      el('button', { class: 'botao secundario', onclick: () => ((invertido = !invertido), desenhar()) }, '⇄ Trocar quem ataca'),
      botaoSequencia));
  desenhar();
  // a classificação só existe depois que o arquivo de animações carrega
  void carregarAnimacoes().then(desenhar);
  return { elemento, parar: () => void (emSequencia = false) };
}
