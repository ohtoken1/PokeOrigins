// Ajustes nossos por cima das animações do Showdown (showdown/anims.js, que não é editado à mão). Pedido do dono,
// 25/10/2026: golpe sem animação ganha uma, e golpe que usa uma animação genérica (o "soco", a "garra" sem cor) ou a de
// um golpe de OUTRO tipo ganha uma camada com a cor do próprio tipo, para não parecer cópia.
// As funções seguem o "roteiro" do Showdown: `scene.showEffect(efeito, início, fim, curva, depois)`,
// `attacker.anim(...)`, `defender.delay(...)` (o palco que entende isso é o animShowdown.ts).
import { Dex } from '@pkmn/sim';
import type { AnimShowdown, EfeitoShowdown } from './showdown/anims.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Roteiro = (scene: any, participantes: any[]) => void;
type Modulo = { BattleMoveAnims: Record<string, AnimShowdown>; BattleOtherAnims: Record<string, AnimShowdown>; BattleEffects: Record<string, EfeitoShowdown> };

const no = (p: any, extra: Record<string, number> = {}) => ({ x: p.x, y: p.y, z: p.z, ...extra });
/** Pancada no alvo: ele recua e volta (o mesmo jeitinho dos golpes do Showdown). */
const recuar = (defender: any, atraso: number) => {
  defender.delay(atraso);
  defender.anim({ z: defender.behind(15), time: 100 }, 'swing');
  defender.anim({ time: 250 }, 'swing');
};

/** Golpes que o Showdown não tem. */
const NOVAS: Record<string, Roteiro> = {
  // Fairy, som: ondas rosas e corações do atacante até o alvo
  alluringvoice(scene, [attacker, defender]) {
    scene.backgroundEffect('#FF99DD', 700, 0.2);
    for (let i = 0; i < 3; i++) {
      scene.showEffect('mistball', no(attacker, { scale: 0.3, opacity: 0.6, time: i * 150 }), no(defender, { scale: 1, opacity: 0.25, time: i * 150 + 450 }), 'linear', 'fade');
      scene.showEffect('heart', no(attacker, { x: attacker.x + (i - 1) * 25, scale: 0.6, opacity: 1, time: 100 + i * 120 }), no(defender, { x: defender.x + (i - 1) * 30, y: defender.y + 20, scale: 1, opacity: 0, time: 600 + i * 120 }), 'ballistic', 'fade');
    }
    recuar(defender, 500);
  },
  // Psychic, físico: o atacante se cobre de energia rosa e investe contra o alvo
  psyshieldbash(scene, [attacker, defender]) {
    scene.showEffect('mistball', no(attacker, { scale: 0.5, opacity: 0.7, time: 0 }), no(attacker, { scale: 1.3, opacity: 0.2, time: 300 }), 'linear', 'fade');
    attacker.anim({ x: defender.x, y: defender.y, z: defender.behind(-5), time: 350 }, 'accel');
    attacker.anim({ time: 400 }, 'ballistic2Back');
    scene.showEffect('impact', no(defender, { scale: 0.4, opacity: 0.9, time: 350 }), no(defender, { scale: 1.2, opacity: 0, time: 650 }), 'linear');
    scene.showEffect('mistball', no(defender, { scale: 0.6, opacity: 0.7, time: 350 }), no(defender, { scale: 1.6, opacity: 0, time: 750 }), 'decel');
    recuar(defender, 350);
  },
  // Poison: a concha abre e dispara veneno
  shellsidearm(scene, [attacker, defender]) {
    scene.showEffect('shell', no(attacker, { scale: 0.5, opacity: 1, time: 0 }), no(attacker, { scale: 0.8, opacity: 0, time: 350 }), 'linear');
    scene.showEffect('poisonwisp', no(attacker, { scale: 0.4, opacity: 0.9, time: 250 }), no(defender, { scale: 0.9, opacity: 0.7, time: 600 }), 'linear', 'explode');
    scene.showEffect('poisonwisp', no(attacker, { scale: 0.3, opacity: 0.7, time: 350 }), no(defender, { x: defender.x + 15, scale: 0.7, opacity: 0.5, time: 700 }), 'linear', 'explode');
    recuar(defender, 600);
  },
  // Bug, proteção: uma teia se abre em volta do atacante
  silktrap(scene, [attacker]) {
    scene.showEffect('web', no(attacker, { scale: 0.2, opacity: 0, time: 0 }), no(attacker, { scale: 1.2, opacity: 0.8, time: 400 }), 'decel', 'fade');
    scene.showEffect('protect', no(attacker, { scale: 1, opacity: 0.5, time: 300 }), no(attacker, { scale: 1.1, opacity: 0, time: 800 }), 'linear');
  },
};

/** O efeito com a cor de cada tipo (só imagens que o Showdown já tem). */
const EFEITO_DO_TIPO: Record<string, string> = {
  Fire: 'fireball', Water: 'waterwisp', Electric: 'electroball', Grass: 'energyball', Ice: 'iceball', Poison: 'poisonwisp',
  Ghost: 'shadowball', Dark: 'blackwisp', Psychic: 'mistball', Fairy: 'mistball', Fighting: 'impact', Flying: 'feather',
  Ground: 'mudwisp', Rock: 'rock1', Steel: 'shine', Bug: 'energyball', Dragon: 'flareball',
};

/** Depois da animação emprestada, um estouro com a cor do tipo do golpe no alvo. */
function comCamadaDoTipo(original: Roteiro, tipo: string): Roteiro {
  const fx = EFEITO_DO_TIPO[tipo];
  return (scene, participantes) => {
    const inicio = scene.timeOffset;
    // o estouro sai junto do último efeito da animação emprestada (a pancada); sem efeito nenhum, aos 300 ms
    let ultimo = -1;
    const mostrar = scene.showEffect;
    scene.showEffect = (fx: unknown, ini: { time?: number }, ...resto: unknown[]) => {
      ultimo = Math.max(ultimo, (ini?.time ?? 0) + scene.timeOffset - inicio);
      return mostrar.call(scene, fx, ini, ...resto);
    };
    original(scene, participantes);
    scene.showEffect = mostrar;
    const fim = scene.timeOffset;
    scene.timeOffset = inicio;
    const defender = participantes[1] ?? participantes[0];
    const t = ultimo < 0 ? 300 : ultimo;
    scene.showEffect(fx, no(defender, { scale: 0.3, opacity: 0.9, time: t }), no(defender, { scale: 1.1, opacity: 0, time: t + 350 }), 'decel');
    scene.showEffect(fx, no(defender, { x: defender.x - 20, y: defender.y + 15, scale: 0.2, opacity: 0.8, time: t + 80 }), no(defender, { x: defender.x - 35, y: defender.y + 30, scale: 0.5, opacity: 0, time: t + 380 }), 'decel');
    scene.showEffect(fx, no(defender, { x: defender.x + 20, y: defender.y - 10, scale: 0.2, opacity: 0.8, time: t + 140 }), no(defender, { x: defender.x + 35, y: defender.y - 20, scale: 0.5, opacity: 0, time: t + 440 }), 'decel');
    scene.timeOffset = fim;
  };
}

/** Como está a animação de cada golpe (para a ferramenta da Administração). */
export type Origem = { tipo: 'propria' } | { tipo: 'nossa' } | { tipo: 'copia'; de: string } | { tipo: 'generica'; de: string } | { tipo: 'sem' };
export const origemDaAnimacao = new Map<string, Origem>();

/** Roda uma vez, quando o arquivo do Showdown é carregado. */
export function ajustarAnimacoes(m: Modulo): void {
  const genericas = new Map<unknown, string>(Object.entries(m.BattleOtherAnims).map(([k, v]) => [v.anim, k]));
  const donos = new Map<unknown, string>();
  for (const [id, e] of Object.entries(m.BattleMoveAnims)) if (e?.anim && !donos.has(e.anim)) donos.set(e.anim, id);
  // efeito que o Showdown não tem com esse nome: o roxo dele
  if (!m.BattleEffects.poisonwisp) m.BattleEffects.poisonwisp = m.BattleEffects.purplewisp;

  for (const g of Dex.moves.all()) {
    if (!g.exists || g.isNonstandard || g.isMax || g.isZ) continue;
    if (NOVAS[g.id]) {
      m.BattleMoveAnims[g.id] = { ...m.BattleMoveAnims[g.id], anim: NOVAS[g.id] };
      origemDaAnimacao.set(g.id, { tipo: 'nossa' });
      continue;
    }
    const e = m.BattleMoveAnims[g.id];
    if (!e?.anim) {
      origemDaAnimacao.set(g.id, { tipo: 'sem' });
      continue;
    }
    const generica = genericas.get(e.anim);
    const dono = donos.get(e.anim);
    const origem: Origem = generica ? { tipo: 'generica', de: generica } : dono && dono !== g.id ? { tipo: 'copia', de: dono } : { tipo: 'propria' };
    origemDaAnimacao.set(g.id, origem);
    // golpe de dano com animação emprestada (genérica, ou de um golpe de outro tipo): ganha a cor do próprio tipo
    const outroTipo = origem.tipo === 'copia' && Dex.moves.get(origem.de).type !== g.type;
    if (g.category !== 'Status' && EFEITO_DO_TIPO[g.type] && (origem.tipo === 'generica' || outroTipo))
      m.BattleMoveAnims[g.id] = { ...e, anim: comCamadaDoTipo(e.anim as Roteiro, g.type) };
  }
}
