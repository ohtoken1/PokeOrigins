// Sprite de mapa (PMD SpriteCollab, o mesmo do Pokémon que segue o jogador) animado numa tela HTML: o Pokémon
// andando no lugar, de frente. Usado nas casas do PC. Quem não tem sprite de mapa (ou a versão shiny dele) mostra
// a imagem de batalha parada.
import { pokemonPorId } from '../dados';
import { lerAnimData, temSpritePmd } from '../jogo/seguidoresPmd';
import { el, spritePokemon } from './dom';

interface Folha {
  img: HTMLImageElement;
  /** tamanho de um quadro da folha */
  largura: number;
  altura: number;
  /** duração de cada quadro, em 1/60 s (como no PMD) */
  duracoes: number[];
  total: number;
  /** parte desenhada (juntando todos os quadros da linha "de frente"), para o Pokémon ficar centralizado e sem sobra */
  x: number;
  y: number;
  w: number;
  h: number;
}

const folhas = new Map<string, Promise<Folha | null>>();
function folhaDe(especie: number, shiny: boolean): Promise<Folha | null> {
  const numero = String(especie).padStart(4, '0');
  const chave = `${numero}${shiny ? '-s' : ''}`;
  if (!folhas.has(chave))
    folhas.set(
      chave,
      (async () => {
        const dados = await lerAnimData(numero);
        if (!dados) return null;
        const img = new Image();
        img.src = `seguidores/${numero}${shiny ? '/shiny' : ''}/Walk-Anim.png`;
        try {
          await img.decode();
        } catch {
          return null;
        }
        const { largura, altura, duracoes } = dados.Walk;
        const quadros = Math.min(duracoes.length, Math.floor(img.width / largura));
        // a primeira linha da folha é o Pokémon de frente
        const c = document.createElement('canvas');
        c.width = largura * quadros;
        c.height = altura;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let x0 = largura, x1 = -1, y0 = altura, y1 = -1;
        for (let y = 0; y < altura; y++)
          for (let x = 0; x < c.width; x++)
            if (d[(y * c.width + x) * 4 + 3] > 0) {
              const xq = x % largura;
              x0 = Math.min(x0, xq);
              x1 = Math.max(x1, xq);
              y0 = Math.min(y0, y);
              y1 = Math.max(y1, y);
            }
        if (x1 < 0) return null;
        const usadas = duracoes.slice(0, quadros);
        return { img, largura, altura, duracoes: usadas, total: usadas.reduce((s, n) => s + n, 0), x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      })(),
    );
  return folhas.get(chave)!;
}

/** Telas na página: um relógio só para todas; as que saíram da página são esquecidas. */
const vivas = new Set<{ tela: HTMLCanvasElement; ctx: CanvasRenderingContext2D; folha: Folha; quadro: number; desde: number }>();
let rodando = false;
function animar() {
  if (!vivas.size) {
    rodando = false;
    return;
  }
  const agora = (performance.now() * 60) / 1000;
  for (const v of vivas) {
    if (!v.tela.isConnected) {
      // dá um tempo para quem criou a casa colocá-la na página
      if (performance.now() - v.desde > 3000) vivas.delete(v);
      continue;
    }
    let t = agora % v.folha.total, quadro = 0;
    while (quadro < v.folha.duracoes.length - 1 && t >= v.folha.duracoes[quadro]) t -= v.folha.duracoes[quadro++];
    if (quadro === v.quadro) continue;
    v.quadro = quadro;
    const f = v.folha;
    v.ctx.clearRect(0, 0, v.tela.width, v.tela.height);
    v.ctx.drawImage(f.img, quadro * f.largura + f.x, f.y, f.w, f.h, 0, 0, v.tela.width, v.tela.height);
  }
  requestAnimationFrame(animar);
}

/** Ampliação do desenho (inteira: fração deixa o pixel art irregular); o CSS reduz suave se não couber na casa. */
const ESCALA = 2;

/** O Pokémon andando no lugar (sprite de mapa). Sem sprite de mapa: a imagem de batalha, parada. */
export function spriteMapa(especie: number, shiny = false): HTMLElement {
  const caixa = el('span', { class: 'sprite-mapa' });
  const reserva = () => caixa.replaceChildren(spritePokemon(pokemonPorId(especie), { shiny, animado: false }));
  if (!temSpritePmd(especie, shiny)) {
    reserva();
    return caixa;
  }
  void folhaDe(especie, shiny).then((folha) => {
    if (!folha) return reserva();
    const tela = el('canvas', { width: folha.w * ESCALA, height: folha.h * ESCALA }) as HTMLCanvasElement;
    const ctx = tela.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(folha.img, folha.x, folha.y, folha.w, folha.h, 0, 0, tela.width, tela.height);
    caixa.replaceChildren(tela);
    vivas.add({ tela, ctx, folha, quadro: 0, desde: performance.now() });
    if (!rodando) {
      rodando = true;
      requestAnimationFrame(animar);
    }
  });
  return caixa;
}
