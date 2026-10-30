// Orbs (os tickets de prêmio), a Chave Temporal e os prêmios do Passe de batalha: sorteados e entregues AQUI, no
// save guardado. Antes era tudo no navegador, e quem mexesse no save ganhava Origin Coins, VIP e títulos à vontade;
// agora o `PUT /api/save` não aceita mais esses valores subindo (server/src/protecaoSave.ts).
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import {
  NIVEIS_DO_PASSE, abrirTicket, gerarPokemon, itemAleatorio, itemExiste, itensDoGrupoDoTicket, nivelDoPasse, nomeDaEspecie, nomeDoItem, nomeDoTitulo,
  temporadaDoPasse, ticketPorId, type PremioDoTicket, type ResultadoDoTicket,
} from './motorDoJogo.ts';
import { itemInegociavel } from '../../shared/naoTrocavel.ts';
import { KIT_PRE_REGISTRO } from '../../shared/kitPreRegistro.ts';
import { conteudoKitPreRegistro } from '../../shared/premiosEventos.ts';
import { cabePokemon, guardarPokemon, type PokemonSave, type SaveMin } from './trocas.ts';

const DIA_MS = 86_400_000;
const numero = (n: number) => n.toLocaleString('pt-BR');
const PC_CHEIO = 'Seu PC está cheio! Libere espaço no PC para receber Pokémon novos.';

type Save = SaveMin & Record<string, unknown>;

/** Cabem `n` Pokémon novos no save? (time ou boxes) */
function cabem(save: Save, n: number): boolean {
  const copia = structuredClone(save);
  for (let i = 0; i < n; i++) {
    const p = { especieId: 1, nivel: 1 } as PokemonSave;
    if (!cabePokemon(copia, p)) return false;
    guardarPokemon(copia, p, false);
  }
  return true;
}

/**
 * Entrega os prêmios sorteados no save (a mesma regra de `entregar` de client/src/ui/ticket.ts). `nt`: trilha grátis
 * do Passe: item com versão "-nt" sai nela, os outros contam em `itensNt`, Pokémon sai NT. Devolve uma frase por prêmio.
 */
export function entregarPremios(save: Save, r: ResultadoDoTicket, opcoes: { nt?: boolean } = {}): string[] {
  return r.pacote.map((premio: PremioDoTicket, i) => {
    if (premio.tipo === 'item') {
      const id = opcoes.nt && itemExiste(`${premio.id}-nt`) ? `${premio.id}-nt` : premio.id;
      save.itens[id] = (save.itens[id] ?? 0) + premio.quantidade;
      if (opcoes.nt && id === premio.id) {
        const nt = ((save.itensNt ??= {}) as Record<string, number>);
        nt[id] = (nt[id] ?? 0) + premio.quantidade;
      }
      return `${nomeDoItem(id)} ×${premio.quantidade}${opcoes.nt && id === premio.id ? ' (NT)' : ''} foi para a bolsa.`;
    }
    if (premio.tipo === 'silver') {
      save.silver = (Number(save.silver) || 0) + premio.quantidade;
      return `+${numero(premio.quantidade)} Poké Dólares.`;
    }
    if (premio.tipo === 'gold') {
      save.gold = (Number(save.gold) || 0) + premio.quantidade;
      return `+${numero(premio.quantidade)} Origin Coins.`;
    }
    if (premio.tipo === 'vip') {
      const atual = typeof save.vipAte === 'number' ? save.vipAte : 0;
      save.vipAte = Math.max(atual, Date.now()) + premio.dias * DIA_MS;
      return `+${premio.dias} dia${premio.dias > 1 ? 's' : ''} de VIP na sua conta.`;
    }
    if (premio.tipo === 'titulo') {
      const lista = Array.isArray(save.titulosGanhos) ? (save.titulosGanhos as string[]) : [];
      save.titulosGanhos = [...new Set([...lista, premio.id])];
      return `Título "${nomeDoTitulo(premio.id)}" liberado (Minha conta → Meu perfil).`;
    }
    const shiny = !!r.shiny[i];
    const p = gerarPokemon(premio.especie, premio.nivel, { shiny, ivMinimo: premio.ivMinimo }) as unknown as PokemonSave;
    p.origem = 'ticket';
    p.obtido = 'nt' in opcoes ? 'passe' : 'orb';
    if (opcoes.nt) p.inegociavel = true;
    const noTime = save.time.length;
    guardarPokemon(save, p, false);
    const nome = `${nomeDaEspecie(premio.especie)}${shiny ? ' ✨' : ''}`;
    return save.time.length > noTime ? `${nome} entrou no seu time.` : `${nome} foi enviado para o PC.`;
  });
}

/** Quantos Pokémon um resultado dá. */
export const pokemonsDoResultado = (r: ResultadoDoTicket) => r.pacote.filter((p) => p.tipo === 'pokemon').length;

/** Abre 1 a 5 Orbs (ou Chaves Temporais) iguais: gasta da bolsa guardada, sorteia e entrega. */
export function abrir(conta: banco.Conta, dados: Record<string, unknown>) {
  const id = typeof dados.id === 'string' ? dados.id : '';
  const ticket = ticketPorId(id);
  if (!ticket) throw new ErroConta('Esse item não é uma Orb.');
  const n = Number(dados.quantidade);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new ErroConta('Quantidade inválida.');
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada antes.');
  let resultados: ResultadoDoTicket[] = [];
  let frases: string[] = [];
  banco.mudarSaves([conta.id], ([bruto]) => {
    const save = bruto as unknown as Save;
    if ((save.itens?.[id] ?? 0) < n) throw new ErroConta(`Você não tem ${n} ${ticket.nome}.`, 409);
    // cada Orb pode dar um Pokémon: com o PC cheio não abre (regra do dono)
    if (!cabem(save, n)) throw new ErroConta(PC_CHEIO, 409);
    save.itens[id] -= n;
    if (save.itens[id] <= 0) delete save.itens[id];
    resultados = Array.from({ length: n }, () => abrirTicket(ticket));
    frases = resultados.flatMap((r) => entregarPremios(save, r));
  });
  const guardado = banco.lerSave(conta.id)!;
  return { save: JSON.parse(guardado.dados), versao: guardado.versao, resultados, frases };
}

// ---------- Passe de batalha: o resgate é feito aqui (o XP do passe ainda vem do navegador) ----------
type EstadoPasse = { xp?: number; temporada?: string; premium?: boolean; resgatados?: { gratis: number[]; premium: number[] } };

/** Resgata casas do passe (uma ou várias: "Resgatar tudo"). Grátis = NT (pedido do dono). */
export function resgatarPasse(conta: banco.Conta, dados: Record<string, unknown>) {
  const casas = Array.isArray(dados.casas) ? dados.casas.slice(0, NIVEIS_DO_PASSE * 2) : [];
  const temporada = temporadaDoPasse();
  if (!temporada) throw new ErroConta('Não há temporada do passe em andamento.', 409);
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada antes.');
  let frases: string[] = [];
  banco.mudarSaves([conta.id], ([bruto]) => {
    const save = bruto as unknown as Save;
    const passe = (save.passe ?? {}) as EstadoPasse;
    if (passe.temporada !== temporada.id) throw new ErroConta('O passe mudou de temporada. Recarregue a página.', 409);
    const resgatados = (passe.resgatados ??= { gratis: [], premium: [] });
    const nivel = nivelDoPasse(Number(passe.xp) || 0);
    const validas = casas
      .map((c) => (c ?? {}) as { trilha?: unknown; nivel?: unknown })
      .filter((c): c is { trilha: 'gratis' | 'premium'; nivel: number } => (c.trilha === 'gratis' || c.trilha === 'premium') && Number.isInteger(c.nivel) && (c.nivel as number) >= 1 && (c.nivel as number) <= NIVEIS_DO_PASSE)
      .filter((c, i, l) => l.findIndex((x) => x.trilha === c.trilha && x.nivel === c.nivel) === i)
      .filter((c) => c.nivel <= nivel && !resgatados[c.trilha].includes(c.nivel) && (c.trilha === 'gratis' || passe.premium));
    if (!validas.length) throw new ErroConta('Nada para resgatar.', 409);
    const resultados = validas.map((c) => {
      const premio = temporada[c.trilha][c.nivel - 1];
      const resolvido: PremioDoTicket = premio.tipo === 'aleatorio'
        ? { tipo: 'item', id: ((l) => l[Math.floor(Math.random() * l.length)])(itensDoGrupoDoTicket(premio.grupo)), quantidade: premio.quantidade }
        : premio;
      const shiny = resolvido.tipo === 'pokemon' && Math.random() < resolvido.chanceShiny;
      return { casa: c, r: { raridade: 'comum', pacote: [resolvido], shiny: [shiny] } as ResultadoDoTicket };
    });
    if (!cabem(save, resultados.reduce((t, x) => t + pokemonsDoResultado(x.r), 0))) throw new ErroConta(PC_CHEIO, 409);
    for (const { casa, r } of resultados) {
      resgatados[casa.trilha].push(casa.nivel);
      frases.push(...entregarPremios(save, r, { nt: casa.trilha === 'gratis' }));
    }
    save.passe = passe;
  });
  const guardado = banco.lerSave(conta.id)!;
  return { save: JSON.parse(guardado.dados), versao: guardado.versao, frases };
}

// ---------- Kit de pré-registro: aberto aqui (pode ter Origin Coins); tudo sai NT ----------
export function abrirKitPreRegistro(conta: banco.Conta) {
  const conteudo = conteudoKitPreRegistro();
  if (!conteudo.length) throw new ErroConta('O conteúdo do Kit de pré-registro ainda vai ser anunciado. Guarde o kit: ele abre quando estiver pronto.', 409);
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada antes.');
  const frases: string[] = [];
  banco.mudarSaves([conta.id], ([bruto]) => {
    const save = bruto as unknown as Save;
    if ((save.itens?.[KIT_PRE_REGISTRO] ?? 0) < 1) throw new ErroConta('Você não tem o Kit de pré-registro.', 409);
    save.itens[KIT_PRE_REGISTRO] -= 1;
    if (save.itens[KIT_PRE_REGISTRO] <= 0) delete save.itens[KIT_PRE_REGISTRO];
    for (const p of conteudo) {
      if (p.id === 'silver' || p.id === 'gold') {
        save[p.id] = (Number(save[p.id]) || 0) + p.quantidade;
        frases.push(`${numero(p.quantidade)} ${p.id === 'silver' ? 'Poké Dólares' : 'Origin Coins'}`);
        continue;
      }
      if (p.id === 'fragmentos') {
        save.fragmentos = (Number(save.fragmentos) || 0) + p.quantidade;
        frases.push(`${p.quantidade} Fragmentos Temporais`);
        continue;
      }
      // item aleatório: sorteia um item e vem a quantidade toda dele (como no jogo antes)
      const base = p.id === 'mint' || p.id === 'charm' || p.id === 'orb' ? itemAleatorio(p.id) : p.id;
      const id = itemExiste(`${base}-nt`) ? `${base}-nt` : base;
      save.itens[id] = (save.itens[id] ?? 0) + p.quantidade;
      if (id === base && !itemInegociavel(id)) {
        const nt = ((save.itensNt ??= {}) as Record<string, number>);
        nt[id] = (nt[id] ?? 0) + p.quantidade;
      }
      frases.push(`${p.quantidade}× ${nomeDoItem(id)}`);
    }
  });
  const guardado = banco.lerSave(conta.id)!;
  return { save: JSON.parse(guardado.dados), versao: guardado.versao, frases };
}
