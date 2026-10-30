// Tela de Início: o time atual lado a lado, cada Pokémon grande num pedestal (clicar abre a ficha).
// É a primeira tela ao abrir o jogo (com save) e tem atalho "Início" na barra do topo.
import type { Tela } from '../main';
import { hpMaximo } from '../../../shared/batalha/pokemon';
import { itemDaLoja } from '../../../shared/loja';
import { nomeItemEquipado } from '../../../shared/usoItens';
import { abrirJanela } from '../ui/janela';
import { pokemonPorId } from '../dados';
import { TAMANHO_MAXIMO_TIME, carregarSave, salvar, type PokemonDoJogador, type Save } from '../estado';
import { ErroApi } from '../conta';
import { NIVEIS_PASSE, XP_POR_MISSAO, XP_POR_NIVEL_PASSE, missaoCompleta, nivelPasse } from '../../../shared/passe';
import { estadoDaCasa, ondeMissao, passeDeHoje, resgatarDoPasse, textoMissao, type Trilha } from '../passe';
import { temporadaAtual, type TemporadaPasse } from '../../../shared/passeTemporadas';
import { visualPremio } from '../ui/ticket';
import { comDica } from '../ui/dica';
import { tornarArrastavel } from '../ui/arrastar';
import { abrirDetalhes } from '../ui/detalhes';
import { el, seloGenero, selosTipos, spritePokemon } from '../ui/dom';
import { iconeItem } from '../ui/iconeItem';
import { acompanharTime, barraHp } from '../ui/time';

function pedestal(p: PokemonDoJogador, posicao: number): HTMLElement {
  const dados = pokemonPorId(p.especieId);
  const max = hpMaximo(p);
  return el(
    'button',
    { class: `pedestal ${p.shiny ? 'shiny' : ''} ${p.hp <= 0 ? 'desmaiado' : ''}`, title: 'Clique para ver a ficha · arraste para trocar a ordem', 'data-alvo': 'time', 'data-i': posicao },
    el('div', { class: 'pedestal-palco' }, spritePokemon(dados, { shiny: p.shiny, palco: true })),
    el('strong', {}, dados.nome, p.shiny ? ' ✨' : '', seloGenero(p.genero)),
    el('small', {}, `Nv. ${p.nivel}`),
    selosTipos(dados),
    barraHp(p.hp, max),
    el('small', { class: 'pedestal-hp' }, `HP ${p.hp}/${max}`),
    p.item ? el('span', { class: 'pedestal-item', title: `Segurando ${nomeItemEquipado(p.item)}` }, iconeItem(itemDaLoja(p.item) ?? { id: p.item, categoria: 'batalha' }), nomeItemEquipado(p.item)) : null,
  );
}

/** Janela das missões de hoje (renovam à meia-noite). */
function abrirMissoes(save: Save): void {
  const passe = passeDeHoje(save);
  salvar(save);
  abrirJanela('Missões diárias', () =>
    el('div', { class: 'missoes' },
      el('p', { class: 'meta' }, `${passe.missoes.length} missões por dia, renovam à meia-noite (as quantidades são as mesmas para todos os jogadores no dia). Cada uma vale ${XP_POR_MISSAO} XP do passe (até 2 níveis por dia). Derrotar e capturar: só Pokémon selvagens.`),
      el('section', { class: 'missoes-grupo' },
        ...passe.missoes.map((m) => {
          const dados = m.especieId ? pokemonPorId(m.especieId) : null;
          const completa = missaoCompleta(m);
          return el('div', { class: `missao ${completa ? 'completa' : ''}` },
            el('span', { class: 'missao-check' }, completa ? '✓' : ''),
            el('span', { class: `missao-sprite missao-${m.tipo}` }, dados ? spritePokemon(dados, { animado: false }) : m.tipo === 'shiny' ? '✨' : '⚔'),
            el('span', { class: 'missao-texto' }, textoMissao(m),
              el('small', {}, `${Math.min(m.feito, m.alvo)} / ${m.alvo} · ${ondeMissao(m)}`),
              el('span', { class: 'barra-exp barra-missao' }, el('span', { class: 'preenchido', style: { width: `${(Math.min(m.feito, m.alvo) / m.alvo) * 100}%` } }))),
            el('strong', { class: 'missao-xp' }, `+${XP_POR_MISSAO} XP`));
        }),
        ),
    ), { classe: 'janela-missoes' });
}

/** Imagem da recompensa (sem nome; pedido do dono) com o cartão de nome e descrição ao passar o mouse. */
function casaDoPasse(save: Save, temporada: TemporadaPasse, trilha: Trilha, nivel: number, aoResgatar: (casas: [Trilha, number][]) => void): HTMLElement {
  const premio = temporada[trilha][nivel - 1];
  const v = visualPremio(premio);
  // o cartão é o da casa inteira: tira o do ícone do item para não aparecerem dois
  v.imagem.querySelectorAll<HTMLElement>('[data-item]').forEach((x) => delete x.dataset.item);
  delete v.imagem.dataset.item;
  const estado = estadoDaCasa(save, trilha, nivel);
  const qtd = premio.tipo === 'item' || premio.tipo === 'aleatorio' ? premio.quantidade : 0;
  // Poké Dólares e Origin Coins: o valor no canto (pedido do dono), curto (50.000 = 50 mil)
  const valor = premio.tipo === 'silver' || premio.tipo === 'gold' ? (premio.quantidade >= 1000 ? `${(premio.quantidade / 1000).toLocaleString('pt-BR')} mil` : premio.quantidade.toLocaleString('pt-BR')) : '';
  const casa = el('button', {
    class: `passe-casa ${trilha} estado-${estado}`, type: 'button', disabled: estado !== 'pronto',
    onclick: () => aoResgatar([[trilha, nivel]]),
  }, v.imagem, qtd > 1 ? el('small', { class: 'passe-qtd' }, `×${qtd}`) : valor ? el('small', { class: 'passe-qtd' }, valor) : null, estado === 'resgatado' ? el('span', { class: 'passe-marca' }, '✓') : estado === 'trancado' ? el('span', { class: 'passe-marca' }, '🔒') : null);
  return comDica(casa, () => {
    const descricao = premio.tipo === 'item' ? itemDaLoja(premio.id)?.descricao : premio.tipo === 'aleatorio' ? 'O item é sorteado na hora de resgatar, e você recebe a quantidade toda dele.' : premio.tipo === 'pokemon' ? `Nível ${premio.nivel}, IVs sorteados, ${Math.round(premio.chanceShiny * 100)}% de chance de shiny.` : premio.tipo === 'titulo' ? 'Título para mostrar no seu perfil (Minha conta → Meu perfil).' : null;
    const situacao = { resgatado: 'Já resgatado.', pronto: 'Clique para resgatar.', trancado: 'Trilha premium: libere com o item Passe Premium.', longe: `Chegue ao nível ${nivel} do passe.` }[estado];
    const nt = trilha === 'gratis' && premio.tipo !== 'silver' && premio.tipo !== 'gold';
    return [el('strong', {}, v.nome), v.qtd ? el('small', {}, v.qtd) : null, descricao ? el('p', { class: 'dica-golpe-desc' }, descricao) : null, nt ? el('small', { class: 'meta' }, '🔒 NT: não pode ser trocado nem vendido.') : null, el('small', { class: 'meta' }, situacao)];
  });
}

/** Passe de batalha: XP só das missões diárias; recompensas da temporada (shared/passeTemporadas.ts). */
function passeDeBatalha(save: Save): HTMLElement {
  const caixa = el('section', { class: 'passe-batalha' });
  let aviso = '';
  let ocupado = false;
  // quem entrega é o servidor (client/src/passe.ts): um clique de cada vez
  const desenhar = (): void => void caixa.replaceChildren(...conteudoDoPasse(save, aviso, async (casas) => {
    if (ocupado) return;
    ocupado = true;
    try {
      aviso = (await resgatarDoPasse(casas)).join(' ');
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    ocupado = false;
    desenhar();
  }).filter((x): x is HTMLElement => !!x));
  desenhar();
  return caixa;
}

function conteudoDoPasse(save: Save, aviso: string, aoResgatar: (casas: [Trilha, number][]) => void): (HTMLElement | null)[] {
  const passe = passeDeHoje(save);
  const temporada = temporadaAtual();
  const nivel = nivelPasse(passe.xp);
  const noNivel = nivel >= NIVEIS_PASSE ? XP_POR_NIVEL_PASSE : passe.xp - nivel * XP_POR_NIVEL_PASSE;
  const feitasHoje = passe.missoes.filter(missaoCompleta).length;
  const casa = (n: number, trilha: Trilha) =>
    temporada ? casaDoPasse(save, temporada, trilha, n, aoResgatar) : el('div', { class: `passe-casa ${trilha}`, title: 'Recompensa a definir' }, el('span', { class: 'passe-cadeado' }, '?'));
  // tudo o que já dá para resgatar, de uma vez
  const prontos = temporada ? (['gratis', 'premium'] as Trilha[]).flatMap((t) => Array.from({ length: NIVEIS_PASSE }, (_, i) => i + 1).filter((n) => estadoDaCasa(save, t, n) === 'pronto').map((n) => [t, n] as const)) : [];
  const fim = temporada ? new Date(temporada.fim - 1).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';
  return [
    el('div', { class: 'passe-topo' },
      el('div', {}, el('h2', {}, temporada?.nome ?? 'Passe de batalha'), el('small', { class: 'meta' }, temporada ? `Termina em ${fim} · ${passe.premium ? '👑 Premium liberado' : 'Premium: use o item Passe Premium'}` : 'Nenhuma temporada em andamento')),
      el('div', { class: 'passe-acoes' },
        prontos.length && temporada
          ? el('button', { class: 'botao', onclick: () => aoResgatar(prontos.map(([t, n]) => [t, n])) }, `Resgatar tudo (${prontos.length})`)
          : null,
        el('button', { class: 'botao secundario', onclick: () => abrirMissoes(save) }, `Missões ${feitasHoje}/${passe.missoes.length}`))),
    aviso ? el('p', { class: 'aviso-bolsa passe-aviso', role: 'status' }, aviso) : null,
    el('div', { class: 'passe-progresso' },
      el('small', {}, `Nível ${nivel} de ${NIVEIS_PASSE}`),
      el('div', { class: 'barra-exp barra-passe' }, el('div', { class: 'preenchido', style: { width: `${(noNivel / XP_POR_NIVEL_PASSE) * 100}%` } }), el('span', {}, nivel >= NIVEIS_PASSE ? 'Completo!' : `${noNivel} / ${XP_POR_NIVEL_PASSE} XP`))),
    el('div', { class: 'passe-trilha' },
      el('div', { class: 'passe-rotulos' }, el('small', {}, 'Grátis'), el('small', {}, 'Premium')),
      ...Array.from({ length: NIVEIS_PASSE }, (_, i) =>
        el('div', { class: `passe-coluna ${i + 1 <= nivel ? 'alcancada' : ''}` }, el('small', { class: 'passe-nivel' }, String(i + 1)), casa(i + 1, 'gratis'), casa(i + 1, 'premium')))),
  ];
}

export const telaInicio: Tela = (raiz, navegar) => {
  const save = carregarSave();
  const tela = el('main', { class: 'tela tela-inicio' });
  raiz.append(tela);
  if (!save) {
    tela.append(el('h1', {}, 'Início'), el('p', { class: 'sub' }, 'Você ainda não começou sua jornada.'), el('button', { class: 'botao grande', onclick: () => navegar({ tela: 'inicial' }) }, 'Começar'));
    return;
  }
  const nome = save.aparencia?.nome || 'Treinador';
  // arrastar um Pokémon para outra posição troca a ordem (o primeiro é quem entra na batalha e segue no mapa)
  const fila = el('div', { class: 'fila-time' });
  const desenharFila = () =>
    fila.replaceChildren(
      ...Array.from({ length: TAMANHO_MAXIMO_TIME }, (_, i) => {
        const p = save.time[i];
        if (!p) return el('div', { class: 'pedestal vazio', 'data-alvo': 'time', 'data-i': i }, el('small', {}, 'Vaga livre'));
        const caixa = pedestal(p, i);
        tornarArrastavel(caixa, {
          aoClicar: () => abrirDetalhes(p),
          aoSoltar: (alvo) => {
            if (!alvo) return;
            const destino = Math.min(Number(alvo.dataset.i), save.time.length - 1);
            if (Number.isNaN(destino) || destino === i) return;
            // troca de lugar com quem está no destino (vaga livre = vai para o fim do time)
            [save.time[i], save.time[destino]] = [save.time[destino], save.time[i]];
            salvar(save);
            desenharFila();
          },
        });
        return caixa;
      }),
    );
  desenharFila();
  // o time mudou pelo PC ou pela bolsa: aparece na hora
  acompanharTime(fila, desenharFila);
  tela.append(
    el('h1', {}, 'Início'),
    el('p', { class: 'sub' }, `Olá, ${nome}!`),
    el('h2', { class: 'titulo-time' }, 'Seu time', el('small', { class: 'meta' }, ' · arraste para trocar a ordem')),
    fila,
    passeDeBatalha(save),
  );
};
