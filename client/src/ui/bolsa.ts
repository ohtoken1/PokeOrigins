import { ITENS, usarRemedio, type ItemId } from '../../../shared/itens';
import { pokemonPorId } from '../dados';
import { salvar, type Save } from '../estado';
import { abrirJanela } from './janela';
import { el } from './dom';
import { cartaoPokemon } from './time';

const GRUPOS = [
  { categoria: 'remedio', titulo: 'Remédios' },
  { categoria: 'bola', titulo: 'Pokébolas' },
] as const;

/** Bolsa fora da batalha: ver itens e usar remédios no time. */
export function abrirBolsa(save: Save, aoMudar: () => void): void {
  let usando: ItemId | null = null;
  let aviso = '';

  abrirJanela('Bolsa', (janela) => {
    if (usando) {
      const item = ITENS[usando];
      return el(
        'div',
        { class: 'bolsa' },
        el('p', {}, `Usar ${item.nome} em qual Pokémon?`),
        el(
          'div',
          { class: 'vagas' },
          save.time.map((p) =>
            cartaoPokemon(p, {
              onclick: () => {
                const id = usando!;
                const mensagem = usarRemedio(item, p, pokemonPorId(p.especieId).nome);
                if (mensagem) {
                  save.itens[id]--;
                  salvar(save);
                  aoMudar();
                }
                aviso = mensagem ?? 'Não teria efeito.';
                usando = null;
                janela.redesenhar();
              },
            }),
          ),
        ),
        el('button', { class: 'botao secundario', onclick: () => ((usando = null), janela.redesenhar()) }, '← Voltar'),
      );
    }

    return el(
      'div',
      { class: 'bolsa' },
      aviso && el('p', { class: 'aviso-bolsa' }, aviso),
      GRUPOS.map(({ categoria, titulo }) =>
        el(
          'section',
          {},
          el('h4', {}, titulo),
          (Object.keys(ITENS) as ItemId[])
            .filter((id) => ITENS[id].categoria === categoria)
            .map((id) =>
              el(
                'div',
                { class: `linha-item ${save.itens[id] ? '' : 'acabou'}` },
                el('div', { class: `icone-item ${id}` }),
                el('div', {}, el('strong', {}, ITENS[id].nome), el('p', {}, ITENS[id].descricao)),
                el('span', { class: 'quantidade' }, `×${save.itens[id]}`),
                categoria === 'remedio' &&
                  el('button', { class: 'botao', disabled: !save.itens[id], onclick: () => ((usando = id), (aviso = ''), janela.redesenhar()) }, 'Usar'),
              ),
            ),
        ),
      ),
    );
  });
}
