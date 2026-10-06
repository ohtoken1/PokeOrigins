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
const CHAVE_CACHE = 'jogo-claude:miniaturas-v2';
const cacheSalvo = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CACHE) ?? '{}');
  } catch {
    return {};
  }
};

/** Espera o navegador ficar livre (para não travar o jogo desenhando miniaturas). */
const quandoLivre = () => new Promise<void>((ok) => ('requestIdleCallback' in window ? requestIdleCallback(() => ok(), { timeout: 2000 }) : setTimeout(ok, 200)));
let fila = Promise.resolve();

function miniatura(biomaId: string): Promise<string> {
  let pronta = miniaturas.get(biomaId);
  if (pronta) return pronta;
  // já desenhada antes (guardada no navegador): não precisa gerar o mapa de novo
  const salva = cacheSalvo()[biomaId];
  if (salva) {
    pronta = Promise.resolve(salva);
    miniaturas.set(biomaId, pronta);
    return pronta;
  }
  tilesets ??= Promise.all(['tiles/tuxemon-buch.png', 'tiles/core_outdoor_nature.png', 'tiles/core_outdoor_water.png'].map(carregarImagem));
  // uma miniatura por vez, só quando o navegador estiver livre
  fila = fila.then(quandoLivre);
  const vez = fila;
  pronta = Promise.all([tilesets, vez]).then(([[buch, natureza, agua]]) => {
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
    const url = c.toDataURL();
    try {
      localStorage.setItem(CHAVE_CACHE, JSON.stringify({ ...cacheSalvo(), [biomaId]: url }));
    } catch {
      /* sem espaço: gera de novo da próxima vez */
    }
    return url;
  });
  fila = pronta.then(() => undefined, () => undefined);
  miniaturas.set(biomaId, pronta);
  return pronta;
}

const CHAVE_POSICAO = 'jogo-claude:posicao-atalhos';

/**
 * Caixinha vertical de atalhos (o bioma atual fica destacado). Fica solta na tela e pode ser
 * arrastada pela alça do topo; a posição fica guardada.
 */
export function atalhosBiomas(atual: string, ir: (biomaId: string) => void): HTMLElement {
  const alca = el('div', { class: 'atalhos-alca', title: 'Arraste para mover' }, '⠿ Biomas');
  const caixa = el(
    'nav',
    { class: 'atalhos-biomas', 'aria-label': 'Trocar de bioma' },
    alca,
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

  const posicionar = (x: number, y: number) => {
    x = Math.max(0, Math.min(window.innerWidth - caixa.offsetWidth, x));
    y = Math.max(0, Math.min(window.innerHeight - caixa.offsetHeight, y));
    Object.assign(caixa.style, { left: `${x}px`, top: `${y}px` });
  };
  // posição salva (depois de entrar na página, quando já tem tamanho)
  requestAnimationFrame(() => {
    try {
      const salva = JSON.parse(localStorage.getItem(CHAVE_POSICAO) ?? 'null');
      if (Array.isArray(salva)) posicionar(salva[0], salva[1]);
    } catch {
      /* fica na posição padrão */
    }
  });

  alca.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const r = caixa.getBoundingClientRect();
    const [ox, oy] = [e.clientX - r.left, e.clientY - r.top];
    alca.setPointerCapture(e.pointerId);
    caixa.classList.add('arrastando');
    const mover = (ev: PointerEvent) => posicionar(ev.clientX - ox, ev.clientY - oy);
    alca.addEventListener('pointermove', mover);
    alca.addEventListener(
      'pointerup',
      () => {
        alca.removeEventListener('pointermove', mover);
        caixa.classList.remove('arrastando');
        const r2 = caixa.getBoundingClientRect();
        try {
          localStorage.setItem(CHAVE_POSICAO, JSON.stringify([r2.left, r2.top]));
        } catch {
          /* ignora */
        }
      },
      { once: true },
    );
  });
  return caixa;
}
