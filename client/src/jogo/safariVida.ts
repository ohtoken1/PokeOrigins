// Safari (shared/safari.ts): mapa de 3 salas empilhadas (a primeira embaixo), ligadas por um corredor na saída de
// cima, e os Pokémon de cada sala ANDANDO de verdade (sprites de mapa do PMD; quem não tem usa a imagem de batalha).
// Clicar num Pokémon da sala atual começa a batalha; os outros somem e o portão de cima abre. Shiny anda com um
// clarão dourado e estrelinhas em volta. Usa a mesma BiomaScene dos mapas (`opcoes.safari`).
import Phaser from 'phaser';
import { POKEMON_POR_SALA, SALAS_SAFARI } from '../../../shared/safari';
import { ESCALA_PMD, FONTE_NOME, TAMANHO_NOME_TELA, ZOOM } from './BiomaScene';
import { garantirFaiscas } from './brilhoSkin';
import { TAM, aleatorioComSemente, type Mapa, type Terreno } from './mapa';
import { carregarPmd, temSpritePmd } from './seguidoresPmd';

export interface PokemonNoSafari {
  especie: number;
  shiny: boolean;
  /** texto que aparece em cima dele com o mouse: "Vulpix Nv. 12" */
  rotulo: string;
}

export interface OpcoesSafari {
  /** os Pokémon de cada sala */
  salas: PokemonNoSafari[][];
  /** sala em que o jogador está ao abrir (continuar um Safari) e se já batalhou nela */
  sala: number;
  escolhido: boolean;
  /** clicou num Pokémon da sala atual; a tela chama `escolher()` da cena se a batalha vai mesmo começar */
  aoClicar(indice: number): void;
  /** o jogador passou para a sala seguinte */
  aoMudarSala(sala: number): void;
  /** saiu pela porta de cima da última sala */
  aoSair(): void;
}

export interface VidaDoSafari {
  /** tem um Pokémon neste tile? */
  ocupa(x: number, y: number): boolean;
  /** portão fechado neste tile? */
  bloqueia(x: number, y: number): boolean;
  /** o jogador terminou um passo aqui */
  pisou(x: number, y: number): void;
  /** escolheu o Pokémon da sala: todos somem e o portão abre */
  escolher(): void;
}

// ---------- mapa ----------
const LARGURA = 40;
const ALTURA = 66;
/** Sala: 28 × 16 tiles (cabe inteira na tela). */
const SALA = { x0: 6, x1: 33, altura: 16 };
/** Corredor de saída, no meio da parede de cima de cada sala (4 de largura, 4 de comprimento). */
const CORREDOR = { x0: 18, x1: 21, comprimento: 4 };
/** Linha de cima da sala `k` (a sala 0 é a de baixo). */
const topoDaSala = (k: number) => 46 - k * (SALA.altura + CORREDOR.comprimento);
/** Em qual sala está a linha `y` (corredor conta como a sala de baixo dele); -1 = fora. */
const salaDaLinha = (y: number) => {
  for (let k = 0; k < SALAS_SAFARI; k++) if (y >= topoDaSala(k) - CORREDOR.comprimento && y < topoDaSala(k) + SALA.altura) return k;
  return -1;
};
/** Linha do portão da sala `k`: a primeira do corredor de cima. */
const linhaDoPortao = (k: number) => topoDaSala(k) - 1;
/** Pisar daqui para cima (depois da última sala) termina o Safari. */
const LINHA_DA_SAIDA = topoDaSala(SALAS_SAFARI - 1) - 3;

/** O mapa é o mesmo para todos os tipos (o visual muda com a paleta do bioma). */
export function gerarMapaSafari(): Mapa {
  const r = aleatorioComSemente('safari');
  const terreno: Terreno[][] = Array.from({ length: ALTURA }, () => Array<Terreno>(LARGURA).fill('chao'));
  const aberto: boolean[][] = Array.from({ length: ALTURA }, () => Array<boolean>(LARGURA).fill(false));
  for (let k = 0; k < SALAS_SAFARI; k++) {
    const y0 = topoDaSala(k);
    for (let y = y0; y < y0 + SALA.altura; y++) for (let x = SALA.x0; x <= SALA.x1; x++) aberto[y][x] = true;
    for (let y = y0 - CORREDOR.comprimento; y < y0; y++)
      for (let x = CORREDOR.x0; x <= CORREDOR.x1; x++) {
        aberto[y][x] = true;
        terreno[y][x] = 'caminho';
      }
    // moitas de mato alto (só enfeite) e a trilha da entrada até a saída
    for (let i = 0; i < 5; i++) {
      const [cx, cy, raio] = [SALA.x0 + 3 + r() * (SALA.x1 - SALA.x0 - 6), y0 + 3 + r() * (SALA.altura - 6), 1.4 + r() * 1.6];
      for (let y = y0; y < y0 + SALA.altura; y++)
        for (let x = SALA.x0; x <= SALA.x1; x++) if (Math.hypot(x - cx, (y - cy) * 1.15) < raio + r() * 0.8) terreno[y][x] = 'mato';
    }
    for (let y = y0; y < y0 + SALA.altura; y++) for (const x of [19, 20]) terreno[y][x] = 'caminho';
  }
  const bloqueado = aberto.map((linha) => linha.map((a) => !a));
  // tudo o que não é sala nem corredor vira parede de árvores/pedras (2 × 2)
  const grandes: Mapa['grandes'] = [];
  for (let gy = 0; gy < ALTURA - 1; gy += 2)
    for (let gx = 0; gx < LARGURA - 1; gx += 2) if (!aberto[gy][gx] && !aberto[gy + 1][gx] && !aberto[gy][gx + 1] && !aberto[gy + 1][gx + 1]) grandes.push({ x: gx, y: gy });
  const flores: Mapa['flores'] = [];
  for (let y = 0; y < ALTURA; y++)
    for (let x = 0; x < LARGURA; x++) if (aberto[y][x] && terreno[y][x] === 'chao' && r() < 0.06) flores.push({ x, y, dx: 2 + Math.floor(r() * 9), dy: 2 + Math.floor(r() * 9) });
  return { largura: LARGURA, altura: ALTURA, terreno, bloqueado, grandes, pedrinhas: [], flores, inicio: { x: 19, y: topoDaSala(0) + SALA.altura - 2 } };
}

// ---------- vida ----------
const PASSO_MS = 430;
const DIRS: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
/** Estrelinha do shiny: tamanho em cada etapa da vida dela. */
const ETAPAS_FAISCA = [0, 1, 2, 1, 0];

interface Bicho {
  sala: number;
  indice: number;
  dados: PokemonNoSafari;
  x: number;
  y: number;
  alvo: { x: number; y: number } | null;
  sombra: Phaser.GameObjects.Ellipse;
  corpo: Phaser.GameObjects.Sprite | null;
  clarao: Phaser.GameObjects.Ellipse | null;
  proximaFaisca: number;
  sumiu: boolean;
}

/** Cerca de madeira que fecha a saída até o jogador batalhar na sala. */
function garantirPortao(cena: Phaser.Scene): void {
  if (cena.textures.exists('safari-portao')) return;
  const c = document.createElement('canvas');
  [c.width, c.height] = [(CORREDOR.x1 - CORREDOR.x0 + 1) * TAM, TAM];
  const g = c.getContext('2d')!;
  const R = (x: number, y: number, w: number, h: number, cor: string) => { g.fillStyle = cor; g.fillRect(x, y, w, h); };
  for (const y of [4, 10]) {
    R(0, y, c.width, 3, '#8a5a2b');
    R(0, y, c.width, 1, '#c08a4a');
    R(0, y + 3, c.width, 1, '#4a2e14');
  }
  for (let x = 2; x < c.width; x += 10) {
    R(x, 1, 4, 14, '#6b4420');
    R(x, 1, 1, 14, '#a8743a');
    R(x, 0, 4, 1, '#c08a4a');
    R(x, 15, 4, 1, '#3a2410');
  }
  cena.textures.addCanvas('safari-portao', c);
}

export function montarVidaDoSafari(
  cena: Phaser.Scene,
  mapa: Mapa,
  jogador: () => { x: number; y: number; seguidor: { x: number; y: number } },
  opcoes: OpcoesSafari,
): VidaDoSafari {
  let salaAtual = opcoes.sala;
  let escolhido = opcoes.escolhido;
  const bichos: Bicho[] = [];
  const ativa = () => cena.sys.isActive();
  const pes = (x: number, y: number): [number, number] => [x * TAM + TAM / 2, y * TAM + TAM - 2];
  const portaoAberto = (k: number) => k < salaAtual || (k === salaAtual && escolhido);
  const ocupa = (x: number, y: number) => bichos.some((b) => !b.sumiu && ((b.x === x && b.y === y) || (b.alvo?.x === x && b.alvo?.y === y)));
  const livre = (x: number, y: number, k: number) => {
    const y0 = topoDaSala(k);
    if (x < SALA.x0 || x > SALA.x1 || y < y0 || y >= y0 + SALA.altura || mapa.bloqueado[y][x] || ocupa(x, y)) return false;
    const j = jogador();
    return !(j.x === x && j.y === y) && !(j.seguidor.x === x && j.seguidor.y === y);
  };

  // ---------- portões ----------
  garantirPortao(cena);
  const portoes = Array.from({ length: SALAS_SAFARI }, (_, k) =>
    portaoAberto(k) ? null : cena.add.image(CORREDOR.x0 * TAM, linhaDoPortao(k) * TAM, 'safari-portao').setOrigin(0).setDepth((linhaDoPortao(k) + 1) * TAM));
  const abrirPortao = (k: number) => {
    const p = portoes[k];
    portoes[k] = null;
    if (p) cena.tweens.add({ targets: p, alpha: 0, y: p.y - 6, duration: 450, onComplete: () => p.destroy() });
  };

  // ---------- nome em cima do Pokémon com o mouse ----------
  const rotulo = cena.add
    .text(0, 0, '', { fontFamily: 'system-ui, Segoe UI, sans-serif', fontSize: `${FONTE_NOME}px`, fontStyle: 'bold', color: '#ffffff', stroke: '#151310', strokeThickness: 5 })
    .setOrigin(0.5, 1).setDepth(100001).setScale(TAMANHO_NOME_TELA / (FONTE_NOME * ZOOM)).setVisible(false);
  rotulo.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  let comRotulo: Bicho | null = null;

  // ---------- passeio ----------
  const passear = (b: Bicho, aoAndar: (dx: number, dy: number) => void, aoParar: () => void) => {
    let dir = DIRS[Math.floor(Math.random() * 4)];
    let seguidos = 0;
    const proximo = () => {
      if (!ativa() || b.sumiu || !b.corpo?.active) return;
      if (seguidos > 2 + Math.random() * 3 || Math.random() < 0.25) {
        dir = DIRS[Math.floor(Math.random() * 4)];
        seguidos = 0;
        if (Math.random() < 0.5) {
          aoParar();
          cena.time.delayedCall(700 + Math.random() * 2400, proximo);
          return;
        }
      }
      const [nx, ny] = [b.x + dir[0], b.y + dir[1]];
      if (!livre(nx, ny, b.sala)) {
        dir = DIRS[Math.floor(Math.random() * 4)];
        seguidos = 99;
        aoParar();
        cena.time.delayedCall(400 + Math.random() * 900, proximo);
        return;
      }
      b.alvo = { x: nx, y: ny };
      seguidos++;
      aoAndar(dir[0], dir[1]);
      const [px, py] = pes(nx, ny);
      cena.tweens.add({
        targets: b.corpo, x: px, y: py, duration: PASSO_MS,
        onUpdate: () => b.corpo?.active && b.corpo.setDepth(b.corpo.y),
        onComplete: () => {
          [b.x, b.y] = [nx, ny];
          b.alvo = null;
          proximo();
        },
      });
    };
    cena.time.delayedCall(300 + Math.random() * 2200, proximo);
  };

  /** O sprite ficou pronto: clique, nome com o mouse, brilho do shiny. */
  const preparar = (b: Bicho, s: Phaser.GameObjects.Sprite, areaClique: Phaser.Geom.Rectangle) => {
    b.corpo = s;
    s.setInteractive({ hitArea: areaClique, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    s.on('pointerover', () => {
      comRotulo = b;
      rotulo.setText(b.dados.rotulo).setColor(b.dados.shiny ? '#ffe27a' : '#ffffff').setVisible(true);
    });
    s.on('pointerout', () => {
      if (comRotulo === b) comRotulo = null;
      rotulo.setVisible(comRotulo !== null);
    });
    s.on('pointerdown', () => {
      if (b.sala === salaAtual && !escolhido && !b.sumiu) opcoes.aoClicar(b.indice);
    });
    if (b.dados.shiny) {
      garantirFaiscas(cena);
      b.clarao = cena.add.ellipse(s.x, s.y - 8, 30, 26, 0xffe27a, 0.4).setBlendMode(Phaser.BlendModes.ADD);
      cena.tweens.add({ targets: b.clarao, alpha: 0.12, scale: 1.25, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  };

  const criar = (sala: number, indice: number, dados: PokemonNoSafari, x: number, y: number) => {
    const [px, py] = pes(x, y);
    const b: Bicho = { sala, indice, dados, x, y, alvo: null, corpo: null, clarao: null, proximaFaisca: 0, sumiu: false, sombra: cena.add.ellipse(px, py - 1, 12, 4, 0x000000, 0.28).setDepth(py - 0.5) };
    bichos.push(b);
    const comImagemDeBatalha = () => {
      // sem sprite de mapa: a imagem de batalha, balançando (carregada fora do loader do Phaser, que tem fila própria)
      const chave = `safari-img-${dados.especie}-${dados.shiny ? 's' : 'n'}`;
      const usar = () => {
        if (!ativa() || b.sumiu) return;
        cena.textures.get(chave).setFilter(Phaser.Textures.FilterMode.LINEAR);
        const s = cena.add.sprite(px, py, chave).setOrigin(0.5, 0.82).setScale(0.42).setDepth(py);
        const { width: w, height: h } = s.frame;
        preparar(b, s, new Phaser.Geom.Rectangle(w * 0.2, h * 0.2, w * 0.6, h * 0.7));
        passear(b, (dx) => dx && s.setFlipX(dx > 0), () => {});
      };
      if (cena.textures.exists(chave)) return usar();
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!ativa()) return;
        if (!cena.textures.exists(chave)) cena.textures.addImage(chave, img);
        usar();
      };
      img.src = `${SPRITES}/${dados.shiny ? 'shiny/' : ''}${dados.especie}.png`;
    };
    if (!temSpritePmd(dados.especie, dados.shiny)) return comImagemDeBatalha();
    carregarPmd(cena, dados.especie, dados.shiny).then((pmd) => {
      if (!ativa() || b.sumiu) return;
      if (!pmd) return comImagemDeBatalha();
      b.sombra.setSize(Math.max(8, pmd.largura * ESCALA_PMD * 0.75), Math.max(3, pmd.largura * ESCALA_PMD * 0.24));
      let linha = 0;
      const s = cena.add.sprite(px, py, `${pmd.prefixo}-Idle`).setOrigin(0.5, pmd.origemIdle).setScale(ESCALA_PMD).setDepth(py);
      s.play(`${pmd.prefixo}-idle-${linha}`);
      // área de clique: uma caixa em volta do corpo (o quadro do sprite tem muita sobra transparente)
      const { width: w, height: h } = s.frame;
      const [lw, lh] = [Math.min(w, Math.max(22, pmd.largura + 8)), Math.min(h, 34)];
      preparar(b, s, new Phaser.Geom.Rectangle((w - lw) / 2, Math.max(0, h * pmd.origemIdle - lh + 4), lw, lh));
      passear(b,
        (dx, dy) => {
          linha = dy > 0 ? 0 : dx > 0 ? 2 : dy < 0 ? 4 : 6;
          s.play(`${pmd.prefixo}-walk-${linha}`, true).setOrigin(0.5, pmd.origemWalk);
        },
        () => s.play(`${pmd.prefixo}-idle-${linha}`, true).setOrigin(0.5, pmd.origemIdle));
    });
  };

  // os Pokémon das salas que ainda têm (a atual primeiro: os sprites carregam em fila)
  for (let k = salaAtual; k < SALAS_SAFARI; k++) {
    if (k === salaAtual && escolhido) continue;
    const y0 = topoDaSala(k);
    (opcoes.salas[k] ?? []).slice(0, POKEMON_POR_SALA).forEach((dados, i) => {
      for (let tentativa = 0; tentativa < 60; tentativa++) {
        const [x, y] = [SALA.x0 + 1 + Math.floor(Math.random() * (SALA.x1 - SALA.x0 - 1)), y0 + 1 + Math.floor(Math.random() * (SALA.altura - 2))];
        // longe da entrada da sala, para não nascer em cima do jogador
        if (!livre(x, y, k) || (Math.abs(x - 19.5) < 4 && y > y0 + SALA.altura - 5)) continue;
        criar(k, i, dados, x, y);
        break;
      }
    });
  }

  // ---------- a cada quadro: sombra, clarão, estrelinhas e nome acompanham o Pokémon ----------
  const faiscas: { img: Phaser.GameObjects.Image; de: Bicho; dx: number; dy: number; nasceu: number }[] = [];
  const quadro = () => {
    const agora = cena.time.now;
    for (const b of bichos) {
      const s = b.corpo;
      if (!s?.active || b.sumiu) continue;
      b.sombra.setPosition(s.x, s.y - 1).setDepth(s.y - 0.5);
      if (!b.clarao) continue;
      b.clarao.setPosition(s.x, s.y - 8).setDepth(s.y - 0.3);
      if (agora >= b.proximaFaisca) {
        b.proximaFaisca = agora + 160 + Math.random() * 220;
        const ang = Math.random() * Math.PI * 2;
        faiscas.push({ img: cena.add.image(0, 0, 'faisca-skin-0'), de: b, dx: Math.cos(ang) * (9 + Math.random() * 7), dy: -9 + Math.sin(ang) * (8 + Math.random() * 7), nasceu: agora });
      }
    }
    for (let i = faiscas.length - 1; i >= 0; i--) {
      const f = faiscas[i];
      const etapa = Math.floor((agora - f.nasceu) / 90);
      const s = f.de.corpo;
      if (etapa >= ETAPAS_FAISCA.length || !s?.active || f.de.sumiu) {
        f.img.destroy();
        faiscas.splice(i, 1);
        continue;
      }
      f.img.setTexture(`faisca-skin-${ETAPAS_FAISCA[etapa]}`).setPosition(s.x + f.dx, s.y + f.dy).setDepth(s.y + 0.3);
    }
    const alvo = comRotulo?.corpo;
    if (alvo?.active && !comRotulo!.sumiu) rotulo.setPosition(alvo.x, alvo.y - alvo.displayHeight * alvo.originY + 2);
    else rotulo.setVisible(false);
  };
  cena.events.on(Phaser.Scenes.Events.POST_UPDATE, quadro);
  cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => cena.events.off(Phaser.Scenes.Events.POST_UPDATE, quadro));

  return {
    ocupa,
    bloqueia: (x, y) => {
      for (let k = 0; k < SALAS_SAFARI; k++) if (y === linhaDoPortao(k) && x >= CORREDOR.x0 && x <= CORREDOR.x1) return !portaoAberto(k);
      return false;
    },
    pisou: (_x, y) => {
      if (y <= LINHA_DA_SAIDA) return opcoes.aoSair();
      // entrou na sala seguinte quando saiu do corredor
      const k = salaDaLinha(y);
      if (k > salaAtual && y >= topoDaSala(k)) {
        salaAtual = k;
        escolhido = false;
        opcoes.aoMudarSala(k);
      }
    },
    escolher: () => {
      escolhido = true;
      comRotulo = null;
      for (const b of bichos) {
        if (b.sala !== salaAtual || b.sumiu) continue;
        b.sumiu = true;
        b.corpo?.disableInteractive();
        const alvos = [b.corpo, b.sombra, b.clarao].filter((o): o is NonNullable<typeof o> => !!o);
        cena.tweens.killTweensOf(alvos);
        cena.tweens.add({ targets: alvos, alpha: 0, duration: 350, onComplete: () => alvos.forEach((o) => o.destroy()) });
      }
      abrirPortao(salaAtual);
    },
  };
}
