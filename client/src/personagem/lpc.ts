// Personagem do jogador montado com as camadas do LPC (Liberated Pixel Cup, client/public/lpc) +
// detalhes Pokémon desenhados por código por cima: boné com logo de Pokébola, estampa na camiseta e
// Pokébolas no cinto. Cada folha tem 4 linhas (cima, esquerda, baixo, direita) de quadros 64×64:
// "walk" tem 9 quadros (o 0 é parado), "idle" tem 2.

export type Corpo = 'masc' | 'fem';
export type Bone = 'nenhum' | 'vermelho' | 'azul' | 'verde' | 'preto' | 'amarelo';
export type Estampa = 'nenhuma' | 'pokebola' | 'raio' | 'gota' | 'chama';

export interface Aparencia {
  corpo: Corpo;
  pele: string;
  cabelo: string;
  corCabelo: string;
  camiseta: string;
  calca: string;
  tenis: string;
  bone: Bone;
  estampa: Estampa;
  cinto: boolean;
}

export const APARENCIA_PADRAO: Aparencia = {
  corpo: 'masc',
  pele: 'light',
  cabelo: 'spiked',
  corCabelo: 'dark_brown',
  camiseta: 'blue',
  calca: 'navy',
  tenis: 'red',
  bone: 'vermelho',
  estampa: 'pokebola',
  cinto: true,
};

export const CABELOS: Record<string, string> = {
  spiked: 'Espetado',
  bangs: 'Franja',
  messy1: 'Bagunçado',
  pixie: 'Pixie',
  bob: 'Chanel',
  ponytail: 'Rabo de cavalo',
  long: 'Longo',
  curly_short: 'Cacheado',
};
export const PELES = ['light', 'amber', 'olive', 'taupe', 'bronze', 'brown', 'black'];
export const CORES_CABELO = ['black', 'dark_brown', 'chestnut', 'light_brown', 'blonde', 'ginger', 'red', 'platinum', 'white', 'pink', 'purple', 'blue', 'green'];
export const CORES_ROUPA = ['white', 'black', 'gray', 'red', 'maroon', 'orange', 'yellow', 'green', 'forest', 'teal', 'sky', 'blue', 'navy', 'purple', 'pink', 'brown', 'tan'];
export const BONES: Record<Bone, string> = { nenhum: 'Sem boné', vermelho: 'Vermelho', azul: 'Azul', verde: 'Verde', preto: 'Preto', amarelo: 'Amarelo' };
export const ESTAMPAS: Record<Estampa, string> = { nenhuma: 'Lisa', pokebola: 'Pokébola', raio: 'Raio', gota: 'Gota', chama: 'Chama' };

/** Cores do boné: [principal, sombra, aba]. */
const COR_BONE: Record<Exclude<Bone, 'nenhum'>, [string, string, string]> = {
  vermelho: ['#e8443c', '#b02e2c', '#8c2224'],
  azul: ['#3c7ee0', '#2a5cb0', '#1f4688'],
  verde: ['#3fae5a', '#2c8444', '#206434'],
  preto: ['#3a3d4a', '#272a34', '#1a1c24'],
  amarelo: ['#f4c430', '#c89a1e', '#a07a14'],
};
const CONTORNO = '#241c26';

export type Paletas = { body: Record<string, string[]>; hair: Record<string, string[]>; cloth: Record<string, string[]> };
let paletas: Promise<Paletas> | null = null;
export function carregarPaletas(): Promise<Paletas> {
  paletas ??= Promise.all(['body', 'hair', 'cloth'].map((n) => fetch(`lpc/paletas/${n}_ulpc.json`).then((r) => r.json()))).then(([body, hair, cloth]) => ({ body, hair, cloth }));
  return paletas;
}

const imagens = new Map<string, Promise<HTMLImageElement | null>>();
function imagem(src: string): Promise<HTMLImageElement | null> {
  if (!imagens.has(src))
    imagens.set(
      src,
      new Promise((ok) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => ok(null);
        i.src = `lpc/${src}`;
      }),
    );
  return imagens.get(src)!;
}

/** Cópia da camada com as cores trocadas: as cores da imagem (do escuro ao claro) viram as da paleta, na mesma ordem. */
function recolorir(img: HTMLImageElement, paleta: string[] | null): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  if (!paleta) return c;
  const dados = ctx.getImageData(0, 0, c.width, c.height);
  const d = dados.data;
  const cores = new Map<number, number>();
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) cores.set((d[i] << 16) | (d[i + 1] << 8) | d[i + 2], 0);
  const lum = (k: number) => 0.3 * (k >> 16) + 0.59 * ((k >> 8) & 255) + 0.11 * (k & 255);
  const ordem = [...cores.keys()].sort((a, b) => lum(a) - lum(b));
  const alvo = paleta.map((h) => parseInt(h.slice(1), 16));
  ordem.forEach((k, i) => cores.set(k, alvo[Math.round((i * (alvo.length - 1)) / Math.max(1, ordem.length - 1))]));
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const n = cores.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])!;
    d[i] = n >> 16;
    d[i + 1] = (n >> 8) & 255;
    d[i + 2] = n & 255;
  }
  ctx.putImageData(dados, 0, 0);
  return c;
}

type Caixa = { topo: number; base: number; esq: number; dir: number } | null;
/** Área desenhada (pixels não transparentes) de um quadro 64×64 da camada. */
function caixa(dados: ImageData, qx: number, qy: number): Caixa {
  let topo = 64, base = -1, esq = 64, dir = -1;
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++)
      if (dados.data[((qy + y) * dados.width + qx + x) * 4 + 3] > 0) {
        topo = Math.min(topo, y);
        base = Math.max(base, y);
        esq = Math.min(esq, x);
        dir = Math.max(dir, x);
      }
  return base < 0 ? null : { topo, base, esq, dir };
}

const px = (ctx: CanvasRenderingContext2D, x: number, y: number, cor: string) => {
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, 1, 1);
};
/** Desenha um padrão de letras (cada letra = uma cor; "." = vazio) a partir de (x, y). */
function padrao(ctx: CanvasRenderingContext2D, x: number, y: number, linhas: string[], cores: Record<string, string>) {
  linhas.forEach((l, j) => [...l].forEach((ch, i) => ch !== '.' && px(ctx, x + i, y + j, cores[ch])));
}

const ESTAMPA_DESENHO: Record<Exclude<Estampa, 'nenhuma'>, { linhas: string[]; cores: Record<string, string> }> = {
  pokebola: { linhas: ['.kkk.', 'krrrk', 'kkwkk', 'kwwwk', '.kkk.'], cores: { k: '#241c26', r: '#e8443c', w: '#f4f4f4' } },
  raio: { linhas: ['..yk', '.yk.', 'yyyk', '.yk.', 'yk..'], cores: { y: '#ffd23a', k: '#a07a14' } },
  gota: { linhas: ['..b..', '.bbb.', 'bbwbb', 'bbbbb', '.bbb.'], cores: { b: '#4aa8f0', w: '#d8f0ff' } },
  chama: { linhas: ['..o..', '.oo.o', 'ooyoo', 'oyyyo', '.ooo.'], cores: { o: '#f0782a', y: '#ffd23a' } },
};

/** Boné por cima da cabeça (a parte do cabelo que sairia por cima do boné é apagada antes). */
function desenharBone(ctx: CanvasRenderingContext2D, ox: number, oy: number, cab: NonNullable<Caixa>, linha: number, bone: Exclude<Bone, 'nenhum'>) {
  const [cor, sombra, aba] = COR_BONE[bone];
  const esq = cab.esq - 1, dir = cab.dir + 1, topo = cab.topo - 1;
  const largura = dir - esq + 1;
  // copa arredondada: as 2 primeiras linhas mais estreitas
  const ALTURA = 8;
  for (let j = 0; j < ALTURA; j++) {
    const recuo = j === 0 ? 3 : j === 1 ? 1 : 0;
    for (let x = esq + recuo; x <= dir - recuo; x++) px(ctx, ox + x, oy + topo + j, j >= ALTURA - 2 ? sombra : cor);
    px(ctx, ox + esq + recuo - 1, oy + topo + j, CONTORNO);
    px(ctx, ox + dir - recuo + 1, oy + topo + j, CONTORNO);
  }
  for (let x = esq + 3; x <= dir - 3; x++) px(ctx, ox + x, oy + topo - 1, CONTORNO);
  px(ctx, ox + esq + 1, oy + topo, CONTORNO);
  px(ctx, ox + dir - 1, oy + topo, CONTORNO);
  const meio = Math.round((esq + dir) / 2);
  if (linha === 2) {
    // de frente: logo de Pokébola e aba reta
    padrao(ctx, ox + meio - 2, oy + topo + 2, ['.www.', 'wwkww', '.www.'], { w: '#f4f4f4', k: CONTORNO });
    for (let x = esq - 1; x <= dir + 1; x++) {
      px(ctx, ox + x, oy + topo + ALTURA, aba);
      px(ctx, ox + x, oy + topo + ALTURA + 1, CONTORNO);
    }
  } else if (linha === 1 || linha === 3) {
    // de lado: aba para a frente (esquerda ou direita) e logo na lateral
    const frente = linha === 1 ? -1 : 1;
    const inicio = linha === 1 ? esq - 4 : meio;
    for (let x = inicio; x <= inicio + Math.floor(largura / 2) + 3; x++) {
      px(ctx, ox + x, oy + topo + ALTURA - 1, aba);
      px(ctx, ox + x, oy + topo + ALTURA, CONTORNO);
    }
    padrao(ctx, ox + meio - 1 + frente * 2, oy + topo + 2, ['.w.', 'wkw', '.w.'], { w: '#f4f4f4', k: CONTORNO });
  } else {
    // de costas: fecho do boné
    for (let x = meio - 2; x <= meio + 2; x++) px(ctx, ox + x, oy + topo + ALTURA - 2, '#f4f4f4');
  }
  void largura;
}

export interface FolhasPersonagem {
  walk: HTMLCanvasElement;
  idle: HTMLCanvasElement;
}

/** Monta as folhas (andar e parado) do personagem com a aparência escolhida. */
export async function montarPersonagem(a: Aparencia): Promise<FolhasPersonagem> {
  const p = await carregarPaletas();
  const montar = async (anim: 'walk' | 'idle') => {
    const lista: [string, string[] | null, string][] = [];
    if (a.cabelo === 'ponytail') lista.push([`cabelo/ponytail/fundo-${anim}.png`, p.hair[a.corCabelo], 'cabeloFundo']);
    lista.push([`corpo/${a.corpo}/${anim}.png`, p.body[a.pele], 'corpo']);
    lista.push([`cabeca/${a.corpo}/${anim}.png`, p.body[a.pele], 'cabeca']);
    lista.push([`olhos/${anim}.png`, null, 'olhos']);
    lista.push([`calca/${a.corpo}/${anim}.png`, p.cloth[a.calca], 'calca']);
    lista.push([`tenis/${a.corpo}/${anim}.png`, p.cloth[a.tenis], 'tenis']);
    lista.push([`camiseta/${a.corpo}/${anim}.png`, p.cloth[a.camiseta], 'camiseta']);
    lista.push([`cabelo/${a.cabelo}/${anim}.png`, p.hair[a.corCabelo], 'cabelo']);
    const imgs = await Promise.all(lista.map(([src]) => imagem(src)));
    const camadas = new Map<string, HTMLCanvasElement>();
    imgs.forEach((img, i) => img && camadas.set(lista[i][2], recolorir(img, lista[i][1])));
    const base = camadas.get('corpo')!;
    const folha = document.createElement('canvas');
    folha.width = base.width;
    folha.height = base.height;
    const ctx = folha.getContext('2d')!;
    const dadosDe = (nome: string) => {
      const c = camadas.get(nome);
      return c ? c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height) : null;
    };
    const cabeca = dadosDe('cabeca');
    const camiseta = dadosDe('camiseta');
    const calca = dadosDe('calca');
    const colunas = folha.width / 64;

    // com boné: apaga o cabelo que ficaria acima da copa
    if (a.bone !== 'nenhum' && cabeca) {
      const cab = camadas.get('cabelo');
      const cctx = cab?.getContext('2d');
      for (let linha = 0; linha < 4 && cctx; linha++)
        for (let col = 0; col < colunas; col++) {
          const c = caixa(cabeca, col * 64, linha * 64);
          if (c) cctx.clearRect(col * 64 + c.esq - 6, linha * 64, c.dir - c.esq + 13, c.topo + 1);
        }
    }
    for (const nome of ['cabeloFundo', 'corpo', 'cabeca', 'olhos', 'calca', 'tenis', 'camiseta', 'cabelo']) {
      const c = camadas.get(nome);
      if (c) ctx.drawImage(c, 0, 0);
    }

    // detalhes Pokémon, quadro a quadro (seguem o balanço da animação)
    for (let linha = 0; linha < 4; linha++)
      for (let col = 0; col < colunas; col++) {
        const ox = col * 64, oy = linha * 64;
        const tronco = camiseta && caixa(camiseta, ox, oy);
        const cintura = calca && caixa(calca, ox, oy);
        if (a.estampa !== 'nenhuma' && linha === 2 && tronco) {
          const e = ESTAMPA_DESENHO[a.estampa];
          const meio = Math.round((tronco.esq + tronco.dir) / 2);
          padrao(ctx, ox + meio - Math.floor(e.linhas[0].length / 2), oy + tronco.topo + 4, e.linhas, e.cores);
        }
        if (a.cinto && cintura) {
          const bola = ['rrr', 'kwk', 'www'];
          const cores = { r: '#e8443c', k: CONTORNO, w: '#f4f4f4' };
          const y = oy + cintura.topo;
          if (linha === 2) padrao(ctx, ox + cintura.esq + 1, y, bola, cores);
          else if (linha === 0) padrao(ctx, ox + cintura.dir - 3, y, bola, cores);
          else padrao(ctx, ox + (linha === 1 ? cintura.dir - 3 : cintura.esq + 1), y, bola, cores);
        }
        if (a.bone !== 'nenhum' && cabeca) {
          const cab = caixa(cabeca, ox, oy);
          if (cab) desenharBone(ctx, ox, oy, cab, linha, a.bone);
        }
      }
    return folha;
  };
  const [walk, idle] = await Promise.all([montar('walk'), montar('idle')]);
  return { walk, idle };
}

/** Linha da folha para cada direção do jogo. */
export const LINHA_DIRECAO = { cima: 0, esquerda: 1, baixo: 2, direita: 3 } as const;
