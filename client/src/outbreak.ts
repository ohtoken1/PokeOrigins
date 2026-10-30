// Outbreak (evento do dono): às 15h e às 21h de Brasília, por 1 hora, uma espécie comum de UM bioma de UMA região
// passa a sair em metade dos encontros daquele mapa. O sorteio usa a data e a hora como semente: igual para todos.
import { BIOMAS, type Bioma } from '../../shared/biomas';
import { montarTabela, type EntradaTabela } from '../../shared/encontros';
import { REGIOES } from '../../shared/regioes';
import { pokemonPorId, pokemonsDaRegiao, todosOsPokemons, pokemonsDosMapasDe } from './dados';
import { el, spritePokemon } from './ui/dom';
import { comDica } from './ui/dica';
import { carregarSave } from './estado';

/** Horas de Brasília em que começa um Outbreak. */
export const HORAS_OUTBREAK = [15, 21];
export const DURACAO_OUTBREAK_MS = 60 * 60 * 1000;
/** Parte dos encontros do mapa que vira a espécie do Outbreak. */
export const CHANCE_OUTBREAK = 0.5;
const BRASILIA_MS = -3 * 60 * 60 * 1000;

/** Nome do Pokémon nos selos de evento: passar o mouse mostra a imagem dele (pedido do dono). */
export function nomeComImagem(especieId: number, nome: string): HTMLElement {
  return comDica(el('span', { class: 'nome-com-imagem' }, nome), () => [el('div', { class: 'dica-pokemon' }, spritePokemon(pokemonPorId(especieId), { palco: true }), el('strong', {}, nome))]);
}

export interface Outbreak {
  regiao: string;
  bioma: Bioma;
  /** número da forma base da linha evolutiva sorteada */
  linha: number;
  nome: string;
  fim: number;
}

function aleatorioCom(semente: string): () => number {
  let a = 0;
  for (const c of semente) a = (Math.imul(a, 31) + c.charCodeAt(0)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, Outbreak | null>();

/** Outbreak ligado pela staff (Administração → Eventos): vem do servidor junto com os outros eventos. */
let forcado: { inicio: number; fim: number } | null = null;
let redesenharSelo = () => {};
export function definirOutbreakForcado(o: { inicio: number; fim: number } | null): void {
  forcado = o;
  redesenharSelo();
}

/** O Outbreak que está valendo agora (null = nenhum). */
export function outbreakAtual(agora = Date.now()): Outbreak | null {
  const br = new Date(agora + BRASILIA_MS);
  const hora = br.getUTCHours();
  const ligado = forcado && agora < forcado.fim ? forcado : null;
  if (!HORAS_OUTBREAK.includes(hora) && !ligado) return null;
  const chave = ligado ? `staff-${ligado.inicio}` : `${br.toISOString().slice(0, 10)}-${hora}`;
  if (!cache.has(chave)) {
    const aleatorio = aleatorioCom(`outbreak-${chave}`);
    const regioes = REGIOES.filter((r) => r.disponivel);
    let achado: Outbreak | null = null;
    // tenta outro mapa se o sorteado não tiver espécie comum (não deve acontecer)
    for (let i = 0; i < 10 && !achado; i++) {
      const regiao = regioes[Math.floor(aleatorio() * regioes.length)];
      const bioma = BIOMAS[Math.floor(aleatorio() * BIOMAS.length)];
      const linhas = [...new Set(montarTabela(bioma, pokemonsDosMapasDe(regiao.id), [], todosOsPokemons()).filter((e) => e.grupo === null).map((e) => e.linha))];
      if (!linhas.length) continue;
      const linha = linhas[Math.floor(aleatorio() * linhas.length)];
      const inicio = ligado ? ligado.inicio : Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate(), hora) - BRASILIA_MS;
      achado = { regiao: regiao.id, bioma, linha, nome: pokemonPorId(linha).nome, fim: inicio + DURACAO_OUTBREAK_MS };
    }
    cache.set(chave, achado);
  }
  return cache.get(chave) ?? null;
}

/** Tabela do encontro deste passo: no mapa do Outbreak, metade das vezes só a linha sorteada. */
export function tabelaComOutbreak(tabela: EntradaTabela[], regiao: string, bioma: string, aleatorio = Math.random): EntradaTabela[] {
  const o = outbreakAtual();
  if (!o || o.regiao !== regiao || o.bioma.id !== bioma || aleatorio() >= CHANCE_OUTBREAK) return tabela;
  const daLinha = tabela.filter((e) => e.linha === o.linha);
  return daLinha.length ? daLinha : tabela;
}

/** Chances do painel % com o Outbreak: metade das vezes a tabela normal, metade só a linha (como `tabelaComOutbreak`). */
export function chancesComOutbreak(tabela: EntradaTabela[], chances: number[], chancesDe: (t: EntradaTabela[]) => number[], regiao: string, bioma: string): number[] {
  const o = outbreakAtual();
  if (!o || o.regiao !== regiao || o.bioma.id !== bioma) return chances;
  const daLinha = tabela.filter((e) => e.linha === o.linha);
  if (!daLinha.length) return chances;
  const daLinhaChances = chancesDe(daLinha);
  if (daLinhaChances.reduce((a, b) => a + b, 0) <= 0) return chances;
  const porEntrada = new Map(daLinha.map((e, i) => [e, daLinhaChances[i]]));
  return chances.map((c, i) => (1 - CHANCE_OUTBREAK) * c + CHANCE_OUTBREAK * (porEntrada.get(tabela[i]) ?? 0));
}

/** Caixa fixa no canto de baixo à esquerda onde ficam os avisos de eventos (Outbreak, Ninho), um em cima do outro. */
export function caixaDeAvisos(): HTMLElement {
  let c = document.querySelector<HTMLElement>('.avisos-eventos');
  if (!c) {
    c = el('div', { class: 'avisos-eventos' });
    document.body.append(c);
  }
  return c;
}

let selo: HTMLElement | null = null;

/** Selo fixo no canto enquanto há um Outbreak (uma vez, no main). */
export function vigiarOutbreak(): void {
  if (selo) return;
  selo = el('div', { class: 'aviso-viagem aviso-outbreak', role: 'status', hidden: true });
  caixaDeAvisos().append(selo);
  const desenhar = () => {
    const o = outbreakAtual();
    selo!.hidden = !o;
    if (!o) return;
    const min = Math.max(1, Math.ceil((o.fim - Date.now()) / 60_000));
    const regiao = REGIOES.find((r) => r.id === o.regiao)?.nome ?? o.regiao;
    selo!.replaceChildren(el('strong', {}, '🔥 Outbreak de ', nomeComImagem(o.linha, o.nome)), el('span', {}, `${regiao} · ${o.bioma.nome} · termina em ${min} min`),
      carregarSave()?.regiao !== o.regiao ? el('small', {}, 'Em outra região: pegue o trem na estação da cidade.') : '');
  };
  redesenharSelo = desenhar;
  desenhar();
  setInterval(desenhar, 30_000);
}
