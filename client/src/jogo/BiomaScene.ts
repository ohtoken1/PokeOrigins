import Phaser from 'phaser';
import type { Bioma } from '../../../shared/biomas';
import { ALTURA, LARGURA, TAM, desenharJogador, desenharMapa, gerarMapa, type Mapa } from './mapa';
import { PALETAS } from './paletas';

/** Tamanho da tela do jogo em pixels (a câmera mostra 21×15 tiles ampliados 2×). */
export const LARGURA_TELA = 672;
export const ALTURA_TELA = 480;
const ZOOM = 2;

export interface OpcoesBioma {
  bioma: Bioma;
  /** Chamado ao terminar cada passo. */
  aoPisar(): void;
}

const DIRECOES_POR_TECLA: Record<string, [number, number]> = {
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0],
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
};

/** Mapa visto de cima, andando de quadrado em quadrado (setas ou WASD), com a câmera seguindo. */
export class BiomaScene extends Phaser.Scene {
  private mapa!: Mapa;
  private jogador!: Phaser.GameObjects.Image;
  private pos = { x: 0, y: 0 };
  private movendo = false;
  private pausado = false;
  private direcaoPendente: [number, number] | undefined;
  private setas!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private opcoes: OpcoesBioma;

  constructor(opcoes: OpcoesBioma) {
    super('bioma');
    this.opcoes = opcoes;
  }

  preload() {
    this.load.image('buch', 'tiles/tuxemon-buch.png');
    this.load.image('voxel', 'tiles/red-voxel.png');
  }

  create() {
    const { bioma } = this.opcoes;
    const paleta = PALETAS[bioma.id] ?? PALETAS.grama;
    this.mapa = gerarMapa(bioma.id, paleta);
    this.pos = { ...this.mapa.inicio };

    const imagem = (chave: string) => this.textures.get(chave).getSourceImage() as HTMLImageElement;
    this.textures.addCanvas('mapa', desenharMapa(this.mapa, paleta, bioma.id, { buch: imagem('buch'), voxel: imagem('voxel') }));
    this.textures.addCanvas('jogador', desenharJogador());
    this.add.image(0, 0, 'mapa').setOrigin(0);
    this.jogador = this.add.image(...this.centroDoTile(this.pos.x, this.pos.y), 'jogador').setOrigin(0.5, 0.75);

    const camera = this.cameras.main;
    camera.setZoom(ZOOM).setBounds(0, 0, LARGURA * TAM, ALTURA * TAM).setRoundPixels(true);
    camera.startFollow(this.jogador, true);

    const teclado = this.input.keyboard!;
    this.setas = teclado.createCursorKeys();
    this.wasd = teclado.addKeys('W,A,S,D') as typeof this.wasd;
    // guarda toques rápidos (apertar e soltar entre dois quadros), que isDown não pega
    teclado.on('keydown', (e: KeyboardEvent) => {
      const direcao = DIRECOES_POR_TECLA[e.key.toLowerCase()];
      if (direcao) this.direcaoPendente = direcao;
    });
  }

  pausar(pausado: boolean) {
    this.pausado = pausado;
  }

  update() {
    if (this.movendo) return;
    if (this.pausado) {
      this.direcaoPendente = undefined;
      return;
    }
    const { setas, wasd } = this;
    let direcao: [number, number] | undefined;
    if (setas.left.isDown || wasd.A.isDown) direcao = [-1, 0];
    else if (setas.right.isDown || wasd.D.isDown) direcao = [1, 0];
    else if (setas.up.isDown || wasd.W.isDown) direcao = [0, -1];
    else if (setas.down.isDown || wasd.S.isDown) direcao = [0, 1];
    direcao ??= this.direcaoPendente;
    this.direcaoPendente = undefined;
    if (direcao) this.tentarMover(...direcao);
  }

  private centroDoTile(x: number, y: number): [number, number] {
    return [x * TAM + TAM / 2, y * TAM + TAM / 2];
  }

  private tentarMover(dx: number, dy: number) {
    if (dx) this.jogador.setFlipX(dx < 0);
    const x = this.pos.x + dx;
    const y = this.pos.y + dy;
    if (x < 0 || y < 0 || x >= LARGURA || y >= ALTURA || this.mapa.bloqueado[y][x]) return;
    this.pos = { x, y };
    this.movendo = true;
    const [px, py] = this.centroDoTile(x, y);
    this.tweens.add({
      targets: this.jogador,
      x: px,
      y: py,
      duration: 160,
      onComplete: () => {
        this.movendo = false;
        this.opcoes.aoPisar();
      },
    });
    // pulinho do passo
    this.tweens.add({ targets: this.jogador, scaleY: 0.9, duration: 80, yoyo: true });
  }
}
