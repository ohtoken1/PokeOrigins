// Visual temático de cada evento (pedido do dono: "uma abinha mais bonitinha, com a temática do evento"). Cada evento
// tem cores, emblema (`ui/emblemaEvento.ts`) e um desenho de fundo próprios (CSS em `.tema-<id>`), usados no banner do topo das janelas
// (Torneio, Liga, Boss, Eventos) e nos cartões de Comunidade → Eventos. O catálogo também mora aqui.
import { NIVEL_MINIMO, type ConteudoTrancado } from '../../../shared/trancas';
import { PRECO_BILHETE, PRECO_NINHO, PRECO_NINHO_VIP, poteInicial, premiosCaptura, NIVEL_NINHO, premioNinho, premiosBossGlobal, pontosGuildaDaPosicao } from '../../../shared/eventosRegras';
import { ENTRADA_TORNEIO } from '../../../shared/torneioRegras';
import { JANELAS_RANQUEADO, PONTOS_DERROTA, PONTOS_VITORIA } from '../../../shared/ranqueado';
import { premioLiga } from '../../../shared/liga';
import { el } from './dom';
import { emblemaEvento } from './emblemaEvento';

export type IdEvento = 'torneio' | 'ranqueado' | 'liga' | 'nightmare' | 'boss' | 'outbreak' | 'ninho' | 'captura' | 'cofre' | 'loteria' | 'expedicao' | 'safari';

export interface InfoEvento {
  nome: string;
  /** frase curta em cima do título do banner */
  lema: string;
  onde: string;
  quando: string;
  descricao: string;
  premios: string;
  tranca?: ConteudoTrancado;
}

const n = (x: number) => x.toLocaleString('pt-BR');

/** Todos os eventos, na ordem da lista de Comunidade → Eventos. */
export const EVENTOS: Record<IdEvento, InfoEvento> = {
  torneio: {
    nome: 'Torneio', lema: 'Mata-mata de 16 treinadores', onde: 'Arena da cidade',
    quando: 'Todo dia às 12h30 (regras sorteadas) e às 18h30 (regras da staff). A inscrição abre 10 minutos antes.',
    descricao: `Melhor de 1, 60 s por turno, batalhas calculadas no servidor. Entrada de ${n(ENTRADA_TORNEIO)} Poké Dólares.`,
    premios: '1º: 150.000 Poké Dólares + 15 Origin Coins + Roleta do Torneio · 2º: 100.000 + 10 Origin Coins · 3º: 50.000',
    tranca: 'torneio',
  },
  ranqueado: {
    nome: 'PvP Ranqueado', lema: 'Da Poké Ball à Master Ball', onde: 'Arena da cidade',
    quando: `Todo dia, em dois horários de 1 hora: ${JANELAS_RANQUEADO.map((j) => `${j.hora}h${String(j.minuto).padStart(2, '0')}`).join(' e ')}.`,
    descricao: `Fila contra outros treinadores, com um elo para cada tier (Ubers, OU, UU e RU). Vitória +${PONTOS_VITORIA} pontos, derrota −${PONTOS_DERROTA} (mais ou menos, pela distância do adversário).`,
    premios: 'Elos: Poké Ball, Great Ball, Ultra Ball, Beast Ball e Master Ball (só 3 vagas por tier)',
  },
  liga: {
    nome: 'Liga Pokémon', lema: 'Elite 4', onde: 'Arena da cidade',
    quando: 'Uma tentativa por semana. A semana vira na segunda-feira, 00h00.',
    descricao: 'Quatro batalhas seguidas, sem curar o time entre elas (a bolsa vale entre uma e outra).',
    get premios() { const PREMIO_LIGA = { normal: premioLiga('normal') }; return `${PREMIO_LIGA.normal.porVitoria} League Coin por vitória; vencendo os 4: +${PREMIO_LIGA.normal.bonus} (${PREMIO_LIGA.normal.quantidade} no total) + ${n(PREMIO_LIGA.normal.silver)} Poké Dólares`; },
    tranca: 'liga',
  },
  nightmare: {
    nome: 'Liga Pokémon Nightmare', lema: 'Um mestre de cada tipo', onde: 'Arena da cidade',
    quando: 'Uma tentativa por semana. A semana vira na segunda-feira, 00h00.',
    descricao: '18 treinadores seguidos, um de cada tipo, com Pokémon até o nível 200. Sem curar entre as batalhas.',
    get premios() { const PREMIO_LIGA = { nightmare: premioLiga('nightmare') }; return `${PREMIO_LIGA.nightmare.porVitoria} League Coin Nightmare por vitória; vencendo os 18: +${PREMIO_LIGA.nightmare.bonus} (${PREMIO_LIGA.nightmare.quantidade} no total) + ${n(PREMIO_LIGA.nightmare.silver)} Poké Dólares`; },
    tranca: 'liga',
  },
  boss: {
    nome: 'Boss', lema: 'A fera da gaiola', onde: 'Gaiola da cidade',
    quando: 'Quando a staff liga. Fica 2 horas na gaiola.',
    descricao: 'Boss global e Boss da guilda: HP infinito, cada treinador luta uma vez, por até 50 turnos, e o dano vale para o ranking.',
    get premios() {
      const lista = (pos: number) => premiosBossGlobal(pos).map((p) => `${n(p.quantidade)} ${p.nome}`).join(' + ');
      const g = (pos: number) => pontosGuildaDaPosicao(pos);
      return `Global: 1º ${lista(0)} · 2º ${lista(1)} · 3º ${lista(2)} · 4º–10º ${lista(3)} · demais ${lista(10)} · Guilda: ${g(10)} Ponto de guilda por lutar; top 3 ${g(0)} / ${g(1)} / ${g(2)}; 4º–10º ${g(3)}`;
    },
  },
  outbreak: {
    nome: 'Outbreak', lema: 'Uma espécie toma conta do mapa', onde: 'Mapas (o aviso no canto da tela mostra qual)',
    quando: 'Todo dia às 15h e às 21h, por 1 hora.',
    descricao: 'Uma espécie comum aparece em metade dos encontros de um mapa de uma região.',
    premios: 'Muito mais chances de achar aquela espécie shiny ou com IVs altos',
  },
  ninho: {
    nome: 'Ninho', lema: 'Um gigante protege o ninho', onde: 'Mapas (o aviso no canto da tela mostra qual)',
    quando: 'Um novo a cada 20 minutos. Fica 10 minutos (+5 por derrota).',
    descricao: `Pokémon nível ${NIVEL_NINHO} que não pode ser capturado. Entrada de ${n(PRECO_NINHO)} Poké Dólares (VIP ${n(PRECO_NINHO_VIP)}).`,
    get premios() { return `${n(premioNinho())} Poké Dólares + Roleta do Ninho · ninho de lendário: 5% de ganhar o Pokémon`; },
  },
  captura: {
    nome: 'Evento de captura', lema: 'A melhor captura do dia', onde: 'Mapas',
    quando: 'Quando a staff liga. Vai até a meia-noite.',
    descricao: 'Capture a espécie sorteada em batalha: ganha quem tiver a maior soma de IVs.',
    get premios() { return premiosCaptura().map((p) => `${n(p.quantidade)} ${p.nome}`).join(' + '); },
  },
  cofre: {
    nome: 'Cofre PokeOrigins', lema: 'Quem descobre a senha leva', onde: 'NPC Eventos (feira do oeste)',
    quando: 'Quando a staff tranca um prêmio.',
    descricao: 'Senha de 3 dígitos. Quem acertar primeiro leva o prêmio.',
    premios: 'O prêmio que a staff colocou no cofre',
  },
  loteria: {
    nome: 'Loteria PokeOrigins', lema: 'O prêmio acumula', onde: 'NPC Eventos (feira do oeste)',
    quando: 'Vendas até as 20h; o sorteio sai às 20h05.',
    descricao: `Bilhete de ${n(PRECO_BILHETE)} com um número de 5 dígitos. Metade vai para o prêmio; ninguém acertou, acumula.`,
    get premios() { return `O prêmio acumulado (começa em ${n(poteInicial())} Poké Dólares)`; },
  },
  expedicao: {
    nome: 'Expedição', lema: 'Seus Pokémon exploram por você', onde: 'NPC Eventos (feira do oeste)',
    quando: 'Sempre aberta: 1, 3 ou 6 horas.',
    descricao: 'Mande até 6 Pokémon. Quanto maior o Power somado, melhores os achados.',
    premios: 'Berries, Apricorns, Pokébolas, remédios, Energies e, com sorte, um item raro (tudo NT)',
  },
  safari: {
    nome: 'Safari', lema: 'Três salas, só Pokémon fortes', onde: 'NPC Safari da cidade',
    quando: 'Todo dia: 1 Ticket Safari grátis (VIP: 2) e mais 1 para comprar.',
    descricao: '3 salas com 10 Pokémon do tipo que você escolher, todos tier A ou melhor, com raros 10× mais comuns.',
    premios: 'Pokémon com IVs altos e mais chance de shiny e lendários',
    tranca: 'safari',
  },
};

export const textoTrancaDoEvento = (e: InfoEvento) => (e.tranca ? `Treinador nível ${NIVEL_MINIMO[e.tranca]}+` : 'Sem nível mínimo');

export type EstadoSelo = 'ativo' | 'espera' | 'fechado';

/** Banner do topo de um evento: fundo temático, emblema grande, lema, título e um selo (Ao vivo / horário). */
export function bannerEvento(id: IdEvento, opcoes: { titulo?: string; subtitulo?: string | HTMLElement; selo?: { texto: string; estado: EstadoSelo } } = {}): HTMLElement {
  const e = EVENTOS[id];
  return el('header', { class: `evento-banner tema-${id}` },
    el('span', { class: 'evento-banner-desenho', 'aria-hidden': 'true' }),
    emblemaEvento(id),
    el('div', { class: 'evento-banner-texto' },
      el('small', {}, e.lema),
      el('h3', {}, opcoes.titulo ?? e.nome),
      opcoes.subtitulo ? el('p', {}, opcoes.subtitulo) : ''),
    opcoes.selo ? el('span', { class: `evento-selo ${opcoes.selo.estado}` }, opcoes.selo.texto) : '');
}

/** Classes da janela de um evento (borda, barra do título e destaques na cor do tema). */
export const classeTematica = (id: IdEvento) => `janela-tematica tema-${id}`;
