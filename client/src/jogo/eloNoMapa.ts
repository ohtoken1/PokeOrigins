// Símbolo do elo do PvP ranqueado à esquerda do nome no mapa (cidade e biomas), do jogador e dos outros
// (pedido do dono). O SVG de ui/simboloElo.ts vira textura uma vez por elo + tier (sem a fita da divisão: pequeno
// demais para ler); a textura fica no Game único e serve para todos os mapas.
import Phaser from 'phaser';
import type { EloNoMapa } from '../../../shared/ranqueado';
import { urlDoElo } from '../ui/simboloElo';

/** Tamanho da imagem desenhada (a tela mostra bem menor, nítido). */
const RESOLUCAO = 96;
/** Altura do símbolo em relação à do nome. */
const PROPORCAO = 2.6;
const carregando = new WeakMap<Phaser.Textures.TextureManager, Map<string, Promise<string>>>();

function garantirTextura(cena: Phaser.Scene, e: EloNoMapa): Promise<string> {
  const chave = `elo-mapa-${e.elo}-${e.tier}`;
  if (cena.textures.exists(chave)) return Promise.resolve(chave);
  let mapa = carregando.get(cena.textures);
  if (!mapa) carregando.set(cena.textures, (mapa = new Map()));
  let p = mapa.get(chave);
  if (!p) {
    p = (async () => {
      const img = new Image();
      img.src = urlDoElo(e.elo, { tier: e.tier });
      await img.decode();
      const tela = document.createElement('canvas');
      tela.width = tela.height = RESOLUCAO;
      tela.getContext('2d')!.drawImage(img, 0, 0, RESOLUCAO, RESOLUCAO);
      if (!cena.textures.exists(chave)) cena.textures.addCanvas(chave, tela)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
      return chave;
    })();
    mapa.set(chave, p);
  }
  return p;
}

export class SeloEloNoMapa {
  private img: Phaser.GameObjects.Image | null = null;
  private pedido = 0;

  constructor(private cena: Phaser.Scene, private nome: Phaser.GameObjects.Text, private aoClicar?: (p: Phaser.Input.Pointer) => void) {}

  definir(e: EloNoMapa | null | undefined): void {
    const n = ++this.pedido;
    if (!e) {
      this.img?.destroy();
      this.img = null;
      return;
    }
    garantirTextura(this.cena, e).then((chave) => {
      if (n !== this.pedido || !this.nome.active) return;
      if (this.img) this.img.setTexture(chave);
      else {
        this.img = this.cena.add.image(0, 0, chave).setOrigin(1, 0.5);
        if (this.aoClicar) this.img.setInteractive({ useHandCursor: true }).on('pointerdown', this.aoClicar);
      }
      this.posicionar();
    }, () => undefined);
  }

  /** Acompanha o nome (chamar sempre que o nome mudar de lugar). */
  posicionar(): void {
    if (!this.img) return;
    const altura = (this.nome.displayHeight / 1.35) * PROPORCAO;
    this.img
      .setDisplaySize(altura, altura)
      .setPosition(this.nome.x - this.nome.displayWidth / 2 + 1, this.nome.y - this.nome.displayHeight / 2)
      .setDepth(this.nome.depth)
      .setVisible(this.nome.visible);
  }

  destruir(): void {
    this.pedido++;
    this.img?.destroy();
    this.img = null;
  }
}
