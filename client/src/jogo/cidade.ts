// Cidade inicial organizada em quadras: avenidas com calçada, praça simétrica no centro (fonte grande com pedras
// em anéis, canteiros, bancos, postes e bandeirolas), cada prédio no seu lote com a porta virada para a rua ou para
// a praça, casas com quintal cercado e caixa de correio, parques com lago, hortas, feiras nas entradas da cidade e,
// fora do anel, floresta orgânica, um lago grande e um campo de flores.
// Prédios e parte da decoração vêm dos tilesets do Tuxemon (créditos em CREDITOS.md); o resto é desenhado por código
// (jogo/cidadeDesenhos.ts e jogo/cidadePecas.ts). Por enquanto tudo é só visual (pedido do dono).
import { TAM, aleatorioComSemente, type InfoCidade, type Mapa, type NpcMapa, type ObjetoMapa, type Terreno } from './mapa';
import { APARENCIA_PADRAO } from '../personagem/lpc';
import { ESTATUA_FONTE, QUADROS_ARENA, QUADROS_FONTE, RECORTE_MART, TAM_ARENA, TAM_FONTE, TAM_POSTE, desenharArena, desenharFonte, desenharMart, desenharPoste, estatuaDePedra } from './cidadeDesenhos';
import { TAM_BARRACA, TAM_CORREIO, desenharBandeirolas, desenharBarraca, desenharCaixaCorreio, desenharCercaBranca, desenharCercaMadeira, desenharCercaViva } from './cidadePecas';
import { dentroDoLago, hash2, ruido, ruidoFractal, type FormaLago } from './ruido';

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
  /** fica no alto (bandeirolas): sempre por cima do jogador */
  alto?: boolean;
  /** sem sombra projetada */
  semSombra?: boolean;
}

/** Arbustos floridos 16 × 16 do core_outdoor (cores variadas). */
const ARBUSTOS: [number, number][] = [
  [448, 384], [464, 384], [480, 384], [448, 400], [464, 400], [480, 400], [464, 416], [432, 448], [448, 448], [464, 448],
];

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
  caixaCorreio: { ...TAM_CORREIO, desenhar: () => [desenharCaixaCorreio()], solidas: 1 },
  ...Object.fromEntries(ARBUSTOS.map(([x, y], i) => [`arbusto${i}`, { folha: 'outdoor', x, y, w: 16, h: 16, solidas: 1 } satisfies Peca])),
  ...Object.fromEntries(
    ['vermelho', 'verde', 'amarelo', 'azul'].map((cor, i) => [
      `barraca_${cor}`,
      { ...TAM_BARRACA, desenhar: (f: ImagensCidade) => [desenharBarraca(f.cidade, cor, i)], solidas: 2 } satisfies Peca,
    ]),
  ),
};

/** Peças de tamanho variável, criadas na hora pelo nome: cercas, cercas-vivas e bandeirolas. */
function garantirPeca(nome: string): void {
  if (PECAS[nome]) return;
  let m: RegExpMatchArray | null;
  if ((m = nome.match(/^cerca(Branca|Madeira)(V?)(\d+)$/))) {
    const [, tipo, v, num] = m;
    const n = Number(num);
    const desenho = tipo === 'Branca' ? desenharCercaBranca : desenharCercaMadeira;
    PECAS[nome] = v
      ? { w: 16, h: n * 16 + 6, desenhar: () => [desenho(n, true)], solidas: n }
      : { w: n * 16, h: tipo === 'Branca' ? 18 : 16, desenhar: () => [desenho(n)], solidas: 1 };
  } else if ((m = nome.match(/^cercaViva(\d+)x(\d+)$/))) {
    const [w, h] = [Number(m[1]), Number(m[2])];
    PECAS[nome] = { w: w * 16, h: h * 16 + 8, desenhar: () => [desenharCercaViva(w * 16, h * 16, w * 7 + h)], solidas: h };
  } else if ((m = nome.match(/^bandeirolas(\d+)$/))) {
    const w = Number(m[1]);
    const exemplo = desenharBandeirolas(w, 0);
    PECAS[nome] = { w, h: exemplo.height, desenhar: () => [0, 1].map((f) => desenharBandeirolas(w, f)), solidas: 0, alto: true, semSombra: true };
  } else throw new Error(`peça desconhecida: ${nome}`);
}

/** Tamanho da cidade em tiles (ímpar: o eixo do meio passa pelo centro da coluna 70 e da linha 54). */
export const LARGURA_CIDADE = 141;
export const ALTURA_CIDADE = 109;

/** Aparência do NPC dos golpes (Move Reminder / Move Tutor). */
const APARENCIA_PROFESSOR = { ...APARENCIA_PADRAO, pele: 'bronze', cabelo: 'messy1', corCabelo: 'white', camiseta: 'purple', calca: 'black', tenis: 'brown', estampa: 'nenhuma' as const, cinto: false };

/** Árvores do core_outdoor_nature (tile do canto de cima, 2 × 3): redondas, pinheiros, outono. */
const ARVORE_REDONDA: [number, number][] = [[48, 0], [50, 0]];
const PINHEIRO: [number, number][] = [[44, 0], [46, 0]];
const PINHEIRO_ESCURO: [number, number][] = [[44, 4], [46, 4]];
const OUTONO: [number, number][] = [[48, 4], [50, 4]];

/**
 * Monta a cidade. Ruas com 5 tiles de largura, centradas na coluna/linha do meio: tudo dentro do anel é simétrico
 * em volta do eixo (cx + 0,5). As peças são posicionadas pelo centro, então ficam centralizadas mesmo com largura par.
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
  const marcar = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (dentro(x, y)) ocupado[y][x] = true;
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
  const info: InfoCidade = { lagos: [], caminhos: [], enfeites: [], moradores: [], pokemons: [], luzes: [] };

  // ---------- ruas (5 tiles) ----------
  pintar('caminho', 0, cy - 2, largura, RUA);
  pintar('caminho', cx - 2, anel.y0, RUA, altura - anel.y0);
  pintar('caminho', anel.x0, anel.y0, anel.x1 - anel.x0 + 1, RUA);
  pintar('caminho', anel.x0, anel.y1 - RUA + 1, anel.x1 - anel.x0 + 1, RUA);
  pintar('caminho', anel.x0, anel.y0, RUA, anel.y1 - anel.y0 + 1);
  pintar('caminho', anel.x1 - RUA + 1, anel.y0, RUA, anel.y1 - anel.y0 + 1);
  // calçada de lajotas (1 tile) dos dois lados das ruas do anel e de dentro dele
  const calcadas: [number, number][] = [];
  for (let y = anel.y0 - 1; y <= anel.y1 + 1; y++)
    for (let x = anel.x0 - 1; x <= anel.x1 + 1; x++)
      if (terreno[y][x] === 'chao' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => terreno[y + dy]?.[x + dx] === 'caminho')) calcadas.push([x, y]);
  for (const [x, y] of calcadas) terreno[y][x] = 'pedra';

  // ---------- praça (41 × 33, centrada): pedras, faixas de tijolo, canteiros ----------
  const praca = { x0: cx - 20, y0: cy - 16, w: 41, h: 33 };
  pintar('praca', praca.x0, praca.y0, praca.w, praca.h);
  moldura('pedraEscura', praca.x0, praca.y0, praca.w, praca.h);
  // a fonte fica recuada (mais para cima) dentro da moldura de tijolos
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
  // hortas atrás das casas do sul (cercadas)
  const horta = { x0: 31, y0: 72, w: 16, h: 3 };
  for (const x of [horta.x0, espelhoX(horta.x0, horta.w)]) {
    pintar('horta', x, horta.y0, horta.w, horta.h);
    marcar(x, horta.y0, horta.w, horta.h);
  }

  // ---------- lagos ----------
  /** lago orgânico (tiles): a água bloqueia, a margem fica livre de árvores e flores */
  const lago = (tx: number, ty: number, rx: number, ry: number) => {
    const l: FormaLago = { x: tx * TAM, y: ty * TAM, rx: rx * TAM, ry: ry * TAM };
    info.lagos.push(l);
    for (let y = Math.floor(ty - ry - 2); y <= ty + ry + 2; y++)
      for (let x = Math.floor(tx - rx - 2); x <= tx + rx + 2; x++) {
        if (!dentro(x, y)) continue;
        const v = dentroDoLago(l, (x + 0.5) * TAM, (y + 0.5) * TAM);
        if (v < 1) {
          terreno[y][x] = 'lago';
          bloqueado[y][x] = true;
        }
        if (v < 1.5) ocupado[y][x] = true;
      }
    // vitórias-régias espalhadas e juncos em pontos da margem
    for (let k = 0, tent = 0; k < Math.round(rx * ry * 0.45) && tent < 200; tent++) {
      const [px, py] = [l.x + (r() * 2 - 1) * l.rx * 0.8, l.y + (r() * 2 - 1) * l.ry * 0.8];
      if (dentroDoLago(l, px, py) < 0.62) {
        info.enfeites.push({ tipo: 'vitoria', x: Math.round(px), y: Math.round(py), v: k });
        k++;
      }
    }
    for (let k = 0; k < 14; k++) {
      const a = r() * Math.PI * 2;
      // procura a margem andando do centro para fora
      for (let t = 0.6; t < 1.6; t += 0.02) {
        const [px, py] = [l.x + Math.cos(a) * l.rx * t, l.y + Math.sin(a) * l.ry * t];
        if (dentroDoLago(l, px, py) >= 0.98) {
          if (Math.sin(a) > -0.3 || k % 3 === 0) info.enfeites.push({ tipo: 'junco', x: Math.round(px), y: Math.round(py + 2), v: k });
          break;
        }
      }
    }
    return l;
  };
  /** trilha curva por pontos em tiles (centro), marcando os tiles por onde passa */
  const trilhaCurva = (pontos: [number, number][], larguraPx = 22) => {
    const px = pontos.map(([x, y]) => [x * TAM, y * TAM] as [number, number]);
    info.caminhos.push({ pontos: px, largura: larguraPx });
    for (let i = 0; i < pontos.length - 1; i++) {
      const [a, b] = [pontos[i], pontos[i + 1]];
      const passos = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 3);
      for (let k = 0; k <= passos; k++) {
        const [x, y] = [a[0] + ((b[0] - a[0]) * k) / passos, a[1] + ((b[1] - a[1]) * k) / passos];
        marcar(Math.floor(x - 1), Math.floor(y - 1), 2, 2);
      }
    }
  };
  // parques com lago ao lado do Centro Pokémon e do Pokémarket (espelhados)
  const lagoParque = { x: 39.5, y: 29.5, rx: 4.4, ry: 2.3 };
  for (const lx of [lagoParque.x, espelho(lagoParque.x)]) lago(lx, lagoParque.y, lagoParque.rx, lagoParque.ry);
  const voltaDoLago: [number, number][] = [[33.5, 24.6], [32, 28], [33.5, 32.2], [37, 34], [42, 34], [45.5, 32.2], [47, 28], [45.5, 24.6]];
  trilhaCurva(voltaDoLago);
  trilhaCurva(voltaDoLago.map(([x, y]) => [espelho(x), y]));
  // do parque oeste até o pátio do professor
  trilhaCurva([[34.4, 33.4], [34.2, 35.5], [34.6, 38.3]]);
  // lago grande fora do anel (sudoeste) e o caminho que sai da avenida do sul
  lago(40.5, 99, 10.5, 4.2);
  trilhaCurva([[cx - 2.6, 95.5], [62, 96.4], [56, 98.4], [52.4, 99.2]], 20);
  // campo de flores fora do anel (sudeste), com trilha
  const campo = { x0: 86, y0: 93, x1: 114, y1: 106 };
  trilhaCurva([[cx + 3.6, 97.5], [79, 98.5], [88, 100.5], [96, 99.6]], 20);

  // ---------- objetos ----------
  const objetos: ObjetoMapa[] = [];
  /** trilhas de terra do tamanho da porta (em pixels, desenhadas por cima da grama) */
  const trilhas: NonNullable<Mapa['trilhas']> = [];
  /** colunas (tiles) da trilha que sai de cada porta, para deixar o portão da cerca aberto */
  let ultimaPorta: [number, number] | null = null;
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
    // começa 6 px por baixo do prédio (sem faixa de grama entre a porta e a trilha)
    trilhas.push({ x: px, y: linha * TAM - 6, w, h: emenda - linha * TAM + 6 });
    const [c0, c1] = [Math.floor(px / TAM), Math.floor((px + w - 1) / TAM)];
    ultimaPorta = [c0, c1];
    // sem flor nem árvore em cima da trilha
    for (let yy = linha; yy < y; yy++) for (let xx = c0; xx <= c1; xx++) ocupado[yy][xx] = true;
  };
  /** Coloca a peça centrada em `centro` (tiles, contínuo) com a base na linha `base` (a linha logo abaixo dela). */
  const colocar = (peca: string, centro: number, base: number, rotulo?: string) => {
    garantirPeca(peca);
    const p = PECAS[peca];
    const x = centro - p.w / TAM / 2;
    const hT = Math.ceil(p.h / TAM);
    const solidas = Math.min(hT, p.solidas ?? hT - 1);
    const [c0, c1] = [Math.round(x), Math.round(x + p.w / TAM) - 1];
    const b = Math.ceil(base);
    for (let yy = b - hT; yy < b; yy++)
      for (let xx = c0; xx <= c1; xx++) {
        if (!dentro(xx, yy)) continue;
        ocupado[yy][xx] = true;
        if (yy >= b - solidas) bloqueado[yy][xx] = true;
      }
    objetos.push({ peca, x, base, rotulo });
    ultimaPorta = null;
    if (p.porta) caminhoDaPorta(Math.round(x * TAM) + p.porta.x, p.porta.w, base, !!p.porta.largo);
    return { c0, c1 };
  };
  const colocarPar = (peca: string, centro: number, base: number) => {
    colocar(peca, centro, base);
    colocar(peca, espelho(centro), base);
  };
  /** poste com a luz registrada (para a noite) */
  const poste = (centro: number, base: number) => {
    colocar('poste', centro, base);
    info.luzes.push({ x: Math.round(centro * TAM), y: base * TAM - TAM_POSTE.h + 8 });
  };
  /** cerca horizontal do tile x0 até x1 (inclusive) na linha `linha`, sem os tiles de `aberto` */
  const cerca = (tipo: 'Branca' | 'Madeira', x0: number, x1: number, linha: number, aberto: [number, number] | null = null) => {
    const trechos: [number, number][] = aberto ? [[x0, aberto[0] - 1], [aberto[1] + 1, x1]] : [[x0, x1]];
    for (const [a, b] of trechos) if (b >= a) colocar(`cerca${tipo}${b - a + 1}`, (a + b + 1) / 2, linha + 1);
  };
  /** casa com quintal: cerca branca na frente (portão na trilha), caixa de correio e arbusto florido */
  const casa = (peca: string, centro: number, base: number) => {
    const { c0, c1 } = colocar(peca, centro, base);
    const porta = ultimaPorta as [number, number] | null;
    if (!porta) return;
    const linhaCerca = base + 1;
    if (terreno[linhaCerca]?.[c0] !== 'chao') return;
    // a cerca passa 1 tile do lado de fora (emenda com a da casa vizinha); do outro lado do eixo, tudo espelhado
    const arbusto = `arbusto${Math.floor(hash2(c0, base, 5) * ARBUSTOS.length)}`;
    if (centro < eixo) {
      cerca('Branca', c0, porta[0] - 1, linhaCerca);
      colocar('caixaCorreio', porta[1] + 1.5, linhaCerca + 1);
      cerca('Branca', porta[1] + 2, c1 + 1, linhaCerca);
      colocar(arbusto, porta[0] - 0.5, base + 1);
    } else {
      cerca('Branca', c0 - 1, porta[0] - 2, linhaCerca);
      colocar('caixaCorreio', porta[0] - 0.5, linhaCerca + 1);
      cerca('Branca', porta[1] + 1, c1, linhaCerca);
      colocar(arbusto, porta[1] + 1.5, base + 1);
    }
  };

  // estação no norte, recuada da avenida, com bancos na plataforma
  colocar('estacao', eixo, anel.y0 - 3);
  colocarPar('bancoCostas', 65, 11);
  // praça
  colocar('fonte', eixo, fonteBase);
  for (const x of [eixo - 6, espelho(eixo - 6)]) {
    colocar('bancoFrente', x, cy - 7);
    colocar('bancoCostas', x, cy + 11);
  }
  colocar('mural', cx - 13, cy - 2, 'Mural de anúncios');
  colocar('mural', espelho(cx - 13), cy - 2, 'Quadro de torneios');
  for (const x of [eixo - 4, espelho(eixo - 4)]) {
    poste(x, praca.y0 + 1);
    poste(x, praca.y0 + praca.h);
  }
  for (const x of [praca.x0 + 1.5, espelho(praca.x0 + 1.5)]) {
    poste(x, cy - 3);
    poste(x, cy + 5);
  }
  // bandeirolas entre os postes das entradas da praça (norte e sul)
  const topoPoste = (base: number) => base - (TAM_POSTE.h - 6) / TAM;
  garantirPeca('bandeirolas128');
  for (const base of [praca.y0 + 1, praca.y0 + praca.h]) colocar('bandeirolas128', eixo, topoPoste(base) + PECAS.bandeirolas128.h / TAM);
  // norte da praça: Centro Pokémon e Pokémarket espelhados, recuados, com caminho até a praça
  const centroPC = eixo - 11;
  colocar('centroPokemon', centroPC, praca.y0 - 2);
  colocar('pokemarket', espelho(centroPC), praca.y0 - 2);
  ['maquinaVermelha', 'maquinaAzul', 'maquinaVerde'].forEach((m, i) => colocar(m, espelho(centroPC) + 4 + i, praca.y0 - 2));
  // quadra oeste: barraca do Professor de Golpes (pátio) e Banco; quadra leste: Arena
  colocar('barraca', oeste, 38);
  colocar('banco', oeste, cy - 5);
  colocar('arena', espelho(oeste), cy - 5);
  // parques: bancos virados para o lago, postes, arbustos floridos na margem
  for (const lx of [lagoParque.x, espelho(lagoParque.x)]) {
    colocar('bancoFrente', lx - 2.5, 27);
    colocar('bancoFrente', lx + 2.5, 27);
  }
  for (const [x, base] of [[31.5, 33], [47.5, 33]] as [number, number][]) {
    poste(x, base);
    poste(espelho(x), base);
  }
  for (const [x, y, k] of [[35, 32, 0], [44, 32, 3], [34, 27, 5], [45, 27, 8]] as [number, number, number][])
    if (terreno[y][x] === 'chao' && !bloqueado[y][x]) colocarPar(`arbusto${k}`, x + 0.5, y + 1);
  // sul da praça: sobrados recuados da avenida do anel
  const baseSul = anel.y1 - RUA - 2;
  casa('sobradoClaro', eixo - 15, baseSul);
  casa('sobradoVermelho', eixo - 9, baseSul);
  casa('sobradoCinza', espelho(eixo - 9), baseSul);
  casa('sobradoClaro', espelho(eixo - 15), baseSul);
  // quadras do sul: casas em fileira e café/casas na ruela
  const casasSul: [string, string, number][] = [['casaMadeira', 'casaMadeira', anel.x0 + 9.5], ['casaVermelha', 'casaVermelha', anel.x0 + 15.5], ['casaVinho', 'casaMadeira2', anel.x0 + 21.5]];
  for (const [a, b, x] of casasSul) {
    casa(a, x, baseSul);
    casa(b, espelho(x), baseSul);
  }
  colocar('cafe', anel.x0 + 12.5, 68);
  casa('casaMadeira2', anel.x0 + 19.5, 68);
  casa('casaVinho', espelho(anel.x0 + 12.5), 68);
  casa('casaVermelha', espelho(anel.x0 + 19.5), 68);
  // norte: casas dos dois lados da estação
  casa('casaVermelha', eixo - 28, anel.y0 - 3);
  casa('casaMadeira', eixo - 20, anel.y0 - 3);
  casa('casaMadeira2', espelho(eixo - 20), anel.y0 - 3);
  casa('casaVinho', espelho(eixo - 28), anel.y0 - 3);
  // cercas de madeira das hortas (portão em cima, de frente para a ruela)
  for (const x0 of [horta.x0, espelhoX(horta.x0, horta.w)]) {
    const meio = x0 + horta.w / 2;
    cerca('Madeira', x0 - 1, x0 + horta.w, horta.y0 - 1, [Math.floor(meio) - 1, Math.floor(meio)]);
    cerca('Madeira', x0 - 1, x0 + horta.w, horta.y0 + horta.h);
    colocar(`cercaMadeiraV${horta.h}`, x0 - 0.5, horta.y0 + horta.h);
    colocar(`cercaMadeiraV${horta.h}`, x0 + horta.w + 0.5, horta.y0 + horta.h);
  }
  // pracinha entre a avenida e o café: cerca-viva com passagem, banco e postes
  for (const [x, w] of [[30, 6], [41, 8]] as [number, number][]) {
    colocar(`cercaViva${w}x1`, x + w / 2, 59);
    colocar(`cercaViva${w}x1`, espelho(x + w / 2), 59);
  }
  colocarPar('bancoFrente', 38.5, 61);
  // feiras nas duas entradas da cidade (barracas viradas para a avenida)
  const barracas = ['barraca_vermelho', 'barraca_amarelo', 'barraca_verde', 'barraca_azul'];
  const feira = [5.5, 10.5, 15.5];
  feira.forEach((x, i) => {
    colocar(barracas[i], x, cy - 3);
    colocar(barracas[3 - i], espelho(x), cy - 3);
  });
  for (const x of [2.5, 18.5]) {
    poste(x, cy - 3);
    poste(espelho(x), cy - 3);
  }

  const npcs: NpcMapa[] = [{ x: Math.floor(oeste), y: 38, nome: 'Professor de Golpes', aparencia: APARENCIA_PROFESSOR }];
  for (const n of npcs) {
    bloqueado[n.y][n.x] = true;
    ocupado[n.y][n.x] = true;
  }

  // ---------- árvores ----------
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
  const plantar = (gx: number, gy: number, arvore?: [number, number], rocha = false) => {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      bloqueado[gy + dy][gx + dx] = true;
      ocupado[gy + dy][gx + dx] = true;
    }
    grandes.push({ x: gx, y: gy, arvore, rocha: rocha || undefined });
  };
  /** planta a árvore e a espelhada, só se as duas couberem */
  const plantarPar = (gx: number, gy: number, folga: number, terrenos?: Terreno[], arvore?: [number, number]) => {
    const gx2 = 2 * cx - gx - 1;
    if (!cabe(gx, gy, folga, terrenos) || !cabe(gx2, gy, folga, terrenos)) return false;
    plantar(gx, gy, arvore);
    if (gx2 !== gx) plantar(gx2, gy, arvore);
    return true;
  };
  // uma árvore no meio de cada canteiro de canto
  for (const [gx, gy] of canteiros.filter(([x]) => x < cx)) plantarPar(gx + 3, gy + 2, 0, ['jardim'], ARVORE_REDONDA[0]);
  // par ao lado do Centro Pokémon / Pokémarket e árvores escolhidas nos lotes (parques, pátio, pracinha, hortas)
  plantarPar(cx - 19, praca.y0 - 6, 0, undefined, ARVORE_REDONDA[1]);
  const escolhidas: [number, number, [number, number]][] = [
    [29, 26, PINHEIRO[0]], [29, 31, ARVORE_REDONDA[0]], [49, 26, OUTONO[0]], [50, 31, PINHEIRO[1]], [64, 27, ARVORE_REDONDA[1]],
    [30, 42, ARVORE_REDONDA[0]], [46, 42, OUTONO[1]], [30, 61, PINHEIRO[0]], [47, 61, ARVORE_REDONDA[1]],
    [29, 72, OUTONO[0]], [49, 72, ARVORE_REDONDA[0]], [64, 72, PINHEIRO[1]], [56, 72, ARVORE_REDONDA[1]],
  ];
  for (const [gx, gy, a] of escolhidas) plantarPar(gx, gy, 0, undefined, a);
  // alameda na avenida do sul e na margem da avenida de entrada
  for (let y = anel.y1 + 3; y < altura - 6; y += 4) plantarPar(cx - 5, y, 0, undefined, ARVORE_REDONDA[(y >> 2) % 2]);
  for (let x = 2; x < anel.x0 - 3; x += 4) plantarPar(x, cy + 4, 0, undefined, ARVORE_REDONDA[(x >> 2) % 2]);
  // floresta orgânica fora do anel: densidade e espécie variam com o ruído (manchas de pinheiros, algumas de outono)
  const foraDoAnel = (x: number, y: number) => x < anel.x0 - 2 || x > anel.x1 + 1 || y < anel.y0 - 2 || y > anel.y1 + 1;
  const reservado = (x: number, y: number) =>
    (y >= 9 && y <= 17 && x >= 20 && x <= 120) || // estação e casas do norte
    (y >= cy - 8 && y <= cy + 3 && (x < anel.x0 || x > anel.x1)) || // feiras e entradas
    (x >= campo.x0 && x <= campo.x1 && y >= campo.y0 && y <= campo.y1) ||
    (x >= cx - 7 && x <= cx + 7 && y > anel.y1); // avenida do sul
  for (let gy = 0; gy < altura - 1; gy += 2)
    for (let gx0 = 0; gx0 < largura - 1; gx0 += 2) {
      const gx = gx0 + ((gy >> 1) % 2) + Math.floor(hash2(gx0, gy, 301) * 2) - 1;
      if (gx < 0 || !foraDoAnel(gx, gy) || reservado(gx, gy)) continue;
      const borda = gx < 4 || gx > largura - 6 || gy < 3 || gy > altura - 5;
      const densidade = ruidoFractal(gx / 11, gy / 11, 201);
      if (!borda && hash2(gx, gy, 302) > 0.12 + densidade * 1.05) continue;
      if (!cabe(gx, gy, 0)) continue;
      const tipoArvore = ruido(gx / 13, gy / 13, 303);
      const lista = hash2(gx, gy, 304) < 0.07 ? OUTONO : tipoArvore > 0.64 ? PINHEIRO_ESCURO : tipoArvore > 0.5 ? PINHEIRO : ARVORE_REDONDA;
      plantar(gx, gy, lista[Math.floor(hash2(gx, gy, 305) * 2)]);
    }
  // banquinho de piquenique no fim da trilha do campo de flores
  colocar('bancoFrente', 97, 99);
  // pedras grandes na margem do lago e no campo de flores
  for (const [gx, gy] of [[28, 95], [51, 102], [47, 94], [90, 95], [108, 103], [101, 94]] as [number, number][]) if (cabe(gx, gy, 0)) plantar(gx, gy, undefined, true);

  // ---------- flores: manchas (mais no campo do sudeste), nada em cima de trilha/objeto ----------
  const flores: Mapa['flores'] = [];
  for (let y = 0; y < altura; y++)
    for (let x = 0; x < largura; x++) {
      if (terreno[y][x] !== 'chao' || ocupado[y][x] || bloqueado[y][x]) continue;
      const noCampo = x >= campo.x0 && x <= campo.x1 && y >= campo.y0 && y <= campo.y1;
      const chance = noCampo ? 0.32 : 0.012 + Math.max(0, ruido(x / 7, y / 7, 401) - 0.62) * 0.5;
      // a cor vem de manchas (moitas da mesma cor juntas); dx + dy dá a cor em plantarFlores
      const v = ruido(x / 5, y / 5, 402);
      const cor = v < 0.42 ? 0 : v < 0.58 ? 1 : 2;
      if (r() < chance) flores.push({ x, y, dx: cor, dy: r() < 0.5 ? 3 : 6 });
    }

  // ---------- vida: moradores passeando e Pokémon soltos ----------
  info.moradores.push(
    { x: 64, y: 45, raio: 5 }, { x: 77, y: 62, raio: 5 }, { x: 64, y: 67, raio: 4 }, { x: 77, y: 47, raio: 4 },
    { x: 9, y: 53, raio: 6 }, { x: 131, y: 54, raio: 6 }, { x: 37, y: 34, raio: 3 }, { x: 104, y: 34, raio: 3 },
    { x: 58, y: 10, raio: 4 }, { x: 82, y: 10, raio: 4 }, { x: 70, y: 76, raio: 6 }, { x: 54, y: 97, raio: 2 },
  );
  info.pokemons.push(
    { especie: 25, x: 70, y: 64, raio: 4 }, { especie: 133, x: 61, y: 50, raio: 3 }, { especie: 39, x: 80, y: 50, raio: 2 },
    { especie: 54, x: 36, y: 33, raio: 2 }, { especie: 183, x: 105, y: 33, raio: 2 }, { especie: 52, x: 12, y: 51, raio: 3 },
    { especie: 58, x: 128, y: 51, raio: 3 }, { especie: 79, x: 53, y: 99, raio: 1 }, { especie: 12, x: 98, y: 100, raio: 4 },
    { especie: 143, x: 106, y: 101, raio: 0 }, { especie: 16, x: 34, y: 76, raio: 3 }, { especie: 1, x: 106, y: 76, raio: 3 },
  );
  // não deixa ninguém nascer em cima de obstáculo
  const pisavel = (x: number, y: number) => !bloqueado[y][x] && terreno[y][x] !== 'jardim' && terreno[y][x] !== 'horta';
  info.moradores = info.moradores.filter((m) => pisavel(m.x, m.y));
  info.pokemons = info.pokemons.filter((p) => !bloqueado[p.y][p.x]);

  // pedras em anéis em volta da fonte (centro da bacia), ovais como ela
  info.aneis = { x: eixo * TAM, y: fonteBase * TAM - 48, raio: 124, achatamento: 0.72 };
  return { largura, altura, terreno, bloqueado, grandes, pedrinhas: [], flores, inicio: { x: cx, y: cy + 11 }, objetos, npcs, trilhas, sombras: true, cidade: info };
}
