import Phaser from 'phaser';
import type { Bioma } from '../../../shared/biomas';
import { ALTURA, LARGURA, TAM, desenharMapa, gerarMapa, type Mapa } from './mapa';
import { PALETAS } from './paletas';
import { pokemonPorId } from '../dados';
import { desenharPersonagem, urlIconePokemon, type Direcao, type Quadro } from './personagem';

/** Tamanho da tela do jogo em pixels (a câmera mostra 30×20 tiles ampliados 2×). */
export const LARGURA_TELA = 960;
export const ALTURA_TELA = 640;
const ZOOM = 2;
/** Personagem e seguidor são desenhados com o dobro de detalhe e exibidos na metade do tamanho. */
const ESCALA_DETALHE = 1 / ZOOM;
const DURACAO_PASSO = 160;

/**
 * Escala do ícone (40×30) do Pokémon que segue o jogador pela altura real (decímetros).
 * Múltiplos de 0,5 = 1, 2, 3… pixels da tela por pixel do ícone (pixel art sem borrar).
 */
function escalaPorAltura(altura: number): number {
  if (altura <= 9) return ESCALA_DETALHE; // Pikachu, Charmander, Bulbasaur…
  if (altura <= 19) return ESCALA_DETALHE * 2; // Charizard, Arcanine, Mewtwo…
  return ESCALA_DETALHE * 3; // Moltres, Gyarados, Onix, Dragonite…
}

export interface OpcoesBioma {
  bioma: Bioma;
  /** Espécie do primeiro Pokémon do time, que anda atrás do jogador. */
  seguidor: number | null;
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
  /** o seguidor é um container (anda de tile em tile) com a imagem dentro (balança parado no lugar) */
  private seguidor!: Phaser.GameObjects.Container;
  private imgSeguidor!: Phaser.GameObjects.Image;
  private escalaSeguidor = ESCALA_DETALHE;
  private pos = { x: 0, y: 0 };
  private posSeguidor = { x: 0, y: 0 };
  private especieSeguidor: number | null;
  private movendo = false;
  private direcao: Direcao = 'baixo';
  /** alterna a perna que vai à frente a cada passo */
  private passos = 0;
  private pausado = false;
  private direcaoPendente: [number, number] | undefined;
  private setas!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private opcoes: OpcoesBioma;

  constructor(opcoes: OpcoesBioma) {
    super('bioma');
    this.opcoes = opcoes;
    this.especieSeguidor = opcoes.seguidor;
  }

  preload() {
    this.load.image('buch', 'tiles/tuxemon-buch.png');
    this.load.image('natureza', 'tiles/core_outdoor_nature.png');
    this.load.image('agua', 'tiles/core_outdoor_water.png');
  }

  create() {
    const { bioma } = this.opcoes;
    const paleta = PALETAS[bioma.id] ?? PALETAS.grama;
    this.mapa = gerarMapa(bioma.id, paleta);
    this.pos = { ...this.mapa.inicio };
    this.posSeguidor = { ...this.mapa.inicio };

    const imagem = (chave: string) => this.textures.get(chave).getSourceImage() as HTMLImageElement;
    this.textures.addCanvas('mapa', desenharMapa(this.mapa, paleta, bioma.id, { buch: imagem('buch'), natureza: imagem('natureza'), agua: imagem('agua') }));
    for (const direcao of ['baixo', 'cima', 'lado'] as Direcao[])
      for (const quadro of [0, 1, 2] as Quadro[]) this.textures.addCanvas(`jogador-${direcao}-${quadro}`, desenharPersonagem(direcao, quadro));
    this.add.image(0, 0, 'mapa').setOrigin(0);

    const [sx, sy] = this.pesDoTile(this.posSeguidor.x, this.posSeguidor.y);
    this.imgSeguidor = this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 0.9).setScale(ESCALA_DETALHE);
    this.seguidor = this.add.container(sx, sy, [this.imgSeguidor]).setVisible(false);
    // balanço para cima e para baixo em 2 quadros, como os Pokémon que seguem nos jogos
    this.tweens.add({ targets: this.imgSeguidor, y: -1.5, duration: 260, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });
    const [px, py] = this.pesDoTile(this.pos.x, this.pos.y);
    this.jogador = this.add.image(px, py, 'jogador-baixo-0').setOrigin(0.5, 28 / 32).setScale(ESCALA_DETALHE);
    this.atualizarProfundidade();
    this.carregarSeguidor();
    if (paleta.submerso) this.efeitosSubmersos();

    const camera = this.cameras.main;
    camera.setZoom(ZOOM).setBounds(0, 0, LARGURA * TAM, ALTURA * TAM).setRoundPixels(true);
    camera.startFollow(this.jogador, true);

    const teclado = this.input.keyboard!;
    this.setas = teclado.createCursorKeys();
    // false = não bloqueia as letras: dá para digitar W A S D na busca da loja com o mapa aberto
    this.wasd = teclado.addKeys('W,A,S,D', false) as typeof this.wasd;
    // guarda toques rápidos (apertar e soltar entre dois quadros), que isDown não pega
    teclado.on('keydown', (e: KeyboardEvent) => {
      const direcao = DIRECOES_POR_TECLA[e.key.toLowerCase()];
      if (direcao) this.direcaoPendente = direcao;
    });
  }

  /** Fundo do mar: feixes de luz balançando, bolhas subindo e o personagem azulado. */
  private efeitosSubmersos() {
    const [w, h] = [LARGURA * TAM, ALTURA * TAM];
    this.jogador.setTint(0xc8e4ff);
    this.imgSeguidor.setTint(0xc8e4ff);

    const luz = this.add.graphics().setDepth(5000).setBlendMode(Phaser.BlendModes.ADD);
    const feixes = Math.round(w / 85);
    for (let i = 0; i < feixes; i++) {
      const x = (i + 0.3) * (w / feixes);
      luz.fillStyle(0xbfe8ff, 0.05);
      luz.fillPoints([new Phaser.Geom.Point(x, 0), new Phaser.Geom.Point(x + 28, 0), new Phaser.Geom.Point(x + 28 + 160, h), new Phaser.Geom.Point(x + 90, h)], true);
    }
    this.tweens.add({ targets: luz, alpha: 0.45, x: 24, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const bolha = this.add.graphics();
    bolha.lineStyle(1, 0xe8f8ff, 0.9).strokeCircle(4, 4, 3);
    bolha.fillStyle(0xffffff, 0.9).fillRect(2, 2, 1, 1);
    bolha.generateTexture('bolha', 8, 8);
    bolha.destroy();
    this.add
      .particles(0, 0, 'bolha', {
        x: { min: 0, max: w },
        y: { min: 0, max: h },
        speedY: { min: -14, max: -28 },
        speedX: { min: -4, max: 4 },
        scale: { min: 0.35, max: 0.8 },
        alpha: { start: 0.8, end: 0 },
        lifespan: { min: 2500, max: 5000 },
        frequency: 10,
      })
      .setDepth(5001);
    // bolhas saindo do jogador de vez em quando
    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        const b = this.add.image(this.jogador.x + 3, this.jogador.y - 14, 'bolha').setScale(0.4).setDepth(5001);
        this.tweens.add({ targets: b, y: b.y - 30, x: b.x + 4, alpha: 0, duration: 1600, onComplete: () => b.destroy() });
      },
    });
  }

  pausar(pausado: boolean) {
    this.pausado = pausado;
  }

  /** Troca o Pokémon que segue o jogador (ex.: o time mudou de ordem ou ele evoluiu). */
  definirSeguidor(especieId: number | null) {
    if (especieId === this.especieSeguidor) return;
    this.especieSeguidor = especieId;
    if (this.seguidor) this.carregarSeguidor();
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

  /** Ponto onde ficam os pés de quem está no tile (um pouco abaixo do centro). */
  private pesDoTile(x: number, y: number): [number, number] {
    return [x * TAM + TAM / 2, y * TAM + TAM - 2];
  }

  private carregarSeguidor() {
    const id = this.especieSeguidor;
    if (!id) {
      this.seguidor.setVisible(false);
      return;
    }
    const chave = `icone-${id}`;
    const aplicar = () => {
      if (this.especieSeguidor !== id || !this.textures.exists(chave)) return;
      // tamanho de acordo com a altura real (Moltres bem maior que o treinador), sempre em fator inteiro na tela
      this.escalaSeguidor = escalaPorAltura(pokemonPorId(id).altura);
      this.imgSeguidor.setTexture(chave).setScale(this.escalaSeguidor);
      this.seguidor.setVisible(true);
    };
    if (this.textures.exists(chave)) return aplicar();
    this.load.setCORS('anonymous');
    this.load.image(chave, urlIconePokemon(id));
    this.load.once(Phaser.Loader.Events.COMPLETE, aplicar);
    this.load.start();
  }

  private atualizarProfundidade() {
    this.jogador.setDepth(this.jogador.y);
    this.seguidor.setDepth(this.seguidor.y);
  }

  private tentarMover(dx: number, dy: number) {
    // vira para a direção mesmo se o caminho estiver bloqueado
    const direcao: Direcao = dy < 0 ? 'cima' : dy > 0 ? 'baixo' : 'lado';
    this.direcao = direcao;
    this.jogador.setTexture(`jogador-${direcao}-0`).setFlipX(dx > 0);

    const x = this.pos.x + dx;
    const y = this.pos.y + dy;
    if (x < 0 || y < 0 || x >= LARGURA || y >= ALTURA || this.mapa.bloqueado[y][x]) return;

    // o seguidor vai para onde o jogador estava
    const anterior = this.pos;
    this.pos = { x, y };
    this.movendo = true;

    this.passos++;
    this.jogador.setTexture(`jogador-${direcao}-${this.passos % 2 ? 1 : 2}`);
    const [px, py] = this.pesDoTile(x, y);
    this.tweens.add({
      targets: this.jogador,
      x: px,
      y: py,
      duration: DURACAO_PASSO,
      onUpdate: () => this.atualizarProfundidade(),
      onComplete: () => {
        this.movendo = false;
        this.jogador.setTexture(`jogador-${this.direcao}-0`);
        this.atualizarProfundidade();
        this.opcoes.aoPisar();
      },
    });
    // balanço do passo
    this.tweens.add({ targets: this.jogador, scaleY: ESCALA_DETALHE * 0.92, duration: DURACAO_PASSO / 2, yoyo: true });

    if (anterior.x !== this.posSeguidor.x || anterior.y !== this.posSeguidor.y) {
      const sdx = anterior.x - this.posSeguidor.x;
      this.posSeguidor = { ...anterior };
      // os ícones olham para a esquerda; espelha quando anda para a direita
      if (sdx) this.imgSeguidor.setFlipX(sdx > 0);
      const [fx, fy] = this.pesDoTile(anterior.x, anterior.y);
      this.tweens.add({ targets: this.seguidor, x: fx, y: fy, duration: DURACAO_PASSO });
      // pulinho
      this.tweens.add({ targets: this.imgSeguidor, scaleY: this.escalaSeguidor * 0.88, scaleX: this.escalaSeguidor * 1.06, duration: DURACAO_PASSO / 2, yoyo: true });
    }
  }
}
