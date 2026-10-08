// O jogo (Phaser) é criado UMA vez e reaproveitado em todos os biomas. Antes cada entrada num bioma
// criava um jogo novo (com um contexto WebGL novo): trocando várias vezes, o navegador ficava
// sem memória de vídeo e a tela travava/ficava preta por dezenas de segundos.
import Phaser from 'phaser';
import { ALTURA_TELA, BiomaScene, LARGURA_TELA, RESOLUCAO, type OpcoesBioma } from './BiomaScene';

let jogo: Phaser.Game | null = null;

/** Coloca o jogo dentro de `area` e começa o bioma. Devolve a função que tira o jogo da tela. */
export function mostrarJogo(area: HTMLElement, opcoes: OpcoesBioma): { cena: () => BiomaScene | null; tirar: () => void } {
  if (!jogo) {
    jogo = new Phaser.Game({
      type: Phaser.AUTO,
      parent: area,
      // resolução dobrada (ver RESOLUCAO): a página mostra o canvas no mesmo tamanho, reduzido suavemente
      width: LARGURA_TELA * RESOLUCAO,
      height: ALTURA_TELA * RESOLUCAO,
      pixelArt: true,
      backgroundColor: '#15263c',
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
  const atual = jogo;
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
      atual.scene.stop('bioma');
      // sem mapa na tela, o jogo dorme (não gasta nada) até o próximo bioma
      atual.loop.sleep();
      atual.canvas.remove();
    },
  };
}
