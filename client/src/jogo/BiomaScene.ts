import Phaser from 'phaser';
import type { Bioma } from '../../../shared/biomas';
import { TAM, desenharMapa, gerarMapa, type Mapa } from './mapa';
import { FOLHAS_CIDADE, PECAS, URL_ESTATUA, gerarMapaCidade, type ImagensCidade, type Peca } from './cidade';
import { sombraProjetada } from './cidadeDesenhos';
import { PALETAS } from './paletas';
import { pokemonPorId } from '../dados';
import { PAUSA_MINIMA_ENCONTRO_MS } from '../../../shared/encontros';
import { desenharPersonagem, type Direcao, type Quadro } from './personagem';
import { montarPersonagem, type FolhasPersonagem } from '../personagem/lpc';
import { carregarPmd, temSpritePmd, type InfoPmd } from './seguidoresPmd';

/** Tamanho da tela do jogo em pixels (a câmera mostra 40×27 tiles ampliados 1,5×). */
export const LARGURA_TELA = 960;
export const ALTURA_TELA = 640;
/** Zoom da câmera, fixo (pedido do dono: 1,5; o jogador não muda). */
const ZOOM = 1.5;
const zoomEscolhido = ZOOM;
/** Nome de treinador: fonte desenhada grande e reduzida para ficar nítida; tamanho final na tela (px). */
const FONTE_NOME = 32;
const TAMANHO_NOME_TELA = 13;
/** Tamanho do personagem/seguidor no mundo (fixo: com zoom 1,6 cada pixel do desenho virava 1 pixel da tela). */
const ESCALA_DETALHE = 1 / 1.6;
/** Quanto o personagem/seguidor são maiores no mundo que o tamanho original (zoom 2 → 1,6). */
const COMPENSA_ZOOM = 2 / 1.6;
/** Escala do personagem LPC (quadro 64×64) no mundo: 20% menor que a do desenho antigo (pedido do dono). */
const ESCALA_LPC = 0.5;
/** Escala dos sprites de mapa do PMD (Pokémon que segue). */
const ESCALA_PMD = 0.75;
const DURACAO_PASSO = 160;
/** Quadros da animação de andar do LPC por quadradinho (o ciclo tem 8). */
const QUADROS_POR_PASSO = 3;

/** Sprites da 5ª geração (Black/White): frente e costas, normal e shiny, já no tamanho relativo certo. */
const SPRITES_BW = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white';
const SPRITES_PADRAO = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
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

/** Mapas já gerados (o desenho fica guardado como textura no jogo, que é reaproveitado). */
const mapasGerados = new Map<string, Mapa>();

export interface Seguidor {
  especie: number;
  shiny: boolean;
}

export interface OpcoesBioma {
  /** Bioma do mapa (na cidade, só define o visual do chão: grama). */
  bioma: Bioma;
  /** Mapa da cidade (sem encontros) no lugar do mapa do bioma. */
  cidade?: boolean;
  /** Primeiro Pokémon do time, que anda atrás do jogador. */
  seguidor: Seguidor | null;
  /** Chamado quando o mapa terminou de ser montado. */
  aoPronto?(): void;
  /** Chamado ao terminar cada passo. */
  aoPisar(): void;
  /** Chamado quando o jogador para: PAUSA_MINIMA_ENCONTRO_MS depois do último passo, sem ter andado de novo (anti-macro). */
  aoParar?(): void;
  /** Personagem LPC montado (chega depois; até lá aparece o desenho antigo). `chave` identifica a aparência. */
  personagem?: { chave: string; folhas: Promise<FolhasPersonagem> };
  /** Nome de treinador, mostrado em cima do personagem. */
  nomeJogador?: string;
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
  private imgSeguidor!: Phaser.GameObjects.Sprite;
  /** balanço da imagem de batalha (o sprite do PMD já tem animação própria) */
  private balanco!: Phaser.Tweens.Tween;
  /** seguidor com sprite de mapa do PMD (andando em 8 direções) e a linha da direção atual */
  private pmd: InfoPmd | null = null;
  private linhaPmd = 0;
  /** Sombras no chão (elipses) embaixo do jogador e do seguidor. */
  private sombraJogador!: Phaser.GameObjects.Ellipse;
  private sombraSeguidor!: Phaser.GameObjects.Ellipse;
  /** nome de treinador em cima da cabeça */
  private nomeJogador: Phaser.GameObjects.Text | null = null;
  private pos = { x: 0, y: 0 };
  private posSeguidor = { x: 0, y: 0 };
  private dadosSeguidor: Seguidor | null = null;
  /** últimas posições do jogador: o seguidor fica 1 passo atrás (2 se for grande) */
  private rastro: { x: number; y: number }[] = [];
  private olhandoParaCima = false;
  private escalaSeguidor = ESCALA_DETALHE;
  private movendo = false;
  private direcao: Direcao = 'baixo';
  /** Textura do personagem LPC (null = desenho antigo) e a linha da folha (0 cima, 1 esquerda, 2 baixo, 3 direita). */
  private lpc: string | null = null;
  private linhaLpc = 2;
  /** Posição no ciclo de 8 quadros de andar (continua de um passo para o outro). */
  private cicloLpc = 0;
  /** alterna a perna que vai à frente a cada passo */
  private passos = 0;
  private pausado = false;
  private direcaoPendente: [number, number] | undefined;
  private setas!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private opcoes!: OpcoesBioma;

  constructor() {
    super('bioma');
  }

  /**
   * A mesma cena é reaproveitada em todos os biomas (o jogo é criado uma vez só): cada entrada
   * num bioma chama init de novo com as opções daquele bioma, e o estado volta ao inicial.
   */
  init(opcoes: OpcoesBioma) {
    this.opcoes = opcoes;
    this.dadosSeguidor = opcoes.seguidor;
    this.rastro = [];
    this.olhandoParaCima = false;
    this.escalaSeguidor = ESCALA_DETALHE;
    this.movendo = false;
    this.direcao = 'baixo';
    this.passos = 0;
    this.pausado = false;
    this.direcaoPendente = undefined;
    this.lpc = null;
    this.linhaLpc = 2;
    this.pmd = null;
    this.linhaPmd = 0;
  }

  preload() {
    // nas próximas visitas os tilesets já estão carregados
    if (!this.textures.exists('buch')) this.load.image('buch', 'tiles/tuxemon-buch.png');
    if (!this.textures.exists('natureza')) this.load.image('natureza', 'tiles/core_outdoor_nature.png');
    if (!this.textures.exists('agua')) this.load.image('agua', 'tiles/core_outdoor_water.png');
    // cidade: prédios e decoração
    if (this.opcoes.cidade)
      for (const [chave, arquivo] of Object.entries(FOLHAS_CIDADE)) if (!this.textures.exists(chave)) this.load.image(chave, arquivo);
    // estátua da fonte: sprite da PokéAPI (CORS liberado para virar pedra); sem internet a fonte fica sem estátua
    if (this.opcoes.cidade && !this.textures.exists('estatua')) {
      this.load.setCORS('anonymous');
      this.load.image('estatua', URL_ESTATUA);
    }
  }

  create() {
    const { bioma } = this.opcoes;
    const paleta = PALETAS[bioma.id] ?? PALETAS.grama;
    // mapa de cada bioma (e da cidade) é gerado e desenhado só na primeira visita; depois vem da memória
    const idMapa = this.opcoes.cidade ? 'cidade' : bioma.id;
    let mapa = mapasGerados.get(idMapa);
    if (!mapa) {
      mapa = this.opcoes.cidade ? gerarMapaCidade() : gerarMapa(bioma.id, paleta);
      mapasGerados.set(idMapa, mapa);
    }
    this.mapa = mapa;
    this.pos = { ...this.mapa.inicio };
    this.posSeguidor = { ...this.mapa.inicio };

    const imagem = (chave: string) => this.textures.get(chave).getSourceImage() as HTMLImageElement;
    const chaveMapa = `mapa-${idMapa}`;
    if (!this.textures.exists(chaveMapa))
      this.textures.addCanvas(
        chaveMapa,
        desenharMapa(this.mapa, paleta, idMapa, {
          buch: imagem('buch'),
          natureza: imagem('natureza'),
          agua: imagem('agua'),
          cidade: this.opcoes.cidade ? imagem('cidade') : undefined,
        }),
      );
    for (const direcao of ['baixo', 'cima', 'lado'] as Direcao[])
      for (const quadro of [0, 1, 2] as Quadro[]) {
        const chave = `jogador-${direcao}-${quadro}`;
        if (!this.textures.exists(chave)) this.textures.addCanvas(chave, desenharPersonagem(direcao, quadro));
      }
    this.add.image(0, 0, chaveMapa).setOrigin(0);
    this.montarObjetos();
    this.montarNpcs();
    if (this.opcoes.cidade) this.soltarBorboletas();

    const [sx, sy] = this.pesDoTile(this.posSeguidor.x, this.posSeguidor.y);
    this.imgSeguidor = this.add.sprite(0, 0, '__DEFAULT').setOrigin(0.5, 0.9).setScale(ESCALA_DETALHE);
    this.seguidor = this.add.container(sx, sy, [this.imgSeguidor]).setVisible(false);
    // balanço para cima e para baixo em 2 quadros, como os Pokémon que seguem nos jogos
    this.balanco = this.tweens.add({ targets: this.imgSeguidor, y: -1.5, duration: 260, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });
    const [px, py] = this.pesDoTile(this.pos.x, this.pos.y);
    this.sombraJogador = this.add.ellipse(px, py, 15, 5, 0x000000, 0.28);
    this.sombraSeguidor = this.add.ellipse(sx, sy, 12, 4, 0x000000, 0.28).setVisible(false);
    this.jogador = this.add.image(px, py, 'jogador-baixo-0').setOrigin(0.5, 28 / 32).setScale(ESCALA_DETALHE);
    this.atualizarProfundidade();
    this.carregarSeguidor();
    this.nomeJogador = null;
    if (this.opcoes.nomeJogador)
      this.nomeJogador = this.add
        .text(px, py, this.opcoes.nomeJogador, { fontFamily: 'system-ui, Segoe UI, sans-serif', fontSize: `${FONTE_NOME}px`, fontStyle: 'bold', color: '#ffffff', stroke: '#16243a', strokeThickness: 5 })
        .setOrigin(0.5, 1)
        .setDepth(100000);
    if (this.nomeJogador) {
      // o jogo usa filtro "pixel art" (NEAREST): no texto isso deixa as letras serrilhadas, então suaviza
      this.nomeJogador.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.ajustarNome();
    }
    this.opcoes.personagem?.folhas.then((f) => this.usarPersonagemLpc(this.opcoes.personagem!.chave, f));
    if (paleta.submerso) this.efeitosSubmersos();

    const camera = this.cameras.main;
    camera.setZoom(zoomEscolhido).setBounds(0, 0, this.mapa.largura * TAM, this.mapa.altura * TAM).setRoundPixels(true);
    camera.startFollow(this.jogador, true);

    const teclado = this.input.keyboard!;
    this.setas = teclado.createCursorKeys();
    // false = não bloqueia as letras: dá para digitar W A S D na busca da loja com o mapa aberto
    this.wasd = teclado.addKeys('W,A,S,D', false) as typeof this.wasd;
    // guarda toques rápidos (apertar e soltar entre dois quadros), que isDown não pega
    const aoTeclar = (e: KeyboardEvent) => {
      const direcao = DIRECOES_POR_TECLA[e.key.toLowerCase()];
      if (direcao) this.direcaoPendente = direcao;
    };
    teclado.on('keydown', aoTeclar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => teclado.off('keydown', aoTeclar));
    this.opcoes.aoPronto?.();
  }

  /** Textura (e quadro) de uma peça da cidade; peças com vários quadros ganham a animação `anim-<peça>`. */
  private quadroDaPeca(nome: string, p: Peca): { chave: string; quadro: string | undefined; animada: boolean } {
    if (p.desenhar) {
      const chave = (i: number) => `peca-${nome}-${i}`;
      if (!this.textures.exists(chave(0))) {
        const imgs = Object.fromEntries(
          [...Object.keys(FOLHAS_CIDADE), 'estatua'].filter((k) => this.textures.exists(k)).map((k) => [k, this.textures.get(k).getSourceImage()]),
        ) as ImagensCidade;
        p.desenhar(imgs).forEach((c, i) => this.textures.addCanvas(chave(i), c));
      }
      let quadros = 0;
      while (this.textures.exists(chave(quadros))) quadros++;
      if (quadros > 1 && !this.anims.exists(`anim-${nome}`))
        this.anims.create({ key: `anim-${nome}`, frames: Array.from({ length: quadros }, (_, i) => ({ key: chave(i) })), frameRate: 7, repeat: -1 });
      return { chave: chave(0), quadro: undefined, animada: quadros > 1 };
    }
    const textura = this.textures.get(p.folha!);
    if (!textura.has(nome)) textura.add(nome, 0, p.x!, p.y!, p.w, p.h);
    return { chave: p.folha!, quadro: nome, animada: false };
  }

  /** Nome em cima de um prédio ou NPC (mesmo estilo do nome do jogador, um pouco menor). */
  private rotulo(texto: string, x: number, y: number, cor = '#ffffff') {
    const t = this.add
      .text(x, y, texto, { fontFamily: 'system-ui, Segoe UI, sans-serif', fontSize: `${FONTE_NOME}px`, fontStyle: 'bold', color: cor, stroke: '#16243a', strokeThickness: 5 })
      .setOrigin(0.5, 1)
      .setDepth(99990)
      .setScale(11 / (FONTE_NOME * zoomEscolhido));
    t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  /** Prédios e decoração em pé: ficam na frente do jogador quando ele passa por trás (profundidade pela base). */
  private montarObjetos() {
    for (const o of this.mapa.objetos ?? []) {
      const p: Peca | undefined = PECAS[o.peca];
      if (!p) continue;
      const { chave, quadro, animada } = this.quadroDaPeca(o.peca, p);
      const x = Math.round(o.x * TAM);
      const base = o.base * TAM;
      const img = animada ? this.add.sprite(x, base, chave, quadro).play(`anim-${o.peca}`) : this.add.image(x, base, chave, quadro);
      img.setOrigin(0, 1).setDepth(base - 0.5);
      // sombra projetada no chão (embaixo de tudo que está em pé)
      this.add.image(x, base - p.h, this.sombraDaPeca(o.peca, p, chave, quadro)).setOrigin(0).setDepth(1).setAlpha(0.28);
      const rotulo = o.rotulo ?? p.rotulo;
      if (rotulo) this.rotulo(rotulo, x + p.w / 2, base - p.h - 2, '#ffe680');
    }
  }

  /** Textura da sombra de uma peça (feita uma vez a partir do primeiro quadro). */
  private sombraDaPeca(nome: string, p: Peca, chave: string, quadro: string | undefined): string {
    const chaveSombra = `sombra-${nome}`;
    if (!this.textures.exists(chaveSombra)) {
      const c = document.createElement('canvas');
      [c.width, c.height] = [p.w, p.h];
      const fr = this.textures.getFrame(chave, quadro);
      c.getContext('2d')!.drawImage(fr.source.image as CanvasImageSource, fr.cutX, fr.cutY, p.w, p.h, 0, 0, p.w, p.h);
      this.textures.addCanvas(chaveSombra, sombraProjetada(c, p.w, p.h).canvas);
    }
    return chaveSombra;
  }

  /** Borboletas voando em volta dos canteiros de flores (a cidade com mais vida). */
  private soltarBorboletas() {
    if (!this.textures.exists('borboleta-0')) {
      for (const [i, asas] of [[0, 3], [1, 1]] as [number, number][]) {
        const c = document.createElement('canvas');
        [c.width, c.height] = [7, 5];
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(3 - asas, 1, asas, 3);
        ctx.fillRect(4, 1, asas, 3);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(3, 0, 1, 5);
        this.textures.addCanvas(`borboleta-${i}`, c);
      }
      this.anims.create({ key: 'anim-borboleta', frames: [{ key: 'borboleta-0' }, { key: 'borboleta-1' }], frameRate: 8, repeat: -1 });
    }
    const jardins: [number, number][] = [];
    this.mapa.terreno.forEach((linha, y) => linha.forEach((t, x) => t === 'jardim' && jardins.push([x, y])));
    if (!jardins.length) return;
    const cores = [0xffe066, 0xff9ecb, 0x9fd8ff, 0xffffff, 0xffb347];
    for (let i = 0; i < 10; i++) {
      const [tx, ty] = jardins[Math.floor(Math.random() * jardins.length)];
      const [casaX, casaY] = [tx * TAM + 8, ty * TAM + 4];
      const b = this.add.sprite(casaX, casaY, 'borboleta-0').setTint(cores[i % cores.length]).setDepth(99000).play('anim-borboleta');
      const voar = () => {
        if (!b.active) return;
        this.tweens.add({
          targets: b,
          x: casaX + Phaser.Math.Between(-28, 28),
          y: casaY + Phaser.Math.Between(-20, 16),
          duration: Phaser.Math.Between(900, 2200),
          ease: 'Sine.easeInOut',
          onComplete: voar,
        });
      };
      voar();
    }
  }

  /** Personagens parados (LPC, olhando para baixo, respirando), por enquanto só visuais. */
  private montarNpcs() {
    const mapa = this.mapa;
    for (const n of mapa.npcs ?? []) {
      const [nx, ny] = this.pesDoTile(n.x, n.y);
      this.add.ellipse(nx, ny - 1, 16, 5, 0x000000, 0.28).setDepth(ny - 0.5);
      this.rotulo(n.nome, nx, ny - 25, '#9fe0ff');
      montarPersonagem(n.aparencia).then((f) => {
        if (this.mapa !== mapa || !this.sys.isActive()) return;
        const chave = `npc-${n.nome}`;
        if (!this.textures.exists(chave)) {
          const t = this.textures.addCanvas(chave, f.idle)!;
          t.add('parado-0', 0, 0, 128, 64, 64);
          t.add('parado-1', 0, 64, 128, 64, 64);
        }
        if (!this.anims.exists(`anim-${chave}`))
          this.anims.create({ key: `anim-${chave}`, frames: [{ key: chave, frame: 'parado-0' }, { key: chave, frame: 'parado-1' }], frameRate: 2, repeat: -1 });
        this.add.sprite(nx, ny, chave, 'parado-0').setOrigin(0.5, 61 / 64).setScale(ESCALA_LPC).setDepth(ny).play(`anim-${chave}`);
      });
    }
  }

  /** Fundo do mar: feixes de luz balançando, bolhas subindo e o personagem azulado. */
  private efeitosSubmersos() {
    const [w, h] = [this.mapa.largura * TAM, this.mapa.altura * TAM];
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

    if (!this.textures.exists('bolha')) {
      const bolha = this.add.graphics();
      bolha.lineStyle(1, 0xe8f8ff, 0.9).strokeCircle(4, 4, 3);
      bolha.fillStyle(0xffffff, 0.9).fillRect(2, 2, 1, 1);
      bolha.generateTexture('bolha', 8, 8);
      bolha.destroy();
    }
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
        const b = this.add.image(this.jogador.x + 3 * COMPENSA_ZOOM, this.jogador.y - 14 * COMPENSA_ZOOM, 'bolha').setScale(0.4).setDepth(5001);
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
    this.atualizarSombras();
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
    // sprite de mapa do PMD, andando em 8 direções (quem não tem usa a imagem de batalha)
    if (temSpritePmd(d.especie, d.shiny)) {
      carregarPmd(this, d.especie, d.shiny).then((info) => {
        if (this.dadosSeguidor !== d || !this.imgSeguidor?.active) return;
        if (!info) return this.usarImagemDeBatalha(d);
        this.pmd = info;
        this.balanco.pause();
        this.imgSeguidor.y = 0;
        this.imgSeguidor.setFlipX(false).setOrigin(0.5, info.origemIdle).setScale(ESCALA_PMD);
        this.escalaSeguidor = ESCALA_PMD;
        this.imgSeguidor.play(`${info.prefixo}-idle-${this.linhaPmd}`);
        this.seguidor.setVisible(true);
      });
      return;
    }
    this.usarImagemDeBatalha(d);
  }

  /** Seguidor com a imagem de batalha (frente/costas), balançando. */
  private usarImagemDeBatalha(d: Seguidor) {
    this.pmd = null;
    this.imgSeguidor.stop();
    this.balanco.resume();
    const aplicar = () => {
      if (this.dadosSeguidor !== d) return;
      this.mostrarLadoSeguidor();
      this.seguidor.setVisible(true);
    };
    const faltam = [false, true].filter((c) => !this.textures.exists(this.chaveSeguidor(c)));
    if (!faltam.length) return aplicar();
    this.load.setCORS('anonymous');
    // Black/White só tem até o #649; depois disso, as imagens padrão da PokéAPI
    const base = d.especie <= 649 ? SPRITES_BW : SPRITES_PADRAO;
    for (const costas of faltam)
      this.load.image(this.chaveSeguidor(costas), `${base}/${costas ? 'back/' : ''}${d.shiny ? 'shiny/' : ''}${d.especie}.png`);
    this.load.once(Phaser.Loader.Events.COMPLETE, aplicar);
    this.load.start();
  }

  /** Frente (ou costas, andando para cima) do Pokémon que segue. */
  private mostrarLadoSeguidor() {
    if (!this.dadosSeguidor || this.pmd) return;
    let chave = this.chaveSeguidor(this.olhandoParaCima);
    // sem imagem de costas (algumas espécies novas): usa a de frente
    if (!this.textures.exists(chave)) chave = this.chaveSeguidor(false);
    if (!this.textures.exists(chave)) return;
    const textura = this.textures.get(chave);
    // reduzido suavemente (não é ampliação de pixel art), então filtro linear
    textura.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const { topo, base } = areaDesenhada(textura.getSourceImage() as HTMLImageElement);
    // altura na tela proporcional à altura real: o treinador (~1,4 m) tem ~16 px no mundo
    const altura = pokemonPorId(this.dadosSeguidor.especie).altura;
    const alvo = Math.max(10, Math.min(44, (altura / 14) * 16)) * COMPENSA_ZOOM;
    this.escalaSeguidor = alvo / Math.max(1, base - topo);
    const h = textura.getSourceImage().height;
    this.imgSeguidor.setTexture(chave).setOrigin(0.5, base / h).setScale(this.escalaSeguidor);
  }

  /** Troca o desenho antigo pelo personagem LPC (cada quadro 64×64 vira um frame "linha-coluna"). */
  private usarPersonagemLpc(chave: string, folhas: FolhasPersonagem) {
    if (!this.jogador?.active) return;
    const nome = `jogador-lpc-${chave}`;
    if (!this.textures.exists(nome)) {
      const t = this.textures.addCanvas(nome, folhas.walk)!;
      for (let linha = 0; linha < 4; linha++) for (let col = 0; col < 9; col++) t.add(`${linha}-${col}`, 0, col * 64, linha * 64, 64, 64);
    }
    this.lpc = nome;
    this.jogador.setTexture(nome, `${this.linhaLpc}-0`).setOrigin(0.5, 61 / 64).setFlipX(false).setScale(ESCALA_LPC);
    this.sombraJogador.setSize(16, 5);
  }

  /** O nome fica sempre com ~13 px na tela, em qualquer zoom (o texto é desenhado grande e reduzido). */
  private ajustarNome() {
    this.nomeJogador?.setScale(TAMANHO_NOME_TELA / (FONTE_NOME * zoomEscolhido));
  }

  private atualizarSombras() {
    if (!this.sombraJogador) return;
    this.sombraJogador.setPosition(this.jogador.x, this.jogador.y - 1).setDepth(this.jogador.depth - 0.5);
    // nome acima da cabeça (o personagem LPC tem ~30 px de altura no mundo)
    // mesma posição do personagem (sem arredondar à parte, senão treme ao andar)
    this.nomeJogador?.setPosition(this.jogador.x, this.jogador.y - (this.lpc ? 25 : 18));
    const largura = this.pmd ? Math.max(8, this.pmd.largura * ESCALA_PMD * 0.75) : Math.max(8, this.imgSeguidor.displayWidth * 0.45);
    this.sombraSeguidor
      .setPosition(this.seguidor.x, this.seguidor.y - 1)
      .setSize(largura, largura * 0.32)
      .setVisible(this.seguidor.visible)
      .setDepth(this.seguidor.depth - 0.5);
  }

  private atualizarProfundidade() {
    this.jogador.setDepth(this.jogador.y);
    this.seguidor.setDepth(this.seguidor.y);
  }

  private tentarMover(dx: number, dy: number) {
    // vira para a direção mesmo se o caminho estiver bloqueado
    const direcao: Direcao = dy < 0 ? 'cima' : dy > 0 ? 'baixo' : 'lado';
    this.direcao = direcao;
    if (this.lpc) {
      // vira mantendo o quadro atual da animação (não "trava" entre passos)
      this.linhaLpc = dy < 0 ? 0 : dy > 0 ? 2 : dx < 0 ? 1 : 3;
      const coluna = String(this.jogador.frame.name).split('-')[1] ?? '0';
      this.jogador.setTexture(this.lpc, `${this.linhaLpc}-${coluna}`);
    } else this.jogador.setTexture(`jogador-${direcao}-0`).setFlipX(dx > 0);

    const x = this.pos.x + dx;
    const y = this.pos.y + dy;
    if (x < 0 || y < 0 || x >= this.mapa.largura || y >= this.mapa.altura || this.mapa.bloqueado[y][x]) return;

    // o seguidor vai para onde o jogador estava
    const anterior = this.pos;
    this.pos = { x, y };
    this.movendo = true;

    this.passos++;
    if (!this.lpc) this.jogador.setTexture(`jogador-${direcao}-${this.passos % 2 ? 1 : 2}`);
    const [px, py] = this.pesDoTile(x, y);
    const inicioCiclo = this.cicloLpc;
    this.tweens.add({
      targets: this.jogador,
      x: px,
      y: py,
      duration: DURACAO_PASSO,
      onUpdate: (tween) => {
        // LPC: 8 quadros de andar, 4 por passo
        // LPC: ~3 quadros por quadradinho andado, sem voltar ao "parado" entre passos seguidos
        if (this.lpc) this.jogador.setFrame(`${this.linhaLpc}-${1 + (Math.floor(inicioCiclo + tween.progress * QUADROS_POR_PASSO) % 8)}`);
        this.atualizarProfundidade();
      },
      onComplete: () => {
        this.movendo = false;
        if (this.lpc) {
          this.cicloLpc = (inicioCiclo + QUADROS_POR_PASSO) % 8;
          // só volta a ficar parado se não começar outro passo logo em seguida
          this.time.delayedCall(40, () => {
            if (!this.movendo && this.lpc) {
              this.jogador.setFrame(`${this.linhaLpc}-0`);
              this.cicloLpc = 0;
            }
          });
        } else this.jogador.setTexture(`jogador-${this.direcao}-0`);
        this.atualizarProfundidade();
        this.opcoes.aoPisar();
        // anti-macro: o encontro só sai quando o jogador para (segurando a tecla ou andando sem parar, nada aparece)
        const passo = this.passos;
        const opcoes = this.opcoes;
        this.time.delayedCall(PAUSA_MINIMA_ENCONTRO_MS, () => {
          if (this.passos === passo && this.opcoes === opcoes && !this.movendo) opcoes.aoParar?.();
        });
      },
    });
    // balanço do passo (o LPC já balança na própria animação)
    if (!this.lpc) this.tweens.add({ targets: this.jogador, scaleY: ESCALA_DETALHE * 0.92, duration: DURACAO_PASSO / 2, yoyo: true });

    // Pokémon grandes ficam 2 passos atrás para não entrar no espaço do treinador
    this.rastro.push({ ...anterior });
    if (this.rastro.length > 3) this.rastro.shift();
    const grande = this.dadosSeguidor ? pokemonPorId(this.dadosSeguidor.especie).altura > 10 : false;
    const destino = this.rastro[this.rastro.length - (grande ? 2 : 1)];
    if (destino && (destino.x !== this.posSeguidor.x || destino.y !== this.posSeguidor.y)) {
      const sdx = destino.x - this.posSeguidor.x;
      const sdy = destino.y - this.posSeguidor.y;
      this.posSeguidor = { ...destino };
      const [fx, fy] = this.pesDoTile(destino.x, destino.y);
      if (this.pmd) {
        // PMD: anima andando na direção do passo; parado volta à animação de respirar
        const pmd = this.pmd;
        this.linhaPmd = sdy > 0 ? 0 : sdx > 0 ? 2 : sdy < 0 ? 4 : 6;
        this.imgSeguidor.play(`${pmd.prefixo}-walk-${this.linhaPmd}`, true).setOrigin(0.5, pmd.origemWalk);
        this.tweens.add({
          targets: this.seguidor, x: fx, y: fy, duration: DURACAO_PASSO,
          onComplete: () => this.time.delayedCall(60, () => {
            if (!this.movendo && this.pmd === pmd) this.imgSeguidor.play(`${pmd.prefixo}-idle-${this.linhaPmd}`, true).setOrigin(0.5, pmd.origemIdle);
          }),
        });
        return;
      }
      // os sprites olham para a esquerda; espelha para a direita; andando para cima mostra as costas
      if (sdx) this.imgSeguidor.setFlipX(sdx > 0);
      if (sdy || sdx) {
        this.olhandoParaCima = sdy < 0;
        this.mostrarLadoSeguidor();
      }
      this.tweens.add({ targets: this.seguidor, x: fx, y: fy, duration: DURACAO_PASSO });
      // pulinho
      this.tweens.add({ targets: this.imgSeguidor, scaleY: this.escalaSeguidor * 0.9, scaleX: this.escalaSeguidor * 1.05, duration: DURACAO_PASSO / 2, yoyo: true });
    }
  }
}
