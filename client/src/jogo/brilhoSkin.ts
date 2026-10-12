// Brilho das skins shiny no mapa: uma aura clara que pulsa por baixo do personagem (a folha vem de
// personagem/skinsDesenho.ts, com os mesmos quadros da de andar) e estrelinhas que nascem em volta dele, crescem e somem.
import Phaser from 'phaser';

const FAISCAS = 3;
const TEMPO_ETAPA_MS = 90;
/** Tamanho da estrela em cada etapa da vida dela. */
const ETAPAS = [0, 1, 2, 1, 0];

/** Texturas das estrelinhas (5×5), em três tamanhos. */
export function garantirFaiscas(cena: Phaser.Scene): void {
  if (cena.textures.exists('faisca-skin-0')) return;
  for (let tam = 0; tam < FAISCAS; tam++) {
    const c = document.createElement('canvas');
    c.width = c.height = 5;
    const g = c.getContext('2d')!;
    const p = (x: number, y: number, cor: string) => { g.fillStyle = cor; g.fillRect(2 + x, 2 + y, 1, 1); };
    p(0, 0, '#ffffff');
    if (tam >= 1) for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p(x, y, tam === 2 ? '#ffffff' : '#fff3a8');
    if (tam === 2) for (const [x, y] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) p(x, y, '#fff3a8');
    cena.textures.addCanvas(`faisca-skin-${tam}`, c);
  }
}

interface Faisca {
  img: Phaser.GameObjects.Image;
  /** posição no quadro 64×64 do personagem */
  x: number;
  y: number;
  nasceu: number;
}

export class BrilhoSkin {
  private aura: Phaser.GameObjects.Image;
  private faiscas: Faisca[] = [];
  private proxima = 0;
  private atualizar: () => void;

  /** `alvo`: a imagem do personagem (textura LPC, quadros "linha-coluna"); `texturaAura`: a aura com os mesmos quadros. */
  constructor(private cena: Phaser.Scene, private alvo: Phaser.GameObjects.Image, texturaAura: string) {
    garantirFaiscas(cena);
    this.aura = cena.add.image(alvo.x, alvo.y, texturaAura, alvo.frame.name);
    this.atualizar = () => this.passo();
    cena.events.on(Phaser.Scenes.Events.POST_UPDATE, this.atualizar);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
    this.passo();
  }

  private passo(): void {
    const { alvo, cena } = this;
    if (!alvo.active) return this.destruir();
    const agora = cena.time.now;
    this.aura
      .setPosition(alvo.x, alvo.y)
      .setOrigin(alvo.originX, alvo.originY)
      .setScale(alvo.scaleX, alvo.scaleY)
      .setFrame(alvo.frame.name)
      .setDepth(alvo.depth - 0.2)
      .setVisible(alvo.visible)
      .setAlpha(0.6 + 0.4 * Math.sin(agora / 270));
    if (agora >= this.proxima && alvo.visible) {
      this.proxima = agora + 280 + Math.random() * 320;
      // nasce em volta do corpo (um anel oval), não em cima do rosto
      const ang = Math.random() * Math.PI * 2, raio = 0.72 + Math.random() * 0.4;
      this.faiscas.push({ img: cena.add.image(0, 0, 'faisca-skin-0'), x: 31.5 + Math.cos(ang) * 16 * raio, y: 36 + Math.sin(ang) * 25 * raio, nasceu: agora });
    }
    this.faiscas = this.faiscas.filter((f) => {
      const etapa = Math.floor((agora - f.nasceu) / TEMPO_ETAPA_MS);
      if (etapa >= ETAPAS.length) return void f.img.destroy(), false;
      // acompanha o personagem: do pixel do quadro para o mundo
      f.img
        .setTexture(`faisca-skin-${ETAPAS[etapa]}`)
        .setPosition(alvo.x + (f.x - 64 * alvo.originX) * alvo.scaleX, alvo.y + (f.y - 64 * alvo.originY) * alvo.scaleY)
        .setScale(alvo.scaleX)
        .setDepth(alvo.depth + 0.2)
        .setVisible(alvo.visible);
      return true;
    });
  }

  destruir(): void {
    this.cena.events.off(Phaser.Scenes.Events.POST_UPDATE, this.atualizar);
    this.aura.destroy();
    for (const f of this.faiscas) f.img.destroy();
    this.faiscas = [];
  }
}

/**
 * Brilho pequeno de um Pokémon shiny no mapa (o que segue o jogador): só estrelinhas piscando em volta (pedido do dono: sem aura); uma
 * estrelinha de vez em quando. `alvo` = quem ele acompanha (posição = os pés).
 */
export class BrilhoShiny {
  private faiscas: { img: Phaser.GameObjects.Image; dx: number; dy: number; nasceu: number }[] = [];
  private proxima = 0;
  private atualizar: () => void;

  constructor(private cena: Phaser.Scene, private alvo: Phaser.GameObjects.Container | Phaser.GameObjects.Sprite) {
    garantirFaiscas(cena);
    this.atualizar = () => this.passo();
    cena.events.on(Phaser.Scenes.Events.POST_UPDATE, this.atualizar);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
  }

  private passo(): void {
    const { alvo, cena } = this;
    if (!alvo.active) return this.destruir();
    const agora = cena.time.now;
    if (agora >= this.proxima && alvo.visible) {
      this.proxima = agora + 320 + Math.random() * 380;
      const ang = Math.random() * Math.PI * 2;
      this.faiscas.push({ img: cena.add.image(0, 0, 'faisca-skin-0'), dx: Math.cos(ang) * (8 + Math.random() * 6), dy: -9 + Math.sin(ang) * (7 + Math.random() * 6), nasceu: agora });
    }
    this.faiscas = this.faiscas.filter((f) => {
      const etapa = Math.floor((agora - f.nasceu) / TEMPO_ETAPA_MS);
      if (etapa >= ETAPAS.length) return void f.img.destroy(), false;
      f.img.setTexture(`faisca-skin-${ETAPAS[etapa]}`).setPosition(alvo.x + f.dx, alvo.y + f.dy).setDepth(alvo.depth + 0.3).setVisible(alvo.visible);
      return true;
    });
  }

  destruir(): void {
    this.cena.events.off(Phaser.Scenes.Events.POST_UPDATE, this.atualizar);
    for (const f of this.faiscas) f.img.destroy();
    this.faiscas = [];
  }
}
