// Começo do jogo: "Você ganhou um Ovo de Inicial!" (botão Abrir agora) e o ovo choca direto no inicial, sorteado
// entre os de TODAS as regiões (chance igual para os 27; pedido do dono: sem roleta, o sorteio é interno). Depois o
// jogador escolhe a região onde começa. O Professor Carvalho explica cada passo (tutorial). O resultado é guardado
// assim que o ovo abre, para recarregar a página não virar um "sortear de novo".
import type { Tela } from '../main';
import { REGIOES, TODOS_INICIAIS } from '../../../shared/regioes';
import { pokemonPorId } from '../dados';
import { novoSave, salvar } from '../estado';
import { el, selosTipos, spritePokemon } from '../ui/dom';
import { falarProfessor } from '../tutorial';
import { PRECO_POR_TRECHO } from '../../../shared/viagem';
import { aparenciaNova, limparAparenciaNova } from './personagem';

const CHAVE_SORTEIO = 'jogo-claude:sorteio-inicial';
/** O ovo dos jogos oficiais (sprite da PokéAPI, como os dos Pokémon). */
const SPRITE_OVO = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/egg.png';

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
                navegar({ tela: 'cidade' });
              },
            },
            el('div', { class: 'cartao-regiao-sprites' }, ...r.iniciais.map((id) => spritePokemon(pokemonPorId(id), { animado: false }))),
            el('strong', {}, r.nome),
            el('small', {}, `Pokédex #${r.pokedex[0]}–${r.pokedex[1]}`),
          ),
        ),
      ),
    );

  // ---------- passo 1: o inicial que saiu do ovo ----------
  const mostrarResultado = (id: number) => {
    const p = pokemonPorId(id);
    tela.replaceChildren(
      el('section', { class: 'roleta-resultado' },
        el('p', { class: 'sub' }, 'Seu primeiro Pokémon é…'),
        el('div', { class: 'palco-inicial' }, spritePokemon(p, { palco: true, escala: 2 })),
        el('h2', {}, p.nome),
        selosTipos(p),
        el('p', { class: 'meta' }, '🔒 NT (inegociável) · IVs 20 em todos os atributos'),
        escolherRegiao(id)),
    );
    void falarProfessor([
      `Que ótimo! O ${p.nome} vai ser o seu parceiro no começo da jornada.`,
      'Agora escolha a região onde você vai começar. A região decide quais Pokémon aparecem nos mapas e quais Ginásios você enfrenta primeiro. O seu inicial vai com você para qualquer região.',
      `Dá para mudar de região depois, pela estação de trem da cidade, mas a passagem custa Poké Dólares (${PRECO_POR_TRECHO.toLocaleString('pt-BR')} por região de distância) e a viagem leva um tempo. No começo do jogo isso pesa no bolso, então escolha com cuidado!`,
    ], 'Escolher a região');
  };

  // ---------- passo 0: o ovo (só para quem ainda não abriu) ----------
  const salvo = lerSorteio();
  if (salvo !== null) return mostrarResultado(salvo); // recarregou a página: mostra o mesmo resultado
  const ovo = el('div', { class: 'ovo-inicial' }, el('img', { src: SPRITE_OVO, alt: 'Ovo' }));
  const abrir = el('button', { class: 'botao grande' }, 'Abrir agora') as HTMLButtonElement;
  abrir.addEventListener('click', () => {
    // sorteio interno, chance igual para todos os iniciais; o ovo some num clarão e o Pokémon aparece
    const id = TODOS_INICIAIS[Math.floor(Math.random() * TODOS_INICIAIS.length)];
    try {
      localStorage.setItem(CHAVE_SORTEIO, String(id));
    } catch {
      /* ignora */
    }
    abrir.disabled = true;
    ovo.classList.add('chocando');
    setTimeout(() => mostrarResultado(id), 900);
  });
  tela.append(
    el('section', { class: 'aviso-ovo-inicial' },
      el('h1', {}, 'Você ganhou um Ovo de Inicial!'),
      el('p', { class: 'sub' }, `Dentro dele está o seu primeiro Pokémon: um dos ${TODOS_INICIAIS.length} iniciais de todas as regiões.`),
      el('div', { class: 'ovo-inicial-palco' }, ovo),
      abrir),
  );
  void falarProfessor([
    'Agora, um presente para você: um Ovo de Inicial! Dentro dele está o Pokémon que vai te acompanhar no começo da sua jornada.',
    `Ele é sorteado entre os ${TODOS_INICIAIS.length} iniciais de todas as regiões, de Kanto a Paldea, todos com a mesma chance. Ele vem com IVs 20 em todos os atributos e é NT: não pode ser trocado nem vendido.`,
    'Quando estiver pronto, clique em "Abrir agora"!',
  ], 'Entendi!');
};
