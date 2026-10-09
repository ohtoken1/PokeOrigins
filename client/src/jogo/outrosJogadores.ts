// Os OUTROS jogadores no mesmo mapa (sala do servidor): personagem LPC de cada um, nome em cima, sombra e o
// Pokémon que segue (sprite do PMD). Andam de tile em tile como o jogador; clicar no boneco abre o menu de interação.
import Phaser from 'phaser';
import { APARENCIA_PADRAO, montarPersonagem, type FolhasPersonagem } from '../personagem/lpc';
import type { DirecaoOnline, JogadorOnline, OuvinteSala, VisualOnline } from '../online';
import { DURACAO_PASSO, ESCALA_LPC, ESCALA_PMD, FONTE_NOME, QUADROS_POR_PASSO, TAMANHO_NOME_TELA, ZOOM } from './BiomaScene';
import { TAM } from './mapa';
import { carregarPmd, temSpritePmd, type InfoPmd } from './seguidoresPmd';

/** Textura do personagem LPC (cada quadro 64×64 vira um frame "linha-coluna"); a mesma para todos com a aparência igual. */
export function garantirTexturaLpc(cena: Phaser.Scene, chave: string, folhas: FolhasPersonagem): string {
  const nome = `jogador-lpc-${chave}`;
  if (!cena.textures.exists(nome)) {
    const t = cena.textures.addCanvas(nome, folhas.walk)!;
    for (let linha = 0; linha < 4; linha++) for (let col = 0; col < 9; col++) t.add(`${linha}-${col}`, 0, col * 64, linha * 64, 64, 64);
  }
  return nome;
}

// a mesma aparência não é montada duas vezes (vários jogadores com o visual padrão, por exemplo)
const folhasPorAparencia = new Map<string, Promise<FolhasPersonagem>>();
function folhasDe(aparencia: VisualOnline['aparencia']): { chave: string; folhas: Promise<FolhasPersonagem> } {
  const completa = { ...APARENCIA_PADRAO, ...(aparencia ?? {}), bone: 'nenhum' as const };
  const chave = JSON.stringify(completa);
  let folhas = folhasPorAparencia.get(chave);
  // aparência estragada (versão antiga, valor que não existe): usa o visual padrão
  if (!folhas) folhasPorAparencia.set(chave, (folhas = montarPersonagem(completa).catch(() => montarPersonagem({ ...APARENCIA_PADRAO, bone: 'nenhum' }))));
  return { chave, folhas };
}

const pes = (x: number, y: number): [number, number] => [x * TAM + TAM / 2, y * TAM + TAM - 2];

interface Outro {
  dados: JogadorOnline;
  corpo: Phaser.GameObjects.Image;
  sombra: Phaser.GameObjects.Ellipse;
  nome: Phaser.GameObjects.Text;
  seguidor: Phaser.GameObjects.Sprite | null;
  sombraSeguidor: Phaser.GameObjects.Ellipse | null;
  pmd: InfoPmd | null;
  linhaPmd: number;
  posSeguidor: { x: number; y: number };
  lpc: string | null;
  ciclo: number;
  movendo: boolean;
  fila: { x: number; y: number; dir: DirecaoOnline }[];
}

export class OutrosJogadores implements OuvinteSala {
  private outros = new Map<number, Outro>();
  private cena: Phaser.Scene;
  private aoClicar: (j: JogadorOnline, evento: MouseEvent) => void;

  constructor(cena: Phaser.Scene, aoClicar: (j: JogadorOnline, evento: MouseEvent) => void) {
    this.cena = cena;
    this.aoClicar = aoClicar;
  }

  /** Quantos estão no mapa agora (para o aviso "N jogadores aqui"). */
  get quantidade(): number {
    return this.outros.size;
  }

  todos(lista: JogadorOnline[]): void {
    for (const id of [...this.outros.keys()]) this.saiu(id);
    for (const j of lista) this.entrou(j);
  }

  entrou(j: JogadorOnline): void {
    if (!this.cena.sys.isActive()) return;
    this.saiu(j.id);
    const [px, py] = pes(j.x, j.y);
    const cena = this.cena;
    const corpo = cena.add.image(px, py, 'jogador-baixo-0').setOrigin(0.5, 28 / 32).setScale(1 / 1.6).setDepth(py);
    const sombra = cena.add.ellipse(px, py - 1, 15, 5, 0x000000, 0.28).setDepth(py - 0.5);
    const nome = cena.add
      .text(px, py, j.nome, { fontFamily: 'system-ui, Segoe UI, sans-serif', fontSize: `${FONTE_NOME}px`, fontStyle: 'bold', color: '#bfe3ff', stroke: '#16243a', strokeThickness: 5 })
      .setOrigin(0.5, 1)
      .setDepth(99999)
      .setScale(TAMANHO_NOME_TELA / (FONTE_NOME * ZOOM));
    nome.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const outro: Outro = { dados: j, corpo, sombra, nome, seguidor: null, sombraSeguidor: null, pmd: null, linhaPmd: 0, posSeguidor: { x: j.x, y: j.y }, lpc: null, ciclo: 0, movendo: false, fila: [] };
    this.outros.set(j.id, outro);
    // clicar no boneco (ou no nome) abre o menu: perfil, trocar, duelo
    for (const alvo of [corpo, nome]) {
      alvo.setInteractive({ useHandCursor: true });
      alvo.on('pointerdown', (p: Phaser.Input.Pointer) => this.aoClicar(outro.dados, p.event as MouseEvent));
    }
    this.aplicarVisual(outro);
    this.posicionarExtras(outro);
  }

  saiu(id: number): void {
    const o = this.outros.get(id);
    if (!o) return;
    this.cena.tweens.killTweensOf([o.corpo, o.seguidor].filter(Boolean) as Phaser.GameObjects.GameObject[]);
    for (const obj of [o.corpo, o.sombra, o.nome, o.seguidor, o.sombraSeguidor]) obj?.destroy();
    this.outros.delete(id);
  }

  moveu(id: number, x: number, y: number, dir: DirecaoOnline): void {
    const o = this.outros.get(id);
    if (!o) return;
    o.fila.push({ x, y, dir });
    // muito atrasado (aba em segundo plano, conexão lenta): pula direto para o fim
    if (o.fila.length > 6) o.fila.splice(0, o.fila.length - 1);
    if (!o.movendo) this.proximoPasso(o);
  }

  visual(id: number, visual: VisualOnline): void {
    const o = this.outros.get(id);
    if (!o) return;
    o.dados.visual = visual;
    this.aplicarVisual(o);
  }

  destruir(): void {
    for (const id of [...this.outros.keys()]) this.saiu(id);
  }

  // ---- desenho ----
  private aplicarVisual(o: Outro): void {
    const { chave, folhas } = folhasDe(o.dados.visual.aparencia);
    void folhas.then((f) => {
      if (!o.corpo.active) return;
      o.lpc = garantirTexturaLpc(this.cena, chave, f);
      o.corpo.setTexture(o.lpc, `${o.dados.dir}-0`).setOrigin(0.5, 61 / 64).setScale(ESCALA_LPC);
    });
    o.seguidor?.destroy();
    o.sombraSeguidor?.destroy();
    o.seguidor = o.sombraSeguidor = null;
    o.pmd = null;
    const seg = o.dados.visual.seguidor;
    // seguidor dos outros: só com sprite de mapa do PMD (a imagem de batalha balançando ficaria pesada com muitos)
    if (!seg || !temSpritePmd(seg.especie, seg.shiny)) return;
    void carregarPmd(this.cena, seg.especie, seg.shiny).then((info) => {
      if (!info || !o.corpo.active || o.dados.visual.seguidor !== seg) return;
      const [sx, sy] = pes(o.posSeguidor.x, o.posSeguidor.y);
      o.pmd = info;
      o.sombraSeguidor = this.cena.add.ellipse(sx, sy - 1, Math.max(8, info.largura * ESCALA_PMD * 0.75), Math.max(8, info.largura * ESCALA_PMD * 0.75) * 0.32, 0x000000, 0.28).setDepth(sy - 0.5);
      o.seguidor = this.cena.add.sprite(sx, sy, `${info.prefixo}-Idle`).setOrigin(0.5, info.origemIdle).setScale(ESCALA_PMD).setDepth(sy);
      o.seguidor.play(`${info.prefixo}-idle-${o.linhaPmd}`);
    });
  }

  private posicionarExtras(o: Outro): void {
    o.sombra.setPosition(o.corpo.x, o.corpo.y - 1).setDepth(o.corpo.y - 0.5);
    o.corpo.setDepth(o.corpo.y);
    o.nome.setPosition(o.corpo.x, o.corpo.y - (o.lpc ? 25 : 18));
    if (o.seguidor && o.sombraSeguidor) {
      o.seguidor.setDepth(o.seguidor.y);
      o.sombraSeguidor.setPosition(o.seguidor.x, o.seguidor.y - 1).setDepth(o.seguidor.y - 0.5);
    }
  }

  private proximoPasso(o: Outro): void {
    const passo = o.fila.shift();
    if (!passo || !o.corpo.active) {
      o.movendo = false;
      if (o.lpc && o.corpo.active) o.corpo.setFrame(`${o.dados.dir}-0`);
      if (o.pmd && o.seguidor) o.seguidor.play(`${o.pmd.prefixo}-idle-${o.linhaPmd}`, true).setOrigin(0.5, o.pmd.origemIdle);
      return;
    }
    const anterior = { x: o.dados.x, y: o.dados.y };
    const distancia = Math.abs(passo.x - anterior.x) + Math.abs(passo.y - anterior.y);
    Object.assign(o.dados, passo);
    const [px, py] = pes(passo.x, passo.y);
    if (o.lpc) o.corpo.setFrame(`${passo.dir}-0`);
    // parado virando (mesmo tile) ou pulo grande (entrou de outro lugar): sem andar
    if (distancia !== 1) {
      o.corpo.setPosition(px, py);
      if (distancia > 1) {
        o.posSeguidor = { ...passo };
        o.seguidor?.setPosition(px, py);
      }
      this.posicionarExtras(o);
      return this.proximoPasso(o);
    }
    o.movendo = true;
    // com passos acumulados, anda mais rápido para alcançar
    const duracao = o.fila.length ? DURACAO_PASSO * 0.6 : DURACAO_PASSO;
    const inicio = o.ciclo;
    this.cena.tweens.add({
      targets: o.corpo, x: px, y: py, duration: duracao,
      onUpdate: (tween) => {
        if (o.lpc) o.corpo.setFrame(`${passo.dir}-${1 + (Math.floor(inicio + tween.progress * QUADROS_POR_PASSO) % 8)}`);
        this.posicionarExtras(o);
      },
      onComplete: () => {
        o.ciclo = (inicio + QUADROS_POR_PASSO) % 8;
        this.posicionarExtras(o);
        this.proximoPasso(o);
      },
    });
    // o Pokémon vai para onde o treinador estava
    if (o.seguidor && o.pmd) {
      const sdx = anterior.x - o.posSeguidor.x;
      const sdy = anterior.y - o.posSeguidor.y;
      o.posSeguidor = anterior;
      o.linhaPmd = sdy > 0 ? 0 : sdx > 0 ? 2 : sdy < 0 ? 4 : 6;
      o.seguidor.play(`${o.pmd.prefixo}-walk-${o.linhaPmd}`, true).setOrigin(0.5, o.pmd.origemWalk);
      const [fx, fy] = pes(anterior.x, anterior.y);
      this.cena.tweens.add({ targets: o.seguidor, x: fx, y: fy, duration: duracao });
    } else o.posSeguidor = anterior;
  }
}
