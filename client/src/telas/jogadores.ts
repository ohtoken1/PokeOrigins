// Comunidade → Buscar jogadores: procura um treinador pelo nome e mostra o perfil (nível, time, Pokédex, capturas).
// Sem servidor ainda, a busca só encontra o próprio jogador deste navegador.
import type { Tela } from '../main';
import { nivelTreinador } from '../../../shared/treinador';
import { pokemonPorId } from '../dados';
import { carregarSave, type Save } from '../estado';
import { abrirDetalhes } from '../ui/detalhes';
import { el, spritePokemon } from '../ui/dom';

function perfil(save: Save): HTMLElement {
  const e = save.estatisticas;
  const dado = (rotulo: string, valor: string) => el('div', { class: 'perfil-dado' }, el('small', {}, rotulo), el('strong', {}, valor));
  return el(
    'article',
    { class: 'perfil-jogador' },
    el('div', { class: 'perfil-topo' }, el('h2', {}, save.aparencia?.nome || 'Treinador'), el('span', { class: 'meta' }, `Treinador Nv. ${nivelTreinador(save.xpTreinador)}`)),
    el('div', { class: 'perfil-dados' },
      dado('Pokédex vistos', String(save.vistos.length)),
      dado('Pokédex capturados', String(save.capturados.length)),
      dado('Capturas', String(e?.capturas ?? 0)),
      dado('Shiny capturados', String(e?.capturasShiny ?? 0)),
      dado('Lendários capturados', String(e?.capturasLendarios ?? 0)),
      dado('Pokémon no PC', String(save.caixa.length)),
    ),
    el('h3', {}, 'Time'),
    el('div', { class: 'perfil-time' },
      ...save.time.map((p) => {
        const d = pokemonPorId(p.especieId);
        return el('button', { class: 'perfil-pokemon', title: 'Ver a ficha', onclick: () => abrirDetalhes(p) }, spritePokemon(d, { shiny: p.shiny, animado: false }), el('small', {}, `${d.nome}${p.shiny ? ' ✨' : ''} · Nv. ${p.nivel}`));
      })),
  );
}

export const telaJogadores: Tela = (raiz) => {
  const tela = el('main', { class: 'tela tela-jogadores' }, el('h1', {}, 'Buscar jogadores'));
  raiz.append(tela);
  const campo = el('input', { type: 'search', class: 'db-busca', placeholder: 'Nome do treinador…' }) as HTMLInputElement;
  const resultado = el('div', { class: 'jogadores-resultado' });
  const buscar = () => {
    const termo = campo.value.trim().toLowerCase();
    const save = carregarSave();
    // sem servidor: a "lista de jogadores" tem só quem joga neste navegador
    const jogadores = save ? [save] : [];
    const achados = termo ? jogadores.filter((s) => (s.aparencia?.nome ?? '').toLowerCase().includes(termo)) : [];
    resultado.replaceChildren(
      !termo
        ? el('p', { class: 'meta' }, 'Digite o nome de um treinador para ver o perfil dele.')
        : achados.length
          ? el('div', {}, ...achados.map(perfil))
          : el('p', { class: 'meta' }, `Nenhum treinador encontrado com "${campo.value.trim()}".`),
    );
  };
  campo.addEventListener('input', buscar);
  tela.append(
    el('div', { class: 'jogadores-busca' }, campo),
    el('small', { class: 'meta' }, 'Por enquanto só dá para encontrar você mesmo: a busca com todos os jogadores precisa do servidor online.'),
    resultado,
  );
  buscar();
};
