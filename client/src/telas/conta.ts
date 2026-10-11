// Aba "Minha conta": Meu perfil (com os títulos), Conquistas e Minhas skins (Opções fica no mesmo menu, tela própria).
import { bonusAtivoDaSkin, bonusDaSkin, temSkin, textoBonusSkin } from '../../../shared/skins';
import { bonusDasConquistas, conquistaFeita, GRUPOS_CONQUISTA, textoRecompensa, TITULOS, tituloAtivo } from '../../../shared/conquistas';
import { aoConcluirConquista, progressoDasConquistas } from '../conquistas';
import type { Tela } from '../main';
import { TODOS_OS_ITENS } from '../../../shared/loja';
import { carregarSave, salvar, salvarAgora, type Save } from '../estado';
import { aparenciaDoSave } from '../personagem/aparencia';
import { LINHA_DIRECAO, montarPersonagem } from '../personagem/lpc';
import { temArteDeSkin } from '../personagem/skinsDesenho';
import { el } from '../ui/dom';
import { iconeItem } from '../ui/iconeItem';
import { perfilJogador } from './jogadores';

export type SecaoConta = 'perfil' | 'achievements' | 'skins';

/** Conquistas: resumo dos bônus ganhos e a lista por grupo, com o progresso e a recompensa de cada uma. */
function achievements(save: Save): HTMLElement {
  const secao = el('section', { class: 'conta-secao' });
  const pct = (v: number) => `+${(Math.round(v * 1000) / 10).toLocaleString('pt-BR')}%`;
  const desenhar = () => {
    const todas = progressoDasConquistas(save);
    const feitas = todas.filter((x) => x.feita).length;
    const bonus = bonusDasConquistas(save);
    secao.replaceChildren(
      el('p', { class: 'sub' }, `${feitas} de ${todas.length} concluídas. A recompensa chega na hora em que a conquista é concluída.`),
      el('div', { class: 'skins-total' },
        el('span', {}, 'Silver em batalhas: ', el('strong', {}, pct(bonus.silver))),
        el('span', {}, 'Shiny, lendários e iniciais: ', el('strong', {}, pct(bonus.raros))),
        el('span', {}, 'Captura: ', el('strong', {}, pct(bonus.captura)))),
      ...GRUPOS_CONQUISTA.map((g) => {
        const doGrupo = todas.filter((x) => x.conquista.grupo === g.id);
        return el('details', { class: 'grupo-conquistas', open: true },
          el('summary', {}, g.nome, el('small', {}, ` ${doGrupo.filter((x) => x.feita).length}/${doGrupo.length}`)),
          el('div', { class: 'lista-achievements' },
            ...doGrupo.map(({ conquista: c, valor, meta, feita }) =>
              el('div', { class: `achievement ${feita ? 'feito' : ''}` },
                el('span', { class: 'achievement-selo' }, feita ? '★' : ''),
                el('div', { class: 'achievement-texto' },
                  el('strong', {}, c.nome),
                  el('small', {}, c.descricao),
                  el('small', { class: 'achievement-recompensa' }, `Recompensa: ${textoRecompensa(c.recompensa)}`),
                  el('div', { class: 'barra-exp' }, el('div', { class: 'preenchido', style: { width: `${(valor / meta) * 100}%` } }))),
                el('span', { class: 'achievement-progresso' }, feita ? 'Concluída' : meta === 1 ? '' : `${valor.toLocaleString('pt-BR')} / ${meta.toLocaleString('pt-BR')}`)))));
      }),
    );
  };
  desenhar();
  // concluiu alguma com a tela aberta: redesenha (para de ouvir quando a tela sai)
  const parar = aoConcluirConquista(() => (secao.isConnected ? desenhar() : parar()));
  return secao;
}

/** Títulos (Meu perfil): os liberados pelas conquistas; o escolhido aparece no perfil (por enquanto só lá). */
function painelTitulos(save: Save, aoMudar: () => void): HTMLElement {
  const emUso = tituloAtivo(save);
  return el('section', { class: 'perfil-painel painel-titulos' },
    el('h3', {}, 'Títulos'),
    el('p', { class: 'meta' }, 'Escolha um título para mostrar no seu perfil. Eles são liberados por conquistas.'),
    el('div', { class: 'lista-titulos' },
      ...TITULOS.map((t) => {
        const liberado = conquistaFeita(save, t.id);
        const usando = liberado && save.titulo === t.id;
        return el('button', {
          class: `titulo-opcao${usando ? ' em-uso' : ''}`, disabled: !liberado, 'aria-pressed': String(usando),
          title: liberado ? (usando ? 'Clique para tirar' : 'Clique para usar') : `Conclua a conquista "${t.conquista}"`,
          onclick: () => {
            // clicar de novo no que está em uso tira
            save.titulo = usando ? null : t.id;
            salvar(save);
            aoMudar();
          },
        }, el('strong', {}, t.nome), el('small', {}, liberado ? (usando ? 'Em uso' : 'Liberado') : `Conquista: ${t.conquista}`));
      })),
    emUso ? null : el('small', { class: 'meta' }, 'Nenhum título em uso.'));
}

/**
 * Minhas skins: as skins que o jogador tem (os tickets mandam as skins para cá, não para a bolsa). Duas escolhas
 * separadas: qual skin usar no visual e de qual skin vem o bônus (dá para usar o visual de uma e o bônus de outra).
 */
function skins(save: Save): HTMLElement {
  const secao = el('section', { class: 'conta-secao' });
  const desenhar = () => secao.replaceChildren(...conteudoSkins(save, desenhar));
  desenhar();
  return secao;
}

/** Provador: o personagem andando com a skin escolhida para o visual (e o brilho, se for shiny). */
function provador(save: Save): HTMLElement {
  const canvas = el('canvas', { width: 64, height: 64, class: 'skin-provador-canvas' }) as HTMLCanvasElement;
  void montarPersonagem(aparenciaDoSave(save)).then((f) => {
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    let quadro = 1;
    const y = LINHA_DIRECAO.baixo * 64;
    const passo = () => {
      // a tela foi redesenhada ou fechada: para
      if (!canvas.isConnected) return clearInterval(relogio);
      ctx.clearRect(0, 0, 64, 64);
      if (f.aura) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 270);
        ctx.drawImage(f.aura, quadro * 64, y, 64, 64, 0, 0, 64, 64);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(f.walk, quadro * 64, y, 64, 64, 0, 0, 64, 64);
      quadro = quadro >= 8 ? 1 : quadro + 1;
    };
    const relogio = setInterval(passo, 110);
    passo();
  });
  return el('div', { class: 'skin-provador' }, canvas);
}

function conteudoSkins(save: Save, redesenhar: () => void): HTMLElement[] {
  const minhas = TODOS_OS_ITENS.filter((i) => i.categoria === 'skins' && (save.itens[i.id] ?? 0) > 0);
  const total = bonusAtivoDaSkin(save);
  const visual = temSkin(save, save.skinVisual) && temArteDeSkin(save.skinVisual) ? save.skinVisual : null;
  const bonus = temSkin(save, save.skinBonus) ? save.skinBonus : null;
  const nomeDe = (id: string | null) => minhas.find((i) => i.id === id)?.nome ?? 'nenhuma';
  const escolher = (campo: 'skinVisual' | 'skinBonus', id: string) => {
    // clicar de novo na que está em uso tira
    save[campo] = save[campo] === id ? null : id;
    salvar(save);
    // o servidor mostra aos outros jogadores a skin do save guardado: manda logo
    if (campo === 'skinVisual') void salvarAgora();
    redesenhar();
  };
  return [
    el('p', { class: 'sub' }, 'Escolha uma skin para o visual e uma para o bônus: podem ser skins diferentes. O visual muda o seu personagem no mapa e na cidade (os outros jogadores também veem); só vale o bônus da skin escolhida.'),
    el('div', { class: 'skins-provador-linha' }, provador(save), el('small', { class: 'meta' }, visual ? 'É assim que você aparece no mapa.' : 'Sem skin no visual: você aparece com o seu personagem normal.')),
    el('div', { class: 'skins-total' }, el('span', {}, 'Visual: ', el('strong', {}, nomeDe(visual))), el('span', {}, 'Bônus de: ', el('strong', {}, nomeDe(bonus)))),
    el('div', { class: 'skins-total' }, ...([['shiny', 'Shiny'], ['raros', 'Lendário, mítico, Ultra Beast e inicial'], ['silver', 'Silver em batalhas'], ['captura', 'Captura'], ['xp', 'XP']] as const).map(([k, nome]) =>
      el('span', {}, `${nome}: `, el('strong', {}, `+${(Math.round(total[k] * 1000) / 10).toLocaleString('pt-BR')}%`)))),
    minhas.length
      ? el('div', { class: 'grade-skins' },
          ...minhas.map((i) => el('div', { class: `cartao-skin${i.id === visual || i.id === bonus ? ' em-uso' : ''}` },
            iconeItem(i), el('strong', {}, i.nome), el('small', {}, `×${save.itens[i.id]}`), el('small', { class: 'skin-bonus' }, textoBonusSkin(bonusDaSkin(i.id))),
            el('div', { class: 'skin-botoes' },
              temArteDeSkin(i.id)
                ? el('button', { class: `botao ${i.id === visual ? '' : 'secundario'}`, 'aria-pressed': String(i.id === visual), onclick: () => escolher('skinVisual', i.id) }, i.id === visual ? '✓ Visual' : 'Usar visual')
                : el('button', { class: 'botao secundario', disabled: true, title: 'O desenho desta skin ainda não está pronto' }, 'Visual em breve'),
              el('button', { class: `botao ${i.id === bonus ? '' : 'secundario'}`, 'aria-pressed': String(i.id === bonus), onclick: () => escolher('skinBonus', i.id) }, i.id === bonus ? '✓ Bônus' : 'Usar bônus')))))
      : el('p', { class: 'meta' }, 'Você ainda não tem nenhuma skin. Elas saem no lendário e no mítico dos tickets, de conquistas e de eventos.'),
  ];
}

export const telaConta = (secao: SecaoConta): Tela => (raiz, navegar) => {
  const save = carregarSave();
  const titulos: Record<SecaoConta, string> = { perfil: 'Meu perfil', achievements: 'Conquistas', skins: 'Minhas skins' };
  const tela = el('main', { class: 'tela tela-conta' }, el('h1', {}, titulos[secao]));
  raiz.append(tela);
  if (!save) {
    tela.append(el('p', { class: 'sub' }, 'Comece um jogo para ver sua conta.'), el('button', { class: 'botao', onclick: () => navegar({ tela: 'inicial' }) }, 'Começar'));
    return;
  }
  if (secao === 'perfil') {
    const corpo = el('div', { class: 'conta-perfil' });
    const desenhar = () => corpo.replaceChildren(perfilJogador(save), painelTitulos(save, desenhar));
    desenhar();
    tela.append(corpo, el('div', { class: 'conta-botoes' }, el('button', { class: 'botao secundario', onclick: () => navegar({ tela: 'personagem' }) }, 'Editar personagem')));
  }
  else if (secao === 'achievements') tela.append(achievements(save));
  else tela.append(skins(save));
};
