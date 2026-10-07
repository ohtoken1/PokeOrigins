// Janela de chocar o Ovo Misterioso: roleta com Pokémon de todas as regiões (como a do ticket),
// que para no Pokémon sorteado; ele vai para o time (ou PC) com IVs do tier garantido.
import { IV_MIN_SHINY, hpMaximo } from '../../../shared/batalha/pokemon';
import { NIVEL_OVO, chocarOvo, ovoPorId, type ResultadoOvo } from '../../../shared/ovos';
import { pokemonPorId, todosOsPokemons } from '../dados';
import { TAMANHO_MAXIMO_TIME, guardarNoPC, novoPokemon, registrarCapturado, salvar, type Save } from '../estado';
import { abrirJanela } from './janela';
import { el, selosTipos, spritePokemon } from './dom';
import { iconeOvo } from './iconeItem';

const LARGURA_CASA = 92;
const CASAS = 44;
const ALVO = 38;
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
  const especies = todosOsPokemons().map((p) => p.id);
  const qualquer = () => especies[Math.floor(Math.random() * especies.length)];
  let girando = false;

  abrirJanela(
    ovo.nome,
    () => {
      const qtd = save.itens[ovoId] ?? 0;
      const faixa = el('div', { class: 'roleta-faixa' });
      const roleta = el('div', { class: 'roleta roleta-ticket' }, el('div', { class: 'roleta-marcador' }), faixa);
      const encher = (fim?: ResultadoOvo) => {
        faixa.style.transition = 'none';
        faixa.style.transform = 'translateX(0)';
        faixa.replaceChildren(...Array.from({ length: CASAS }, (_, i) => (i === ALVO && fim ? casa(fim.especie, fim.shiny) : casa(qualquer()))));
      };
      encher();
      const resultado = el('div', { class: 'ticket-resultado' });
      const botao = el('button', { class: 'botao grande', disabled: qtd <= 0 }, qtd > 0 ? `🥚 Chocar (você tem ${qtd})` : 'Você não tem este ovo') as HTMLButtonElement;

      botao.addEventListener('click', () => {
        if (girando || (save.itens[ovoId] ?? 0) <= 0) return;
        girando = true;
        botao.disabled = true;
        resultado.replaceChildren();
        // gasta o ovo e entrega o Pokémon já no começo (fechar a janela no meio não perde nada)
        save.itens[ovoId] -= 1;
        if (save.itens[ovoId] <= 0) delete save.itens[ovoId];
        const r = chocarOvo(ovo, especies, IV_MIN_SHINY);
        // o Pokémon já fica salvo (fechar a janela no meio não perde nada),
        // mas o time na tela só atualiza quando a roleta parar (para não estragar a surpresa)
        const frase = entregar(save, r);
        salvar(save);

        encher(r);
        void faixa.offsetWidth;
        const desvio = (Math.random() - 0.5) * LARGURA_CASA * 0.4;
        faixa.style.transition = `transform ${DURACAO_ROLETA}ms cubic-bezier(0.08, 0.6, 0.1, 1)`;
        faixa.style.transform = `translateX(${-(ALVO * LARGURA_CASA - (roleta.clientWidth / 2 - LARGURA_CASA / 2) + desvio)}px)`;
        setTimeout(() => {
          faixa.children[ALVO]?.classList.add('sorteado');
          const dados = pokemonPorId(r.especie);
          resultado.replaceChildren(
            el('p', { class: 'ticket-raridade' }, r.shiny ? '✨ Shiny! ✨' : 'O ovo chocou!'),
            el('div', { class: `premio ovo-nasceu ${r.shiny ? 'casa-shiny' : ''}` },
              spritePokemon(dados, { shiny: r.shiny, animado: false }),
              el('strong', {}, `${dados.nome}${r.shiny ? ' ✨' : ''}`),
              selosTipos(dados),
              el('small', {}, `Nv. ${NIVEL_OVO} · IVs tier ${ovo.tier} ou superior`),
            ),
            el('small', {}, frase),
          );
          aoMudar();
          girando = false;
          botao.disabled = (save.itens[ovoId] ?? 0) <= 0;
          botao.textContent = botao.disabled ? 'Sem mais ovos' : `🥚 Chocar outro (você tem ${save.itens[ovoId]})`;
        }, DURACAO_ROLETA + 150);
      });

      return el(
        'div',
        { class: 'ticket' },
        el('div', { class: 'ovo-topo' }, iconeOvo(ovo.tier), el('p', { class: 'meta' }, ovo.descricao)),
        roleta,
        botao,
        resultado,
      );
    },
    { classe: 'janela-ticket' },
  );
}
