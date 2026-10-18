// Correio: uma caixa por conta (pedido do dono). Prêmios de eventos (Liga, Torneio, Cofre, Loteria, Boss, Evento de
// captura), presentes da staff (Dar item, Dar Pokémon, aba Correio) e avisos (atualização etc.) chegam aqui como
// CARTAS. Anexos ficam guardados na carta até o jogador clicar em Resgatar: só então entram no save guardado, numa
// mudança só (mudarSaves). Assim nada troca o save por baixo de quem está jogando.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { aplicarItem, lerNome, lerPokemon } from './entregas.ts';
import { avisar } from './mundo.ts';
import { guardarPokemon, type PokemonSave, type SaveMin } from './trocas.ts';

export type Anexo = { tipo: 'item'; item: string; nome: string; quantidade: number } | { tipo: 'pokemon'; nome: string; dados: PokemonSave };

/** Cartas guardadas por conta: passando disso, as mais velhas já lidas e sem nada para resgatar são apagadas. */
const CARTAS_MAX = 200;
const TITULO_MAX = 60;
const TEXTO_MAX = 2000;
const ANEXOS_MAX = 10;
const QUANTIDADE_MAX = 999_999_999;

/** Anexo de item (ou saldo: silver, gold, fragmentos, league-coins…; medalhas de torneio). */
export const anexoItem = (item: string, nome: string, quantidade: number): Anexo => ({ tipo: 'item', item, nome, quantidade });

/** Põe uma carta na caixa da conta e avisa o jogo dela (se estiver aberto). `de` = quem mandou (staff, liga, torneio…). */
export function enviar(contaId: number, titulo: string, texto: string, anexos: Anexo[] = [], de = 'sistema'): void {
  banco.criarCarta(contaId, titulo.slice(0, TITULO_MAX), texto.slice(0, TEXTO_MAX), de, JSON.stringify(anexos));
  const sobra = banco.quantasCartas(contaId) - CARTAS_MAX;
  if (sobra > 0) banco.apagarCartasVelhas(contaId, sobra);
  avisar(contaId, { t: 'correio' });
}

/** O que o jogo mostra de um anexo (Pokémon: só o que aparece na carta). */
function anexoParaFora(a: Anexo) {
  if (a.tipo === 'item') return a;
  return { tipo: 'pokemon' as const, nome: a.nome, especieId: a.dados.especieId, nivel: a.dados.nivel, shiny: a.dados.shiny === true };
}

/** Caixa do jogador (mais nova primeiro). */
export function listar(conta: banco.Conta) {
  const cartas = banco.cartasDaConta(conta.id).map((c) => ({
    id: c.id, titulo: c.titulo, texto: c.texto, de: c.de, criadoEm: c.criado_em, lida: !!c.lida, resgatada: !!c.resgatada,
    anexos: (JSON.parse(c.anexos) as Anexo[]).map(anexoParaFora),
  }));
  return { cartas };
}

const lerId = (v: unknown) => {
  const id = Number(v);
  if (!Number.isSafeInteger(id) || id < 1) throw new ErroConta('Carta não encontrada.', 404);
  return id;
};

export function ler(conta: banco.Conta, dados: Record<string, unknown>) {
  banco.marcarCartaLida(lerId(dados.id), conta.id);
  return listar(conta);
}

/**
 * Resgata os anexos de uma carta (`id`) ou de todas (`todas: true`). Tudo numa mudança só: se um Pokémon não couber
 * (PC cheio), nada é resgatado e as cartas continuam esperando.
 */
export function resgatar(conta: banco.Conta, dados: Record<string, unknown>) {
  if (!banco.lerSave(conta.id)) throw new ErroConta('Comece sua jornada antes de resgatar.', 409);
  const cartas = (dados.todas === true ? banco.cartasDaConta(conta.id) : [banco.cartaDaConta(lerId(dados.id), conta.id)])
    .filter((c): c is banco.Carta => !!c && !c.resgatada && c.anexos !== '[]');
  if (!cartas.length) throw new ErroConta('Não há nada para resgatar.', 409);
  const recebidos: { nome: string; quantidade: number }[] = [];
  banco.mudarSaves([conta.id], ([save]) => {
    // da mais velha para a mais nova (a ordem em que chegaram)
    for (const c of [...cartas].reverse()) {
      for (const a of JSON.parse(c.anexos) as Anexo[]) {
        if (a.tipo === 'item') aplicarItem(save, a.item, a.quantidade);
        // Pokémon: time se couber, senão a primeira box com espaço (PC cheio = erro e nada muda)
        else guardarPokemon(save as unknown as SaveMin, a.dados, false);
        recebidos.push({ nome: a.nome, quantidade: a.tipo === 'item' ? a.quantidade : 1 });
      }
      banco.marcarCartaResgatada(c.id, conta.id);
    }
  });
  const guardado = banco.lerSave(conta.id)!;
  return { ...listar(conta), recebidos, save: JSON.parse(guardado.dados), versao: guardado.versao };
}

/** Apaga uma carta (`id`) ou todas as lidas (`lidas: true`). Carta com anexo esperando não é apagada. */
export function apagar(conta: banco.Conta, dados: Record<string, unknown>) {
  const podeApagar = (c: banco.Carta) => !!c.resgatada || c.anexos === '[]';
  if (dados.lidas === true) {
    for (const c of banco.cartasDaConta(conta.id)) if (c.lida && podeApagar(c)) banco.apagarCarta(c.id, conta.id);
    return listar(conta);
  }
  const c = banco.cartaDaConta(lerId(dados.id), conta.id);
  if (!c) throw new ErroConta('Carta não encontrada.', 404);
  if (!podeApagar(c)) throw new ErroConta('Resgate os anexos antes de apagar a carta.', 409);
  banco.apagarCarta(c.id, conta.id);
  return listar(conta);
}

// ---- staff: Administração → Correio ----
/**
 * A staff manda uma carta para um jogador (`usuario`) ou para todos (`todos: true`), com anexos opcionais: itens e
 * saldos (`itens: [{ item, nome, quantidade }]`) e um Pokémon montado (`pokemon`, como no Dar Pokémon).
 */
export function enviarDaStaff(conta: banco.Conta, dados: Record<string, unknown>) {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
  const titulo = lerNome(dados.titulo);
  if (titulo.length < 3) throw new ErroConta('Escreva um título (3 letras ou mais).');
  const texto = typeof dados.texto === 'string' ? dados.texto.replace(/\r/g, '').replace(/[^\P{Cc}\n]/gu, ' ').trim().slice(0, TEXTO_MAX) : '';
  const anexos: Anexo[] = [];
  for (const x of Array.isArray(dados.itens) ? dados.itens : []) {
    const o = (x ?? {}) as Record<string, unknown>;
    const item = typeof o.item === 'string' ? o.item : '';
    if (!/^[a-z0-9-]{1,60}$/.test(item)) throw new ErroConta('Item inválido.');
    const q = o.quantidade;
    if (typeof q !== 'number' || !Number.isSafeInteger(q) || q < 1 || q > QUANTIDADE_MAX) throw new ErroConta('Quantidade inválida.');
    anexos.push(anexoItem(item, lerNome(o.nome) || item, q));
  }
  if (dados.pokemon) anexos.push({ tipo: 'pokemon', nome: lerNome(dados.nomePokemon) || 'Pokémon', dados: lerPokemon(dados.pokemon) });
  if (anexos.length > ANEXOS_MAX) throw new ErroConta(`No máximo ${ANEXOS_MAX} anexos por carta.`);
  if (!texto && !anexos.length) throw new ErroConta('A carta está vazia: escreva um texto ou anexe algo.');
  let para: number[];
  if (dados.todos === true) para = banco.contasComSave();
  else {
    const usuario = typeof dados.usuario === 'string' ? dados.usuario.trim() : '';
    const alvo = usuario ? banco.contaPorUsuario(usuario) : undefined;
    if (!alvo) throw new ErroConta('Jogador não encontrado.', 404);
    para = [alvo.id];
  }
  banco.transacao(() => {
    for (const id of para) enviar(id, titulo, texto, anexos, 'staff');
  });
  return { enviadas: para.length };
}
