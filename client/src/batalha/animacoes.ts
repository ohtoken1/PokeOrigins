// Animações da batalha (Web Animations API): entrada, dano, desmaio, Pokébola, evolução e transformações.
// As dos golpes ficam em efeitosGolpes.ts.
import { el } from '../ui/dom';
import { Dex } from '@pkmn/sim';

/** Espera a animação acabar; com a aba em segundo plano o navegador congela animações, então há um limite de tempo. */
const esperarAnimacao = (a: Animation) => {
  const duracao = Number(a.effect?.getTiming().duration) || 500;
  return Promise.race([a.finished.then(() => undefined), new Promise<void>((r) => setTimeout(r, duracao + 150))]);
};

function centro(elemento: Element, arena: HTMLElement) {
  const r = elemento.getBoundingClientRect();
  const a = arena.getBoundingClientRect();
  return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 };
}

export function animarEntrada(sprite: HTMLElement) {
  return esperarAnimacao(
    sprite.animate(
      [
        { transform: 'scale(0)', filter: 'brightness(4)', opacity: 1 },
        { transform: 'scale(1)', filter: 'brightness(1)', opacity: 1 },
      ],
      { duration: 400, easing: 'ease-out', fill: 'forwards' },
    ),
  );
}

export function animarRetorno(sprite: HTMLElement) {
  return esperarAnimacao(
    sprite.animate(
      [
        { transform: 'scale(1)', filter: 'brightness(1)' },
        { transform: 'scale(0)', filter: 'brightness(4)' },
      ],
      { duration: 300, easing: 'ease-in', fill: 'forwards' },
    ),
  );
}

export function animarDesmaio(sprite: HTMLElement) {
  return esperarAnimacao(
    sprite.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(60px)', opacity: 0 }], {
      duration: 500,
      easing: 'ease-in',
      fill: 'forwards',
    }),
  );
}

export function animarDano(sprite: HTMLElement) {
  return esperarAnimacao(sprite.animate([{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }], { duration: 420 }));
}

export function tremerArena(arena: HTMLElement) {
  return esperarAnimacao(
    arena.animate(
      [
        { transform: 'translate(0,0)' },
        { transform: 'translate(-6px,2px)' },
        { transform: 'translate(6px,-2px)' },
        { transform: 'translate(-4px,0)' },
        { transform: 'translate(0,0)' },
      ],
      { duration: 280 },
    ),
  );
}

function explosao(arena: HTMLElement, ponto: { x: number; y: number }, cor: string) {
  const brilho = el('div', { class: 'explosao', style: { background: `radial-gradient(circle, #fff 0 15%, ${cor} 40%, transparent 70%)`, left: `${ponto.x}px`, top: `${ponto.y}px` } });
  arena.append(brilho);
  brilho
    .animate([{ transform: 'translate(-50%,-50%) scale(0.3)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }], {
      duration: 350,
      easing: 'ease-out',
    })
    .finished.then(() => brilho.remove());
}

/** Pokébola: voa até o selvagem, puxa ele para dentro, cai e treme. */
export async function animarBola(arena: HTMLElement, alvo: HTMLElement, tremidas: number, capturou: boolean, bolaId = 'pokeball') {
  const para = centro(alvo, arena);
  const de = { x: arena.clientWidth * 0.2, y: arena.clientHeight * 0.95 };
  const chao = { x: para.x, y: para.y + alvo.clientHeight * 0.35 };
  // sprite oficial da bola arremessada (Great Ball, Ultra Ball…)
  // imagem da PokéAPI ("Ultra Ball" → ultra-ball.png); se faltar, volta à bola desenhada
  const arquivo = (Dex.items.get(bolaId).name || 'Poke Ball').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-');
  const img = el('img', { src: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${arquivo}.png`, alt: '' });
  const bola = el('div', { class: 'pokebola com-sprite' }, img);
  img.addEventListener('error', () => {
    bola.className = 'pokebola';
    img.remove();
  });
  arena.append(bola);
  const pos = (p: { x: number; y: number }, extra = '') => ({ transform: `translate(${p.x}px,${p.y}px) translate(-50%,-50%) ${extra}` });

  await esperarAnimacao(
    bola.animate([pos(de, 'rotate(0)'), pos({ x: (de.x + para.x) / 2, y: Math.max(30, para.y - 45) }, 'rotate(360deg)'), pos(para, 'rotate(720deg)')], {
      duration: 900,
      easing: 'ease-out',
    }),
  );
  await esperarAnimacao(alvo.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(0)', filter: 'brightness(4)' }], { duration: 400, fill: 'forwards' }));
  await esperarAnimacao(bola.animate([pos(para), pos(chao)], { duration: 420, easing: 'ease-in', fill: 'forwards' }));
  // fixa a posição no chão (sem depender da animação continuar valendo)
  Object.assign(bola.style, pos(chao));

  for (let i = 0; i < tremidas; i++) {
    await new Promise((r) => setTimeout(r, 450));
    await esperarAnimacao(bola.animate([pos(chao, 'rotate(0)'), pos(chao, 'rotate(-25deg)'), pos(chao, 'rotate(25deg)'), pos(chao, 'rotate(0)')], { duration: 600 }));
  }
  await new Promise((r) => setTimeout(r, 350));

  if (capturou) {
    await esperarAnimacao(bola.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(0.55)' }], { duration: 300, fill: 'forwards' }));
    explosao(arena, chao, '#ffe066');
    await new Promise((r) => setTimeout(r, 500));
  } else {
    bola.remove();
    explosao(arena, chao, '#ffffff');
    await esperarAnimacao(alvo.animate([{ transform: 'scale(0)', filter: 'brightness(4)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 350, fill: 'forwards' }));
  }
  return () => bola.remove();
}

/** Evolução: o sprite pisca em branco alternando entre a forma antiga e a nova. */
export async function animarEvolucao(sprite: HTMLImageElement, srcNovo: string) {
  const antigo = sprite.src;
  for (let i = 0; i < 6; i++) {
    sprite.src = i % 2 ? antigo : srcNovo;
    await esperarAnimacao(sprite.animate([{ filter: 'brightness(5)' }, { filter: 'brightness(1)' }], { duration: 160 + i * 40 }));
  }
  sprite.src = srcNovo;
  await esperarAnimacao(sprite.animate([{ filter: 'brightness(6)', transform: 'scale(1.2)' }, { filter: 'brightness(1)', transform: 'scale(1)' }], { duration: 600 }));
}

/**
 * Transformação na batalha (Mega Evolução, Primal Reversion, outras formas): uma esfera de luz envolve o Pokémon,
 * ele fica branco, troca de forma no auge e a esfera explode em raios. `simbolo`: aparece por cima (Mega, Ω/α).
 */
export async function animarTransformacao(
  lugar: HTMLElement,
  sprite: HTMLImageElement,
  trocar: () => void,
  { cores, simbolo, rapida = false }: { cores: string[]; simbolo?: HTMLElement; rapida?: boolean },
) {
  const fundo = cores.length > 1 ? `conic-gradient(from 0deg, ${[...cores, cores[0]].join(', ')})` : `radial-gradient(circle, #fff 0 20%, ${cores[0]} 55%, transparent 72%)`;
  const esfera = el('div', { class: 'transf-esfera', style: { background: fundo } });
  const raios = el('div', { class: 'transf-raios' }, ...Array.from({ length: 10 }, (_, i) => el('span', { style: { transform: `rotate(${i * 36}deg)`, background: cores[i % cores.length] } })));
  lugar.append(esfera, raios);
  if (simbolo) lugar.append(simbolo);
  const t = rapida ? 0.55 : 1;

  // 1) a luz cresce girando em volta e o Pokémon vai ficando branco
  await Promise.all([
    esperarAnimacao(esfera.animate([{ transform: 'scale(0) rotate(0deg)', opacity: 0.2 }, { transform: 'scale(1.25) rotate(540deg)', opacity: 0.85 }], { duration: 1100 * t, easing: 'ease-in', fill: 'forwards' })),
    esperarAnimacao(sprite.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(8) saturate(0)' }], { duration: 1100 * t, fill: 'forwards' })),
    simbolo ? esperarAnimacao(simbolo.animate([{ opacity: 0, transform: 'scale(0.2)' }, { opacity: 1, transform: 'scale(1.1)' }], { duration: 700 * t, delay: 300 * t, fill: 'forwards' })) : Promise.resolve(),
  ]);
  // 2) no auge, troca a forma
  trocar();
  await new Promise((r) => setTimeout(r, 120));
  // 3) a esfera estoura em raios e o Pokémon aparece com a cor de volta
  await Promise.all([
    esperarAnimacao(esfera.animate([{ transform: 'scale(1.25)', opacity: 0.85 }, { transform: 'scale(2.4)', opacity: 0 }], { duration: 500 * t, easing: 'ease-out', fill: 'forwards' })),
    esperarAnimacao(raios.animate([{ transform: 'scale(0.3)', opacity: 1 }, { transform: 'scale(1.8)', opacity: 0 }], { duration: 600 * t, easing: 'ease-out', fill: 'forwards' })),
    esperarAnimacao(sprite.animate([{ filter: 'brightness(8) saturate(0)' }, { filter: 'brightness(1)' }], { duration: 700 * t, fill: 'forwards' })),
    simbolo ? esperarAnimacao(simbolo.animate([{ opacity: 1, transform: 'scale(1.1)' }, { opacity: 0, transform: 'scale(1.8)' }], { duration: 600 * t, fill: 'forwards' })) : Promise.resolve(),
  ]);
  esfera.remove();
  raios.remove();
  simbolo?.remove();
  // tira o filtro preso pelo "fill: forwards" (o brilho da Mega vem da classe)
  sprite.getAnimations().forEach((a) => a.cancel());
}

/**
 * Evolução fora da batalha (pedra, Linking Cord…): janela por cima de tudo com o Pokémon piscando entre a forma
 * antiga e a nova, como na evolução por nível. Resolve quando o jogador fecha.
 */
export function animarEvolucaoNaTela(antes: { nome: string; src: string }, depois: { nome: string; src: string }): Promise<void> {
  const img = el('img', { class: 'sprite evolucao-sprite', src: antes.src, alt: '' }) as HTMLImageElement;
  const texto = el('p', { class: 'evolucao-texto' }, `O quê? ${antes.nome} está evoluindo!`);
  const ok = el('button', { class: 'botao', hidden: true }, 'OK');
  const fundo = el('div', { class: 'evolucao-tela' }, el('div', { class: 'evolucao-caixa' }, el('div', { class: 'evolucao-palco' }, el('div', { class: 'evolucao-luz' }), img), texto, ok));
  document.body.append(fundo);
  return new Promise((resolver) => {
    void (async () => {
      await new Promise((r) => setTimeout(r, 700));
      await animarEvolucao(img, depois.src);
      texto.textContent = `Parabéns! ${antes.nome} evoluiu para ${depois.nome}!`;
      ok.hidden = false;
      ok.focus();
    })();
    ok.addEventListener('click', () => {
      fundo.remove();
      resolver();
    });
  });
}
