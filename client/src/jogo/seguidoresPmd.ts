// Sprites de mapa do PMD SpriteCollab (client/public/seguidores/<número>): Pokémon que segue o jogador
// andando com animação em 8 direções (961 espécies; shiny em 918). Quem não tem sprite usa a imagem
// de batalha. Licença CC BY-NC 4.0 (créditos em CREDITOS.md).
import Phaser from 'phaser';
import { FAIXAS_COM_SHINY, FAIXAS_COM_SPRITE } from './seguidoresIndice';

const conjunto = (faixas: [number, number][]) => new Set(faixas.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)));
export const ESPECIES_PMD = conjunto(FAIXAS_COM_SPRITE);
export const SHINY_PMD = conjunto(FAIXAS_COM_SHINY);
/** Tem sprite de mapa para esta espécie (e para a versão shiny, se for shiny)? */
export const temSpritePmd = (especie: number, shiny: boolean) => (shiny ? SHINY_PMD : ESPECIES_PMD).has(especie);

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

const carregando = new Map<string, Promise<InfoPmd | null>>();

/** Carrega as folhas de andar/parado e cria as animações (uma vez por espécie). */
export function carregarPmd(cena: Phaser.Scene, especie: number, shiny = false): Promise<InfoPmd | null> {
  if (!temSpritePmd(especie, shiny)) return Promise.resolve(null);
  const numero = String(especie).padStart(4, '0');
  const prefixo = `pmd-${numero}${shiny ? '-s' : ''}`;
  const salvo = carregando.get(prefixo);
  if (salvo) return salvo;
  const pasta = `seguidores/${numero}${shiny ? '/shiny' : ''}`;
  const promessa = (async () => {
    const dados = await lerAnimData(numero);
    if (!dados) return null;
    await new Promise<void>((ok) => {
      for (const nome of ['Walk', 'Idle'] as const)
        if (!cena.textures.exists(`${prefixo}-${nome}`))
          cena.load.spritesheet(`${prefixo}-${nome}`, `${pasta}/${nome}-Anim.png`, { frameWidth: dados[nome].largura, frameHeight: dados[nome].altura });
      cena.load.once(Phaser.Loader.Events.COMPLETE, () => ok());
      cena.load.start();
    });
    if (!cena.textures.exists(`${prefixo}-Walk`)) return null;
    // sem folha "parado" (alguns Pokémon): parado usa o 1º quadro de andar
    const temIdle = cena.textures.exists(`${prefixo}-Idle`);
    for (const nome of ['Walk', 'Idle'] as const) {
      if (nome === 'Idle' && !temIdle) {
        const colunas = Math.floor(cena.textures.get(`${prefixo}-Walk`).getSourceImage().width / dados.Walk.largura);
        for (let linha = 0; linha < 8; linha++)
          if (!cena.anims.exists(`${prefixo}-idle-${linha}`))
            cena.anims.create({ key: `${prefixo}-idle-${linha}`, frames: cena.anims.generateFrameNumbers(`${prefixo}-Walk`, { start: linha * colunas, end: linha * colunas }), frameRate: 1, repeat: -1 });
        continue;
      }
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
    const idle = temIdle ? medir(img('Idle'), dados.Idle) : walk;
    return { especie, prefixo, origemWalk: walk.origemY, origemIdle: idle.origemY, largura: walk.largura };
  })();
  carregando.set(prefixo, promessa);
  return promessa;
}
