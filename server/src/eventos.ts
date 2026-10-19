// Cofre e Loteria (eventos da planilha do dono). O servidor é o juiz: sorteia a senha e os números, cobra os
// bilhetes no save guardado e entrega o prêmio da Loteria por uma entrega (server/src/entregas.ts).
import { randomInt } from 'node:crypto';
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisar, avisarEvento, avisarTodos } from './mundo.ts';
import * as correio from './correio.ts';
import { lerNome, lerPokemon } from './entregas.ts';
import { NIVEL_MINIMO, liberado } from '../../shared/trancas.ts';
import { nivelTreinador } from '../../shared/treinador.ts';
import {
  BILHETES_POR_JOGADOR, DIGITOS_COFRE, FECHA_VENDAS, HORA_SORTEIO, INTERVALO_TENTATIVA_COFRE_MS, NUMEROS_LOTERIA, PARTE_DO_POTE, POTE_INICIAL,
  PRECO_BILHETE, PREMIO_COFRE_MAX, agoraEmBrasilia, formatarBilhete, primeiroDoProximoMes,
  CHANCE_LENDARIO_NINHO, DURACAO_NINHO_MS, EXTRA_POR_DERROTA_MS, INTERVALO_NINHO_MS, LUTA_NINHO_MS, PRECO_NINHO, PRECO_NINHO_VIP, PREMIO_CAPTURA, ROLETA_NINHO,
  proximaMeiaNoite, slotDoNinho, sortearFatia,
  DANO_MAXIMO_BOSS, DURACAO_BOSS_MS, NIVEL_BOSS, PONTOS_GUILDA_BOSS, PREMIOS_BOSS_GLOBAL,
} from '../../shared/eventosRegras.ts';

/** Nome de treinador (o que os outros veem), ou o usuário. */
function nomeDe(conta: { id: number; usuario: string }): string {
  try {
    const s = banco.lerSave(conta.id);
    const n = s ? (JSON.parse(s.dados) as { aparencia?: { nome?: unknown } }).aparencia?.nome : null;
    if (typeof n === 'string' && n.trim()) return n.trim().slice(0, 16);
  } catch {
    // fica o usuário
  }
  return conta.usuario;
}
const exigirStaff = (conta: banco.Conta) => {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
};
const mudou = () => avisarTodos({ t: 'eventos' });

// ---------- Cofre ----------
interface EstadoCofre {
  aberto: boolean;
  senha: string;
  /** nome do prêmio (o que os jogadores leem) */
  premio: string;
  /** o que vai para quem acertar, por uma entrega (server/src/entregas.ts) */
  conteudo: { tipo: 'item'; item: string; quantidade: number } | { tipo: 'pokemon'; dados: string };
  abertoEm: number;
  tentativas: number;
  vencedor?: { nome: string; usuario: string; quando: number };
}
const cofre = () => banco.lerEvento<EstadoCofre>('cofre');
const ultimaTentativa = new Map<number, number>();

const cofreParaFora = (c: EstadoCofre | null, admin: boolean) =>
  c && {
    aberto: c.aberto, premio: c.premio, abertoEm: c.abertoEm, tentativas: c.tentativas,
    vencedor: c.vencedor ? { nome: c.vencedor.nome, quando: c.vencedor.quando, ...(admin ? { usuario: c.vencedor.usuario } : {}) } : null,
  };

/** A staff tranca um item (com quantidade) ou um Pokémon montado; o sistema sorteia a senha e entrega a quem acertar. */
export function abrirCofre(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  let conteudo: EstadoCofre['conteudo'];
  if (dados.tipo === 'pokemon') conteudo = { tipo: 'pokemon', dados: JSON.stringify(lerPokemon(dados.pokemon)) };
  else if (dados.tipo === 'item') {
    const item = typeof dados.item === 'string' && /^[a-z0-9-]{1,60}$/.test(dados.item) ? dados.item : null;
    const quantidade = dados.quantidade;
    if (!item) throw new ErroConta('Item inválido.');
    if (typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 9999) throw new ErroConta('A quantidade vai de 1 a 9999.');
    conteudo = { tipo: 'item', item, quantidade };
  } else throw new ErroConta('Escolha um item ou um Pokémon.');
  const premio = lerNome(dados.nome).slice(0, PREMIO_COFRE_MAX) || 'um prêmio misterioso';
  if (cofre()?.aberto) throw new ErroConta('Já há um cofre esperando. Cancele antes de colocar outro.', 409);
  const senha = String(randomInt(10 ** DIGITOS_COFRE)).padStart(DIGITOS_COFRE, '0');
  banco.gravarEvento('cofre', { aberto: true, senha, premio, conteudo, abertoEm: Date.now(), tentativas: 0 } satisfies EstadoCofre);
  avisarEvento(`🔐 O Cofre PokeOrigins está trancado com um prêmio dentro: ${premio}! Descubra a senha de ${DIGITOS_COFRE} dígitos.`);
  mudou();
  return estado(conta);
}

export function fecharCofre(conta: banco.Conta) {
  exigirStaff(conta);
  const c = cofre();
  if (c?.aberto) banco.gravarEvento('cofre', { ...c, aberto: false });
  mudou();
  return estado(conta);
}

export function tentarCofre(conta: banco.Conta, dados: Record<string, unknown>) {
  const senha = typeof dados.senha === 'string' && new RegExp(`^\\d{${DIGITOS_COFRE}}$`).test(dados.senha) ? dados.senha : null;
  if (!senha) throw new ErroConta('Senha inválida.');
  const agora = Date.now();
  if (agora - (ultimaTentativa.get(conta.id) ?? 0) < INTERVALO_TENTATIVA_COFRE_MS) throw new ErroConta('Calma! Espere um instante antes de tentar de novo.', 429);
  ultimaTentativa.set(conta.id, agora);
  const resultado = banco.transacao(() => {
    const c = cofre();
    if (!c?.aberto) throw new ErroConta(c?.vencedor ? `Tarde demais: ${c.vencedor.nome} já abriu o cofre.` : 'Não há cofre para abrir agora.', 409);
    c.tentativas++;
    if (senha !== c.senha) {
      banco.gravarEvento('cofre', c);
      return { acertou: false as const };
    }
    c.aberto = false;
    c.vencedor = { nome: nomeDe(conta), usuario: conta.usuario, quando: agora };
    banco.gravarEvento('cofre', c);
    // o prêmio chega pelo correio
    correio.enviar(conta.id, 'Cofre PokeOrigins', `Você descobriu a senha ${c.senha} e abriu o cofre! Aqui está o prêmio.`,
      [c.conteudo.tipo === 'item' ? correio.anexoItem(c.conteudo.item, c.premio, c.conteudo.quantidade) : { tipo: 'pokemon', nome: c.premio, dados: JSON.parse(c.conteudo.dados) }], 'cofre');
    avisarEvento(`🔓 ${c.vencedor.nome} abriu o Cofre PokeOrigins (senha ${c.senha}) e levou: ${c.premio}!`);
    return { acertou: true as const, premio: c.premio };
  });
  if (resultado.acertou) {
    mudou();
  }
  return resultado;
}

// ---------- Loteria ----------
interface EstadoLoteria {
  pote: number;
  /** dia em que as vendas voltam (depois de alguém ganhar: dia 1º do mês seguinte) */
  voltaEm: string | null;
  /** último dia sorteado */
  sorteadoEm: string | null;
  ultimo?: { dia: string; numero: number; vencedor: string | null; premio: number };
}
const loteria = (): EstadoLoteria => banco.lerEvento<EstadoLoteria>('loteria') ?? { pote: POTE_INICIAL, voltaEm: null, sorteadoEm: null };
const minutos = (h: { hora: number; minuto: number }) => h.hora * 60 + h.minuto;

function situacao(l: EstadoLoteria, agora = Date.now()) {
  const { dia, minutos: min } = agoraEmBrasilia(agora);
  const pausada = l.voltaEm !== null && dia < l.voltaEm;
  return { dia, pausada, vendendo: !pausada && min < minutos(FECHA_VENDAS) };
}

/** Sorteia o dia, se já passou das 20h05 e ainda não sorteou (chamado a cada 30 s e a cada pedido). */
export function conferirSorteio(agora = Date.now(), forcar = false): void {
  const l = loteria();
  const { dia, pausada } = situacao(l, agora);
  if (!forcar && (pausada || l.sorteadoEm === dia || agoraEmBrasilia(agora).minutos < minutos(HORA_SORTEIO))) return;
  let dono: number | null = null;
  banco.transacao(() => {
    const numero = randomInt(NUMEROS_LOTERIA);
    dono = banco.donoDoBilhete(dia, numero);
    l.sorteadoEm = dia;
    if (dono === null) {
      l.ultimo = { dia, numero, vencedor: null, premio: l.pote };
      avisarEvento(`🎰 Loteria: saiu o número ${formatarBilhete(numero)} e ninguém acertou. O prêmio acumulou: ${l.pote.toLocaleString('pt-BR')} Poké Dólares!`);
    } else {
      const nome = nomeDe(banco.contaPorId(dono) ?? { id: dono, usuario: 'Alguém' });
      if (l.pote > 0) correio.enviar(dono, 'Loteria PokeOrigins', `Seu bilhete ${formatarBilhete(numero)} foi sorteado! Aqui está o prêmio.`, [correio.anexoItem('silver', 'Poké Dólares', l.pote)], 'loteria');
      l.ultimo = { dia, numero, vencedor: nome, premio: l.pote };
      avisarEvento(`🎰 ${nome} ganhou a Loteria com o número ${formatarBilhete(numero)} e levou ${l.pote.toLocaleString('pt-BR')} Poké Dólares! A Loteria volta no dia 1º do próximo mês.`);
      l.pote = POTE_INICIAL;
      l.voltaEm = primeiroDoProximoMes(dia);
    }
    banco.gravarEvento('loteria', l);
  });
  mudou();
}
setInterval(() => conferirSorteio(), 30_000).unref();

export function comprarBilhetes(conta: banco.Conta, dados: Record<string, unknown>) {
  conferirSorteio();
  const quantidade = dados.quantidade;
  if (typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > BILHETES_POR_JOGADOR) throw new ErroConta('Quantidade inválida.');
  banco.transacao(() => {
    const l = loteria();
    const { dia, vendendo, pausada } = situacao(l);
    if (!vendendo) throw new ErroConta(pausada ? 'A Loteria volta no dia 1º do próximo mês.' : 'As vendas de hoje já fecharam (até as 20h).', 409);
    const meus = banco.bilhetesDaConta(dia, conta.id).length;
    if (meus + quantidade > BILHETES_POR_JOGADOR) throw new ErroConta(`Cada jogador compra no máximo ${BILHETES_POR_JOGADOR} bilhetes por dia (você tem ${meus}).`);
    if (banco.bilhetesVendidos(dia) + quantidade > NUMEROS_LOTERIA) throw new ErroConta('Os números de hoje acabaram.', 409);
    const custo = quantidade * PRECO_BILHETE;
    banco.mudarSaves([conta.id], ([save]) => {
      const silver = typeof save.silver === 'number' ? save.silver : 0;
      if (silver < custo) throw new ErroConta('Poké Dólares insuficientes.');
      save.silver = silver - custo;
    });
    for (let i = 0; i < quantidade; i++) {
      let n = randomInt(NUMEROS_LOTERIA);
      while (banco.donoDoBilhete(dia, n) !== null) n = (n + 1) % NUMEROS_LOTERIA;
      banco.criarBilhete(dia, n, conta.id);
    }
    l.pote += Math.floor(custo * PARTE_DO_POTE);
    banco.gravarEvento('loteria', l);
  });
  mudou();
  const guardado = banco.lerSave(conta.id)!;
  return { ...estado(conta), save: JSON.parse(guardado.dados), versao: guardado.versao };
}

/** Staff abastece o prêmio (depois de alguém ganhar, por exemplo). */
export function abastecerLoteria(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const valor = dados.valor;
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 1 || valor > 1e9) throw new ErroConta('Valor inválido.');
  const l = loteria();
  l.pote += valor;
  banco.gravarEvento('loteria', l);
  mudou();
  return estado(conta);
}

export function estado(conta: banco.Conta) {
  conferirSorteio();
  const l = loteria();
  const s = situacao(l);
  conferirCaptura();
  conferirBoss();
  return {
    boss: bossParaFora(conta),
    outbreak: outbreakForcado(),
    ninho: ninhoParaFora(conta),
    captura: capturaParaFora(conta),
    cofre: cofreParaFora(cofre(), !!conta.admin),
    loteria: { pote: l.pote, vendendo: s.vendendo, pausada: s.pausada, voltaEm: l.voltaEm, meus: banco.bilhetesDaConta(s.dia, conta.id), vendidos: banco.bilhetesVendidos(s.dia), ultimo: l.ultimo ?? null },
  };
}

// ---------- Ninho ----------
// O jogo calcula onde o ninho está e qual Pokémon é (semente = horário + derrotas, client/src/ninho.ts); o servidor
// guarda o que é de todos: quanto tempo ele fica, quem está lutando agora e se alguém já derrotou.
interface EstadoNinho {
  slot: number;
  /** começo (ms); sem ele, o começo do horário do slot. A staff liga um ninho na hora com `inicio` = agora. */
  inicio?: number;
  derrotas: number;
  derrotado?: { nome: string; especie: string };
  lutando?: { contaId: number; ate: number };
}
const fimDoNinho = (n: EstadoNinho) => (n.inicio ?? n.slot * INTERVALO_NINHO_MS) + DURACAO_NINHO_MS + n.derrotas * EXTRA_POR_DERROTA_MS;
/** O ninho que vale agora: o guardado, se ainda não acabou; senão, o do horário. */
function ninhoVigente(agora = Date.now()): EstadoNinho {
  const n = banco.lerEvento<EstadoNinho>('ninho');
  if (n && !n.derrotado && agora < fimDoNinho(n)) return n;
  const slot = slotDoNinho(agora);
  return n && n.slot === slot ? n : { slot, derrotas: 0 };
}
const ninhoDoSlot = (slot: number): EstadoNinho => {
  const n = banco.lerEvento<EstadoNinho>('ninho');
  return n && n.slot === slot ? n : { slot, derrotas: 0 };
};

function ninhoParaFora(conta: banco.Conta, agora = Date.now()) {
  const n = ninhoVigente(agora);
  const ativo = !n.derrotado && agora < fimDoNinho(n);
  const lutando = n.lutando && n.lutando.ate > agora ? n.lutando : null;
  return { slot: n.slot, inicio: n.inicio ?? null, derrotas: n.derrotas, ativo, fim: fimDoNinho(n), ocupado: !!lutando && lutando.contaId !== conta.id, meu: !!lutando && lutando.contaId === conta.id, derrotado: n.derrotado ?? null };
}

/** Paga a entrada (100k, VIP 50k) e segura o ninho para esta conta enquanto ela luta. */
export function entrarNoNinho(conta: banco.Conta, dados: Record<string, unknown>) {
  const agora = Date.now();
  const slot = ninhoVigente(agora).slot;
  if (dados.slot !== slot) throw new ErroConta('Este ninho já sumiu.', 409);
  banco.transacao(() => {
    const n = ninhoVigente(agora);
    if (n.derrotado || agora >= fimDoNinho(n)) throw new ErroConta('Este ninho já sumiu.', 409);
    if (n.lutando && n.lutando.ate > agora && n.lutando.contaId !== conta.id) throw new ErroConta('Outro treinador está enfrentando este ninho agora.', 409);
    banco.mudarSaves([conta.id], ([save]) => {
      const vip = typeof save.vipAte === 'number' && save.vipAte > agora;
      const preco = vip ? PRECO_NINHO_VIP : PRECO_NINHO;
      const silver = typeof save.silver === 'number' ? save.silver : 0;
      if (silver < preco) throw new ErroConta('Poké Dólares insuficientes.');
      save.silver = silver - preco;
    });
    n.lutando = { contaId: conta.id, ate: agora + LUTA_NINHO_MS };
    banco.gravarEvento('ninho', n);
  });
  mudou();
  const guardado = banco.lerSave(conta.id)!;
  return { ninho: ninhoParaFora(conta), save: JSON.parse(guardado.dados), versao: guardado.versao };
}

/** Fim da luta. Venceu: o ninho some, sai a fatia da roleta e (se era lendário) os 5%. Perdeu: +5 min e ele muda de lugar. */
export function resultadoDoNinho(conta: banco.Conta, dados: Record<string, unknown>) {
  const slot = dados.slot;
  const especie = lerNome(dados.especie).slice(0, 40) || 'Pokémon';
  const resposta = banco.transacao(() => {
    if (typeof slot !== 'number') throw new ErroConta('Ninho inválido.');
    const n = ninhoDoSlot(slot);
    if (!n.lutando || n.lutando.contaId !== conta.id) throw new ErroConta('Você não está enfrentando este ninho.', 409);
    delete n.lutando;
    if (dados.venceu === true) {
      n.derrotado = { nome: nomeDe(conta), especie };
      banco.gravarEvento('ninho', n);
      avisarEvento(`🪺 ${n.derrotado.nome} derrotou o ninho de ${especie}!`);
      return { venceu: true, fatia: sortearFatia(ROLETA_NINHO), lendario: dados.lendario === true && Math.random() < CHANCE_LENDARIO_NINHO };
    }
    n.derrotas++;
    banco.gravarEvento('ninho', n);
    return { venceu: false };
  });
  mudou();
  return { ...resposta, ninho: ninhoParaFora(conta) };
}

// ---------- Evento de captura ----------
interface EstadoCaptura {
  especieId: number;
  nome: string;
  inicio: number;
  fim: number;
  premiado: boolean;
  /** melhor captura de cada conta (contaId → ...) */
  melhores: Record<string, { nome: string; soma: number; quando: number }>;
  vencedor?: { nome: string; soma: number };
}
const captura = () => banco.lerEvento<EstadoCaptura>('captura');
const rankingDaCaptura = (c: EstadoCaptura) =>
  Object.entries(c.melhores).sort(([, a], [, b]) => b.soma - a.soma || a.quando - b.quando).map(([id, m]) => ({ contaId: Number(id), ...m }));

/** A staff começa o evento com a espécie sorteada pelo jogo (só as que aparecem nos mapas); vai até a meia-noite. */
export function iniciarCaptura(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const especieId = dados.especieId;
  const nome = lerNome(dados.nome).slice(0, 40);
  if (typeof especieId !== 'number' || !Number.isSafeInteger(especieId) || especieId < 1 || !nome) throw new ErroConta('Espécie inválida.');
  const atual = captura();
  if (atual && !atual.premiado) throw new ErroConta('Já há um evento de captura em andamento.', 409);
  const agora = Date.now();
  banco.gravarEvento('captura', { especieId, nome, inicio: agora, fim: proximaMeiaNoite(agora), premiado: false, melhores: {} } satisfies EstadoCaptura);
  avisarEvento(`🎯 Evento de captura: quem capturar o ${nome} com a maior soma de IVs até a meia-noite leva o prêmio!`);
  mudou();
  return estado(conta);
}

/** O jogo avisa de uma captura em batalha nos mapas; o servidor confere o Pokémon no save guardado. */
export function registrarCaptura(conta: banco.Conta, dados: Record<string, unknown>) {
  conferirCaptura();
  const c = captura();
  if (!c || c.premiado || Date.now() >= c.fim) return { registrado: false };
  const uid = dados.uid;
  const s = banco.lerSave(conta.id);
  if (typeof uid !== 'number' || !s) return { registrado: false };
  const save = JSON.parse(s.dados) as { time?: unknown[]; caixa?: unknown[] };
  const p = [...(save.time ?? []), ...(save.caixa ?? [])].find((x) => (x as { uid?: number }).uid === uid) as { especieId?: number; origem?: string; ivs?: Record<string, number> } | undefined;
  if (!p || p.especieId !== c.especieId || p.origem || !p.ivs) return { registrado: false };
  const soma = Object.values(p.ivs).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  const antes = c.melhores[conta.id];
  if (antes && antes.soma >= soma) return { registrado: false, soma };
  c.melhores[conta.id] = { nome: nomeDe(conta), soma, quando: Date.now() };
  banco.gravarEvento('captura', c);
  mudou();
  return { registrado: true, soma };
}

/** Passou da meia-noite: entrega o prêmio ao primeiro do ranking (empate = quem capturou antes). */
export function conferirCaptura(agora = Date.now()): void {
  const c = captura();
  if (!c || c.premiado || agora < c.fim) return;
  const primeiro = rankingDaCaptura(c)[0];
  banco.transacao(() => {
    c.premiado = true;
    if (primeiro) {
      c.vencedor = { nome: primeiro.nome, soma: primeiro.soma };
      correio.enviar(primeiro.contaId, 'Evento de captura', `Você venceu o Evento de captura com ${primeiro.soma} de IVs! Aqui está o prêmio.`, [
        correio.anexoItem(PREMIO_CAPTURA.item, 'Ovo Lendário', 1),
        correio.anexoItem('silver', 'Poké Dólares', PREMIO_CAPTURA.silver),
        correio.anexoItem('gold', 'Origin Coins', PREMIO_CAPTURA.gold),
      ], 'captura');
    }
    banco.gravarEvento('captura', c);
  });
  if (primeiro) {
    avisarEvento(`🎯 ${primeiro.nome} venceu o Evento de captura com um ${c.nome} de ${primeiro.soma} de IVs!`);
  } else avisarEvento(`🎯 O Evento de captura do ${c.nome} terminou sem capturas.`);
  mudou();
}
setInterval(() => conferirCaptura(), 30_000).unref();

function capturaParaFora(conta: banco.Conta) {
  const c = captura();
  if (!c) return null;
  return {
    especieId: c.especieId, nome: c.nome, fim: c.fim, ativo: !c.premiado && Date.now() < c.fim, vencedor: c.vencedor ?? null,
    ranking: rankingDaCaptura(c).slice(0, 10).map((r) => ({ nome: r.nome, soma: r.soma })), meu: c.melhores[conta.id]?.soma ?? null,
  };
}

// ---------- Ligar eventos na hora (Administração → Eventos; para testar no Closed Beta) ----------
/** Outbreak ligado pela staff: vale 1 h a partir de agora (o jogo sorteia o mapa e a espécie com a semente `inicio`). */
interface OutbreakForcado { inicio: number; fim: number }
export const outbreakForcado = () => {
  const o = banco.lerEvento<OutbreakForcado>('outbreak');
  return o && Date.now() < o.fim ? o : null;
};

export function ligarEvento(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const agora = Date.now();
  if (dados.evento === 'outbreak') {
    banco.gravarEvento('outbreak', { inicio: agora, fim: agora + 60 * 60 * 1000 } satisfies OutbreakForcado);
    avisarEvento('🔥 Um Outbreak começou agora! Veja no canto da tela onde ele está.');
  } else if (dados.evento === 'ninho') {
    banco.gravarEvento('ninho', { slot: slotDoNinho(agora), inicio: agora, derrotas: 0 } satisfies EstadoNinho);
    avisarEvento('🪺 Um ninho apareceu! Veja no canto da tela onde ele está.');
  } else if (dados.evento === 'loteria') {
    const l = loteria();
    l.sorteadoEm = null;
    l.voltaEm = null;
    banco.gravarEvento('loteria', l);
    conferirSorteio(agora, true);
  } else throw new ErroConta('Evento desconhecido.');
  mudou();
  return estado(conta);
}

// ---------- Bosses (global e da guilda) ----------
// A staff monta o Pokémon (Administração → Eventos) e o boss fica 2 h na gaiola da cidade. Cada jogador luta UMA vez
// (HP infinito, 50 turnos; o jogo manda o dano). Global: top 3 jogadores. Guilda: soma por guilda, top 3 guildas;
// cada membro delas que lutou ganha pontos de guilda (loja da guilda futuramente).
interface EstadoBoss {
  tipo: 'global' | 'guilda';
  especieId: number;
  nome: string;
  pokemon: string;
  inicio: number;
  fim: number;
  premiado: boolean;
  danos: Record<string, { nome: string; dano: number; guilda: { id: number; nome: string } | null }>;
  lutando: Record<string, number>;
  resultado?: string;
}
const boss = () => banco.lerEvento<EstadoBoss>('boss');
const rankingBoss = (b: EstadoBoss) => Object.entries(b.danos).map(([id, d]) => ({ contaId: Number(id), ...d })).sort((x, y) => y.dano - x.dano);
function rankingGuildas(b: EstadoBoss) {
  const soma = new Map<number, { id: number; nome: string; dano: number; membros: number[] }>();
  for (const r of rankingBoss(b)) {
    if (!r.guilda) continue;
    const g = soma.get(r.guilda.id) ?? { ...r.guilda, dano: 0, membros: [] };
    g.dano += r.dano;
    g.membros.push(r.contaId);
    soma.set(r.guilda.id, g);
  }
  return [...soma.values()].sort((x, y) => y.dano - x.dano);
}

export function iniciarBoss(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const tipo = dados.tipo === 'guilda' ? 'guilda' : 'global';
  const atual = boss();
  if (atual && !atual.premiado) throw new ErroConta('Já há um boss na gaiola. Encerre antes de começar outro.', 409);
  const pokemon = lerPokemon(dados.pokemon) as unknown as Record<string, unknown>;
  pokemon.nivel = NIVEL_BOSS;
  const nome = lerNome(dados.nome).replace(/ Nv\. \d+$/, '').slice(0, 40) || 'Boss';
  const agora = Date.now();
  banco.gravarEvento('boss', { tipo, especieId: Number(pokemon.especieId), nome, pokemon: JSON.stringify(pokemon), inicio: agora, fim: agora + DURACAO_BOSS_MS, premiado: false, danos: {}, lutando: {} } satisfies EstadoBoss);
  avisarEvento(tipo === 'global' ? `👹 Boss global: ${nome} está furioso na gaiola da cidade! Cada treinador pode enfrentá-lo uma vez nas próximas 2 horas.` : `🛡️ Boss da guilda: ${nome} está na gaiola da cidade! O dano dos membros soma para a guilda (2 horas).`);
  mudou();
  return estado(conta);
}

export function encerrarBoss(conta: banco.Conta) {
  exigirStaff(conta);
  conferirBoss(Infinity);
  return estado(conta);
}

/** Entrar na luta: uma vez por jogador; no da guilda, só quem tem guilda. Devolve o Pokémon do boss. */
export function entrarNoBoss(conta: banco.Conta) {
  conferirBoss();
  const b = boss();
  if (!b || b.premiado) throw new ErroConta('Não há boss na gaiola agora.', 409);
  if (b.danos[conta.id] || b.lutando[conta.id]) throw new ErroConta('Você já enfrentou este boss.', 409);
  // tranca de nível (pedido do dono), pelo save guardado
  const guardado = banco.lerSave(conta.id);
  const xp = guardado ? (JSON.parse(guardado.dados) as Record<string, unknown>).xpTreinador : 0;
  if (!liberado('boss', nivelTreinador(typeof xp === 'number' && xp > 0 ? xp : 0), !!conta.admin)) throw new ErroConta(`O Boss abre no nível ${NIVEL_MINIMO.boss} de treinador.`, 403);
  if (b.tipo === 'guilda' && !banco.claDaConta(conta.id)) throw new ErroConta('O Boss da guilda é só para quem está numa guilda.', 409);
  b.lutando[conta.id] = Date.now();
  banco.gravarEvento('boss', b);
  return { pokemon: JSON.parse(b.pokemon), nome: b.nome };
}

export function resultadoDoBoss(conta: banco.Conta, dados: Record<string, unknown>) {
  const b = boss();
  if (!b || !b.lutando[conta.id] || b.danos[conta.id]) throw new ErroConta('Você não está enfrentando este boss.', 409);
  const dano = typeof dados.dano === 'number' && Number.isFinite(dados.dano) ? Math.max(0, Math.min(DANO_MAXIMO_BOSS, Math.floor(dados.dano))) : 0;
  const cla = banco.claDaConta(conta.id);
  b.danos[conta.id] = { nome: nomeDe(conta), dano, guilda: cla ? { id: cla.id, nome: cla.nome } : null };
  delete b.lutando[conta.id];
  banco.gravarEvento('boss', b);
  mudou();
  return { dano, ...estado(conta) };
}

/** Passaram as 2 h (ou a staff encerrou): entrega os prêmios. */
export function conferirBoss(agora = Date.now()): void {
  const b = boss();
  if (!b || b.premiado || agora < b.fim) return;
  const frases: string[] = [];
  banco.transacao(() => {
    b.premiado = true;
    if (b.tipo === 'global') {
      rankingBoss(b).slice(0, 3).forEach((r, i) => {
        if (r.dano <= 0) return;
        const p = PREMIOS_BOSS_GLOBAL[i];
        correio.enviar(r.contaId, 'Boss global', `Você ficou em ${i + 1}º lugar no ranking de dano do Boss global!`, [correio.anexoItem(p.item, p.nome, p.quantidade)], 'boss');
        frases.push(`${i + 1}º ${r.nome}`);
      });
    } else {
      rankingGuildas(b).slice(0, 3).forEach((g, i) => {
        if (g.dano <= 0) return;
        for (const id of g.membros) {
          correio.enviar(id, 'Boss da guilda', `Sua guilda ficou em ${i + 1}º lugar no ranking de dano do Boss da guilda!`, [correio.anexoItem('pontos-guilda', 'Pontos de guilda', PONTOS_GUILDA_BOSS)], 'boss');
        }
        frases.push(`${i + 1}º ${g.nome}`);
      });
    }
    b.resultado = frases.join(' · ');
    banco.gravarEvento('boss', b);
  });
  avisarEvento(`${b.tipo === 'global' ? '👹 Boss global' : '🛡️ Boss da guilda'} ${b.nome} terminou! ${frases.length ? frases.join(' · ') : 'Ninguém causou dano.'}`);
  mudou();
}
setInterval(() => conferirBoss(), 30_000).unref();

function bossParaFora(conta: banco.Conta) {
  const b = boss();
  if (!b) return null;
  return {
    tipo: b.tipo, especieId: b.especieId, nome: b.nome, fim: b.fim, ativo: !b.premiado, jaLutei: !!b.danos[conta.id] || !!b.lutando[conta.id],
    meuDano: b.danos[conta.id]?.dano ?? null, resultado: b.resultado ?? null,
    ranking: rankingBoss(b).slice(0, 10).map((r) => ({ nome: r.nome, dano: r.dano, guilda: r.guilda?.nome ?? null })),
    guildas: rankingGuildas(b).slice(0, 10).map((g) => ({ nome: g.nome, dano: g.dano })),
  };
}
