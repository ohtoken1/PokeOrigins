// Joystick de toque (pedido do dono, para o celular): encostou o dedo no chão do mapa, o joystick aparece embaixo
// dele; arrastar anda nas 4 direções (como segurar a seta), soltar some. Toque em prédio, NPC, jogador ou boss
// continua abrindo o que abre hoje (o joystick só nasce quando o toque não pegou nada clicável).
// Funciona também com o mouse (arrastar no chão), o que não atrapalha o PC.
import Phaser from 'phaser';

/** distância mínima do arraste (px da tela) para começar a andar */
const ZONA_MORTA = 14;
/** até onde a bolinha vai do centro */
const RAIO = 44;

export class Joystick {
  /** direção atual (null = parado); a cena lê a cada quadro */
  direcao: [number, number] | null = null;
  private base: HTMLDivElement;
  private bolinha: HTMLDivElement;
  private centro: { x: number; y: number } | null = null;
  private ponteiro: number | null = null;

  /** `aoComecar` = a direção acabou de mudar (garante o passo mesmo num arraste rápido que solta antes do quadro) */
  constructor(cena: Phaser.Scene, aoMudar: (d: [number, number]) => void, podeUsar: () => boolean) {
    this.base = document.createElement('div');
    this.base.className = 'joystick';
    this.base.hidden = true;
    this.bolinha = document.createElement('div');
    this.bolinha.className = 'joystick-bolinha';
    this.base.append(this.bolinha);
    document.body.append(this.base);

    const baixo = (p: Phaser.Input.Pointer, sobre: Phaser.GameObjects.GameObject[]) => {
      if (sobre.length || this.ponteiro !== null || !podeUsar()) return;
      const e = p.event as PointerEvent | TouchEvent | MouseEvent;
      const pos = 'touches' in e ? e.changedTouches[0] : e;
      if (!pos) return;
      this.ponteiro = p.id;
      this.centro = { x: pos.clientX, y: pos.clientY };
      this.base.style.left = `${pos.clientX}px`;
      this.base.style.top = `${pos.clientY}px`;
      this.bolinha.style.transform = 'translate(-50%, -50%)';
      this.base.hidden = false;
    };
    const mover = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.ponteiro || !this.centro) return;
      const e = p.event as PointerEvent | TouchEvent | MouseEvent;
      const pos = 'touches' in e ? [...e.changedTouches].find((t) => t) : e;
      if (!pos) return;
      const dx = pos.clientX - this.centro.x;
      const dy = pos.clientY - this.centro.y;
      const dist = Math.hypot(dx, dy);
      const f = dist > RAIO ? RAIO / dist : 1;
      this.bolinha.style.transform = `translate(calc(-50% + ${dx * f}px), calc(-50% + ${dy * f}px))`;
      const nova: [number, number] | null = dist < ZONA_MORTA ? null : Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
      const mudou = nova?.[0] !== this.direcao?.[0] || nova?.[1] !== this.direcao?.[1];
      this.direcao = nova;
      if (mudou && nova) aoMudar(nova);
    };
    const soltar = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.ponteiro) return;
      this.ponteiro = null;
      this.centro = null;
      this.direcao = null;
      this.base.hidden = true;
    };
    cena.input.on('pointerdown', baixo);
    cena.input.on('pointermove', mover);
    cena.input.on('pointerup', soltar);
    cena.input.on('pointerupoutside', soltar);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      cena.input.off('pointerdown', baixo);
      cena.input.off('pointermove', mover);
      cena.input.off('pointerup', soltar);
      cena.input.off('pointerupoutside', soltar);
      this.base.remove();
    });
  }

  /** Some na hora (pausa, janela aberta por cima). */
  soltar(): void {
    this.ponteiro = null;
    this.centro = null;
    this.direcao = null;
    this.base.hidden = true;
  }
}
