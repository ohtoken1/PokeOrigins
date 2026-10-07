// Começo do jogo: uma roleta sorteia o inicial entre os de TODAS as regiões (chance igual para os 27)
// e depois o jogador escolhe a região onde começa. O resultado é guardado assim que a roleta gira, para recarregar
// a página não virar um "sortear de novo".
import type { Tela } from '../main';
import { REGIOES, TODOS_INICIAIS } from '../../../shared/regioes';
import { pokemonPorId } from '../dados';
import { novoSave, salvar } from '../estado';
import { corTipo, el, selosTipos, spritePokemon } from '../ui/dom';
import { aparenciaNova, limparAparenciaNova } from './personagem';

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
  // primeiro passo: criar o personagem
  if (!aparenciaNova()) return navegar({ tela: 'personagem' });
  const tela = el('main', { class: 'tela tela-inicial' });
  raiz.append(tela);

  // ---------- passo 2: região (depois do sorteio) ----------
  const escolherRegiao = (inicial: number) =>
    el(
      'section',
      { class: 'passo-regiao' },
      el('h2', {}, 'Onde começa a sua jornada?'),
      el(
        'div',
        { class: 'grade-regioes' },
        ...REGIOES.filter((r) => r.disponivel).map((r) =>
          el(
            'button',
            {
              class: 'cartao-regiao',
              onclick: () => {
                salvar(novoSave(r.id, inicial, aparenciaNova() ?? undefined));
                limparAparenciaNova();
                try {
                  localStorage.removeItem(CHAVE_SORTEIO);
                } catch {
                  /* ignora */
                }
                navegar({ tela: 'regiao' });
              },
            },
            el('div', { class: 'cartao-regiao-sprites' }, ...r.iniciais.map((id) => spritePokemon(pokemonPorId(id), { animado: false }))),
            el('strong', {}, r.nome),
            el('small', {}, `Pokédex #${r.pokedex[0]}–${r.pokedex[1]}`),
          ),
        ),
      ),
    );

  // ---------- passo 1: roleta ----------
  // faixa com várias voltas dos 27 iniciais embaralhados; o sorteado fica numa das últimas voltas
  const ordem = [...TODOS_INICIAIS].sort(() => Math.random() - 0.5);
  const voltas = 6;
  const itens = Array.from({ length: voltas }, () => ordem).flat();
  const faixa = el(
    'div',
    { class: 'roleta-faixa' },
    ...itens.map((id) => el('div', { class: 'roleta-item', style: { '--cor-tipo': corTipo(pokemonPorId(id).tipos[0]) } }, spritePokemon(pokemonPorId(id), { animado: false }))),
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
      escolherRegiao(id),
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

  tela.append(
    el('h1', {}, 'Roleta do inicial'),
    el('p', { class: 'sub' }, `Gire para sortear seu primeiro Pokémon entre os ${TODOS_INICIAIS.length} iniciais de todas as regiões, todos com a mesma chance. Depois, escolha a região onde começar.`),
    janela,
    botao,
    resultado,
  );
  // já sorteou antes (recarregou a página): mostra o mesmo resultado
  const salvo = lerSorteio();
  if (salvo !== null) requestAnimationFrame(() => girar(salvo, true));
};
