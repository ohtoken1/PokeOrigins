// Sprites de mapa do PMD SpriteCollab (client/public/seguidores/<número>): Pokémon que segue o jogador
// andando com animação em 8 direções. Por enquanto só os iniciais e suas evoluções (pedido do dono);
// os outros continuam com a imagem de batalha. Licença CC BY-NC 4.0 (créditos em CREDITOS.md).
import Phaser from 'phaser';

const LINHAS_INICIAIS = [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912];
export const ESPECIES_PMD = new Set(LINHAS_INICIAIS.flatMap((n) => [n, n + 1, n + 2]));

/** Linhas da folha do PMD (8 direções). */
export const DIRECAO_PMD = { baixo: 0, direita: 2, cima: 4, esquerda: 6 } as const;

export interface InfoPmd {
  especie: number;
  /** chaves das animações: `${prefixo}-walk-${linha}` e `${prefixo}-idle-${linha}` */
  prefixo: string;
  /** altura do pé dentro do quadro (0 a 1) em cada animação e largura desenhada (px), para a origem e a sombra */
  origemWalk: number;
  origemIdle: number;
  largura: number;
}

type Anim = { largura: number; altura: number; duracoes: number[] };

async function lerAnimData(numero: string): Promise<Record<'Walk' | 'Idle', Anim> | null> {
  try {
    const xml = new DOMParser().parseFromString(await (await fetch(`seguidores/${numero}/AnimData.xml`)).text(), 'text/xml');
    const achar = (nome: string): Anim | null => {
      let anim = [...xml.querySelectorAll('Anim')].find((a) => a.querySelector('Name')?.textContent === nome);
      // algumas animações são cópia de outra
      const copia = anim?.querySelector('CopyOf')?.textContent;
      if (copia) anim = [...xml.querySelectorAll('Anim')].find((a) => a.querySelector('Name')?.textContent === copia);
      if (!anim) return null;
      return {
        largura: Number(anim.querySelector('FrameWidth')?.textContent),
        altura: Number(anim.querySelector('FrameHeight')?.textContent),
        duracoes: [...anim.querySelectorAll('Duration')].map((d) => Number(d.textContent)),
      };
    };
    const walk = achar('Walk');
    const idle = achar('Idle') ?? walk;
    return walk && idle ? { Walk: walk, Idle: idle } : null;
  } catch {
    return null;
  }
}

/** Pé (última linha desenhada) e largura desenhada nos quadros da linha "baixo" da folha de andar. */
function medir(img: HTMLImageElement, a: Anim): { origemY: number; largura: number } {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = a.altura;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let base = 0, esq = c.width, dir = 0;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < a.largura; x++)
      if (d[(y * c.width + x) * 4 + 3] > 0) {
        base = Math.max(base, y);
        esq = Math.min(esq, x);
        dir = Math.max(dir, x);
      }
  return { origemY: (base + 1) / a.altura, largura: Math.max(4, dir - esq + 1) };
}

const carregando = new Map<number, Promise<InfoPmd | null>>();

/** Carrega as folhas de andar/parado e cria as animações (uma vez por espécie). */
export function carregarPmd(cena: Phaser.Scene, especie: number): Promise<InfoPmd | null> {
  if (!ESPECIES_PMD.has(especie)) return Promise.resolve(null);
  const salvo = carregando.get(especie);
  if (salvo) return salvo;
  const numero = String(especie).padStart(4, '0');
  const prefixo = `pmd-${numero}`;
  const promessa = (async () => {
    const dados = await lerAnimData(numero);
    if (!dados) return null;
    await new Promise<void>((ok) => {
      for (const nome of ['Walk', 'Idle'] as const)
        if (!cena.textures.exists(`${prefixo}-${nome}`))
          cena.load.spritesheet(`${prefixo}-${nome}`, `seguidores/${numero}/${nome}-Anim.png`, { frameWidth: dados[nome].largura, frameHeight: dados[nome].altura });
      cena.load.once(Phaser.Loader.Events.COMPLETE, () => ok());
      cena.load.start();
    });
    if (!cena.textures.exists(`${prefixo}-Walk`)) return null;
    for (const nome of ['Walk', 'Idle'] as const) {
      const a = dados[nome];
      const colunas = Math.floor(cena.textures.get(`${prefixo}-${nome}`).getSourceImage().width / a.largura);
      // durações do PMD em quadros de 1/60 s
      const total = (a.duracoes.reduce((s, d) => s + d, 0) * 1000) / 60;
      for (let linha = 0; linha < 8; linha++) {
        const chave = `${prefixo}-${nome.toLowerCase()}-${linha}`;
        if (cena.anims.exists(chave)) continue;
        cena.anims.create({
          key: chave,
          frames: cena.anims.generateFrameNumbers(`${prefixo}-${nome}`, { start: linha * colunas, end: linha * colunas + colunas - 1 }),
          duration: total,
          repeat: -1,
        });
      }
    }
    const img = (nome: 'Walk' | 'Idle') => cena.textures.get(`${prefixo}-${nome}`).getSourceImage() as HTMLImageElement;
    const walk = medir(img('Walk'), dados.Walk);
    const idle = cena.textures.exists(`${prefixo}-Idle`) ? medir(img('Idle'), dados.Idle) : walk;
    return { especie, prefixo, origemWalk: walk.origemY, origemIdle: idle.origemY, largura: walk.largura };
  })();
  carregando.set(especie, promessa);
  return promessa;
}
