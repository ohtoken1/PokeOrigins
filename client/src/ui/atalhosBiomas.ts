// Atalhos para trocar de bioma sem voltar ao menu: um quadradinho com um pedaço do mapa de cada bioma.
import { BIOMAS } from '../../../shared/biomas';
import { ALTURA, LARGURA, TAM, desenharMapa, gerarMapa } from '../jogo/mapa';
import { PALETAS } from '../jogo/paletas';
import { el } from './dom';

/** Miniaturas já desenhadas (data URL), uma por bioma. */
const miniaturas = new Map<string, Promise<string>>();
let tilesets: Promise<HTMLImageElement[]> | undefined;

const carregarImagem = (src: string) =>
  new Promise<HTMLImageElement>((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = erro;
    img.src = src;
  });

/** Recorte de 10×10 tiles do mapa do bioma, reduzido para 60×60. */
function miniatura(biomaId: string): Promise<string> {
  let pronta = miniaturas.get(biomaId);
  if (pronta) return pronta;
  tilesets ??= Promise.all(['tiles/tuxemon-buch.png', 'tiles/core_outdoor_nature.png', 'tiles/core_outdoor_water.png'].map(carregarImagem));
  pronta = tilesets.then(([buch, natureza, agua]) => {
    const paleta = PALETAS[biomaId] ?? PALETAS.grama;
    const mapa = gerarMapa(biomaId, paleta);
    const completo = desenharMapa(mapa, paleta, biomaId, { buch, natureza, agua });
    const lado = 10 * TAM;
    const c = document.createElement('canvas');
    c.width = c.height = 60;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    // recorte com mais "cara" do bioma: mais obstáculos (árvores, corais, lápides) e líquido, sem a borda do mapa
    let melhor = { x: mapa.inicio.x - 5, y: mapa.inicio.y - 5, nota: -1 };
    for (let y = 6; y + 10 < ALTURA - 6; y += 3)
      for (let x = 6; x + 10 < LARGURA - 6; x += 3) {
        let nota = mapa.grandes.filter((g) => g.x >= x && g.x < x + 9 && g.y >= y && g.y < y + 9).length * 3;
        for (let yy = y; yy < y + 10; yy++) for (let xx = x; xx < x + 10; xx++) if (mapa.terreno[yy][xx] === 'liquido') nota += 1;
        // um pouco de líquido ajuda, mas não deixa a miniatura virar só água
        nota -= Math.max(0, nota - 40);
        if (nota > melhor.nota) melhor = { x, y, nota };
      }
    ctx.drawImage(completo, melhor.x * TAM, melhor.y * TAM, lado, lado, 0, 0, 60, 60);
    return c.toDataURL();
  });
  miniaturas.set(biomaId, pronta);
  return pronta;
}

/** Fileira de atalhos; o bioma atual fica destacado. */
export function atalhosBiomas(atual: string, ir: (biomaId: string) => void): HTMLElement {
  return el(
    'nav',
    { class: 'atalhos-biomas', 'aria-label': 'Trocar de bioma' },
    ...BIOMAS.map((b) => {
      const botao = el(
        'button',
        { class: `atalho-bioma ${b.id === atual ? 'ativo' : ''}`, title: b.nome, 'aria-label': b.nome, onclick: () => b.id !== atual && ir(b.id) },
        el('span', {}, b.nome),
      );
      miniatura(b.id).then((url) => (botao.style.backgroundImage = `url(${url})`)).catch(() => {});
      return botao;
    }),
  );
}
