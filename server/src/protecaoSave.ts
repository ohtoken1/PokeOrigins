// O que só o servidor muda no save (pedido do dono, antes do lançamento): Origin Coins, VIP, títulos ganhos, pacotes
// comprados, NT (Pokémon e itens) e os resgates do Passe. O `PUT /api/save` vem do navegador e pode ter sido mexido;
// aqui esses campos voltam ao que estava guardado. Quem dá essas coisas é o servidor: Correio, lojas, câmbio, quadro
// de missões, Orbs, Passe e Kit de pré-registro (server/src/tickets.ts), roleta do Ninho (server/src/eventos.ts).
// O navegador ainda pode GASTAR Origin Coins (loja, troca de nome…), por isso só a subida é recusada.
// A staff (conta.admin) passa: o painel ⚙ Admin dá moedas e VIP pelo jogo.
import type * as banco from './banco.ts';
import { ITEM_PASSE_PREMIUM, temporadaDoPasse } from './motorDoJogo.ts';

type Save = Record<string, unknown>;
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const objeto = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** Copia o campo guardado (ou apaga, se não havia). */
function manter(save: Save, antes: Save, campo: string): void {
  if (antes[campo] === undefined) delete save[campo];
  else save[campo] = antes[campo];
}

/** Todo Pokémon do save (time, PC, Daycare, Expedição, parceiro de fusão…): objetos com `uid` e `especieId`. */
function pokemonsDe(v: unknown, achados: Record<string, unknown>[] = [], fundo = 0): Record<string, unknown>[] {
  if (!v || typeof v !== 'object' || fundo > 8) return achados;
  if (Array.isArray(v)) {
    for (const x of v) pokemonsDe(x, achados, fundo + 1);
    return achados;
  }
  const o = v as Record<string, unknown>;
  if (typeof o.uid === 'number' && typeof o.especieId === 'number') achados.push(o);
  for (const [k, x] of Object.entries(o)) if (k !== 'batalhaAberta' && x && typeof x === 'object') pokemonsDe(x, achados, fundo + 1);
  return achados;
}

/** Passe: os resgates não somem e a trilha premium só liga gastando o item Passe Premium. */
function protegerPasse(save: Save, antes: Save): void {
  const velho = objeto(antes.passe);
  const novo = objeto(save.passe);
  if (!velho || !novo) return;
  const atual = temporadaDoPasse()?.id;
  // o navegador não sai da temporada em vigor (mudar e voltar zeraria os resgates)
  if (velho.temporada === atual && novo.temporada !== atual) novo.temporada = atual;
  if (novo.temporada !== velho.temporada) {
    // temporada nova de verdade: começa sem resgates e sem premium (o item ainda pode ser usado nela)
    if (novo.premium === true && !(numero(objeto(save.itens)?.[ITEM_PASSE_PREMIUM]) < numero(objeto(antes.itens)?.[ITEM_PASSE_PREMIUM]))) novo.premium = false;
    return;
  }
  const r0 = (objeto(velho.resgatados) ?? {}) as Record<string, unknown>;
  const r1 = (objeto(novo.resgatados) ?? {}) as Record<string, unknown>;
  const unir = (a: unknown, b: unknown) => [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])].filter((n) => Number.isInteger(n));
  novo.resgatados = { gratis: unir(r0.gratis, r1.gratis), premium: unir(r0.premium, r1.premium) };
  if (velho.premium === true) novo.premium = true;
  else if (novo.premium === true && !(numero(objeto(save.itens)?.[ITEM_PASSE_PREMIUM]) < numero(objeto(antes.itens)?.[ITEM_PASSE_PREMIUM]))) novo.premium = false;
}

export function proteger(conta: banco.Conta, save: Save, antes: Save | null): void {
  if (conta.admin) return;
  // primeiro save da conta: começa sem nada disso (só o servidor dá)
  if (!antes) {
    save.gold = 0;
    for (const campo of ['vipAte', 'titulosGanhos', 'pacotesComprados']) delete save[campo];
    return;
  }
  // Origin Coins: o navegador só gasta
  if (numero(save.gold) > numero(antes.gold) || typeof save.gold !== 'number' || save.gold < 0) save.gold = numero(antes.gold);
  for (const campo of ['vipAte', 'titulosGanhos', 'pacotesComprados']) manter(save, antes, campo);
  // NT dos Pokémon: quem era NT continua NT (onde quer que esteja agora)
  const nt = new Set(pokemonsDe(antes).filter((p) => p.inegociavel === true).map((p) => p.uid));
  if (nt.size) for (const p of pokemonsDe(save)) if (nt.has(p.uid)) p.inegociavel = true;
  // NT dos itens: a contagem nunca desce (o jogo só soma; `quantidadeNt` já limita pelo total)
  const ntAntes = objeto(antes.itensNt);
  if (ntAntes) {
    const ntAgora = (objeto(save.itensNt) ?? (save.itensNt = {})) as Record<string, unknown>;
    for (const [id, q] of Object.entries(ntAntes)) if (numero(q) > numero(ntAgora[id])) ntAgora[id] = numero(q);
  }
  protegerPasse(save, antes);
}
