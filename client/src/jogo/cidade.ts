// Cidade inicial organizada em quadras: avenidas com calçada, praça simétrica no centro (fonte grande, canteiros,
// bancos e postes espelhados) e cada prédio no seu lote, com a porta virada para a rua ou para a praça.
// Prédios e decoração vêm dos tilesets do Tuxemon (créditos em CREDITOS.md); fonte, arena, postes e o Pokémarket
// azul são desenhados por código (jogo/cidadeDesenhos.ts). Por enquanto tudo é só visual (pedido do dono).
import { TAM, aleatorioComSemente, type Mapa, type NpcMapa, type ObjetoMapa, type Terreno } from './mapa';
import { APARENCIA_PADRAO } from '../personagem/lpc';
import { ESTATUA_FONTE, QUADROS_ARENA, QUADROS_FONTE, RECORTE_MART, TAM_ARENA, TAM_FONTE, TAM_POSTE, desenharArena, desenharFonte, desenharMart, desenharPoste, estatuaDePedra } from './cidadeDesenhos';

/** Folhas de imagem dos objetos da cidade (chave da textura no Phaser → arquivo). */
export const FOLHAS_CIDADE = {
  predios: 'tiles/core_buildings.png',
  cidade: 'tiles/core_city_and_country.png',
  outdoor: 'tiles/core_outdoor.png',
} as const;
export type FolhaCidade = keyof typeof FOLHAS_CIDADE;
/** Sprite (5ª geração) do Pokémon da estátua da fonte, carregado da PokéAPI como os outros sprites. */
export const URL_ESTATUA = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/${ESTATUA_FONTE}.png`;
/** Imagens que os desenhos por código recebem: as folhas e a estátua (que pode faltar, sem internet). */
export type ImagensCidade = Record<FolhaCidade, HTMLImageElement> & { estatua?: HTMLImageElement };

/** Um objeto em pé no mapa: recorte de uma folha (x, y em pixels) ou desenho por código (`desenhar`). */
export interface Peca {
  folha?: FolhaCidade;
  x?: number;
  y?: number;
  w: number;
  h: number;
  /** desenho por código: um canvas por quadro de animação (recebe as folhas já carregadas) */
  desenhar?: (imgs: ImagensCidade) => HTMLCanvasElement[];
  /** porta (pixels a partir da esquerda da imagem e largura): sai dela um caminho de terra até a calçada.
   * `largo` = caminho de 3 tiles (Centro Pokémon e Pokémarket, de frente para a praça); senão, com a largura da porta. */
  porta?: { x: number; w: number; largo?: boolean };
  /** linhas de baixo (em tiles) que bloqueiam a passagem; o resto dá para passar por trás. Padrão: todas menos a de cima. */
  solidas?: number;
  /** nome mostrado em cima do objeto */
  rotulo?: string;
}

export const PECAS: Record<string, Peca> = {
  centroPokemon: { folha: 'predios', x: 0, y: 416, w: 112, h: 128, porta: { x: 64, w: 16, largo: true }, rotulo: 'Centro Pokémon' },
  pokemarket: { w: RECORTE_MART.w, h: RECORTE_MART.h, desenhar: (f) => [desenharMart(f.predios)], porta: { x: 64, w: 16, largo: true }, rotulo: 'Pokémarket' },
  banco: { folha: 'predios', x: 112, y: 0, w: 112, h: 80, porta: { x: 47, w: 18 }, rotulo: 'Banco' },
  estacao: { folha: 'predios', x: 0, y: 0, w: 112, h: 80, porta: { x: 47, w: 18 }, rotulo: 'Estação de trem' },
  arena: { ...TAM_ARENA, desenhar: () => Array.from({ length: QUADROS_ARENA }, (_, i) => desenharArena(i)), solidas: 10, porta: { x: 112, w: 32 }, rotulo: 'Arena' },
  fonte: {
    ...TAM_FONTE,
    desenhar: (f) => {
      const estatua = f.estatua ? estatuaDePedra(f.estatua, f.estatua.width, f.estatua.height) : null;
      return Array.from({ length: QUADROS_FONTE }, (_, i) => desenharFonte(i, estatua));
    },
    solidas: 6,
  },
  cafe: { folha: 'predios', x: 112, y: 419, w: 80, h: 82, porta: { x: 46, w: 19 } },
  casaVermelha: { folha: 'predios', x: 0, y: 149, w: 80, h: 59, porta: { x: 47, w: 18 } },
  casaVinho: { folha: 'predios', x: 80, y: 149, w: 80, h: 59, porta: { x: 47, w: 18 } },
  casaMadeira: { folha: 'predios', x: 160, y: 149, w: 80, h: 59, porta: { x: 47, w: 18 } },
  casaMadeira2: { folha: 'predios', x: 240, y: 149, w: 80, h: 59, porta: { x: 47, w: 18 } },
  sobradoClaro: { folha: 'predios', x: 112, y: 304, w: 80, h: 96, porta: { x: 47, w: 18 } },
  sobradoVermelho: { folha: 'predios', x: 192, y: 304, w: 80, h: 96, porta: { x: 47, w: 18 } },
  sobradoCinza: { folha: 'predios', x: 272, y: 304, w: 80, h: 96, porta: { x: 47, w: 18 } },
  mural: { folha: 'cidade', x: 459, y: 519, w: 42, h: 33, solidas: 1 },
  barraca: { folha: 'cidade', x: 280, y: 359, w: 80, h: 86, solidas: 3 },
  bancoFrente: { folha: 'cidade', x: 451, y: 63, w: 42, h: 30, solidas: 1 },
  bancoCostas: { folha: 'cidade', x: 451, y: 105, w: 43, h: 20, solidas: 1 },
  maquinaVermelha: { folha: 'outdoor', x: 288, y: 784, w: 16, h: 32, solidas: 1 },
  maquinaAzul: { folha: 'outdoor', x: 272, y: 816, w: 16, h: 32, solidas: 1 },
  maquinaVerde: { folha: 'outdoor', x: 288, y: 816, w: 16, h: 32, solidas: 1 },
  poste: { ...TAM_POSTE, desenhar: () => [desenharPoste()], solidas: 1 },
};

/** Tamanho da cidade em tiles (ímpar: o eixo do meio passa pelo centro da coluna 70 e da linha 54). */
export const LARGURA_CIDADE = 141;
export const ALTURA_CIDADE = 109;

/** Aparência do NPC dos golpes (Move Reminder / Move Tutor). */
const APARENCIA_PROFESSOR = { ...APARENCIA_PADRAO, pele: 'bronze', cabelo: 'messy1', corCabelo: 'white', camiseta: 'purple', calca: 'black', tenis: 'brown', estampa: 'nenhuma' as const, cinto: false };

/**
 * Monta a cidade. Ruas com 5 tiles de largura, centradas na coluna/linha do meio: tudo é simétrico em volta do
 * eixo (cx + 0,5). As peças são posicionadas pelo centro, então ficam centralizadas mesmo com largura par.
 */
export function gerarMapaCidade(): Mapa {
  const [largura, altura] = [LARGURA_CIDADE, ALTURA_CIDADE];
  const r = aleatorioComSemente('cidade');
  const terreno: Terreno[][] = Array.from({ length: altura }, () => Array<Terreno>(largura).fill('chao'));
  const bloqueado: boolean[][] = Array.from({ length: altura }, () => Array<boolean>(largura).fill(false));
  /** tiles ocupados por objetos (não nasce flor nem árvore em cima) */
  const ocupado: boolean[][] = Array.from({ length: altura }, () => Array<boolean>(largura).fill(false));
  const dentro = (x: number, y: number) => x >= 0 && y >= 0 && x < largura && y < altura;
  const pintar = (tipo: Terreno, x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (dentro(x, y)) terreno[y][x] = tipo;
  };
  const moldura = (tipo: Terreno, x0: number, y0: number, w: number, h: number) => {
    pintar(tipo, x0, y0, w, 1);
    pintar(tipo, x0, y0 + h - 1, w, 1);
    pintar(tipo, x0, y0, 1, h);
    pintar(tipo, x0 + w - 1, y0, 1, h);
  };
  /** coluna e linha do meio (o eixo de simetria passa pelo centro delas) */
  const [cx, cy] = [70, 54];
  const eixo = cx + 0.5;
  /** espelha um centro (em tiles, contínuo) para o outro lado do eixo */
  const espelho = (centro: number) => 2 * eixo - centro;
  /** coluna espelhada de um retângulo que começa em x0 e tem largura w */
  const espelhoX = (x0: number, w: number) => 2 * cx - x0 - w + 1;
  const anel = { x0: 23, y0: 19, x1: 117, y1: 89 };
  const RUA = 5;

  // ---------- ruas (5 tiles) ----------
  pintar('caminho', 0, cy - 2, largura, RUA);
  pintar('caminho', cx - 2, anel.y0, RUA, altura - anel.y0);
  pintar('caminho', anel.x0, anel.y0, anel.x1 - anel.x0 + 1, RUA);
  pintar('caminho', anel.x0, anel.y1 - RUA + 1, anel.x1 - anel.x0 + 1, RUA);
  pintar('caminho', anel.x0, anel.y0, RUA, anel.y1 - anel.y0 + 1);
  pintar('caminho', anel.x1 - RUA + 1, anel.y0, RUA, anel.y1 - anel.y0 + 1);
  // calçada de pedra (1 tile) dos dois lados das ruas do anel e de dentro dele
  const calcadas: [number, number][] = [];
  for (let y = anel.y0 - 1; y <= anel.y1 + 1; y++)
    for (let x = anel.x0 - 1; x <= anel.x1 + 1; x++)
      if (terreno[y][x] === 'chao' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => terreno[y + dy]?.[x + dx] === 'caminho')) calcadas.push([x, y]);
  for (const [x, y] of calcadas) terreno[y][x] = 'pedra';

  // ---------- praça (41 × 33, centrada) ----------
  const praca = { x0: cx - 20, y0: cy - 16, w: 41, h: 33 };
  pintar('pedra', praca.x0, praca.y0, praca.w, praca.h);
  moldura('pedraEscura', praca.x0, praca.y0, praca.w, praca.h);
  // moldura da fonte (a fonte fica um pouco para trás do centro)
  // a fonte fica recuada (mais para cima) dentro da moldura de pedra
  const fonteBase = cy + 3;
  moldura('pedraEscura', cx - 8, cy - 7, 17, 15);
  // canteiros 8 × 5 nos cantos (árvore no meio) e 8 × 3 dos lados, espelhados
  const canteiros: [number, number][] = [];
  for (const y of [cy - 13, cy + 9]) for (const x of [cx - 17, espelhoX(cx - 17, 8)]) canteiros.push([x, y]);
  for (const [gx, gy] of canteiros) pintar('jardim', gx, gy, 8, 5);
  for (const x of [cx - 17, espelhoX(cx - 17, 8)]) pintar('jardim', x, cy - 1, 8, 3);

  // ---------- estação e trilhos (norte) ----------
  pintar('trilho', 0, 7, largura, 2);
  pintar('pedra', cx - 14, 9, 29, 2);
  for (const x of [cx - 9, espelhoX(cx - 9, 2)]) pintar('pedra', x, 11, 2, 7);
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) if (terreno[y][x] === 'trilho') bloqueado[y][x] = true;

  // ---------- lotes ----------
  const oeste = 39.5;
  // pátio do Professor de Golpes ligado à calçada; ruelas das casas do sul
  pintar('pedra', anel.x0 + RUA + 1, 38, 16, 2);
  pintar('pedra', anel.x0 + RUA + 1, 70, 20, 1);
  pintar('pedra', espelhoX(anel.x0 + RUA + 1, 20), 70, 20, 1);

  // ---------- objetos ----------
  const objetos: ObjetoMapa[] = [];
  /** trilhas de terra do tamanho da porta (em pixels, desenhadas por cima da grama) */
  const trilhas: NonNullable<Mapa['trilhas']> = [];
  /** caminho de terra saindo da porta (x em pixels) até encontrar calçada, rua ou praça */
  const caminhoDaPorta = (px: number, w: number, linha: number, largo: boolean) => {
    const col = Math.floor((px + w / 2) / TAM);
    let y = linha;
    while (y < linha + 8 && dentro(col, y) && terreno[y][col] === 'chao') y++;
    if (y === linha) return;
    if (largo) return pintar('caminho', col - 1, linha, 3, y - linha);
    // atravessa a calçada e emenda na rua de terra (+1 px cobre a borda da rua)
    let fim = y;
    while (fim < y + 2 && dentro(col, fim) && terreno[fim][col] === 'pedra') fim++;
    const emenda = dentro(col, fim) && terreno[fim][col] === 'caminho' ? fim * TAM + 1 : y * TAM;
    trilhas.push({ x: px, y: linha * TAM, w, h: emenda - linha * TAM });
    // sem flor nem árvore em cima da trilha
    for (let yy = linha; yy < y; yy++) for (let xx = Math.floor(px / TAM); xx <= Math.floor((px + w - 1) / TAM); xx++) ocupado[yy][xx] = true;
  };
  /** Coloca a peça centrada em `centro` (tiles, contínuo) com a base na linha `base` (a linha logo abaixo dela). */
  const colocar = (peca: string, centro: number, base: number, rotulo?: string) => {
    const p = PECAS[peca];
    const x = centro - p.w / TAM / 2;
    const hT = Math.ceil(p.h / TAM);
    const solidas = Math.min(hT, p.solidas ?? hT - 1);
    const [c0, c1] = [Math.round(x), Math.round(x + p.w / TAM) - 1];
    for (let yy = base - hT; yy < base; yy++)
      for (let xx = c0; xx <= c1; xx++) {
        if (!dentro(xx, yy)) continue;
        ocupado[yy][xx] = true;
        if (yy >= base - solidas) bloqueado[yy][xx] = true;
      }
    objetos.push({ peca, x, base, rotulo });
    if (p.porta) caminhoDaPorta(Math.round(x * TAM) + p.porta.x, p.porta.w, base, !!p.porta.largo);
  };

  // estação no norte, recuada da avenida
  colocar('estacao', eixo, anel.y0 - 3);
  // praça
  colocar('fonte', eixo, fonteBase);
  for (const x of [eixo - 6, espelho(eixo - 6)]) {
    colocar('bancoFrente', x, cy - 7);
    colocar('bancoCostas', x, cy + 11);
  }
  colocar('mural', cx - 13, cy - 2, 'Mural de anúncios');
  colocar('mural', espelho(cx - 13), cy - 2, 'Quadro de torneios');
  for (const x of [eixo - 4, espelho(eixo - 4)]) {
    colocar('poste', x, praca.y0 + 1);
    colocar('poste', x, praca.y0 + praca.h);
  }
  for (const x of [praca.x0 + 1.5, espelho(praca.x0 + 1.5)]) {
    colocar('poste', x, cy - 3);
    colocar('poste', x, cy + 5);
  }
  // norte da praça: Centro Pokémon e Pokémarket espelhados, recuados, com caminho até a praça
  const centroPC = eixo - 11;
  colocar('centroPokemon', centroPC, praca.y0 - 2);
  colocar('pokemarket', espelho(centroPC), praca.y0 - 2);
  ['maquinaVermelha', 'maquinaAzul', 'maquinaVerde'].forEach((m, i) => colocar(m, espelho(centroPC) + 4 + i, praca.y0 - 2));
  // quadra oeste: barraca do Professor de Golpes (pátio) e Banco; quadra leste: Arena
  colocar('barraca', oeste, 38);
  colocar('banco', oeste, cy - 5);
  colocar('arena', espelho(oeste), cy - 5);
  // sul da praça: sobrados recuados da avenida do anel
  const baseSul = anel.y1 - RUA - 2;
  colocar('sobradoClaro', eixo - 15, baseSul);
  colocar('sobradoVermelho', eixo - 9, baseSul);
  colocar('sobradoCinza', espelho(eixo - 9), baseSul);
  colocar('sobradoClaro', espelho(eixo - 15), baseSul);
  // quadras do sul: casas em fileira e café/casas na ruela
  const casasSul: [string, string, number][] = [['casaMadeira', 'casaMadeira', anel.x0 + 9.5], ['casaVermelha', 'casaVermelha', anel.x0 + 15.5], ['casaVinho', 'casaMadeira2', anel.x0 + 21.5]];
  for (const [a, b, x] of casasSul) {
    colocar(a, x, baseSul);
    colocar(b, espelho(x), baseSul);
  }
  colocar('cafe', anel.x0 + 12.5, 68);
  colocar('casaMadeira2', anel.x0 + 19.5, 68);
  colocar('casaVinho', espelho(anel.x0 + 12.5), 68);
  colocar('casaVermelha', espelho(anel.x0 + 19.5), 68);
  // norte: casas dos dois lados da estação
  colocar('casaVermelha', eixo - 28, anel.y0 - 3);
  colocar('casaMadeira', eixo - 20, anel.y0 - 3);
  colocar('casaMadeira2', espelho(eixo - 20), anel.y0 - 3);
  colocar('casaVinho', espelho(eixo - 28), anel.y0 - 3);

  const npcs: NpcMapa[] = [{ x: Math.floor(oeste), y: 38, nome: 'Professor de Golpes', aparencia: APARENCIA_PROFESSOR }];
  for (const n of npcs) {
    bloqueado[n.y][n.x] = true;
    ocupado[n.y][n.x] = true;
  }

  // ---------- árvores (fileiras e pares espelhados) ----------
  const grandes: Mapa['grandes'] = [];
  /** cabe árvore 2×2 (a copa passa 1 tile para cima) com `folga` tiles de grama livre em volta */
  const cabe = (gx: number, gy: number, folga: number, terrenos: Terreno[] = ['chao']) => {
    for (let y = gy - 1 - folga; y <= gy + 1 + folga; y++)
      for (let x = gx - folga; x <= gx + 1 + folga; x++) {
        if (!dentro(x, y) || ocupado[y][x]) return false;
        const tronco = y >= gy && x >= gx && x <= gx + 1;
        if (tronco ? !terrenos.includes(terreno[y][x]) : folga > 0 && terreno[y][x] !== 'chao') return false;
      }
    return true;
  };
  const plantar = (gx: number, gy: number) => {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      bloqueado[gy + dy][gx + dx] = true;
      ocupado[gy + dy][gx + dx] = true;
    }
    grandes.push({ x: gx, y: gy });
  };
  /** planta a árvore e a espelhada, só se as duas couberem */
  const plantarPar = (gx: number, gy: number, folga: number, terrenos?: Terreno[]) => {
    const gx2 = 2 * cx - gx - 1;
    if (!cabe(gx, gy, folga, terrenos) || !cabe(gx2, gy, folga, terrenos)) return false;
    plantar(gx, gy);
    if (gx2 !== gx) plantar(gx2, gy);
    return true;
  };
  // uma árvore no meio de cada canteiro de canto
  for (const [gx, gy] of canteiros.filter(([x]) => x < cx)) plantarPar(gx + 3, gy + 2, 0, ['jardim']);
  // par ao lado do Centro Pokémon / Pokémarket
  plantarPar(cx - 19, praca.y0 - 6, 0);
  // poucas árvores espalhadas pelos lotes, bem distribuídas (grade com um pouco de variação)
  for (let gy = anel.y0 + RUA + 2; gy < anel.y1 - RUA - 2; gy += 7)
    for (let gx = anel.x0 + RUA + 2; gx < cx - 3; gx += 7) plantarPar(gx + Math.floor(r() * 3) - 1, gy + Math.floor(r() * 3) - 1, 1);
  // fileiras ao longo das avenidas fora do anel (a cada 4 tiles, dos dois lados)
  for (let x = 2; x < anel.x0 - 3; x += 4) for (const y of [cy - 5, cy + 4]) plantarPar(x, y, 0);
  for (let y = anel.y1 + 3; y < altura - 6; y += 4) plantarPar(cx - 5, y, 0);
  // floresta em volta: borda cheia e, fora do anel, um pomar em grade
  for (let gy = 0; gy < altura - 1; gy += 2)
    for (let gx = 0; gx < cx; gx += 2) {
      const foraDoAnel = gx < anel.x0 - 4 || gy < 5 || gy > anel.y1 + 3;
      const borda = gx < 6 || gy < 5 || gy >= altura - 7;
      if (borda || (foraDoAnel && (gx + gy) % 4 === 0)) plantarPar(gx, gy, 0);
    }

  // ---------- flores ----------
  const flores: Mapa['flores'] = [];
  for (let y = 0; y < altura; y++)
    for (let x = 0; x < largura; x++)
      if (terreno[y][x] === 'chao' && !ocupado[y][x] && r() < 0.05) flores.push({ x, y, dx: 2 + Math.floor(r() * 9), dy: 2 + Math.floor(r() * 9) });

  return { largura, altura, terreno, bloqueado, grandes, pedrinhas: [], flores, inicio: { x: cx, y: cy + 11 }, objetos, npcs, trilhas, sombras: true };
}
