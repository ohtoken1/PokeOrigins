// Balão de fala em cima do personagem quando ele manda mensagem no chat LOCAL (pedido do dono). Acompanha o nome
// (o jogador e os outros, jogo/outrosJogadores.ts), um balão por pessoa (o novo troca o anterior) e some sozinho.
import Phaser from 'phaser';
import { FONTE_NOME, TAMANHO_NOME_TELA, ZOOM } from './BiomaScene';

/** Tamanho máximo do texto no balão (a mensagem inteira continua no chat). */
const MAXIMO_LETRAS = 90;
/** Quanto tempo fica: 4 s + um pouco por letra, até 9 s. */
const duracao = (texto: string) => Math.min(9000, 4000 + texto.length * 60);

/** Balão aberto de cada personagem e a função que o tira (com os ouvintes da cena). */
const baloes = new WeakMap<Phaser.GameObjects.Text, () => void>();

/** Mostra `texto` num balão em cima de `nome` (o rótulo do personagem). */
export function falarEm(cena: Phaser.Scene, nome: Phaser.GameObjects.Text, texto: string): void {
  if (!cena.sys.isActive() || !nome.active) return;
  baloes.get(nome)?.();
  const curto = texto.length > MAXIMO_LETRAS ? `${texto.slice(0, MAXIMO_LETRAS - 1)}…` : texto;
  const escala = TAMANHO_NOME_TELA / (FONTE_NOME * ZOOM);
  const largura = FONTE_NOME * 13;
  const t = cena.add.text(0, 0, curto, {
    fontFamily: 'system-ui, Segoe UI, sans-serif',
    fontSize: `${FONTE_NOME}px`,
    color: '#1a1815',
    align: 'center',
    wordWrap: { width: largura, useAdvancedWrap: true },
  }).setOrigin(0.5, 1);
  t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  const pad = FONTE_NOME * 0.45;
  const [w, h] = [t.width + pad * 2, t.height + pad * 1.4];
  const ponta = FONTE_NOME * 0.45;
  const g = cena.add.graphics();
  g.fillStyle(0xfaf6ea, 0.97).lineStyle(FONTE_NOME * 0.12, 0x5a4a23, 1);
  g.fillRoundedRect(-w / 2, -h - ponta, w, h, FONTE_NOME * 0.45).strokeRoundedRect(-w / 2, -h - ponta, w, h, FONTE_NOME * 0.45);
  // pontinha apontando para o personagem
  g.fillTriangle(-ponta, -ponta - 1, ponta, -ponta - 1, 0, 0);
  g.lineBetween(-ponta, -ponta, 0, 0).lineBetween(ponta, -ponta, 0, 0);
  t.setY(-ponta - pad * 0.7);
  const balao = cena.add.container(0, 0, [g, t]).setScale(escala).setDepth(100001);

  const seguir = () => {
    if (!nome.active) return acabar();
    // logo acima do nome (o nome tem a origem embaixo)
    balao.setPosition(nome.x, nome.y - nome.displayHeight - 1).setVisible(nome.visible);
  };
  const acabar = () => {
    cena.events.off(Phaser.Scenes.Events.POST_UPDATE, seguir);
    cena.events.off(Phaser.Scenes.Events.SHUTDOWN, acabar);
    if (baloes.get(nome) === acabar) baloes.delete(nome);
    balao.destroy();
  };
  baloes.set(nome, acabar);
  seguir();
  cena.events.on(Phaser.Scenes.Events.POST_UPDATE, seguir);
  cena.events.once(Phaser.Scenes.Events.SHUTDOWN, acabar);
  // some suave no fim
  cena.time.delayedCall(duracao(curto), () => {
    if (!balao.active) return;
    cena.tweens.add({ targets: balao, alpha: 0, duration: 300, onComplete: acabar });
  });
}
