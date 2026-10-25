// Toca as animações de golpe do Pokémon Showdown (showdown/anims.js: as mesmas do site deles, ~930 golpes) na nossa
// arena. O arquivo deles descreve cada golpe chamando `scene.showEffect(...)`, `scene.backgroundEffect(...)` e
// `attacker.anim(...)`; aqui fica um "palco" que entende essas chamadas (posições e curvas copiadas do motor deles,
// battle-animations.ts, MIT) e desenha tudo em cima dos nossos sprites, quadro a quadro.
//
// Medidas do Showdown: palco de 640 × 360; o Pokémon de perto (o do jogador) fica em (210, 245) com z = 0 e o de
// longe em (430, 135) com z = 200. Esses dois pontos são casados com o centro dos nossos dois sprites.
import type { EfeitoShowdown } from './showdown/anims.js';
import { ajustarAnimacoes } from './animsNossas';

const FX = 'https://play.pokemonshowdown.com/fx/';

type Loc = { x?: number; y?: number; z?: number; scale?: number; xscale?: number; yscale?: number; opacity?: number; time?: number };
type Caixa = { left: number; top: number; width: number; height: number; opacity: number };
type Curva = (x: number) => number;
type Curvas = Record<keyof Caixa, Curva>;
interface Trecho { t0: number; t1: number; de: Caixa; para: Caixa; curvas: Curvas }
interface Peca { trechos: Trecho[]; aplicar: (c: Caixa | null) => void }

// curvas do jQuery e as que o Showdown acrescenta
const linear: Curva = (x) => x;
const swing: Curva = (x) => 0.5 - Math.cos(x * Math.PI) / 2;
const ballisticUp: Curva = (x) => -3 * x * x + 4 * x;
const ballisticDown: Curva = (x) => 1 - ballisticUp(1 - x);
const quadUp: Curva = (x) => 1 - (1 - x) * (1 - x);
const quadDown: Curva = (x) => x * x;

/** Onde um efeito aparece no palco do Showdown (cópia do `pos` deles). */
function pos(loc: Loc, obj: EfeitoShowdown): Caixa {
  const l = { x: 0, y: 0, z: 0, scale: 1, opacity: 1, ...loc };
  const xscale = l.xscale || l.xscale === 0 ? l.xscale : l.scale;
  const yscale = l.yscale || l.yscale === 0 ? l.yscale : l.scale;
  let left = 210;
  let top = 245;
  let escala = obj.gen === 5 ? 2.0 - l.z / 200 : 1.5 - 0.5 * (l.z / 200);
  if (escala < 0.1) escala = 0.1;
  left += (410 - 190) * (l.z / 200);
  top += (135 - 245) * (l.z / 200);
  left += Math.floor(l.x * escala);
  top -= Math.floor(l.y * escala);
  const width = Math.floor(obj.w * escala * xscale);
  const height = Math.floor(obj.h * escala * yscale);
  const hoffset = Math.floor((obj.h - (obj.y || 0) * 2) * escala * yscale);
  left -= Math.floor(width / 2);
  top -= Math.floor(hoffset / 2);
  return { left, top, width, height, opacity: l.opacity };
}
/** Curva de cada medida para a transição pedida (cópia do `posT` deles). */
function curvasDe(transicao: string | undefined, para: Caixa, de: Caixa, loc: Loc): Curvas {
  const c: Curvas = { left: linear, top: linear, width: linear, height: linear, opacity: linear };
  const sobe = para.top < de.top;
  if (transicao === 'ballistic') c.top = sobe ? ballisticUp : ballisticDown;
  else if (transicao === 'ballisticUnder') c.top = sobe ? ballisticDown : ballisticUp;
  else if (transicao === 'ballistic2') c.top = sobe ? quadUp : quadDown;
  else if (transicao === 'ballistic2Back') c.top = (loc.z ?? 0) > 0 ? quadUp : quadDown;
  else if (transicao === 'ballistic2Under') c.top = sobe ? quadDown : quadUp;
  else if (transicao === 'swing') c.left = c.top = c.width = c.height = swing;
  else if (transicao === 'accel') c.left = c.top = c.width = c.height = quadDown;
  else if (transicao === 'decel') c.left = c.top = c.width = c.height = quadUp;
  return c;
}
const CHAVES: (keyof Caixa)[] = ['left', 'top', 'width', 'height', 'opacity'];
/** Como a peça está no instante `t` (null = ainda não apareceu). */
function estadoEm(p: Peca, t: number): Caixa | null {
  let atual: Trecho | null = null;
  for (const tr of p.trechos) if (tr.t0 <= t && (!atual || tr.t0 >= atual.t0)) atual = tr;
  if (!atual) return null;
  if (t >= atual.t1) return atual.para;
  const x = (t - atual.t0) / (atual.t1 - atual.t0);
  const c = {} as Caixa;
  for (const k of CHAVES) c[k] = atual.de[k] + (atual.para[k] - atual.de[k]) * atual.curvas[k](x);
  return c;
}

let dados: Promise<typeof import('./showdown/anims.js')> | null = null;
/** O arquivo das animações é grande: só é baixado na primeira batalha. */
export const carregarAnimacoes = () =>
  (dados ??= import('./showdown/anims.js').then((m) => {
    // golpes sem animação e animações emprestadas ganham as nossas (animsNossas.ts)
    ajustarAnimacoes(m);
    return m;
  }));

const centroDe = (e: Element, arena: HTMLElement) => {
  const r = e.getBoundingClientRect();
  const a = arena.getBoundingClientRect();
  return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2, w: r.width, h: r.height };
};

/** Golpes que tremem a tela além dos que o Showdown já treme (Earthquake, Bulldoze e Earth Power usam `$bg`). */
const TREMEM = new Set([
  'magnitude', 'fissure', 'precipiceblades', 'stompingtantrum', 'thousandarrows', 'thousandwaves', 'headlongrush', 'highhorsepower',
  'explosion', 'selfdestruct', 'mistyexplosion', 'heavyslam', 'heatcrash', 'bodypress', 'gigaimpact', 'dracometeor', 'meteorbeam',
  'rockslide', 'stoneedge', 'rockwrecker', 'headsmash', 'woodhammer', 'dragonhammer', 'gigatonhammer', 'hammerarm', 'icehammer',
  'crushgrip', 'superpower', 'outrage', 'ragingbull', 'collisioncourse', 'electrodrift', 'sacredsword', 'diamondstorm', 'landswrath',
  'tectonicrage', 'continentalcrash', 'supersonicskystrike', 'shatteredpsyche',
]);

export interface OpcoesShowdown {
  /** 1º turno dos golpes de dois turnos (Solar Beam, Fly…): toca a parte de preparo (`prepareAnim`) */
  preparo?: boolean;
  /** o golpe errou: a animação vai para um ponto ao lado do alvo, como no Showdown (`missedPokemon`) */
  errou?: boolean;
}

/**
 * Toca a animação do Showdown para o golpe. `defensor` = quem recebe (o próprio atacante nos golpes em si mesmo).
 * Devolve false se o Showdown não tem animação para este golpe (quem chamou usa a nossa).
 */
export async function animarComShowdown(arena: HTMLElement, atacante: HTMLElement, defensor: HTMLElement, golpeId: string, opcoes: OpcoesShowdown = {}): Promise<boolean> {
  const m = await carregarAnimacoes().catch(() => null);
  const entrada = m?.BattleMoveAnims[golpeId];
  const roteiroDoGolpe = opcoes.preparo ? entrada?.prepareAnim : entrada?.anim;
  if (!m || !roteiroDoGolpe || document.hidden) return false;

  // quem está perto (o do jogador) e quem está longe; os dois pontos do Showdown casam com os nossos centros
  const outro = atacante === defensor ? arena.querySelector<HTMLElement>(atacante.closest('.lugar-jogador') ? '.sprite-selvagem' : '.sprite-jogador') : defensor;
  const dePerto = (e: HTMLElement) => !!e.closest('.lugar-jogador');
  const [perto, longe] = dePerto(atacante) ? [atacante, outro] : [outro, atacante];
  if (!perto || !longe || perto === longe) return false;
  const [A, B] = [centroDe(perto, arena), centroDe(longe, arena)];
  let sx = (B.x - A.x) / 220;
  let sy = (B.y - A.y) / -110;
  if (!(sx > 0.3)) sx = 1;
  if (!(sy > 0.3)) sy = 1;
  // tamanho dos efeitos: a média das duas escalas, sem exagerar
  const su = Math.max(0.8, Math.min(2.2, (sx + sy) / 2));
  const telaX = (x: number) => A.x + (x - 210) * sx;
  const telaY = (y: number) => A.y + (y - 245) * sy;

  const pecas: Peca[] = [];
  const nos: HTMLElement[] = [];
  const imagens: HTMLImageElement[] = [];
  // tremor da tela: o Showdown mexe o cenário dele (`$bg`, top −90 = parado); aqui a arena inteira treme junto
  const tremor: Peca = { trechos: [], aplicar: (c) => void (arena.style.translate = c ? `0 ${Math.round(c.top * 1.1)}px` : '') };
  let cursorTremor = 0;
  let ultimoTremor = 0;
  const parado = (top: number): Caixa => ({ left: 0, top, width: 0, height: 0, opacity: 1 });
  const tremer = (top: number, tempo: number) => {
    tremor.trechos.push({ t0: cursorTremor, t1: cursorTremor + tempo, de: parado(ultimoTremor), para: parado(top), curvas: curvasDe('swing', parado(top), parado(ultimoTremor), {}) });
    cursorTremor += tempo;
    ultimoTremor = top;
  };
  const cena = {
    timeOffset: 0,
    animating: true,
    acceleration: 1,
    battle: { mySide: { x: 0, y: 0, z: 0 } },
    // os golpes de terremoto balançam o cenário deles (jQuery `$bg.animate({ top, bottom }, tempo)`)
    $bg: {
      animate(css: { top?: number }, tempo = 400) {
        tremer((css.top ?? -90) + 90, tempo);
        return this;
      },
      delay(tempo: number) {
        cursorTremor += tempo;
        return this;
      },
      css() { return this; },
    },
    wait(tempo: number) { cena.timeOffset += tempo; },
    showEffect(efeito: string | EfeitoShowdown, inicio: Loc, fim: Loc, transicao?: string, depois?: string) {
      const ef = typeof efeito === 'string' ? m.BattleEffects[efeito] : efeito;
      if (!ef) return null;
      const img = document.createElement('img');
      img.className = 'fx-golpe fx-showdown';
      img.alt = '';
      img.src = /^(https?:|data:|blob:|\/)/.test(ef.url) ? ef.url : FX + ef.url;
      img.style.opacity = '0';
      arena.append(img);
      nos.push(img);
      imagens.push(img);
      const peca: Peca = {
        trechos: [],
        aplicar: (c) => {
          if (!c) return void (img.style.opacity = '0');
          const [w, h] = [c.width * su, c.height * su];
          img.style.width = `${w}px`;
          img.style.height = `${h}px`;
          img.style.transform = `translate(${telaX(c.left + c.width / 2) - w / 2}px, ${telaY(c.top + c.height / 2) - h / 2}px)`;
          img.style.opacity = String(c.opacity);
        },
      };
      pecas.push(peca);
      return cena.animateEffect(peca, ef, inicio, fim, transicao, depois);
    },
    animateEffect(peca: Peca | null, efeito: string | EfeitoShowdown, inicio: Loc, fim: Loc, transicao?: string, depois?: string) {
      const ef = typeof efeito === 'string' ? m.BattleEffects[efeito] : efeito;
      if (!peca || !ef) return peca;
      const ini: Loc = { ...inicio };
      let final: Loc = { ...fim };
      if (!ini.time) ini.time = 0;
      if (!final.time) final.time = ini.time + 500;
      ini.time += cena.timeOffset;
      final.time += cena.timeOffset;
      if (!final.scale && final.scale !== 0 && ini.scale) final.scale = ini.scale;
      if (!final.xscale && final.xscale !== 0 && ini.xscale) final.xscale = ini.xscale;
      if (!final.yscale && final.yscale !== 0 && ini.yscale) final.yscale = ini.yscale;
      final = { ...ini, ...final };
      const [de, para] = [pos(ini, ef), pos(final, ef)];
      peca.trechos.push({ t0: ini.time, t1: Math.max(ini.time + 1, final.time!), de, para, curvas: curvasDe(transicao, para, de, final) });
      const t1 = Math.max(ini.time + 1, final.time!);
      const lin: Curvas = { left: swing, top: swing, width: swing, height: swing, opacity: swing };
      if (depois === 'fade') peca.trechos.push({ t0: t1, t1: t1 + 100, de: para, para: { ...para, opacity: 0 }, curvas: lin });
      if (depois === 'explode') {
        const maior: Loc = { ...final, opacity: 0 };
        if (maior.scale) maior.scale *= 3;
        if (maior.xscale) maior.xscale *= 3;
        if (maior.yscale) maior.yscale *= 3;
        peca.trechos.push({ t0: t1, t1: t1 + 200, de: para, para: pos(maior, ef), curvas: lin });
      }
      return peca;
    },
    backgroundEffect(fundo: string, duracao: number, opacidade = 1, atraso = 0) {
      const div = document.createElement('div');
      div.className = 'fx-fundo-golpe';
      div.style.background = fundo;
      div.style.opacity = '0';
      arena.prepend(div);
      nos.push(div);
      const c = (o: number): Caixa => ({ left: 0, top: 0, width: 0, height: 0, opacity: o });
      const lin: Curvas = { left: linear, top: linear, width: linear, height: linear, opacity: swing };
      const fica = Math.max(250, duracao);
      pecas.push({
        trechos: [
          { t0: atraso, t1: atraso + 250, de: c(0), para: c(opacidade), curvas: lin },
          { t0: atraso + fica, t1: atraso + fica + 250, de: c(opacidade), para: c(0), curvas: lin },
        ],
        aplicar: (x) => (div.style.opacity = String(x?.opacity ?? 0)),
      });
    },
  };

  /** Um dos nossos sprites, do jeito que as animações do Showdown esperam (posição, fila de movimentos). */
  const boneco = (no: HTMLElement, frente: boolean, deslocado = 0) => {
    const ct = frente ? B : A;
    const esc = frente ? 1 : 1.5;
    // medidas "do Showdown" que dão o tamanho que o nosso sprite tem na tela (para as cópias dele: Double Team…)
    const sp: EfeitoShowdown = { url: (no as HTMLImageElement).currentSrc || (no as HTMLImageElement).src || '', w: ct.w / (su * esc), h: ct.h / (su * esc) };
    const b = { x: deslocado, y: 0, z: frente ? 200 : 0, sp, isFrontSprite: frente, isMissedPokemon: !!deslocado };
    const repouso = pos(b, sp);
    const original = { transform: no.style.transform, origem: no.style.transformOrigin, opacity: no.style.opacity, transicao: no.style.transition };
    let cursor = 0;
    let ultimo = repouso;
    const peca: Peca = {
      trechos: [],
      aplicar: (c) => {
        const k = c ?? repouso;
        const dx = (k.left + k.width / 2 - (repouso.left + repouso.width / 2)) * sx;
        const dy = (k.top + k.height / 2 - (repouso.top + repouso.height / 2)) * sy;
        no.style.transform = `translate(${dx}px, ${dy}px) scale(${k.width / (repouso.width || 1)}, ${k.height / (repouso.height || 1)})`;
        no.style.opacity = String(k.opacity);
      },
    };
    pecas.push(peca);
    return Object.assign(b, {
      peca,
      comecar() {
        // a animação de entrada termina "presa" (fill forwards) e passaria por cima do movimento (Close Combat…)
        for (const a of no.getAnimations()) if (a.playState === 'finished') a.cancel();
        no.style.transition = 'none';
        no.style.transformOrigin = '50% 50%';
      },
      voltar() {
        no.style.transform = original.transform;
        no.style.transformOrigin = original.origem;
        no.style.opacity = original.opacity;
        no.style.transition = original.transicao;
      },
      delay(tempo: number) { cursor += tempo; return this; },
      anim(fim: Loc, transicao?: string) {
        const final = { x: b.x, y: b.y, z: b.z, scale: 1, opacity: 1, time: 500, ...fim };
        const para = pos(final, sp);
        const t1 = cursor + Math.max(1, final.time);
        peca.trechos.push({ t0: cursor, t1, de: ultimo, para, curvas: curvasDe(transicao, para, repouso, final) });
        cursor = t1;
        ultimo = para;
        return this;
      },
      leftof: (d: number) => b.x + (frente ? 1 : -1) * d,
      behind: (d: number) => b.z + (frente ? 1 : -1) * d,
      behindx: (d: number) => b.x + (frente ? 1 : -1) * d,
      behindy: (d: number) => b.y + (frente ? -1 : 1) * d,
    });
  };
  const bAtacante = boneco(atacante, !dePerto(atacante));
  // errou: um "alvo de mentira" ao lado do de verdade (o de verdade não se mexe), 100 unidades para a esquerda dele
  const falso = document.createElement('div');
  const bDefensor = defensor === atacante ? bAtacante : opcoes.errou ? boneco(falso, !dePerto(defensor), -100) : boneco(defensor, !dePerto(defensor));
  const bonecos = bDefensor === bAtacante ? [bAtacante] : [bAtacante, bDefensor];

  const limpar = () => {
    for (const n of nos) n.remove();
    for (const b of bonecos) b.voltar();
    arena.style.translate = '';
  };
  try {
    roteiroDoGolpe(cena, [bAtacante, bDefensor]);
  } catch {
    limpar();
    return false;
  }
  // golpes pesados que o Showdown não treme: um tremor curto no meio da animação
  if (!opcoes.preparo && !opcoes.errou && !tremor.trechos.length && TREMEM.has(golpeId)) {
    const fimAnim = Math.max(0, ...pecas.flatMap((p) => p.trechos.map((t) => t.t1)));
    cursorTremor = Math.max(0, fimAnim * 0.45);
    for (const [top, tempo] of [[-10, 70], [8, 80], [-6, 80], [4, 80], [-2, 80], [0, 80]]) tremer(top, tempo);
  }
  if (tremor.trechos.length) pecas.push(tremor);
  const total = Math.max(0, ...pecas.flatMap((p) => p.trechos.map((t) => t.t1)));
  if (!total) {
    limpar();
    return false;
  }
  // espera (pouco) as imagens dos efeitos chegarem, para o começo não sair em branco
  await Promise.race([Promise.all(imagens.map((i) => i.decode().catch(() => undefined))), new Promise((r) => setTimeout(r, 700))]);

  for (const b of bonecos) b.comecar();
  await new Promise<void>((acabou) => {
    const inicio = performance.now();
    let fim = false;
    const terminar = () => {
      if (fim) return;
      fim = true;
      acabou();
    };
    // com a aba em segundo plano o navegador para os quadros: o relógio garante o fim
    const relogio = setTimeout(terminar, total + 400);
    const quadro = (agora: number) => {
      if (fim) return;
      const t = agora - inicio;
      for (const p of pecas) p.aplicar(estadoEm(p, t));
      if (t >= total) {
        clearTimeout(relogio);
        terminar();
      } else requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  });
  limpar();
  return true;
}
