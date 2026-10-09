// Vida da cidade (só visual): moradores passeando, Pokémon soltos, bandos de Pidgey voando com sombra no chão,
// sombras de nuvens, o trem passando na estação com fumaça, ondinhas e brilhos nos lagos, folhas caindo das
// árvores e o céu acompanhando o relógio (fim de tarde alaranjado, noite azulada com os postes acesos e vaga-lumes).
import Phaser from 'phaser';
import { TAM, aleatorioComSemente, type Mapa } from './mapa';
import { dentroDoLago } from './ruido';
import { carregarPmd, temSpritePmd, type InfoPmd } from './seguidoresPmd';
import { CABELOS, CORES_CABELO, CORES_ROUPA, PELES, montarPersonagem, type Aparencia } from '../personagem/lpc';
import { TAM_TREM, desenharTrem } from './cidadePecas';
import { sombraProjetada } from './cidadeDesenhos';
import { PECAS } from './cidade';

/** Profundidades (por cima de tudo que está no chão e em pé, embaixo dos nomes). */
const PROF_NUVENS = 99400;
const PROF_PASSAROS = 99600;
const PROF_LUZ = 99710;
/** Escalas iguais às do jogador/seguidor (BiomaScene). */
const ESCALA_LPC = 0.5;
const ESCALA_PMD = 0.75;
/** Tempo de um passo de quem passeia (mais devagar que o jogador). */
const PASSO_MORADOR = 300;
const PASSO_POKEMON = 340;

/** Quem anda sozinho pela cidade: tile atual e o de destino ficam reservados (o jogador não entra). */
interface Andante {
  x: number;
  y: number;
  alvo: { x: number; y: number } | null;
}

export interface VidaDaCidade {
  /** Tem alguém (morador ou Pokémon) neste tile? O jogador não pode entrar. */
  ocupa(x: number, y: number): boolean;
}

/** Hora do dia (0–24) do relógio; `jogo-claude:hora-teste` no localStorage força uma hora (para testar). */
export function horaDoDia(): number {
  try {
    const teste = localStorage.getItem('jogo-claude:hora-teste');
    if (teste !== null && teste !== '') return Number(teste);
  } catch {
    /* sem localStorage */
  }
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

/** Cor do céu sobre a cidade (multiplica) e quanto é noite (0–1), conforme a hora. */
function ceu(hora: number): { cor: number; noite: number } {
  const mistura = (a: number, b: number, t: number) => {
    const [ar, ag, ab] = [(a >> 16) & 255, (a >> 8) & 255, a & 255];
    const [br, bg, bb] = [(b >> 16) & 255, (b >> 8) & 255, b & 255];
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
  };
  const DIA = 0xffffff;
  const TARDE = 0xffd2a8;
  const NOITE = 0x6676b8;
  const AURORA = 0xffd8d0;
  const entre = (h: number, a: number, b: number) => Math.min(1, Math.max(0, (h - a) / (b - a)));
  if (hora >= 7 && hora < 16.5) return { cor: DIA, noite: 0 };
  if (hora >= 16.5 && hora < 18.5) return { cor: mistura(DIA, TARDE, entre(hora, 16.5, 18.5)), noite: entre(hora, 17.8, 18.5) * 0.3 };
  if (hora >= 18.5 && hora < 20) return { cor: mistura(TARDE, NOITE, entre(hora, 18.5, 20)), noite: 0.3 + entre(hora, 18.5, 20) * 0.7 };
  if (hora >= 5 && hora < 6) return { cor: mistura(NOITE, AURORA, entre(hora, 5, 6)), noite: 1 - entre(hora, 5, 6) * 0.7 };
  if (hora >= 6 && hora < 7) return { cor: mistura(AURORA, DIA, entre(hora, 6, 7)), noite: 0.3 - entre(hora, 6, 7) * 0.3 };
  return { cor: NOITE, noite: 1 };
}

/** Textura redonda e suave (luz, nuvem, brilho) desenhada com gradiente. */
function texturaSuave(cena: Phaser.Scene, chave: string, raio: number, cor: string, pontos: [number, number, number][] = [[0, 0, 1]]) {
  if (cena.textures.exists(chave)) return;
  const c = document.createElement('canvas');
  [c.width, c.height] = [raio * 2, raio * 2];
  const ctx = c.getContext('2d')!;
  for (const [dx, dy, escala] of pontos) {
    const [x, y, rr] = [raio + dx * raio, raio + dy * raio, raio * escala];
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, cor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
  }
  cena.textures.addCanvas(chave, c);
}

/** Pixel quadradinho (folha, brilho, vaga-lume…) como textura. */
function texturaPixels(cena: Phaser.Scene, chave: string, linhas: string[], cores: Record<string, string>) {
  if (cena.textures.exists(chave)) return;
  const c = document.createElement('canvas');
  [c.width, c.height] = [linhas[0].length, linhas.length];
  const ctx = c.getContext('2d')!;
  linhas.forEach((l, y) =>
    [...l].forEach((ch, x) => {
      if (!cores[ch]) return;
      ctx.fillStyle = cores[ch];
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  cena.textures.addCanvas(chave, c);
}

export function montarVidaDaCidade(
  cena: Phaser.Scene,
  mapa: Mapa,
  jogador: () => { x: number; y: number; seguidor: { x: number; y: number } },
  /** modo desempenho: sem moradores, Pokémon, pássaros, nuvens, folhas nem vaga-lumes */
  leve = false,
): VidaDaCidade {
  const info = mapa.cidade!;
  const [W, H] = [mapa.largura * TAM, mapa.altura * TAM];
  const andantes: Andante[] = [];
  const ativa = () => cena.sys.isActive();
  const pes = (x: number, y: number): [number, number] => [x * TAM + TAM / 2, y * TAM + TAM - 2];
  const ocupa = (x: number, y: number) => andantes.some((a) => (a.x === x && a.y === y) || (a.alvo?.x === x && a.alvo?.y === y));
  /** dá para um andante pisar aqui? (dentro do raio da casa, livre, sem o jogador nem o seguidor) */
  const livre = (x: number, y: number, casa: { x: number; y: number; raio: number }) => {
    if (Math.abs(x - casa.x) > casa.raio || Math.abs(y - casa.y) > casa.raio) return false;
    if (x < 0 || y < 0 || x >= mapa.largura || y >= mapa.altura || mapa.bloqueado[y][x] || ocupa(x, y)) return false;
    // ninguém pisa nos canteiros nem na horta
    if (mapa.terreno[y][x] === 'jardim' || mapa.terreno[y][x] === 'horta') return false;
    const j = jogador();
    return !(j.x === x && j.y === y) && !(j.seguidor.x === x && j.seguidor.y === y);
  };
  const DIRS: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  /** Passeio: anda alguns passos numa direção, para um pouco, escolhe outra. */
  const passear = (
    a: Andante, casa: { x: number; y: number; raio: number }, duracao: number,
    corpo: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Depth & Phaser.GameObjects.GameObject,
    sombra: Phaser.GameObjects.Ellipse, aoAndar: (dx: number, dy: number) => void, aoParar: () => void,
  ) => {
    let dir = DIRS[Math.floor(Math.random() * 4)];
    let passosSeguidos = 0;
    const proximo = () => {
      if (!ativa() || !corpo.active) return;
      // às vezes muda de direção (ou depois de alguns passos)
      if (passosSeguidos > 2 + Math.random() * 3 || Math.random() < 0.25) {
        dir = DIRS[Math.floor(Math.random() * 4)];
        passosSeguidos = 0;
        if (Math.random() < 0.55) {
          aoParar();
          cena.time.delayedCall(900 + Math.random() * 2600, proximo);
          return;
        }
      }
      const [nx, ny] = [a.x + dir[0], a.y + dir[1]];
      if (!livre(nx, ny, casa)) {
        dir = DIRS[Math.floor(Math.random() * 4)];
        passosSeguidos = 99;
        aoParar();
        cena.time.delayedCall(500 + Math.random() * 900, proximo);
        return;
      }
      a.alvo = { x: nx, y: ny };
      passosSeguidos++;
      aoAndar(dir[0], dir[1]);
      const [px, py] = pes(nx, ny);
      cena.tweens.add({
        targets: corpo, x: px, y: py, duration: duracao,
        onUpdate: () => {
          corpo.setDepth(corpo.y);
          sombra.setPosition(corpo.x, corpo.y - 1).setDepth(corpo.y - 0.5);
        },
        onComplete: () => {
          [a.x, a.y] = [nx, ny];
          a.alvo = null;
          proximo();
        },
      });
    };
    cena.time.delayedCall(400 + Math.random() * 2500, proximo);
  };

  // ---------- moradores (personagens LPC com roupas sorteadas) ----------
  const sorte = aleatorioComSemente('moradores');
  const escolher = <T,>(lista: readonly T[]) => lista[Math.floor(sorte() * lista.length)];
  (leve ? [] : info.moradores).forEach((casa, i) => {
    const corpo: Aparencia['corpo'] = sorte() < 0.5 ? 'masc' : 'fem';
    const aparencia: Aparencia = {
      corpo, pele: escolher(PELES), cabelo: escolher(Object.keys(CABELOS)), corCabelo: escolher(CORES_CABELO.slice(0, 9)),
      camiseta: escolher(CORES_ROUPA), calca: escolher(['black', 'navy', 'brown', 'gray', 'tan', 'blue', 'forest']), tenis: escolher(['black', 'brown', 'white', 'red', 'gray']),
      bone: sorte() < 0.2 ? escolher(['vermelho', 'azul', 'verde', 'amarelo'] as const) : 'nenhum', estampa: 'nenhuma', cinto: false,
    };
    const a: Andante = { x: casa.x, y: casa.y, alvo: null };
    andantes.push(a);
    const [px, py] = pes(casa.x, casa.y);
    const sombra = cena.add.ellipse(px, py - 1, 16, 5, 0x000000, 0.28).setDepth(py - 0.5);
    montarPersonagem(aparencia).then((f) => {
      if (!ativa()) return;
      if (!cena.textures.exists(`morador-${i}`)) {
        const t = cena.textures.addCanvas(`morador-${i}`, f.walk)!;
        for (let linha = 0; linha < 4; linha++) for (let col = 0; col < 9; col++) t.add(`${linha}-${col}`, 0, col * 64, linha * 64, 64, 64);
        for (let linha = 0; linha < 4; linha++)
          cena.anims.create({ key: `morador-${i}-andar-${linha}`, frames: Array.from({ length: 8 }, (_, k) => ({ key: `morador-${i}`, frame: `${linha}-${k + 1}` })), frameRate: 14, repeat: -1 });
      }
      const s = cena.add.sprite(px, py, `morador-${i}`, '2-0').setOrigin(0.5, 61 / 64).setScale(ESCALA_LPC).setDepth(py);
      let linha = 2;
      passear(a, casa, PASSO_MORADOR, s, sombra,
        (dx, dy) => {
          linha = dy < 0 ? 0 : dy > 0 ? 2 : dx < 0 ? 1 : 3;
          s.play(`morador-${i}-andar-${linha}`, true);
        },
        () => {
          s.stop();
          s.setFrame(`${linha}-0`);
        });
    });
  });

  // ---------- Pokémon soltos (sprites de mapa do PMD) ----------
  for (const p of leve ? [] : info.pokemons) {
    if (!temSpritePmd(p.especie, false)) continue;
    const a: Andante = { x: p.x, y: p.y, alvo: null };
    andantes.push(a);
    const [px, py] = pes(p.x, p.y);
    const sombra = cena.add.ellipse(px, py - 1, 12, 4, 0x000000, 0.28).setDepth(py - 0.5);
    carregarPmd(cena, p.especie).then((pmd: InfoPmd | null) => {
      if (!pmd || !ativa()) return;
      sombra.setSize(Math.max(8, pmd.largura * ESCALA_PMD * 0.75), Math.max(3, pmd.largura * ESCALA_PMD * 0.24));
      let linha = 0;
      const s = cena.add.sprite(px, py, `${pmd.prefixo}-Idle`).setOrigin(0.5, pmd.origemIdle).setScale(ESCALA_PMD).setDepth(py);
      s.play(`${pmd.prefixo}-idle-${linha}`);
      if (p.raio === 0) return;
      passear(a, p, PASSO_POKEMON, s, sombra,
        (dx, dy) => {
          linha = dy > 0 ? 0 : dx > 0 ? 2 : dy < 0 ? 4 : 6;
          s.play(`${pmd.prefixo}-walk-${linha}`, true).setOrigin(0.5, pmd.origemWalk);
        },
        () => s.play(`${pmd.prefixo}-idle-${linha}`, true).setOrigin(0.5, pmd.origemIdle));
    });
  }

  // ---------- bandos de Pidgey cruzando o céu (com sombra no chão) ----------
  const camera = cena.cameras.main;
  if (!leve) carregarPmd(cena, 16).then((pmd) => {
    if (!pmd || !ativa()) return;
    const bando = () => {
      if (!ativa()) return;
      const vista = camera.worldView;
      const daEsquerda = Math.random() < 0.5;
      const y0 = vista.y + vista.height * (0.2 + Math.random() * 0.5);
      const [x0, x1] = daEsquerda ? [vista.x - 60, vista.right + 60] : [vista.right + 60, vista.x - 60];
      const subida = (Math.random() - 0.5) * vista.height * 0.5;
      const linha = daEsquerda ? 2 : 6;
      const quantos = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < quantos; k++) {
        const [ox, oy] = [-k * 18 * (daEsquerda ? 1 : -1), (k % 2 ? 1 : -1) * k * 9];
        const ave = cena.add.sprite(x0 + ox, y0 + oy, `${pmd.prefixo}-Walk`).setScale(ESCALA_PMD).setDepth(PROF_PASSAROS).play(`${pmd.prefixo}-walk-${linha}`);
        const sombra = cena.add.ellipse(x0 + ox + 10, y0 + oy + 46, 12, 4, 0x000000, 0.16).setDepth(PROF_NUVENS - 1);
        const duracao = Math.abs(x1 - x0) / 0.075;
        cena.tweens.add({ targets: ave, x: x1 + ox, y: y0 + oy + subida, duration: duracao, onComplete: () => ave.destroy() });
        cena.tweens.add({ targets: sombra, x: x1 + ox + 10, y: y0 + oy + subida + 46, duration: duracao, onComplete: () => sombra.destroy() });
      }
      cena.time.delayedCall(18000 + Math.random() * 22000, bando);
    };
    cena.time.delayedCall(4000, bando);
  });

  // ---------- sombras de nuvens passando devagar ----------
  texturaSuave(cena, 'nuvem-sombra', 120, 'rgba(10,20,40,0.55)', [[0, 0, 0.75], [-0.35, 0.1, 0.6], [0.38, -0.05, 0.62], [0.1, 0.3, 0.5], [-0.1, -0.3, 0.5]]);
  for (let k = 0; k < (leve ? 0 : 6); k++) {
    const nuvem = cena.add.image(Math.random() * W, Math.random() * H, 'nuvem-sombra').setDepth(PROF_NUVENS).setAlpha(0.2).setScale(1.4 + Math.random() * 1.2, 1 + Math.random() * 0.6);
    const andar = () => {
      if (!ativa()) return;
      const fim = W + 300;
      cena.tweens.add({
        targets: nuvem, x: fim, y: nuvem.y + 120, duration: ((fim - nuvem.x) / 9) * 1000,
        onComplete: () => {
          nuvem.setPosition(-300, Math.random() * H);
          andar();
        },
      });
    };
    andar();
  }

  // ---------- trem passando na estação (fumaça saindo da chaminé) ----------
  const linhaTrilho = mapa.terreno.findIndex((l) => l[0] === 'trilho');
  if (linhaTrilho >= 0) {
    for (const f of [0, 1]) if (!cena.textures.exists(`trem-${f}`)) cena.textures.addCanvas(`trem-${f}`, desenharTrem(f));
    if (!cena.anims.exists('anim-trem')) cena.anims.create({ key: 'anim-trem', frames: [{ key: 'trem-0' }, { key: 'trem-1' }], frameRate: 8, repeat: -1 });
    if (!cena.textures.exists('trem-sombra')) cena.textures.addCanvas('trem-sombra', sombraProjetada(cena.textures.get('trem-0').getSourceImage() as HTMLCanvasElement, TAM_TREM.w, TAM_TREM.h).canvas);
    texturaSuave(cena, 'fumaca', 8, 'rgba(235,235,240,0.9)');
    const base = (linhaTrilho + 2) * TAM - 2;
    const passar = () => {
      if (!ativa()) return;
      const praDireita = Math.random() < 0.5;
      const [x0, x1] = praDireita ? [-TAM_TREM.w - 20, W + 20] : [W + 20, -TAM_TREM.w - 20];
      const trem = cena.add.sprite(x0, base, 'trem-0').setOrigin(0, 1).setDepth(base).setFlipX(praDireita).play('anim-trem');
      const sombra = cena.add.image(x0, base - TAM_TREM.h, 'trem-sombra').setOrigin(0).setDepth(1).setAlpha(0.28);
      const duracao = (Math.abs(x1 - x0) / 150) * 1000;
      cena.tweens.add({ targets: [trem, sombra], x: x1, duration: duracao, onComplete: () => [trem, sombra].forEach((o) => o.destroy()) });
      const fumaca = cena.time.addEvent({
        delay: 140, loop: true,
        callback: () => {
          if (!trem.active) return fumaca.remove();
          const chamine = praDireita ? trem.x + TAM_TREM.w - 14 : trem.x + 14;
          const p = cena.add.image(chamine, base - TAM_TREM.h, 'fumaca').setDepth(PROF_PASSAROS - 1).setAlpha(0.8).setScale(0.6);
          cena.tweens.add({ targets: p, y: p.y - 26 - Math.random() * 10, x: p.x + (praDireita ? -18 : 18), scale: 1.8, alpha: 0, duration: 1300, onComplete: () => p.destroy() });
        },
      });
      cena.time.delayedCall(duracao + 30000 + Math.random() * 30000, passar);
    };
    cena.time.delayedCall(6000, passar);
  }

  // ---------- lagos: ondinhas que se abrem e brilhos piscando ----------
  texturaPixels(cena, 'brilho-agua', ['.w.', 'www', '.w.'], { w: '#ffffff' });
  for (const l of info.lagos) {
    const pontoNaAgua = (): [number, number] | null => {
      for (let t = 0; t < 20; t++) {
        const [x, y] = [l.x + (Math.random() * 2 - 1) * l.rx, l.y + (Math.random() * 2 - 1) * l.ry];
        if (dentroDoLago(l, x, y) < 0.7) return [x, y];
      }
      return null;
    };
    cena.time.addEvent({
      delay: 900 + Math.random() * 600, loop: true,
      callback: () => {
        const p = pontoNaAgua();
        if (!p) return;
        const onda = cena.add.ellipse(p[0], p[1], 4, 2).setStrokeStyle(1, 0xd8f2ff, 0.9).setDepth(2);
        cena.tweens.add({ targets: onda, scaleX: 5, scaleY: 5, alpha: 0, duration: 1600, onComplete: () => onda.destroy() });
      },
    });
    cena.time.addEvent({
      delay: 350, loop: true,
      callback: () => {
        const p = pontoNaAgua();
        if (!p) return;
        const b = cena.add.image(Math.round(p[0]), Math.round(p[1]), 'brilho-agua').setDepth(2).setAlpha(0);
        cena.tweens.add({ targets: b, alpha: 0.9, duration: 300, yoyo: true, onComplete: () => b.destroy() });
      },
    });
  }

  // ---------- folhas caindo das árvores perto da câmera ----------
  texturaPixels(cena, 'folha-0', ['.gg', 'gGg', 'gg.'], { g: '#4c9a4a', G: '#7cc46a' });
  texturaPixels(cena, 'folha-1', ['oo.', 'oOo', '.oo'], { o: '#d89a3a', O: '#f2c86a' });
  cena.time.addEvent({
    delay: 700, loop: true,
    callback: () => {
      if (leve) return;
      const vista = camera.worldView;
      const perto = mapa.grandes.filter((g) => !g.rocha && g.x * TAM > vista.x - 32 && g.x * TAM < vista.right && g.y * TAM > vista.y && g.y * TAM < vista.bottom + 32);
      if (!perto.length) return;
      const g = perto[Math.floor(Math.random() * perto.length)];
      const outono = g.arvore?.[1] === 4 && g.arvore[0] >= 48;
      const [x, y] = [g.x * TAM + 6 + Math.random() * 20, (g.y - 1) * TAM + 8 + Math.random() * 12];
      const folha = cena.add.image(x, y, outono ? 'folha-1' : 'folha-0').setDepth(g.y * TAM + 40).setAngle(Math.random() * 90);
      cena.tweens.add({ targets: folha, y: y + 26 + Math.random() * 10, angle: folha.angle + 160, duration: 2200, ease: 'Sine.easeIn' });
      cena.tweens.add({ targets: folha, x: x + 7, duration: 550, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
      cena.tweens.add({ targets: folha, alpha: 0, delay: 1700, duration: 500, onComplete: () => folha.destroy() });
    },
  });

  // ---------- céu: tarde e noite (postes acesos, vaga-lumes) ----------
  texturaSuave(cena, 'luz-poste', 48, 'rgba(255,214,140,0.85)');
  texturaSuave(cena, 'luz-chao', 48, 'rgba(255,200,120,0.5)');
  texturaPixels(cena, 'vagalume', ['.y.', 'yYy', '.y.'], { y: '#c8f060', Y: '#ffffa0' });
  /** o que tem luz própria (postes, janelas, vaga-lumes) não escurece à noite */
  const brilhantes = new WeakSet<Phaser.GameObjects.GameObject>();
  const luzes = info.luzes.flatMap((l) => {
    // brilho na lanterna e uma poça de luz no chão em volta do pé do poste
    const luz = cena.add.image(l.x, l.y, 'luz-poste').setDepth(PROF_LUZ).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(1.3);
    const chao = cena.add.image(l.x + 2, l.y + 36, 'luz-chao').setDepth(PROF_LUZ).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(2.2, 1.2);
    cena.tweens.add({ targets: luz, scale: { from: 1.24, to: 1.38 }, duration: 1400 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    brilhantes.add(luz).add(chao);
    return [luz, chao];
  });
  // janelas acesas: os vidros (pixels azulados claros) dos prédios viram luz amarela à noite
  const janelas: Phaser.GameObjects.Image[] = [];
  for (const o of mapa.objetos ?? []) {
    const p = PECAS[o.peca];
    if (!p || (p.folha !== 'predios' && o.peca !== 'pokemarket')) continue;
    const chave = `janelas-${o.peca}`;
    if (!cena.textures.exists(chave)) {
      const fonte = p.folha ? cena.textures.getFrame(p.folha, o.peca) : cena.textures.getFrame(`peca-${o.peca}-0`);
      if (!fonte) continue;
      const c = document.createElement('canvas');
      [c.width, c.height] = [p.w, p.h];
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(fonte.source.image as CanvasImageSource, fonte.cutX, fonte.cutY, p.w, p.h, 0, 0, p.w, p.h);
      const dados = ctx.getImageData(0, 0, p.w, p.h);
      const d = dados.data;
      for (let i = 0; i < d.length; i += 4) {
        const vidro = d[i + 3] > 200 && d[i + 2] > 150 && d[i + 2] > d[i] + 35 && d[i + 1] > d[i] + 10;
        // vidro claro → amarelo claro, vidro escuro → laranja (fica com o desenho da janela)
        if (vidro) [d[i], d[i + 1], d[i + 2], d[i + 3]] = d[i + 2] > 210 ? [255, 236, 160, 255] : d[i + 2] > 185 ? [255, 206, 112, 255] : [232, 156, 72, 255];
        else d[i + 3] = 0;
      }
      ctx.putImageData(dados, 0, 0);
      cena.textures.addCanvas(chave, c);
    }
    // logo acima do prédio (o jogador passando na frente continua por cima)
    const j = cena.add.image(Math.round(o.x * TAM), o.base * TAM, chave).setOrigin(0, 1).setDepth(o.base * TAM - 0.49).setAlpha(0);
    brilhantes.add(j);
    janelas.push(j);
  }
  // a noite tinge cada objeto (como uma camada escura por cima, mas deixando as luzes de fora)
  let noite = 0;
  let corCeu = 0xffffff;
  type Tingivel = Phaser.GameObjects.GameObject & { setTint?: (c: number) => unknown; clearTint?: () => unknown; tintTopLeft?: number };
  const tingir = (lista: Phaser.GameObjects.GameObject[]) => {
    for (const o of lista) {
      if (brilhantes.has(o) || o instanceof Phaser.GameObjects.Text) continue;
      if (o instanceof Phaser.GameObjects.Container) {
        tingir(o.list);
        continue;
      }
      const t = o as Tingivel;
      if (!t.setTint || t.tintTopLeft === corCeu) continue;
      if (corCeu === 0xffffff) t.clearTint?.();
      else t.setTint(corCeu);
    }
  };
  const atualizarCeu = () => {
    const c = ceu(horaDoDia());
    noite = c.noite;
    corCeu = c.cor;
    for (const l of luzes) l.setAlpha(c.noite * 0.9);
    for (const j of janelas) j.setAlpha(c.noite * 0.85);
    tingir(cena.children.list);
  };
  atualizarCeu();
  cena.time.addEvent({ delay: 60000, loop: true, callback: atualizarCeu });
  // quem aparece depois (moradores, folhas, pássaros, trem…) também é tingido
  cena.time.addEvent({ delay: 250, loop: true, callback: () => corCeu !== 0xffffff && tingir(cena.children.list) });
  cena.time.addEvent({
    delay: 260, loop: true,
    callback: () => {
      if (noite < 0.5 || leve) return;
      const vista = camera.worldView;
      const [x, y] = [vista.x + Math.random() * vista.width, vista.y + Math.random() * vista.height];
      const tx = Math.floor(x / TAM);
      const ty = Math.floor(y / TAM);
      if (mapa.terreno[ty]?.[tx] !== 'chao' && mapa.terreno[ty]?.[tx] !== 'jardim' && mapa.terreno[ty]?.[tx] !== 'lago') return;
      const v = cena.add.image(x, y, 'vagalume').setDepth(PROF_LUZ).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      brilhantes.add(v);
      cena.tweens.add({ targets: v, alpha: 1, duration: 600, yoyo: true, hold: 500, onComplete: () => v.destroy() });
      cena.tweens.add({ targets: v, x: x + (Math.random() - 0.5) * 30, y: y - 10 - Math.random() * 14, duration: 1700 });
    },
  });

  return { ocupa };
}
