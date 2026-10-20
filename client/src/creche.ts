// Creche (breeding) no save do jogador: casais guardados em `save.creche`, ciclos de ovo e o ovo que sai como um
// Pokémon para o PC. Regras em shared/breeding.ts (planilha do dono).
import { marcarConquista } from './conquistas';
import { DESTINY_KNOT } from '../../shared/breeding';
import { golpesIniciais, hpMaximo, ppMaximo } from '../../shared/batalha/pokemon';
import {
  PASSOS_PARA_CHOCAR,
  PRECO_CHOCAR_DAYCARE,
  TEMPO_CHOCAR_DAYCARE_MS,
  CASAIS_POR_VEZ,
  CASAIS_POR_VEZ_VIP,
  chanceShinyDoCasal,
  eggMovesHerdados,
  ivsDoFilhote,
  maeEPai,
  naturezaDoFilhote,
  rodarCiclos,
  type CasalCreche,
} from '../../shared/breeding';
import { formaBaseDe } from '../../shared/encontros';
import { vipAtivo } from '../../shared/vip';
import { pokemonPorId, todosOsPokemons } from './dados';
import { TAMANHO_MAXIMO_TIME, carregarSave, guardarNoPC, novoPokemon, registrarCapturado, salvar, type PokemonDoJogador, type Save } from './estado';
import { el } from './ui/dom';

export type Casal = CasalCreche<PokemonDoJogador>;
/** Imagem do ovo (PokéAPI), usada no PC e na ficha. */
export const SPRITE_OVO = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/egg.png';

export const casaisDe = (save: Save): Casal[] => (save.creche ??= { casais: [] }).casais;
export const vagasDaCreche = (save: Save) => (vipAtivo(save) ? CASAIS_POR_VEZ_VIP : CASAIS_POR_VEZ);

/** Tira o Pokémon do time ou do PC (para ir para a creche). */
function tirarDoJogador(save: Save, p: PokemonDoJogador): void {
  save.time = save.time.filter((x) => x !== p);
  save.caixa = save.caixa.filter((x) => x !== p);
  delete p.box;
}

/** Deixa um casal na creche (quem chama confere `podemCruzar` e salva). O time precisa ficar com 1 Pokémon. */
export function deixarCasal(save: Save, a: PokemonDoJogador, b: PokemonDoJogador): string | null {
  if (casaisDe(save).length >= vagasDaCreche(save)) return 'O Daycare está cheio.';
  const sobraNoTime = save.time.filter((x) => x !== a && x !== b).length;
  if (sobraNoTime < 1) return 'Seu time precisa ficar com pelo menos 1 Pokémon.';
  tirarDoJogador(save, a);
  tirarDoJogador(save, b);
  casaisDe(save).push({ pais: [a, b], desde: Date.now() });
  marcarConquista(save, 'breeding');
  return null;
}

/** Devolve um Pokémon da creche: time se tiver vaga, senão PC. */
function devolver(save: Save, p: PokemonDoJogador): void {
  if (save.time.length < TAMANHO_MAXIMO_TIME) save.time.push(p);
  else guardarNoPC(save, p);
}

/** Retira o casal (o ciclo em andamento se perde; um ovo pronto é entregue antes). Quem chama salva. */
export function retirarCasal(save: Save, i: number): void {
  const casal = casaisDe(save)[i];
  if (!casal) return;
  if (casal.ovo) retirarOvo(save, i);
  casaisDe(save).splice(i, 1);
  for (const p of casal.pais) devolver(save, p);
}

/** Cria o ovo: um Pokémon da forma base da mãe (ou do não-Ditto), nível 1, que ainda vai chocar. */
export function criarOvo(casal: Casal): PokemonDoJogador {
  const { mae, pai } = maeEPai(casal.pais[0], casal.pais[1]);
  const especieId = formaBaseDe(pokemonPorId(mae.especieId), todosOsPokemons()).id;
  const shiny = Math.random() < chanceShinyDoCasal(mae, pai);
  const p = novoPokemon(especieId, 1, shiny);
  p.ivs = ivsDoFilhote(mae, pai);
  p.natureza = naturezaDoFilhote(mae, pai) ?? p.natureza;
  // Egg Moves herdados primeiro; o resto, os golpes de nível 1
  const herdados = eggMovesHerdados(especieId, mae, pai);
  const iniciais = golpesIniciais(especieId, 1).filter((g) => !herdados.includes(g.id));
  p.golpes = [...herdados.map((id) => ({ id, pp: ppMaximo(id) })), ...iniciais].slice(0, 4);
  p.hp = hpMaximo(p);
  p.origem = 'ovo';
  p.ovo = { desde: Date.now() };
  p.ivsFaixa = false;
  p.ivsRevelados = false;
  return p;
}
/** Retira o ovo pronto: ele vai para o PC (ovo não luta, então não entra no time) e o ciclo recomeça. */
export function retirarOvo(save: Save, i: number): PokemonDoJogador | null {
  const casal = casaisDe(save)[i];
  if (!casal?.ovo) return null;
  const ovo = criarOvo(casal);
  // Destiny Knot (pedido do dono, 20/10/2026): é gasto no ovo em que foi usado (um só, mesmo com os dois segurando)
  const comNo = casal.pais.find((p) => p.item === DESTINY_KNOT);
  if (comNo) comNo.item = null;
  guardarNoPC(save, ovo);
  casal.ovo = false;
  casal.desde = Date.now();
  return ovo;
}

/** Roda os ciclos de todos os casais; devolve quantos ovos saíram agora. */
export function atualizarCreche(save: Save): number {
  const vip = vipAtivo(save);
  return casaisDe(save).filter((c) => rodarCiclos(c, Date.now(), vip)).length;
}

// ---------- choco ----------

/** O ovo choca: vira o Pokémon (registra na Pokédex). Quem chama guarda e salva. */
export function chocar(save: Save, p: PokemonDoJogador): void {
  delete p.ovo;
  registrarCapturado(save, p.especieId, p.shiny);
}

export const ovosNoPC = (save: Save) => save.caixa.filter((p) => p.ovo);
export const chocandoNoDaycare = (save: Save) => (save.creche ??= { casais: [] }).chocando ??= [];

/** A moça do Daycare choca o ovo: cobra, tira do PC e devolve chocado depois de 10 minutos. */
export function deixarOvoParaChocar(save: Save, p: PokemonDoJogador): string | null {
  if (!p.ovo || !save.caixa.includes(p)) return 'Esse ovo não está no seu PC.';
  if (save.silver < PRECO_CHOCAR_DAYCARE) return 'Faltam Poké Dólares.';
  save.silver -= PRECO_CHOCAR_DAYCARE;
  save.caixa = save.caixa.filter((x) => x !== p);
  delete p.box;
  chocandoNoDaycare(save).push({ pokemon: p, pronto: Date.now() + TEMPO_CHOCAR_DAYCARE_MS });
  return null;
}

/** Busca um ovo que a moça já chocou: o Pokémon vai para o time (se tiver vaga) ou para o PC. */
export function buscarChocado(save: Save, i: number): PokemonDoJogador | null {
  const lista = chocandoNoDaycare(save);
  const item = lista[i];
  if (!item || item.pronto > Date.now()) return null;
  lista.splice(i, 1);
  chocar(save, item.pokemon);
  devolver(save, item.pokemon);
  return item.pokemon;
}

// aviso na tela (ovo apareceu, ovo chocou)
let avisoEl: HTMLElement | null = null;
let esconder = 0;
function avisar(titulo: string, texto: string): void {
  if (!avisoEl) {
    avisoEl = el('div', { class: 'aviso-anuncio aviso-creche', role: 'status', hidden: true });
    document.body.append(avisoEl);
  }
  avisoEl.replaceChildren(el('strong', {}, titulo), el('span', {}, texto));
  avisoEl.hidden = false;
  clearTimeout(esconder);
  esconder = window.setTimeout(() => avisoEl && (avisoEl.hidden = true), 10_000);
}

/** Um passo no mapa (cidade ou bioma): todo ovo do PC anda junto; com 1.000 passos, choca. Devolve true se chocou algum. */
export function passoDosOvos(save: Save): boolean {
  const chocados: PokemonDoJogador[] = [];
  for (const p of save.caixa) {
    if (!p.ovo) continue;
    p.ovo.passos = (p.ovo.passos ?? 0) + 1;
    if (p.ovo.passos >= PASSOS_PARA_CHOCAR) {
      chocar(save, p);
      chocados.push(p);
    }
  }
  if (chocados.length) avisar('🐣 Seu ovo chocou!', `Nasceu: ${chocados.map((p) => `${pokemonPorId(p.especieId).nome}${p.shiny ? ' ✨' : ''}`).join(', ')}. ${chocados.length > 1 ? 'Estão' : 'Está'} no seu PC.`);
  return chocados.length > 0;
}

/** Confere o Daycare ao abrir e a cada minuto: ovo novo do casal e ovo chocado pela moça → salva e avisa. */
export function vigiarCreche(): void {
  const avisados = new Set<unknown>();
  const conferir = () => {
    const save = carregarSave();
    if (!save?.creche) return;
    const novos = atualizarCreche(save);
    if (novos) {
      salvar(save);
      avisar('🥚 Um ovo apareceu no Daycare!', 'Vá até o Daycare, na cidade, para retirar o ovo. O próximo ciclo só começa depois.');
    }
    const prontos = chocandoNoDaycare(save).filter((c) => c.pronto <= Date.now() && !avisados.has(c));
    if (prontos.length) {
      prontos.forEach((c) => avisados.add(c));
      avisar('🐣 O ovo chocou no Daycare!', 'Vá até o Daycare, na cidade, para buscar o seu Pokémon.');
    }
  };
  conferir();
  window.setInterval(conferir, 30_000);
}

export const ehOvo = (p: { ovo?: unknown }) => !!p.ovo;
