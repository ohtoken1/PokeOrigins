// Regras dos eventos do Cofre e da Loteria (planilha "Eventos PokeOrigins.xlsx", decisões do dono). Sem imports:
// o servidor lê este arquivo. Os PRÊMIOS podem ser trocados pela staff (shared/premiosEventos.ts): use as funções
// poteInicial(), premioNinho(), roletaNinho(), premiosCaptura(), premiosBossGlobal(), pontosGuildaDaPosicao().
import { ajustesPremios, type Fatia, type Premio } from './premiosEventos.ts';

/** Cofre: senha de 3 dígitos sorteada pelo sistema; tentativas ilimitadas, mas uma a cada tanto por conta. */
export const DIGITOS_COFRE = 3;
export const INTERVALO_TENTATIVA_COFRE_MS = 10_000;
export const PREMIO_COFRE_MAX = 120;

/** Loteria: bilhete de 1.000 Poké Dólares com número de 5 dígitos que não se repete no dia. */
export const PRECO_BILHETE = 1000;
export const BILHETES_POR_JOGADOR = 100;
/** Parte de cada bilhete que vai para o prêmio (o resto some do jogo). */
export const PARTE_DO_POTE = 0.5;
/** Prêmio com que a loteria recomeça depois de alguém ganhar (pedido do dono: 500 mil; a staff pode abastecer mais). */
export const POTE_INICIAL = 500_000;
export const poteInicial = () => ajustesPremios().loteria?.poteInicial ?? POTE_INICIAL;
export const NUMEROS_LOTERIA = 100_000;
/** Horário de Brasília: vendas até 20h00, sorteio às 20h05. */
export const FECHA_VENDAS = { hora: 20, minuto: 0 };
export const HORA_SORTEIO = { hora: 20, minuto: 5 };

const BRASILIA_MS = -3 * 60 * 60 * 1000;
/** Dia ("2026-10-15") e minutos do dia no horário de Brasília. */
export function agoraEmBrasilia(agora = Date.now()): { dia: string; minutos: number } {
  const br = new Date(agora + BRASILIA_MS);
  return { dia: br.toISOString().slice(0, 10), minutos: br.getUTCHours() * 60 + br.getUTCMinutes() };
}
/** Primeiro dia do mês seguinte ("2026-11-01"). */
export function primeiroDoProximoMes(dia: string): string {
  const [a, m] = dia.split('-').map(Number);
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`;
}
export const formatarBilhete = (n: number) => String(n).padStart(5, '0');

/** Ninho: um novo a cada 20 min; fica 10 min no mapa; cada derrota de quem tentou dá +5 min. */
export const INTERVALO_NINHO_MS = 20 * 60 * 1000;
export const DURACAO_NINHO_MS = 10 * 60 * 1000;
export const EXTRA_POR_DERROTA_MS = 5 * 60 * 1000;
export const PRECO_NINHO = 100_000;
export const PRECO_NINHO_VIP = 50_000;
export const NIVEL_NINHO = 150;
export const PREMIO_NINHO = 100_000;
export const premioNinho = () => ajustesPremios().ninho?.silver ?? PREMIO_NINHO;
export const CHANCE_LENDARIO_NINHO = 0.05;
/** Tempo que quem entrou tem para lutar antes de o ninho ficar livre de novo. */
export const LUTA_NINHO_MS = 10 * 60 * 1000;
export const slotDoNinho = (agora = Date.now()) => Math.floor(agora / INTERVALO_NINHO_MS);

/** Roleta do Ninho (pedido do dono): fatias do mesmo tamanho na roda; as chances reais aparecem ao lado. */
export const ROLETA_NINHO: Fatia[] = [
  { id: 'silver', nome: '50.000 Poké Dólares', quantidade: 50_000, chance: 0.9 },
  { id: 'mint', nome: 'Mint aleatória', quantidade: 1, chance: 0.02 },
  { id: 'abilitycapsule', nome: 'Ability Capsule', quantidade: 1, chance: 0.02 },
  { id: 'abilitypatch', nome: 'Ability Patch', quantidade: 1, chance: 0.02 },
  { id: 'charm', nome: 'Charm aleatório', quantidade: 1, chance: 0.01 },
  { id: 'ovo-comum-s', nome: 'Ovo Comum S', quantidade: 1, chance: 0.01 },
  { id: 'orb', nome: 'Orb aleatória', quantidade: 1, chance: 0.01 },
  { id: 'fragmentos', nome: '3 Fragmentos Temporais', quantidade: 3, chance: 0.009 },
  { id: 'chave-temporal', nome: 'Chave Temporal', quantidade: 1, chance: 0.001 },
];
export const roletaNinho = () => ajustesPremios().ninho?.roleta ?? ROLETA_NINHO;
export function sortearFatia(roleta: { chance: number }[], aleatorio = Math.random): number {
  let r = aleatorio();
  for (let i = 0; i < roleta.length; i++) if ((r -= roleta[i].chance) < 0) return i;
  return 0;
}

/** Evento de captura: maior soma de IVs da espécie sorteada até a meia-noite de Brasília. */
export const PREMIOS_CAPTURA: Premio[] = [
  { id: 'ovo-lendario', nome: 'Ovo Lendário', quantidade: 1 },
  { id: 'silver', nome: 'Poké Dólares', quantidade: 200_000 },
  { id: 'gold', nome: 'Origin Coins', quantidade: 50 },
];
export const premiosCaptura = () => ajustesPremios().captura ?? PREMIOS_CAPTURA;
/** Próxima meia-noite de Brasília (ms). */
export function proximaMeiaNoite(agora = Date.now()): number {
  const br = new Date(agora + BRASILIA_MS);
  return Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate() + 1) - BRASILIA_MS;
}

/** Bosses (global e da guilda): HP infinito, 50 turnos, nível 200 para os testes (o dono decide 150 ou 200), 2 h na gaiola. */
export const NIVEL_BOSS = 200;
export const TURNOS_BOSS = 50;
export const DURACAO_BOSS_MS = 2 * 60 * 60 * 1000;
/** teto do dano de uma luta (a luta é calculada no servidor; o teto é só uma garantia) */
export const DANO_MAXIMO_BOSS = 5_000_000;
export const PREMIOS_BOSS_GLOBAL = [
  { item: 'chave-temporal', nome: 'Chave Temporal', quantidade: 1 },
  { item: 'fragmentos', nome: 'Fragmentos Temporais', quantidade: 5 },
  { item: 'fragmentos', nome: 'Fragmentos Temporais', quantidade: 2 },
];
/**
 * Prêmios do Boss global por posição no dano (pedido do dono, 20/10/2026), para TODO jogador que lutou:
 * top 3 = item acima + 500k / 300k / 200k Poké Dólares + 50 / 30 / 20 Origin Coins; 4º ao 10º = 100k; o resto = 50k.
 */
export const SILVER_BOSS_GLOBAL = [500_000, 300_000, 200_000];
export const SILVER_BOSS_GLOBAL_ATE_10 = 100_000;
export const SILVER_BOSS_GLOBAL_PARTICIPAR = 50_000;
export const GOLD_BOSS_GLOBAL = [50, 30, 20];
/** Padrão (o que está acima), no formato que a staff edita: top 3, 4º ao 10º e o resto. */
export function premiosBossGlobalPadrao(): { top: Premio[][]; ate10: Premio[]; participar: Premio[] } {
  const silver = (q: number): Premio => ({ id: 'silver', nome: 'Poké Dólares', quantidade: q });
  return {
    top: [0, 1, 2].map((i) => [{ id: PREMIOS_BOSS_GLOBAL[i].item, nome: PREMIOS_BOSS_GLOBAL[i].nome, quantidade: PREMIOS_BOSS_GLOBAL[i].quantidade }, silver(SILVER_BOSS_GLOBAL[i]), { id: 'gold', nome: 'Origin Coins', quantidade: GOLD_BOSS_GLOBAL[i] }]),
    ate10: [silver(SILVER_BOSS_GLOBAL_ATE_10)],
    participar: [silver(SILVER_BOSS_GLOBAL_PARTICIPAR)],
  };
}
export function premiosBossGlobal(posicao: number): { item: string; nome: string; quantidade: number }[] {
  const a = ajustesPremios().bossGlobal;
  if (a) return (a.top[posicao] ?? (posicao < 10 ? a.ate10 : a.participar)).map((p) => ({ item: p.id, nome: p.nome, quantidade: p.quantidade }));
  const silver = SILVER_BOSS_GLOBAL[posicao] ?? (posicao < 10 ? SILVER_BOSS_GLOBAL_ATE_10 : SILVER_BOSS_GLOBAL_PARTICIPAR);
  return [
    ...(PREMIOS_BOSS_GLOBAL[posicao] ? [PREMIOS_BOSS_GLOBAL[posicao]] : []),
    { item: 'silver', nome: 'Poké Dólares', quantidade: silver },
    ...(GOLD_BOSS_GLOBAL[posicao] ? [{ item: 'gold', nome: 'Origin Coins', quantidade: GOLD_BOSS_GLOBAL[posicao] }] : []),
  ];
}
/**
 * Pontos de guilda do Boss da guilda (pedido do dono, 20/10/2026), para cada membro que LUTOU: 1 só por participar,
 * mais 15 / 10 / 5 se a guilda ficou em 1º / 2º / 3º no dano somado, ou mais 1 se ficou do 4º ao 10º.
 */
export const PONTOS_GUILDA_PARTICIPAR = 1;
export const PONTOS_GUILDA_PODIO = [15, 10, 5];
export const PONTOS_GUILDA_ATE_10 = 1;
export const pontosGuildaDaPosicao = (posicao: number) => {
  const g = ajustesPremios().bossGuilda ?? { participar: PONTOS_GUILDA_PARTICIPAR, podio: PONTOS_GUILDA_PODIO, ate10: PONTOS_GUILDA_ATE_10 };
  return g.participar + (g.podio[posicao] ?? (posicao < 10 ? g.ate10 : 0));
};
/** Golpes proibidos contra os bosses (lista aprovada pelo dono): tiram porcentagem da vida ou dano fixo. */
export const GOLPES_PROIBIDOS_BOSS = [
  'toxic', 'willowisp', 'toxicspikes', 'poisonpowder', 'poisongas', 'toxicthread', 'destinybond', 'superfang', 'naturesmadness', 'ruination',
  'guillotine', 'fissure', 'horndrill', 'sheercold', 'leechseed', 'curse', 'saltcure', 'perishsong', 'painsplit', 'endeavor', 'finalgambit',
  'nightshade', 'seismictoss', 'psywave', 'dragonrage', 'sonicboom',
];
