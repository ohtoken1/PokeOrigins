// Barra no topo do site. Por enquanto só "Jogar" funciona; as outras abas serão ligadas depois.
import { el } from './dom';

const ABAS = ['Jogar', 'Torneios', 'Ranking', 'Pokédex', 'Comunidade'];

export function montarBarraTopo(irParaJogo: () => void) {
  const barra = el(
    'nav',
    { class: 'barra-topo' },
    el('div', { class: 'barra-topo-conteudo' },
      el('strong', { class: 'marca' }, 'Jogo Claude'),
      el('div', { class: 'abas-topo' },
        ...ABAS.map((nome, i) =>
          i === 0
            ? el('button', { class: 'aba-topo ativa', onclick: irParaJogo }, nome)
            : el('button', { class: 'aba-topo', disabled: true, title: 'Em breve' }, nome),
        ),
      ),
    ),
  );
  document.body.prepend(barra);
}
