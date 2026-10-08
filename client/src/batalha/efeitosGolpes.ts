// Animações dos golpes, inspiradas nas do Pokémon Showdown (que imitam os jogos): usam as mesmas imagens de efeito
// do Showdown (play.pokemonshowdown.com/fx: bola de fogo, folhas, raio, pedras, mordida, soco…), carregadas direto
// de lá como os ícones de itens. Cada golpe escolhe um "roteiro": primeiro os golpes famosos (Thunderbolt, Earthquake,
// Surf…), depois pelas marcas do golpe (soco, mordida, corte, som, chute) e por fim pela categoria e pelo tipo.
import { Dex } from '@pkmn/sim';
import { corTipo, el } from '../ui/dom';

const FX = 'https://play.pokemonshowdown.com/fx/';

type Ponto = { x: number; y: number };
/** `oposto` = Pokémon do outro lado (golpes que miram o lado do adversário, como os hazards, vêm sem alvo). */
type Contexto = { arena: HTMLElement; atacante: HTMLElement; alvo: HTMLElement | null; oposto: HTMLElement | null; tipo: string; cor: string; golpe: string };

/**
 * Hazards (como no Pokémon Showdown): cada peça é arremessada em arco do atacante até o chão em volta do adversário e
 * FICA lá enquanto o hazard existir. `pecas[i]` = [dx, altura acima do chão] em px a partir dos pés do Pokémon
 * (o lado do jogador espelha o dx). Spikes/Toxic Spikes: uma peça por camada.
 */
export const HAZARDS: Record<string, { fx: string[]; tamanho: number; opacidade: number; pecas: [number, number][]; porCamada?: boolean }> = {
  // posições do Showdown abertas 1,5× (os nossos sprites são maiores que os de lá)
  stealthrock: { fx: ['rock1', 'rock2', 'rock1', 'rock2'], tamanho: 28, opacidade: 0.75, pecas: [[-60, 12], [-30, 52], [45, 26], [15, 40]] },
  spikes: { fx: ['caltrop'], tamanho: 28, opacidade: 1, pecas: [[-38, 0], [75, 0], [45, -6]], porCamada: true },
  toxicspikes: { fx: ['poisoncaltrop'], tamanho: 28, opacidade: 1, pecas: [[8, -2], [-22, 6]], porCamada: true },
  stickyweb: { fx: ['web'], tamanho: 96, opacidade: 0.45, pecas: [[15, -4]] },
};

/** Ponto (na arena) de uma peça de hazard em volta de quem está no `lugar` (pés do Pokémon = base do lugar). */
export function pontoHazard(arena: HTMLElement, lugar: HTMLElement, [dx, altura]: [number, number], espelhar: boolean): Ponto {
  const r = lugar.getBoundingClientRect();
  const a = arena.getBoundingClientRect();
  return { x: r.left - a.left + r.width / 2 + (espelhar ? -dx : dx), y: r.bottom - a.top - altura };
}

/** Arremessa as peças do hazard em arco até o lado adversário (só a animação; quem deixa as peças lá é a tela). */
async function arremessarHazard(ctx: Contexto, id: string) {
  const h = HAZARDS[id];
  const lugar = ctx.oposto?.parentElement;
  if (!h || !lugar) return;
  const de = centro(ctx.atacante, ctx.arena);
  const espelhar = lugar.classList.contains('lugar-jogador');
  // Spikes/Toxic Spikes jogam todas as peças da animação (o Showdown também), mas só ficam as das camadas
  await Promise.all(
    h.pecas.map((p, i) => voar(ctx, h.fx[i % h.fx.length], de, pontoHazard(ctx.arena, lugar, p, espelhar), { tamanho: h.tamanho, duracao: 520, atraso: i * (id === 'stealthrock' ? 75 : 125), arco: 70 })),
  );
}

const pausa = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Espera a animação (com limite de tempo: com a aba em segundo plano o navegador congela animações). */
const fim = (a: Animation) => {
  const duracao = Number(a.effect?.getTiming().duration) || 500;
  const atraso = Number(a.effect?.getTiming().delay) || 0;
  return Promise.race([a.finished.then(() => undefined).catch(() => undefined), pausa(duracao + atraso + 150)]);
};

function centro(elemento: Element, arena: HTMLElement): Ponto {
  const r = elemento.getBoundingClientRect();
  const a = arena.getBoundingClientRect();
  return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 };
}

/** Imagem de efeito do Showdown (ou um círculo de luz, se `nome` for null) num ponto da arena. */
function efeito(ctx: Contexto, nome: string | null, tamanho: number, extra: Partial<CSSStyleDeclaration> = {}): HTMLElement {
  const elemento = nome
    ? el('img', { class: 'fx-golpe', src: `${FX}${nome}.png`, alt: '', referrerpolicy: 'no-referrer' })
    : el('div', { class: 'fx-golpe fx-luz', style: { background: `radial-gradient(circle, #fff 0 18%, ${ctx.cor} 45%, transparent 70%)` } });
  Object.assign(elemento.style, { width: `${tamanho}px`, height: `${tamanho}px`, ...extra });
  ctx.arena.append(elemento);
  return elemento;
}

const pos = (p: Ponto, extra = '') => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) ${extra}`;
const misturar = (a: Ponto, b: Ponto, t: number): Ponto => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const ao = (p: Ponto, dx: number, dy: number): Ponto => ({ x: p.x + dx, y: p.y + dy });
const sorteio = (n: number) => (Math.random() - 0.5) * n;

/** Um efeito que voa de `de` até `para` e some. */
async function voar(ctx: Contexto, nome: string | null, de: Ponto, para: Ponto, opcoes: { tamanho?: number; duracao?: number; atraso?: number; girar?: boolean; arco?: number } = {}) {
  const { tamanho = 48, duracao = 380, atraso = 0, girar = false, arco = 0 } = opcoes;
  const fx = efeito(ctx, nome, tamanho, { opacity: '0' });
  const meio = ao(misturar(de, para, 0.5), 0, -arco);
  const a = fx.animate(
    [
      { transform: pos(de, `scale(0.5) rotate(0deg)`), opacity: 1 },
      { transform: pos(meio, `scale(0.9) rotate(${girar ? 200 : 0}deg)`), opacity: 1 },
      { transform: pos(para, `scale(1.1) rotate(${girar ? 400 : 0}deg)`), opacity: 0.9 },
    ],
    { duration: duracao, delay: atraso, easing: 'ease-in', fill: 'both' },
  );
  await fim(a);
  fx.remove();
}

/** Efeito que aparece num ponto, cresce e some. */
async function estourar(ctx: Contexto, nome: string | null, p: Ponto, opcoes: { tamanho?: number; duracao?: number; atraso?: number; de?: number; ate?: number; giro?: number } = {}) {
  const { tamanho = 80, duracao = 380, atraso = 0, de = 0.4, ate = 1.4, giro = 0 } = opcoes;
  const fx = efeito(ctx, nome, tamanho, { opacity: '0' });
  const a = fx.animate(
    [
      { transform: pos(p, `scale(${de}) rotate(0deg)`), opacity: 1 },
      { transform: pos(p, `scale(${ate}) rotate(${giro}deg)`), opacity: 0 },
    ],
    { duration: duracao, delay: atraso, easing: 'ease-out', fill: 'both' },
  );
  await fim(a);
  fx.remove();
}

/** O alvo pisca (levou o golpe). */
const piscar = (alvo: HTMLElement) => fim(alvo.animate([{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }], { duration: 420 }));
/** A arena treme (forte = terremoto). */
const tremer = (arena: HTMLElement, forte = false) => {
  const d = forte ? 10 : 5;
  return fim(
    arena.animate(
      [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ transform: i === 7 ? 'translate(0,0)' : `translate(${(i % 2 ? -1 : 1) * d}px, ${(i % 3) - 1}px)` })),
      { duration: forte ? 700 : 300 },
    ),
  );
};
/** A tela inteira da arena fica de uma cor por um instante (raio, golpes psíquicos, clima). */
async function tingir(ctx: Contexto, cor: string, duracao = 450, forca = 0.45) {
  const camada = el('div', { class: 'fx-tela', style: { background: cor } });
  ctx.arena.append(camada);
  await fim(camada.animate([{ opacity: 0 }, { opacity: forca }, { opacity: 0 }], { duration: duracao }));
  camada.remove();
}
/** O atacante avança até perto do alvo e volta. */
async function avancar(ctx: Contexto, quanto = 0.4, duracao = 320) {
  if (!ctx.alvo) return;
  const de = centro(ctx.atacante, ctx.arena);
  const para = centro(ctx.alvo, ctx.arena);
  const [dx, dy] = [(para.x - de.x) * quanto, (para.y - de.y) * quanto];
  await fim(ctx.atacante.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }], { duration: duracao, easing: 'ease-in-out' }));
}
/** Brilho em volta do Pokémon (aura que sobe). */
async function aura(ctx: Contexto, quem: HTMLElement, cor = ctx.cor, nome: string | null = null) {
  const p = centro(quem, ctx.arena);
  const brilho = quem.animate([{ filter: 'brightness(1)' }, { filter: `brightness(1.6) drop-shadow(0 0 10px ${cor})` }, { filter: 'brightness(1)' }], { duration: 700 });
  await Promise.all([
    fim(brilho),
    ...[0, 1, 2, 3, 4, 5].map((i) => voar(ctx, nome, ao(p, sorteio(70), 40), ao(p, sorteio(70), -50), { tamanho: nome ? 28 : 22, duracao: 520, atraso: i * 70 })),
  ]);
}

// ---------- roteiros ----------

/** Vários efeitos em sequência do atacante até o alvo (jatos e raios: Flamethrower, Surf, Ice Beam…). */
async function jato(ctx: Contexto, nome: string | null, quantidade = 8, tamanho = 44, espalhar = 18) {
  if (!ctx.alvo) return;
  const de = centro(ctx.atacante, ctx.arena);
  const para = centro(ctx.alvo, ctx.arena);
  await Promise.all(Array.from({ length: quantidade }, (_, i) => voar(ctx, nome, de, ao(para, sorteio(espalhar), sorteio(espalhar)), { tamanho, duracao: 360, atraso: i * 55 })));
  await Promise.all([estourar(ctx, nome, para, { tamanho: tamanho * 2 }), piscar(ctx.alvo)]);
}

/** Um projetil grande (Shadow Ball, Sludge Bomb, Energy Ball…). */
async function bola(ctx: Contexto, nome: string | null, tamanho = 64) {
  if (!ctx.alvo) return;
  const de = centro(ctx.atacante, ctx.arena);
  const para = centro(ctx.alvo, ctx.arena);
  await voar(ctx, nome, de, para, { tamanho, duracao: 450, girar: true, arco: 30 });
  await Promise.all([estourar(ctx, nome, para, { tamanho: tamanho * 1.8 }), estourar(ctx, null, para, { tamanho: 120 }), piscar(ctx.alvo)]);
}

/** Coisas caindo do alto no alvo (Rock Slide, Thunder, Draco Meteor, Blizzard…). */
async function chuva(ctx: Contexto, nome: string, quantidade = 5, tamanho = 46) {
  if (!ctx.alvo) return;
  const para = centro(ctx.alvo, ctx.arena);
  await Promise.all(Array.from({ length: quantidade }, (_, i) => voar(ctx, nome, ao(para, sorteio(90), -220), ao(para, sorteio(70), sorteio(30)), { tamanho, duracao: 380, atraso: i * 90 })));
  await Promise.all([tremer(ctx.arena), piscar(ctx.alvo)]);
}

/** Raio do céu (Thunderbolt, Thunder, Thunder Shock). */
async function raio(ctx: Contexto) {
  if (!ctx.alvo) return;
  const para = centro(ctx.alvo, ctx.arena);
  const fx = efeito(ctx, 'lightning', 120, { opacity: '0' });
  const a = fx.animate(
    [
      { transform: `translate(${para.x}px, ${para.y - 70}px) translate(-50%, -50%) scaleY(0.2)`, opacity: 1 },
      { transform: `translate(${para.x}px, ${para.y - 70}px) translate(-50%, -50%) scaleY(1.6)`, opacity: 1 },
      { transform: `translate(${para.x}px, ${para.y - 70}px) translate(-50%, -50%) scaleY(1.6)`, opacity: 0 },
    ],
    { duration: 420, fill: 'both' },
  );
  await Promise.all([tingir(ctx, '#fff7a0', 420, 0.5), fim(a), pausa(150).then(() => estourar(ctx, 'electroball', para, { tamanho: 110 }))]);
  fx.remove();
  await piscar(ctx.alvo);
}

/** Terremoto: a arena treme forte e pedras sobem do chão embaixo do alvo. */
async function terremoto(ctx: Contexto) {
  const para = ctx.alvo ? centro(ctx.alvo, ctx.arena) : centro(ctx.atacante, ctx.arena);
  const chao = ao(para, 0, 40);
  await Promise.all([
    tremer(ctx.arena, true),
    ...[0, 1, 2, 3].map((i) => voar(ctx, 'rock3', ao(chao, sorteio(80), 10), ao(chao, sorteio(80), -60), { tamanho: 34, duracao: 420, atraso: i * 110 })),
  ]);
  if (ctx.alvo) await piscar(ctx.alvo);
}

/** Folhas girando até o alvo (Razor Leaf, Magical Leaf, Leaf Storm, Petal Dance…). */
async function folhas(ctx: Contexto, nome = 'leaf1') {
  if (!ctx.alvo) return;
  const de = centro(ctx.atacante, ctx.arena);
  const para = centro(ctx.alvo, ctx.arena);
  await Promise.all(Array.from({ length: 7 }, (_, i) => voar(ctx, i % 2 ? nome : nome === 'leaf1' ? 'leaf2' : nome, ao(de, sorteio(40), sorteio(40)), ao(para, sorteio(40), sorteio(30)), { tamanho: 30, duracao: 450, atraso: i * 60, girar: true, arco: 40 + sorteio(40) })));
  await piscar(ctx.alvo);
}

/** Sugar energia: bolinhas saem do alvo e voltam para o atacante (Absorb, Giga Drain, Drain Punch…). */
async function drenar(ctx: Contexto) {
  if (!ctx.alvo) return;
  const de = centro(ctx.atacante, ctx.arena);
  const para = centro(ctx.alvo, ctx.arena);
  await Promise.all([estourar(ctx, 'energyball', para, { tamanho: 70 }), piscar(ctx.alvo)]);
  await Promise.all(Array.from({ length: 6 }, (_, i) => voar(ctx, 'energyball', ao(para, sorteio(40), sorteio(40)), de, { tamanho: 22, duracao: 450, atraso: i * 60, arco: 20 })));
  await aura(ctx, ctx.atacante, '#7fe07f');
}

/** Ondas saindo do atacante (golpes de som: Growl, Roar, Hyper Voice, Boomburst; e Psychic). */
async function ondas(ctx: Contexto, cor = ctx.cor) {
  const de = centro(ctx.atacante, ctx.arena);
  const para = ctx.alvo ? centro(ctx.alvo, ctx.arena) : de;
  const aneis = [0, 1, 2].map((i) => {
    const anel = el('div', { class: 'fx-golpe fx-anel', style: { borderColor: cor } });
    ctx.arena.append(anel);
    return fim(anel.animate([{ transform: pos(de, 'scale(0.3)'), opacity: 1 }, { transform: pos(misturar(de, para, 0.85), 'scale(1.3)'), opacity: 0 }], { duration: 520, delay: i * 140, fill: 'both' })).then(() => anel.remove());
  });
  await Promise.all(aneis);
  if (ctx.alvo) await piscar(ctx.alvo);
}

/** Corpo a corpo com um desenho no alvo (soco, chute, mordida, garra, corte). */
async function contato(ctx: Contexto, desenho: 'soco' | 'chute' | 'mordida' | 'garra' | 'corte' | 'impacto') {
  if (!ctx.alvo) return;
  const para = centro(ctx.alvo, ctx.arena);
  await avancar(ctx);
  if (desenho === 'mordida') {
    // as duas mandíbulas fecham no alvo
    const cima = efeito(ctx, 'topbite', 70, { opacity: '0' });
    const baixo = efeito(ctx, 'bottombite', 70, { opacity: '0' });
    await Promise.all([
      fim(cima.animate([{ transform: pos(ao(para, 0, -40)), opacity: 1 }, { transform: pos(ao(para, 0, -10)), opacity: 1 }], { duration: 260, fill: 'both' })),
      fim(baixo.animate([{ transform: pos(ao(para, 0, 40)), opacity: 1 }, { transform: pos(ao(para, 0, 10)), opacity: 1 }], { duration: 260, fill: 'both' })),
    ]);
    cima.remove();
    baixo.remove();
  } else if (desenho === 'garra' || desenho === 'corte') {
    const [a, b] = desenho === 'garra' ? ['leftclaw', 'rightclaw'] : ['leftslash', 'rightslash'];
    await Promise.all([estourar(ctx, a, ao(para, -12, 0), { tamanho: 70, de: 0.8, ate: 1.1 }), estourar(ctx, b, ao(para, 12, 0), { tamanho: 70, de: 0.8, ate: 1.1, atraso: 120 })]);
  } else {
    const nome = desenho === 'soco' ? 'fist' : desenho === 'chute' ? 'foot' : 'impact';
    await Promise.all([estourar(ctx, nome, para, { tamanho: desenho === 'impacto' ? 90 : 60, de: 1.2, ate: 0.8 }), estourar(ctx, null, para, { tamanho: 100, atraso: 120 })]);
  }
  await Promise.all([tremer(ctx.arena), piscar(ctx.alvo)]);
}

/** Proteção (Protect, Detect, Light Screen, Reflect…): uma bolha em volta do atacante. */
async function escudo(ctx: Contexto, cor = '#7fe0ff') {
  const p = centro(ctx.atacante, ctx.arena);
  const bolha = el('div', { class: 'fx-golpe fx-escudo', style: { borderColor: cor, boxShadow: `0 0 18px ${cor}, inset 0 0 22px ${cor}` } });
  ctx.arena.append(bolha);
  await fim(bolha.animate([{ transform: pos(p, 'scale(0.3)'), opacity: 0 }, { transform: pos(p, 'scale(1)'), opacity: 0.9, offset: 0.4 }, { transform: pos(p, 'scale(1.05)'), opacity: 0 }], { duration: 750, fill: 'both' }));
  bolha.remove();
}

/** Nuvem em cima do alvo (Smokescreen, Poison Gas, Spore, Sleep Powder…). */
async function nuvem(ctx: Contexto, nome: string) {
  const p = ctx.alvo ? centro(ctx.alvo, ctx.arena) : centro(ctx.atacante, ctx.arena);
  await Promise.all([0, 1, 2, 3, 4].map((i) => estourar(ctx, nome, ao(p, sorteio(60), sorteio(30)), { tamanho: 70, duracao: 700, atraso: i * 90, de: 0.5, ate: 1.6 })));
}

/** Espadas girando em volta do atacante (Swords Dance). */
async function espadas(ctx: Contexto) {
  const p = centro(ctx.atacante, ctx.arena);
  await Promise.all(
    [0, 1, 2, 3].map((i) => {
      const ang = (i / 4) * Math.PI * 2;
      return estourar(ctx, 'sword', ao(p, Math.cos(ang) * 45, Math.sin(ang) * 30), { tamanho: 50, duracao: 650, de: 1.2, ate: 0.6, giro: 180, atraso: i * 60 });
    }),
  );
  await aura(ctx, ctx.atacante, '#ffffff');
}

/** Cura (Recover, Roost, Synthesis, Rest…): brilhos subindo no atacante. */
const cura = (ctx: Contexto) => aura(ctx, ctx.atacante, '#9effa8', 'shine');

/** Clima: a arena fica da cor do clima. */
const CLIMAS: Record<string, string> = { sunnyday: '#ffcf40', raindance: '#4d8bff', sandstorm: '#d8a85a', snowscape: '#dff4ff', hail: '#dff4ff', chillyreception: '#dff4ff' };

/** Imagem de efeito de cada tipo (golpes sem roteiro próprio). */
const FX_DO_TIPO: Record<string, string> = {
  Normal: 'wisp', Fire: 'fireball', Water: 'waterwisp', Electric: 'electroball', Grass: 'leaf1', Ice: 'iceball', Fighting: 'fist', Poison: 'poisonwisp',
  Ground: 'rock3', Flying: 'feather', Psychic: 'mistball', Bug: 'energyball', Rock: 'rock1', Ghost: 'shadowball', Dragon: 'flareball', Dark: 'blackwisp',
  Steel: 'shine', Fairy: 'heart',
};

/** Golpes famosos com roteiro próprio. */
const ROTEIROS: Record<string, (ctx: Contexto) => Promise<void>> = {
  thunderbolt: raio, thunder: raio, thundershock: raio, zapcannon: (c) => bola(c, 'electroball', 80), thunderwave: (c) => nuvem(c, 'electroball'),
  earthquake: terremoto, magnitude: terremoto, bulldoze: terremoto, earthpower: terremoto, fissure: terremoto, precipiceblades: terremoto, headlongrush: terremoto,
  flamethrower: (c) => jato(c, 'fireball', 9), fireblast: (c) => bola(c, 'flareball', 90), ember: (c) => jato(c, 'fireball', 3), heatwave: (c) => jato(c, 'fireball', 12, 40, 50), overheat: (c) => bola(c, 'flareball', 100), flareblitz: (c) => contato(c, 'impacto'), willowisp: (c) => nuvem(c, 'fireball'),
  watergun: (c) => jato(c, 'waterwisp', 5, 34), hydropump: (c) => jato(c, 'waterwisp', 14, 52), surf: (c) => jato(c, 'waterwisp', 14, 60, 60), scald: (c) => jato(c, 'waterwisp', 9), bubblebeam: (c) => jato(c, 'waterwisp', 9, 30), waterpulse: (c) => ondas(c, '#4d9bff'), muddywater: (c) => jato(c, 'waterwisp', 12, 56, 60),
  icebeam: (c) => jato(c, 'icicle', 10, 36), blizzard: (c) => chuva(c, 'iceball', 8, 40), icywind: (c) => jato(c, 'iceball', 8, 30, 50), powdersnow: (c) => jato(c, 'iceball', 6, 26, 40), iceshard: (c) => voar(c, 'icicle', centro(c.atacante, c.arena), centro(c.alvo ?? c.atacante, c.arena), { tamanho: 40 }).then(() => (c.alvo ? piscar(c.alvo) : undefined)),
  razorleaf: (c) => folhas(c), magicalleaf: (c) => folhas(c), leafstorm: (c) => folhas(c), petaldance: (c) => folhas(c, 'petal'), petalblizzard: (c) => folhas(c, 'petal'), leafblade: (c) => contato(c, 'corte'),
  absorb: drenar, megadrain: drenar, gigadrain: drenar, drainpunch: drenar, leechlife: drenar, hornleech: drenar, dreameater: drenar,
  solarbeam: (c) => jato(c, 'energyball', 12, 44), energyball: (c) => bola(c, 'energyball', 70),
  psychic: (c) => tingir(c, '#ff7ad9', 500).then(() => ondas(c, '#ff7ad9')), psybeam: (c) => jato(c, 'mistball', 9, 34), confusion: (c) => ondas(c, '#ff7ad9'), psyshock: (c) => jato(c, 'mistball', 7, 40, 30), futuresight: (c) => tingir(c, '#ff7ad9', 600),
  shadowball: (c) => bola(c, 'shadowball', 70), darkpulse: (c) => ondas(c, '#3a2a4a'), sludgebomb: (c) => bola(c, 'poisonwisp', 70), sludgewave: (c) => jato(c, 'poisonwisp', 12, 52, 60), toxic: (c) => nuvem(c, 'poisonwisp'),
  rockslide: (c) => chuva(c, 'rock1', 6), stoneedge: (c) => chuva(c, 'rock2', 4, 54), rockthrow: (c) => chuva(c, 'rock1', 3), rocktomb: (c) => chuva(c, 'rock3', 5),
  stealthrock: (c) => arremessarHazard(c, 'stealthrock'), spikes: (c) => arremessarHazard(c, 'spikes'), toxicspikes: (c) => arremessarHazard(c, 'toxicspikes'), stickyweb: (c) => arremessarHazard(c, 'stickyweb'),
  dracometeor: (c) => chuva(c, 'flareball', 5, 60), dragonpulse: (c) => bola(c, 'flareball', 70), outrage: (c) => aura(c, c.atacante, '#ff5050').then(() => contato(c, 'impacto')), dragondance: (c) => aura(c, c.atacante, '#7a5cff'),
  hyperbeam: (c) => jato(c, null, 14, 46), gigaimpact: (c) => contato(c, 'impacto'), bodyslam: (c) => contato(c, 'impacto'), tackle: (c) => contato(c, 'impacto'), quickattack: (c) => contato(c, 'impacto'),
  swordsdance: espadas, protect: (c) => escudo(c, '#7fff9a'), detect: (c) => escudo(c, '#ffe066'), reflect: (c) => escudo(c, '#ffb0e0'), lightscreen: (c) => escudo(c, '#ffe9a0'), substitute: (c) => escudo(c, '#ffffff'),
  recover: cura, roost: cura, synthesis: cura, moonlight: cura, morningsun: cura, rest: cura, softboiled: cura, slackoff: cura, wish: cura, healpulse: cura,
  smokescreen: (c) => nuvem(c, 'blackwisp'), poisongas: (c) => nuvem(c, 'poisonwisp'), spore: (c) => nuvem(c, 'energyball'), sleeppowder: (c) => nuvem(c, 'energyball'), stunspore: (c) => nuvem(c, 'electroball'), poisonpowder: (c) => nuvem(c, 'poisonwisp'),
  stringshot: (c) => (c.alvo ? estourar(c, 'web', centro(c.alvo, c.arena), { tamanho: 110, duracao: 600, de: 0.4, ate: 1.1 }) : Promise.resolve()),
  moonblast: (c) => bola(c, 'moon', 70), dazzlinggleam: (c) => tingir(c, '#ffd6f0', 450, 0.6), playrough: (c) => contato(c, 'impacto'), charm: (c) => nuvem(c, 'heart'), sweetkiss: (c) => nuvem(c, 'heart'), attract: (c) => nuvem(c, 'heart'),
  bravebird: (c) => contato(c, 'impacto'), airslash: (c) => jato(c, 'feather', 6, 34), hurricane: (c) => jato(c, 'feather', 12, 36, 60), gust: (c) => jato(c, 'feather', 5, 30, 40), featherdance: (c) => nuvem(c, 'feather'),
  flashcannon: (c) => jato(c, 'shine', 9, 40), irondefense: (c) => aura(c, c.atacante, '#c0c8d8', 'shine'), bulletpunch: (c) => contato(c, 'soco'), meteormash: (c) => contato(c, 'soco'),
};

/** Roteiro do golpe: próprio, pelas marcas (soco, mordida, corte, som, chute), ou pela categoria e pelo tipo. */
function roteiro(golpeId: string, categoria: string, tipo: string): (ctx: Contexto) => Promise<void> {
  const proprio = ROTEIROS[golpeId];
  if (proprio) return proprio;
  const g = Dex.moves.get(golpeId);
  const marcas = g.flags ?? {};
  const fx = FX_DO_TIPO[tipo] ?? null;
  if (CLIMAS[golpeId]) return (c) => tingir(c, CLIMAS[golpeId], 700, 0.5);
  if (marcas.bite) return (c) => contato(c, 'mordida');
  if (marcas.punch) return (c) => contato(c, 'soco');
  if (marcas.slicing) return (c) => contato(c, 'corte');
  if (/kick|stomp/i.test(g.name)) return (c) => contato(c, 'chute');
  if (/claw|scratch|swipe|slash/i.test(g.name)) return (c) => contato(c, 'garra');
  if (marcas.sound) return (c) => ondas(c);
  if (categoria === 'Status') {
    // golpe de status no próprio Pokémon (sobe atributo): aura; no adversário: ondas da cor do tipo
    return g.target === 'self' || g.target === 'allySide' || g.target === 'adjacentAllyOrSelf' ? (c) => aura(c, c.atacante) : (c) => ondas(c);
  }
  if (categoria === 'Physical') {
    if (marcas.contact) return (c) => contato(c, 'impacto');
    return tipo === 'Ground' ? terremoto : tipo === 'Rock' ? (c) => chuva(c, 'rock1', 4) : (c) => bola(c, fx, 50);
  }
  // especiais: raios e jatos ("Beam", pulsos) viram jato; o resto, um projetil grande
  if (/beam|cannon|blast|spray|pump|gun/i.test(g.name) || marcas.pulse) return (c) => jato(c, fx, 10, 40);
  return (c) => bola(c, fx, 64);
}

/** Anima o golpe na arena. `alvo` null = golpe em si mesmo (ou sem alvo). */
export async function animarGolpeOriginal(arena: HTMLElement, atacante: HTMLElement, alvo: HTMLElement | null, golpeId: string, tipo: string, categoria: string, oposto: HTMLElement | null = null) {
  const ctx: Contexto = { arena, atacante, alvo, oposto, tipo, cor: corTipo(tipo), golpe: golpeId };
  try {
    await roteiro(golpeId, categoria, tipo)(ctx);
  } finally {
    // nada de efeito sobrando na arena se algo falhar no meio
    arena.querySelectorAll('.fx-golpe, .fx-tela').forEach((e) => e.remove());
  }
}
