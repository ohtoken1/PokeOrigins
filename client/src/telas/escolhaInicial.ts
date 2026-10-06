// Começo do jogo: o jogador escolhe a região e uma roleta sorteia o inicial entre os de TODAS as
// regiões (chance igual para os 27). O resultado é guardado assim que a roleta gira, para recarregar
// a página não virar um "sortear de novo".
import type { Tela } from '../main';
import { REGIOES, TODOS_INICIAIS, regiaoPorId } from '../../../shared/regioes';
import { pokemonPorId } from '../dados';
import { novoSave, salvar } from '../estado';
import { el, selosTipos, spritePokemon } from '../ui/dom';

const CHAVE_SORTEIO = 'jogo-claude:sorteio-inicial';
const LARGURA_ITEM = 96;

const lerSorteio = (): number | null => {
  try {
    const n = Number(localStorage.getItem(CHAVE_SORTEIO));
    return TODOS_INICIAIS.includes(n) ? n : null;
  } catch {
    return null;
  }
};

export const telaEscolhaInicial: Tela = (raiz, navegar) => {
  const tela = el('main', { class: 'tela tela-inicial' });
  raiz.append(tela);

  // ---------- passo 1: região ----------
  const escolherRegiao = () => {
    tela.replaceChildren(
      el('h1', {}, 'Onde começa a sua jornada?'),
      el('p', { class: 'sub' }, 'Escolha a região inicial. Depois, a roleta sorteia o seu primeiro Pokémon entre os iniciais de todas as regiões.'),
      el(
        'div',
        { class: 'grade-regioes' },
        ...REGIOES.filter((r) => r.disponivel).map((r) =>
          el(
            'button',
            { class: 'cartao-regiao', onclick: () => roleta(r.id) },
            el('div', { class: 'cartao-regiao-sprites' }, ...r.iniciais.map((id) => spritePokemon(pokemonPorId(id), { animado: false }))),
            el('strong', {}, r.nome),
            el('small', {}, `Pokédex #${r.pokedex[0]}–${r.pokedex[1]}`),
          ),
        ),
      ),
    );
  };

  // ---------- passo 2: roleta ----------
  const roleta = (regiaoId: string) => {
    const regiao = regiaoPorId(regiaoId);
    // faixa com várias voltas dos 27 iniciais embaralhados; o sorteado fica numa das últimas voltas
    const ordem = [...TODOS_INICIAIS].sort(() => Math.random() - 0.5);
    const voltas = 6;
    const itens = Array.from({ length: voltas }, () => ordem).flat();
    const faixa = el(
      'div',
      { class: 'roleta-faixa' },
      ...itens.map((id) => el('div', { class: 'roleta-item' }, spritePokemon(pokemonPorId(id), { animado: false }))),
    );
    const janela = el('div', { class: 'roleta' }, el('div', { class: 'roleta-marcador' }), faixa);
    const resultado = el('div', { class: 'roleta-resultado' });
    const botao = el('button', { class: 'botao grande' }, '🎲 Girar a roleta') as HTMLButtonElement;

    const mostrarResultado = (id: number) => {
      const p = pokemonPorId(id);
      resultado.replaceChildren(
        el('p', { class: 'sub' }, 'Seu primeiro Pokémon é…'),
        el('div', { class: 'palco-inicial' }, spritePokemon(p, { palco: true, escala: 2 })),
        el('h2', {}, p.nome),
        selosTipos(p),
        el('p', { class: 'meta' }, '🔒 NT (inegociável) · IVs 20 em todos os atributos'),
        el(
          'button',
          {
            class: 'botao grande',
            onclick: () => {
              salvar(novoSave(regiao.id, id));
              try {
                localStorage.removeItem(CHAVE_SORTEIO);
              } catch {
                /* ignora */
              }
              navegar({ tela: 'regiao' });
            },
          },
          `Começar em ${regiao.nome}`,
        ),
      );
    };

    const girar = (id: number, instantaneo = false) => {
      botao.hidden = true;
      const alvo = (voltas - 2) * ordem.length + ordem.indexOf(id);
      const deslocamento = alvo * LARGURA_ITEM - (janela.clientWidth / 2 - LARGURA_ITEM / 2);
      faixa.style.transition = instantaneo ? 'none' : 'transform 5s cubic-bezier(0.12, 0.7, 0.15, 1)';
      faixa.style.transform = `translateX(${-deslocamento}px)`;
      const fim = () => {
        faixa.children[alvo]?.classList.add('sorteado');
        mostrarResultado(id);
      };
      if (instantaneo) fim();
      else setTimeout(fim, 5100);
    };

    botao.addEventListener('click', () => {
      // chance igual para todos os iniciais
      const id = TODOS_INICIAIS[Math.floor(Math.random() * TODOS_INICIAIS.length)];
      try {
        localStorage.setItem(CHAVE_SORTEIO, String(id));
      } catch {
        /* ignora */
      }
      girar(id);
    });

    tela.replaceChildren(
      el('h1', {}, 'Roleta do inicial'),
      el('p', { class: 'sub' }, `Região: ${regiao.nome} · ${TODOS_INICIAIS.length} iniciais, todos com a mesma chance.`),
      janela,
      botao,
      resultado,
      el('button', { class: 'botao secundario voltar-regiao', onclick: escolherRegiao, hidden: lerSorteio() !== null }, '← Trocar região'),
    );
    // já sorteou antes (recarregou a página): mostra o mesmo resultado
    const salvo = lerSorteio();
    if (salvo !== null) requestAnimationFrame(() => girar(salvo, true));
  };

  escolherRegiao();
};
