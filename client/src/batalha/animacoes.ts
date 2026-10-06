// Animações básicas da batalha (Web Animations API). Fáceis de trocar por efeitos melhores depois.
import { corTipo, el } from '../ui/dom';
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

/**
 * Golpe: físico = o atacante avança; especial = um projétil da cor do tipo voa até o alvo;
 * status = um anel da cor do tipo pulsa no alvo.
 */
export async function animarGolpe(arena: HTMLElement, atacante: HTMLElement, alvo: HTMLElement | null, tipo: string, categoria: string) {
  const cor = corTipo(tipo);
  const destino = alvo ?? atacante;

  if (categoria === 'Physical' && alvo) {
    const de = centro(atacante, arena);
    const para = centro(alvo, arena);
    const dx = (para.x - de.x) * 0.35;
    const dy = (para.y - de.y) * 0.35;
    await esperarAnimacao(
      atacante.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }], {
        duration: 320,
        easing: 'ease-in-out',
      }),
    );
    explosao(arena, centro(alvo, arena), cor);
    await animarDano(alvo);
    return;
  }

  if (categoria === 'Special' && alvo) {
    const de = centro(atacante, arena);
    const para = centro(alvo, arena);
    const bola = el('div', { class: 'projetil', style: { background: cor, boxShadow: `0 0 18px 6px ${cor}` } });
    arena.append(bola);
    await esperarAnimacao(
      bola.animate(
        [
          { transform: `translate(${de.x}px,${de.y}px) scale(0.6)` },
          { transform: `translate(${para.x}px,${para.y}px) scale(1.2)` },
        ],
        { duration: 380, easing: 'ease-in' },
      ),
    );
    bola.remove();
    explosao(arena, para, cor);
    await animarDano(alvo);
    return;
  }

  // golpe de status (ou sem alvo): anel pulsando
  const ponto = centro(destino, arena);
  const anel = el('div', { class: 'anel', style: { borderColor: cor, left: `${ponto.x}px`, top: `${ponto.y}px` } });
  arena.append(anel);
  await Promise.all([
    esperarAnimacao(
      anel.animate([{ transform: 'translate(-50%,-50%) scale(0.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], {
        duration: 600,
        easing: 'ease-out',
      }),
    ),
    esperarAnimacao(atacante.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.8)' }, { filter: 'brightness(1)' }], { duration: 600 })),
  ]);
  anel.remove();
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
      duration: 550,
      easing: 'ease-out',
    }),
  );
  await esperarAnimacao(alvo.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(0)', filter: 'brightness(4)' }], { duration: 300, fill: 'forwards' }));
  await esperarAnimacao(bola.animate([pos(para), pos(chao)], { duration: 300, easing: 'ease-in', fill: 'forwards' }));
  // fixa a posição no chão (sem depender da animação continuar valendo)
  Object.assign(bola.style, pos(chao));

  for (let i = 0; i < tremidas; i++) {
    await new Promise((r) => setTimeout(r, 350));
    await esperarAnimacao(bola.animate([pos(chao, 'rotate(0)'), pos(chao, 'rotate(-25deg)'), pos(chao, 'rotate(25deg)'), pos(chao, 'rotate(0)')], { duration: 450 }));
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
