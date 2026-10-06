import Phaser from 'phaser';
import type { Bioma } from '../../../shared/biomas';
import { ALTURA, LARGURA, TAM, desenharMapa, gerarMapa, type Mapa } from './mapa';
import { PALETAS } from './paletas';
import { pokemonPorId } from '../dados';
import { desenharPersonagem, type Direcao, type Quadro } from './personagem';

/** Tamanho da tela do jogo em pixels (a câmera mostra 30×20 tiles ampliados 2×). */
export const LARGURA_TELA = 960;
export const ALTURA_TELA = 640;
const ZOOM = 2;
/** Personagem e seguidor são desenhados com o dobro de detalhe e exibidos na metade do tamanho. */
const ESCALA_DETALHE = 1 / ZOOM;
const DURACAO_PASSO = 160;

/** Sprites da 5ª geração (Black/White): frente e costas, normal e shiny, já no tamanho relativo certo. */
const SPRITES_BW = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white';
/** Linhas de cima e de baixo da parte não transparente da imagem (para medir o Pokémon e achar os pés). */
const cacheAreas = new WeakMap<HTMLImageElement, { topo: number; base: number }>();
function areaDesenhada(img: HTMLImageElement): { topo: number; base: number } {
  const salva = cacheAreas.get(img);
  if (salva) return salva;
  const c = document.createElement('canvas');
  [c.width, c.height] = [img.width, img.height];
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  let [topo, base] = [0, img.height];
  try {
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    const linhaTem = (y: number) => {
      for (let x = 0; x < img.width; x++) if (d[(y * img.width + x) * 4 + 3] > 0) return true;
      return false;
    };
    while (topo < img.height - 1 && !linhaTem(topo)) topo++;
    while (base > topo + 1 && !linhaTem(base - 1)) base--;
  } catch {
    /* sem CORS: usa a imagem toda */
  }
  const area = { topo, base };
  cacheAreas.set(img, area);
  return area;
}

export interface Seguidor {
  especie: number;
  shiny: boolean;
}

export interface OpcoesBioma {
  bioma: Bioma;
  /** Primeiro Pokémon do time, que anda atrás do jogador. */
  seguidor: Seguidor | null;
  /** Chamado quando o mapa terminou de ser montado. */
  aoPronto?(): void;
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
  private pos = { x: 0, y: 0 };
  private posSeguidor = { x: 0, y: 0 };
  private dadosSeguidor: Seguidor | null;
  /** últimas posições do jogador: o seguidor fica 1 passo atrás (2 se for grande) */
  private rastro: { x: number; y: number }[] = [];
  private olhandoParaCima = false;
  private escalaSeguidor = ESCALA_DETALHE;
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
    this.dadosSeguidor = opcoes.seguidor;
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
    this.opcoes.aoPronto?.();

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
        // só em volta do que a câmera mostra (antes nasciam bolhas no mapa inteiro)
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-260, -170, 520, 340), quantity: 1 },
        speedY: { min: -14, max: -28 },
        speedX: { min: -4, max: 4 },
        scale: { min: 0.35, max: 0.8 },
        alpha: { start: 0.8, end: 0 },
        lifespan: { min: 2500, max: 5000 },
        frequency: 45,
      })
      .setDepth(5001)
      .startFollow(this.jogador);
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
  definirSeguidor(novo: Seguidor | null) {
    if (novo?.especie === this.dadosSeguidor?.especie && novo?.shiny === this.dadosSeguidor?.shiny) return;
    this.dadosSeguidor = novo;
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

  private chaveSeguidor(costas: boolean) {
    const d = this.dadosSeguidor!;
    return `seguidor-${d.especie}-${d.shiny ? 's' : 'n'}-${costas ? 'c' : 'f'}`;
  }

  private carregarSeguidor() {
    const d = this.dadosSeguidor;
    if (!d) {
      this.seguidor.setVisible(false);
      return;
    }
    const aplicar = () => {
      if (this.dadosSeguidor !== d) return;
      this.mostrarLadoSeguidor();
      this.seguidor.setVisible(true);
    };
    const faltam = [false, true].filter((c) => !this.textures.exists(this.chaveSeguidor(c)));
    if (!faltam.length) return aplicar();
    this.load.setCORS('anonymous');
    for (const costas of faltam)
      this.load.image(this.chaveSeguidor(costas), `${SPRITES_BW}/${costas ? 'back/' : ''}${d.shiny ? 'shiny/' : ''}${d.especie}.png`);
    this.load.once(Phaser.Loader.Events.COMPLETE, aplicar);
    this.load.start();
  }

  /** Frente (ou costas, andando para cima) do Pokémon que segue. */
  private mostrarLadoSeguidor() {
    if (!this.dadosSeguidor) return;
    const chave = this.chaveSeguidor(this.olhandoParaCima);
    if (!this.textures.exists(chave)) return;
    const textura = this.textures.get(chave);
    // reduzido suavemente (não é ampliação de pixel art), então filtro linear
    textura.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const { topo, base } = areaDesenhada(textura.getSourceImage() as HTMLImageElement);
    // altura na tela proporcional à altura real: o treinador (~1,4 m) tem ~16 px no mundo
    const altura = pokemonPorId(this.dadosSeguidor.especie).altura;
    const alvo = Math.max(10, Math.min(44, (altura / 14) * 16));
    this.escalaSeguidor = alvo / Math.max(1, base - topo);
    const h = textura.getSourceImage().height;
    this.imgSeguidor.setTexture(chave).setOrigin(0.5, base / h).setScale(this.escalaSeguidor);
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

    // Pokémon grandes ficam 2 passos atrás para não entrar no espaço do treinador
    this.rastro.push({ ...anterior });
    if (this.rastro.length > 3) this.rastro.shift();
    const grande = this.dadosSeguidor ? pokemonPorId(this.dadosSeguidor.especie).altura > 10 : false;
    const destino = this.rastro[this.rastro.length - (grande ? 2 : 1)];
    if (destino && (destino.x !== this.posSeguidor.x || destino.y !== this.posSeguidor.y)) {
      const sdx = destino.x - this.posSeguidor.x;
      const sdy = destino.y - this.posSeguidor.y;
      this.posSeguidor = { ...destino };
      // os sprites olham para a esquerda; espelha para a direita; andando para cima mostra as costas
      if (sdx) this.imgSeguidor.setFlipX(sdx > 0);
      if (sdy || sdx) {
        this.olhandoParaCima = sdy < 0;
        this.mostrarLadoSeguidor();
      }
      const [fx, fy] = this.pesDoTile(destino.x, destino.y);
      this.tweens.add({ targets: this.seguidor, x: fx, y: fy, duration: DURACAO_PASSO });
      // pulinho
      this.tweens.add({ targets: this.imgSeguidor, scaleY: this.escalaSeguidor * 0.9, scaleX: this.escalaSeguidor * 1.05, duration: DURACAO_PASSO / 2, yoyo: true });
    }
  }
}
