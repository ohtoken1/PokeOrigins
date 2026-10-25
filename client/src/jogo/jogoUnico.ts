// O jogo (Phaser) é criado UMA vez e reaproveitado em todos os biomas. Antes cada entrada num bioma
// criava um jogo novo (com um contexto WebGL novo): trocando várias vezes, o navegador ficava
// sem memória de vídeo e a tela travava/ficava preta por dezenas de segundos.
import Phaser from 'phaser';
import { ALTURA_TELA, BiomaScene, LARGURA_TELA, resolucao, type OpcoesBioma } from './BiomaScene';

let jogo: Phaser.Game | null = null;
/** Há um mapa na tela (entre o mostrarJogo e o tirar). */
let mapaNaTela = false;

/**
 * Durante a batalha o mapa dorme (não desenha): ele ficava animando por baixo da janela da batalha e dos painéis
 * com desfoque, e o navegador às vezes piscava ou mostrava quadrados pretos (pedido do dono). Acorda quando ela fecha.
 */
let vigiandoBatalha = false;
function dormirNaBatalha(): void {
  if (vigiandoBatalha) return;
  vigiandoBatalha = true;
  let emBatalha = false;
  new MutationObserver(() => {
    const agora = !!document.querySelector('.batalha-fundo');
    if (agora === emBatalha) return;
    emBatalha = agora;
    if (!jogo || !mapaNaTela) return;
    if (agora) jogo.loop.sleep();
    else jogo.loop.wake();
  }).observe(document.body, { childList: true });
}

/**
 * Mapa em tela cheia (ui/telaCheia.ts): o jogo muda de formato para o da tela, mostrando MAIS mapa em vez de faixas
 * pretas (celular em pé fica alto e estreito). A área de jogo fica parecida com a normal (960 × 640), então os
 * bonecos ficam de um tamanho parecido; o zoom da câmera vem de `config.width`, que não muda.
 */
let telaCheia = false;
function aplicarTamanho(): void {
  if (!jogo) return;
  const r = resolucao();
  let [w, h] = [LARGURA_TELA, ALTURA_TELA];
  if (telaCheia) {
    const k = Math.sqrt((innerWidth * innerHeight) / (LARGURA_TELA * ALTURA_TELA));
    [w, h] = [Math.round(innerWidth / k), Math.round(innerHeight / k)];
  }
  if (jogo.scale.width !== w * r || jogo.scale.height !== h * r) jogo.scale.setGameSize(w * r, h * r);
  jogo.scale.refresh();
}
export function definirTelaCheia(sim: boolean): void {
  telaCheia = sim;
  aplicarTamanho();
}
addEventListener('resize', () => telaCheia && aplicarTamanho());

/** Coloca o jogo dentro de `area` e começa o bioma. Devolve a função que tira o jogo da tela. */
export function mostrarJogo(area: HTMLElement, opcoes: OpcoesBioma): { cena: () => BiomaScene | null; tirar: () => void } {
  // o modo desempenho muda a resolução: o jogo é criado de novo com o tamanho certo
  if (jogo && jogo.config.width !== LARGURA_TELA * resolucao()) {
    // o destroy do Phaser só acontece no próximo quadro: com o jogo dormindo (fora do mapa) nunca acontecia,
    // e o teclado do jogo velho continuava "segurando" as setas (o novo ignorava as teclas já tratadas)
    jogo.input.keyboard?.stopListeners();
    jogo.loop.wake();
    jogo.destroy(true);
    jogo = null;
  }
  if (!jogo) {
    jogo = new Phaser.Game({
      type: Phaser.AUTO,
      parent: area,
      // resolução dobrada (ver RESOLUCAO): a página mostra o canvas no mesmo tamanho, reduzido suavemente
      width: LARGURA_TELA * resolucao(),
      height: ALTURA_TELA * resolucao(),
      pixelArt: true,
      backgroundColor: '#12110f',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    });
    jogo.scene.add('bioma', BiomaScene, false);
    // depuração no navegador (só no modo de desenvolvimento)
    if (import.meta.env.DEV) (window as unknown as { jogo: Phaser.Game }).jogo = jogo;
  } else {
    // o mesmo canvas muda de lugar na página
    area.append(jogo.canvas);
    jogo.scale.parent = area;
    jogo.scale.parentIsWindow = false;
    jogo.scale.getParentBounds();
    jogo.scale.refresh();
    jogo.loop.wake();
  }
  aplicarTamanho();
  const atual = jogo;
  mapaNaTela = true;
  dormirNaBatalha();
  // começa no quadro seguinte: dá tempo da página mostrar o "Carregando mapa…" antes de desenhar
  let tirado = false;
  setTimeout(() => !tirado && atual.scene.start('bioma', opcoes), 30);

  return {
    cena: () => {
      const c = atual.scene.getScene('bioma') as BiomaScene | null;
      return c?.sys.isActive() ? c : null;
    },
    tirar: () => {
      tirado = true;
      if (atual === jogo) mapaNaTela = false;
      atual.scene.stop('bioma');
      // sem mapa na tela, o jogo dorme (não gasta nada) até o próximo bioma
      atual.loop.sleep();
      atual.canvas.remove();
    },
  };
}

/** Pausa (ou volta) o mapa que estiver na tela, seja qual for a tela (batalha PvP que começa de fora). */
export function pausarMapaAtual(pausado: boolean): void {
  const c = jogo?.scene.getScene('bioma') as BiomaScene | null | undefined;
  if (c?.sys.isActive()) c.pausar(pausado);
}
