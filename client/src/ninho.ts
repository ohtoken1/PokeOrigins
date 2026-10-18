// Ninho (evento do dono): a cada 20 min aparece um ninho num mapa de uma região; clicar → paga 100k (VIP 50k) e luta
// contra um Pokémon nível 150. O lugar e o Pokémon saem de uma semente (horário + quantas derrotas): igual para todos;
// perdeu, o ninho "teleporta" (outra semente). O servidor (server/src/eventos.ts) guarda o tempo, quem está lutando
// e quem venceu. Venceu: 100k + roleta do Ninho; se era lendário, 5% de ganhar o Pokémon.
import { BIOMAS, type Bioma } from '../../shared/biomas';
import { biomaDoPokemon, ehLendario } from '../../shared/encontros';
import { especie } from '../../shared/batalha/pokemon';
import { ehParadoxo, foraDosMapas } from '../../shared/formasRegionais';
import { CHANCE_LENDARIO_NINHO, NIVEL_NINHO, PRECO_NINHO, PRECO_NINHO_VIP, PREMIO_NINHO, ROLETA_NINHO } from '../../shared/eventosRegras';
import { REGIOES } from '../../shared/regioes';
import { TICKETS, itensDoGrupo } from '../../shared/tickets';
import { TODOS_OS_ITENS } from '../../shared/loja';
import { hpMaximo, type PokemonIndividual } from '../../shared/batalha/pokemon';
import { sortearIvs } from '../../shared/ovos';
import { vipAtivo } from '../../shared/vip';
import { api, ErroApi } from './conta';
import { pokemonsDaRegiao } from './dados';
import { TAMANHO_MAXIMO_TIME, novoPokemon, adotarSaveDoServidor, guardarNoPC, registrarCapturado, salvar, salvarAgora, type Save } from './estado';
import { aoAvisoDoServidor } from './online';
import { confirmar } from './ui/confirmar';
import { el } from './ui/dom';
import { girarRoleta } from './ui/roleta';
import { caixaDeAvisos, definirOutbreakForcado, nomeComImagem } from './outbreak';
import { avisar } from './ui/avisos';

export interface EstadoNinhoServidor { slot: number; inicio: number | null; derrotas: number; ativo: boolean; fim: number; ocupado: boolean; meu: boolean; derrotado: { nome: string; especie: string } | null }
export interface Ninho { regiao: string; bioma: Bioma; especieId: number; nome: string; lendario: boolean }

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

const cache = new Map<string, Ninho>();
/** Onde está o ninho deste horário depois de `derrotas` tentativas que falharam, e qual Pokémon ele tem. */
export function ninhoDe(slot: number, derrotas: number, inicio: number | null = null): Ninho {
  // ninho ligado pela staff (`inicio`) tem outra semente: não repete o do horário
  const chave = inicio ? `${slot}-${derrotas}-${inicio}` : `${slot}-${derrotas}`;
  if (!cache.has(chave)) {
    const aleatorio = aleatorioCom(`ninho-${chave}`);
    const regioes = REGIOES.filter((r) => r.disponivel);
    let achado: Ninho | null = null;
    while (!achado) {
      const regiao = regioes[Math.floor(aleatorio() * regioes.length)];
      const bioma = BIOMAS[Math.floor(aleatorio() * BIOMAS.length)];
      // só a ÚLTIMA evolução (pedido do dono), de quem mora neste mapa
      const lista = pokemonsDaRegiao(regiao.id).filter((p) => biomaDoPokemon(p) === bioma.id && !(especie(p.id).evos ?? []).length && !ehParadoxo(especie(p.id).name) && !foraDosMapas(p.id));
      if (!lista.length) continue;
      const p = lista[Math.floor(aleatorio() * lista.length)];
      achado = { regiao: regiao.id, bioma, especieId: p.id, nome: p.nome, lendario: ehLendario(p) };
    }
    cache.set(chave, achado);
  }
  return cache.get(chave)!;
}

let estado: EstadoNinhoServidor | null = null;
const ouvintes = new Set<() => void>();
async function atualizar(): Promise<void> {
  try {
    const r = await api<{ ninho: EstadoNinhoServidor; outbreak: { inicio: number; fim: number } | null }>('GET', '/eventos');
    estado = r.ninho;
    definirOutbreakForcado(r.outbreak);
  } catch {
    // sem conexão: fica o último
  }
  ouvintes.forEach((f) => f());
}
export const ninhoAtual = (): (Ninho & { servidor: EstadoNinhoServidor }) | null =>
  estado && estado.ativo && Date.now() < estado.fim ? { ...ninhoDe(estado.slot, estado.derrotas, estado.inicio), servidor: estado } : null;

let selo: HTMLElement | null = null;
/** Selo no canto (como o do Outbreak) + atualiza a cada mudança dos eventos. Uma vez, no main. */
export function vigiarNinho(): void {
  if (selo) return;
  selo = el('div', { class: 'aviso-viagem aviso-ninho', role: 'status', hidden: true });
  caixaDeAvisos().append(selo);
  const desenhar = () => {
    const n = ninhoAtual();
    selo!.hidden = !n;
    if (!n) return;
    const min = Math.max(1, Math.ceil((n.servidor.fim - Date.now()) / 60_000));
    selo!.replaceChildren(el('strong', {}, '🪺 Ninho de ', nomeComImagem(n.especieId, n.nome)), el('span', {}, `${REGIOES.find((r) => r.id === n.regiao)?.nome} · ${n.bioma.nome} · some em ${min} min`));
  };
  ouvintes.add(desenhar);
  aoAvisoDoServidor((msg) => msg.t === 'eventos' && void atualizar());
  void atualizar();
  setInterval(() => void atualizar(), 60_000);
  setInterval(desenhar, 20_000);
}

/** O Pokémon do ninho: nível 150 (atributos proporcionais), IVs sorteados. */
function pokemonDoNinho(n: Ninho): PokemonIndividual {
  const p = novoPokemon(n.especieId, NIVEL_NINHO, false);
  p.ivs = sortearIvs(0, 0);
  p.hp = hpMaximo(p);
  return p;
}

/** Entrega o prêmio da fatia da roleta (os itens que o servidor não conhece saem aqui). */
function premioDaFatia(save: Save, fatia: number): void {
  const id = ROLETA_NINHO[fatia].id;
  const dar = (item: string, qtd = 1) => (save.itens[item] = (save.itens[item] ?? 0) + qtd);
  const sorteia = (lista: string[]) => lista[Math.floor(Math.random() * lista.length)];
  if (id === 'silver') save.silver += 50_000;
  else if (id === 'fragmentos') save.fragmentos = (save.fragmentos ?? 0) + 3;
  else if (id === 'mint') dar(sorteia(TODOS_OS_ITENS.filter((i) => i.categoria === 'mints').map((i) => i.id)));
  else if (id === 'charm') dar(sorteia(itensDoGrupo('charm')));
  else if (id === 'orb') dar(sorteia(TICKETS.map((t) => t.id)));
  else dar(id);
}

/**
 * Botão "Enfrentar o ninho" no canto do mapa: só aparece no mapa (região + bioma) do ninho. `lutar` abre a batalha
 * (a tela do bioma cuida da pausa do mapa) e chama `aoFim(venceu)`.
 */
export function botaoDoNinho(save: Save, regiao: string, bioma: string, cena: () => { mostrarNinho(p: { especie: number; semente: string; aoClicar: () => void } | null): void } | null, lutar: (equipe: PokemonIndividual[], nome: string, aoFim: (venceu: boolean) => void) => void, aoMudar: () => void): { elemento: HTMLElement; parar: () => void } {
  const botao = el('button', { class: 'botao-ninho', hidden: true }) as HTMLButtonElement;
  const desenhar = () => {
    const n = ninhoAtual();
    botao.hidden = !n || n.regiao !== regiao || n.bioma.id !== bioma;
    cena()?.mostrarNinho(n && !botao.hidden ? { especie: n.especieId, semente: `${n.servidor.slot}-${n.servidor.derrotas}-${n.servidor.inicio ?? ''}`, aoClicar: () => botao.click() } : null);
    if (!n || botao.hidden) return;
    botao.textContent = n.servidor.ocupado ? `🪺 ${n.nome} (outro treinador está lutando)` : `🪺 Há um ninho de ${n.nome} neste mapa!`;
    botao.disabled = n.servidor.ocupado;
  };
  botao.onclick = async () => {
    const n = ninhoAtual();
    if (!n) return;
    const preco = vipAtivo(save) ? PRECO_NINHO_VIP : PRECO_NINHO;
    if (!(await confirmar('Ninho', `Pagar ${preco.toLocaleString('pt-BR')} Poké Dólares para enfrentar o ${n.nome} nível ${NIVEL_NINHO}? Ele não pode ser capturado. Vencendo: ${PREMIO_NINHO.toLocaleString('pt-BR')} + a roleta do Ninho${n.lendario ? ` e ${CHANCE_LENDARIO_NINHO * 100}% de chance de ganhar o ${n.nome}` : ''}.`))) return;
    try {
      await salvarAgora();
      const r = await api<{ save: Save; versao: number; ninho: EstadoNinhoServidor }>('POST', '/eventos/ninho/entrar', { slot: n.servidor.slot });
      adotarSaveDoServidor(r.save, r.versao);
      aoMudar();
    } catch (e) {
      avisar(e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.', 'erro');
      return;
    }
    lutar([pokemonDoNinho(n)], n.nome, async (venceu) => {
      try {
        const r = await api<{ venceu: boolean; fatia?: number; lendario?: boolean }>('POST', '/eventos/ninho/resultado', { slot: n.servidor.slot, venceu, lendario: n.lendario, especie: n.nome });
        if (!r.venceu) return void (await atualizar());
        save.silver += PREMIO_NINHO;
        await girarRoleta('Roleta do Ninho', ROLETA_NINHO, r.fatia ?? 0);
        premioDaFatia(save, r.fatia ?? 0);
        if (r.lendario) {
          const p = novoPokemon(n.especieId, 100, false);
          p.origem = 'ticket';
          registrarCapturado(save, n.especieId, false);
          if (save.time.length < TAMANHO_MAXIMO_TIME) save.time.push(p);
          else guardarNoPC(save, p);
          avisar(`Sorte grande! O ${n.nome} do ninho quis ir com você!`, 'ok');
        }
        salvar(save);
        aoMudar();
      } catch (e) {
        avisar(e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.', 'erro');
      }
      await atualizar();
    });
  };
  ouvintes.add(desenhar);
  desenhar();
  const relogio = setInterval(desenhar, 15_000);
  // o mapa pode ficar pronto depois do primeiro desenho
  const primeiro = setTimeout(desenhar, 1500);
  return { elemento: botao, parar: () => (ouvintes.delete(desenhar), clearInterval(relogio), clearTimeout(primeiro)) };
}
