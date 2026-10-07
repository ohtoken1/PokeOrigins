// Janela de chocar o Ovo Misterioso: roleta com Pokémon de todas as regiões (como a do ticket),
// que para no Pokémon sorteado; ele vai para o time (ou PC) com IVs do tier garantido.
import { IV_MIN_SHINY, hpMaximo } from '../../../shared/batalha/pokemon';
import { NIVEL_OVO, chocarOvo, ovoPorId, type ResultadoOvo } from '../../../shared/ovos';
import { pokemonPorId, todosOsPokemons } from '../dados';
import { TODOS_INICIAIS } from '../../../shared/regioes';
import { TAMANHO_MAXIMO_TIME, guardarNoPC, novoPokemon, registrarCapturado, salvar, type Save } from '../estado';
import { abrirJanela } from './janela';
import { el, selosTipos, spritePokemon } from './dom';
import { iconeOvo } from './iconeItem';
import { areaRoletas, botoesQuantidade } from './abrirVarios';
import { ehLendario } from '../../../shared/encontros';
import { especie } from '../../../shared/batalha/pokemon';

/** Duração da roleta do ovo (mais lenta que a do ticket, para dar expectativa). */
const DURACAO_ROLETA = 9000;

const raro = (id: number) => {
  const p = pokemonPorId(id);
  return p.lendario || p.mitico;
};

function casa(id: number, shiny = false): HTMLElement {
  return el('div', { class: `casa-roleta ${raro(id) ? 'fundo-lendario' : 'fundo-comum'} ${shiny ? 'casa-shiny' : ''}` }, spritePokemon(pokemonPorId(id), { shiny, animado: false }));
}

/** Coloca o Pokémon do ovo no time (ou no PC) e devolve a frase de onde ele foi. */
function entregar(save: Save, r: ResultadoOvo): string {
  const p = novoPokemon(r.especie, NIVEL_OVO, r.shiny);
  p.ivs = r.ivs;
  p.hp = hpMaximo(p);
  registrarCapturado(save, r.especie);
  const nome = `${pokemonPorId(r.especie).nome}${r.shiny ? ' ✨' : ''}`;
  if (save.time.length < TAMANHO_MAXIMO_TIME) {
    save.time.push(p);
    return `${nome} entrou no seu time.`;
  }
  return `${nome} foi enviado para o PC (Box ${guardarNoPC(save, p) + 1}).`;
}

export function abrirJanelaOvo(save: Save, ovoId: string, aoMudar: () => void): void {
  const ovo = ovoPorId(ovoId);
  if (!ovo) return;
  // Ovo Lendário: lendários, míticos e Ultra Beasts, só a primeira forma da linha (Cosmog, não Lunala; Type: Null, não Silvally)
  const especies =
    ovo.grupo === 'iniciais'
      ? TODOS_INICIAIS
      : todosOsPokemons()
          .filter((p) => ovo.grupo === 'todos' || (ehLendario(p) && !p.evoluiDe && !especie(p.id).prevo))
          .map((p) => p.id);
  const qualquer = () => especies[Math.floor(Math.random() * especies.length)];
  let girando = false;

  abrirJanela(
    ovo.nome,
    () => {
      const qtd = save.itens[ovoId] ?? 0;
      // uma roleta por ovo chocado (uma em cima da outra)
      const roletas = areaRoletas(() => casa(qualquer()));
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
        const frases = todos.map((x) => entregar(save, x));
        salvar(save);
        const r = todos[0];

        roletas.girar(todos.map((x) => casa(x.especie, x.shiny)), DURACAO_ROLETA, () => {
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
                  el('small', {}, `Nv. ${NIVEL_OVO}${ovo.tier ? ` · IVs tier ${ovo.tier} ou superior` : ''}`),
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
        el('div', { class: 'ovo-topo' }, iconeOvo(ovo.letra), el('p', { class: 'meta' }, ovo.descricao)),
        roletas.raiz,
        areaBotoes,
        resultado,
      );
    },
    { classe: 'janela-ticket' },
  );
}
