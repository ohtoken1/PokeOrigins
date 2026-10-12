// Janela de chocar o Ovo Misterioso: roleta com Pokémon de todas as regiões (como a do ticket),
// que para no Pokémon sorteado; ele vai para o time (ou PC) com IVs do tier garantido.
import { IV_MIN_SHINY, hpMaximo } from '../../../shared/batalha/pokemon';
import { NIVEL_OVO, chocarOvo, ovoPorId, type Ovo, type ResultadoOvo } from '../../../shared/ovos';
import { marcarConquista } from '../conquistas';
import { pokemonPorId, todosOsPokemons } from '../dados';
import { TODOS_INICIAIS } from '../../../shared/regioes';
import { TAMANHO_MAXIMO_TIME, guardarNoPC, novoPokemon, registrarCapturado, salvar, type Save } from '../estado';
import { abrirJanela } from './janela';
import { corTipo, el, selosTipos, spritePokemon } from './dom';
import { iconeOvo } from './iconeItem';
import { areaRoletas, botoesQuantidade } from './abrirVarios';
import { ehLendario } from '../../../shared/encontros';
import { especie } from '../../../shared/batalha/pokemon';
import { ehParadoxo, foraDosMapas } from '../../../shared/formasRegionais';

/** Duração da roleta do ovo (mais lenta que a do ticket, para dar expectativa). */
const DURACAO_ROLETA = 9000;

/** Fundo da casa pela categoria: Ultra Beast vermelho, mítico roxo, lendário laranja, os outros branco. */
function fundoCategoria(id: number): string {
  const p = pokemonPorId(id);
  if ((especie(id).tags ?? []).includes('Ultra Beast')) return 'fundo-ultra';
  if (p.mitico) return 'fundo-mitico';
  if (p.lendario) return 'fundo-lendario';
  return 'fundo-comum';
}

/** Casa da roleta; `porTipo` (Ovo Inicial): fundo na cor do tipo, como na roleta do inicial. */
function casa(id: number, shiny = false, porTipo = false): HTMLElement {
  const dados = pokemonPorId(id);
  const fundo = porTipo ? 'fundo-tipo' : fundoCategoria(id);
  return el('div', { class: `casa-roleta ${fundo} ${shiny ? 'casa-shiny' : ''}`, style: porTipo ? { '--cor-tipo': corTipo(dados.tipos[0]) } : {} }, spritePokemon(dados, { shiny, animado: false }));
}

/** Coloca o Pokémon do ovo no time (ou no PC) e devolve a frase de onde ele foi. */
function entregar(save: Save, r: ResultadoOvo, ovo: Ovo): string {
  const p = novoPokemon(r.especie, NIVEL_OVO, r.shiny);
  p.ivs = r.ivs;
  p.hp = hpMaximo(p);
  p.origem = 'ovo';
  // ovo NT: o Pokémon que nasce também não pode ser trocado (os IVs continuam escondidos)
  if (ovo.nt) {
    p.inegociavel = true;
    p.ivsRevelados = false;
  }
  registrarCapturado(save, r.especie, r.shiny);
  // conquista: lendário saindo do Ovo Misterioso
  if (ovo.grupo === 'todos' && ehLendario(pokemonPorId(r.especie))) marcarConquista(save, 'ovoLendario');
  const nome = `${pokemonPorId(r.especie).nome}${r.shiny ? ' ✨' : ''}`;
  if (save.time.length < TAMANHO_MAXIMO_TIME) {
    save.time.push(p);
    return `${nome} entrou no seu time.`;
  }
  return `${nome} foi enviado para o PC (Box ${guardarNoPC(save, p) + 1}).`;
}

/** É um inicial ou evolução de um (sobe a linha até a primeira forma). */
function ehDeInicial(id: number, porSlug: Map<string, number>): boolean {
  for (let atual: number | undefined = id, i = 0; atual !== undefined && i < 5; i++) {
    if (TODOS_INICIAIS.includes(atual)) return true;
    const pai: string | null = pokemonPorId(atual).evoluiDe;
    atual = pai ? porSlug.get(pai) : undefined;
  }
  return false;
}

/**
 * Quem pode nascer do ovo. Paradoxos (com Koraidon e Miraidon) não nascem de nenhum (pedido do dono).
 * Lendário: lendários, míticos e Ultra Beasts, só a primeira forma da linha (Cosmog, não Lunala; Type: Null, não Silvally).
 * Comum: sem lendário/mítico/Ultra Beast e sem inicial nem evolução de inicial.
 */
export function especiesDoOvo(ovo: Ovo): number[] {
  if (ovo.grupo === 'iniciais') return TODOS_INICIAIS;
  const todos = todosOsPokemons().filter((p) => !ehParadoxo(especie(p.id).name) && !foraDosMapas(p.id));
  const lendarioBase = (p: (typeof todos)[number]) => ehLendario(p) && !p.evoluiDe && !especie(p.id).prevo;
  if (ovo.grupo === 'lendarios') return todos.filter(lendarioBase).map((p) => p.id);
  const porSlug = new Map(todosOsPokemons().map((p) => [p.slug, p.id]));
  // Misterioso (pedido do dono): de iniciais e de lendários só a forma base; os comuns vêm em qualquer forma
  if (ovo.grupo === 'todos') return todos.filter((p) => (ehLendario(p) ? lendarioBase(p) : !ehDeInicial(p.id, porSlug) || TODOS_INICIAIS.includes(p.id))).map((p) => p.id);
  return todos.filter((p) => !ehLendario(p) && !ehDeInicial(p.id, porSlug)).map((p) => p.id);
}

export function abrirJanelaOvo(save: Save, ovoId: string, aoMudar: () => void): void {
  const ovo = ovoPorId(ovoId);
  if (!ovo) return;
  const especies = especiesDoOvo(ovo);
  const qualquer = () => especies[Math.floor(Math.random() * especies.length)];
  let girando = false;

  abrirJanela(
    ovo.nome,
    () => {
      const qtd = save.itens[ovoId] ?? 0;
      // uma roleta por ovo chocado (uma em cima da outra)
      const porTipo = ovo.grupo === 'iniciais';
      const roletas = areaRoletas(() => casa(qualquer(), false, porTipo));
      const resultado = el('div', { class: 'ticket-resultado' });
      const chocarVarios = (n: number) => {
        if (girando || (save.itens[ovoId] ?? 0) < n) return;
        girando = true;
        botoes.travar(true);
        resultado.replaceChildren();
        // gasta os ovos e entrega os Pokémon já no começo (fechar a janela no meio não perde nada),
        // mas o time na tela só atualiza quando a roleta parar (para não estragar a surpresa)
        save.itens[ovoId] -= n;
        if (save.itens[ovoId] <= 0) delete save.itens[ovoId];
        const todos = Array.from({ length: n }, () => chocarOvo(ovo, especies, IV_MIN_SHINY));
        const frases = todos.map((x) => entregar(save, x, ovo));
        salvar(save);
        const r = todos[0];

        roletas.girar(todos.map((x) => casa(x.especie, x.shiny, porTipo)), DURACAO_ROLETA, () => {
          const shinies = todos.filter((x) => x.shiny).length;
          resultado.replaceChildren(
            el('p', { class: 'ticket-raridade' }, n > 1 ? `${n} ovos chocaram!${shinies ? ` ${shinies} shiny!` : ''}` : r.shiny ? '✨ Shiny! ✨' : 'O ovo chocou!'),
            el('div', { class: 'premios' },
              ...todos.map((x) => {
                const dados = pokemonPorId(x.especie);
                return el('div', { class: `premio ovo-nasceu ${x.shiny ? 'casa-shiny' : ''}` },
                  spritePokemon(dados, { shiny: x.shiny, animado: false }),
                  el('strong', {}, `${dados.nome}${x.shiny ? ' ✨' : ''}`),
                  selosTipos(dados),
                  el('small', {}, `Nv. ${NIVEL_OVO}${ovo.tier ? ` · IVs tier ${ovo.tier} ou superior` : ''}${ovo.nt ? ' · NT' : ''}`),
                );
              }),
            ),
            el('div', { class: 'frases-premio' }, ...frases.map((f) => el('small', {}, f))),
          );
          aoMudar();
          girando = false;
          botoes = botoesQuantidade('Chocar', save.itens[ovoId] ?? 0, chocarVarios);
          areaBotoes.replaceChildren(botoes.raiz);
        });
      };
      let botoes = botoesQuantidade('Chocar', qtd, chocarVarios);
      const areaBotoes = el('div', {}, botoes.raiz);

      return el(
        'div',
        { class: 'ticket' },
        el('div', { class: 'ovo-topo' }, iconeOvo(ovo.letra, ovo.rotulo, ovo.nt), el('p', { class: 'meta' }, ovo.descricao)),
        roletas.raiz,
        areaBotoes,
        resultado,
      );
    },
    { classe: 'janela-ticket' },
  );
}
