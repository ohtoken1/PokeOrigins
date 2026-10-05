import Phaser from 'phaser';
import type { Bioma } from '../../../shared/biomas';

export const TILE = 32;
export const COLUNAS = 21;
export const LINHAS = 15;

export type Celula = 'chao' | 'zona' | 'obstaculo';

const DIRECOES_POR_TECLA: Record<string, [number, number]> = {
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0],
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
};

export interface OpcoesBioma {
  bioma: Bioma;
  /** Chamado ao terminar cada passo, com o tipo de chão em que o jogador parou. */
  aoPisar(celula: Celula): void;
}

/** Gerador aleatório com semente: o mesmo bioma gera sempre o mesmo mapa. */
function aleatorioComSemente(texto: string): () => number {
  let s = 0;
  for (const c of texto) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mapa visto de cima, andando de quadrado em quadrado (setas ou WASD).
 * O mapa é gerado por código até termos mapas desenhados no Tiled.
 */
export class BiomaScene extends Phaser.Scene {
  private mapa: Celula[][] = [];
  private jogador!: Phaser.GameObjects.Container;
  private pos = { x: Math.floor(COLUNAS / 2), y: Math.floor(LINHAS / 2) };
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

  create() {
    this.gerarMapa();
    this.desenharMapa();
    this.criarJogador();
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

  private tentarMover(dx: number, dy: number) {
    const x = this.pos.x + dx;
    const y = this.pos.y + dy;
    if (this.mapa[y]?.[x] !== 'chao' && this.mapa[y]?.[x] !== 'zona') return;
    this.pos = { x, y };
    this.movendo = true;
    this.tweens.add({
      targets: this.jogador,
      x: x * TILE + TILE / 2,
      y: y * TILE + TILE / 2,
      duration: 140,
      onComplete: () => {
        this.movendo = false;
        this.opcoes.aoPisar(this.mapa[y][x]);
      },
    });
  }

  private gerarMapa() {
    const aleatorio = aleatorioComSemente(this.opcoes.bioma.id);
    this.mapa = Array.from({ length: LINHAS }, () => Array<Celula>(COLUNAS).fill('chao'));

    // manchas de mato (zonas de encontro)
    for (let i = 0; i < 9; i++) {
      const cx = Math.floor(aleatorio() * COLUNAS);
      const cy = Math.floor(aleatorio() * LINHAS);
      const raio = 2 + aleatorio() * 3;
      for (let y = 0; y < LINHAS; y++)
        for (let x = 0; x < COLUNAS; x++)
          if (Math.hypot(x - cx, (y - cy) * 1.2) < raio + aleatorio() * 0.8) this.mapa[y][x] = 'zona';
    }
    // obstáculos espalhados e borda
    for (let y = 0; y < LINHAS; y++)
      for (let x = 0; x < COLUNAS; x++) {
        const borda = x === 0 || y === 0 || x === COLUNAS - 1 || y === LINHAS - 1;
        if (borda || aleatorio() < 0.06) this.mapa[y][x] = 'obstaculo';
      }
    // área livre em volta do ponto de partida
    for (let y = this.pos.y - 1; y <= this.pos.y + 1; y++)
      for (let x = this.pos.x - 1; x <= this.pos.x + 1; x++) this.mapa[y][x] = 'chao';
  }

  private desenharMapa() {
    const { cores } = this.opcoes.bioma;
    const g = this.add.graphics();
    for (let y = 0; y < LINHAS; y++)
      for (let x = 0; x < COLUNAS; x++) {
        const px = x * TILE;
        const py = y * TILE;
        g.fillStyle(cores.chao).fillRect(px, py, TILE, TILE);
        const celula = this.mapa[y][x];
        if (celula === 'zona') {
          g.fillStyle(cores.zona).fillRect(px, py, TILE, TILE);
          g.lineStyle(2, cores.detalhe);
          for (const [ox, oy] of [[7, 22], [17, 12], [24, 26]]) {
            g.lineBetween(px + ox, py + oy, px + ox - 3, py + oy - 8);
            g.lineBetween(px + ox, py + oy, px + ox + 3, py + oy - 8);
          }
        } else if (celula === 'obstaculo') {
          g.fillStyle(0x000000, 0.18).fillEllipse(px + TILE / 2, py + TILE - 5, TILE - 6, 8);
          g.fillStyle(cores.obstaculo).fillRoundedRect(px + 3, py + 2, TILE - 6, TILE - 8, 8);
        }
      }
  }

  private criarJogador() {
    const sombra = this.add.ellipse(0, 11, 20, 7, 0x000000, 0.25);
    const corpo = this.add.rectangle(0, 3, 16, 14, 0x2b54c8).setStrokeStyle(2, 0x162a66);
    const cabeca = this.add.circle(0, -7, 7, 0xf2c9a0).setStrokeStyle(2, 0x6a4a30);
    const bone = this.add.rectangle(0, -12, 16, 6, 0xd62a2a).setStrokeStyle(2, 0x6e1010);
    this.jogador = this.add.container(this.pos.x * TILE + TILE / 2, this.pos.y * TILE + TILE / 2, [sombra, corpo, cabeca, bone]);
  }
}
