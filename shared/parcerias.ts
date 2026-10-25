// Códigos de parceria dos criadores de conteúdo (pedido do dono): o jogador digita o código na doação, o valor fica
// somado no código e a equipe faz o repasse ao criador no fim do mês, à mão. Sem imports: o servidor também usa.

/** Código: 3 a 20 letras ou números, sempre em maiúsculas (o jogador pode digitar em minúsculas). */
export const CODIGO_PARCERIA = /^[A-Z0-9]{3,20}$/;
export const lerCodigoParceria = (v: unknown): string | null => {
  const c = typeof v === 'string' ? v.trim().toUpperCase() : '';
  return CODIGO_PARCERIA.test(c) ? c : null;
};
export const CRIADOR_MAX = 40;

/** Link de divulgação do criador (pedido do dono, 24/10/2026): quem abre `/c/CODIGO` cai na página de pré-registro com o
 *  código já preenchido; a conta criada fica ligada a ele. Vale o último link clicado ANTES de criar a conta. */
export const caminhoDoLink = (codigo: string) => `/c/${codigo}`;
export const LINK_CRIADOR = /^\/c\/([A-Za-z0-9]{3,20})\/?$/;
/** "Jogador de verdade" para a parceria = conta que chegou neste nível de treinador (decisão do dono). */
export const NIVEL_JOGADOR_PARCERIA = 5;

/** Como a administração vê cada parceria (valores em centavos de real). */
export interface ParceriaPublica {
  codigo: string;
  criador: string;
  ativo: boolean;
  criadoEm: number;
  usos: number;
  /** tudo o que já foi doado com o código */
  doado: number;
  /** doado neste mês (horário de Brasília) */
  doadoNoMes: number;
  /** já repassado ao criador */
  repassado: number;
  /** falta repassar = doado − repassado */
  pendente: number;
  ultimoRepasse: number | null;
  /** cliques no link (cada pessoa conta uma vez por dia) */
  cliques: number;
  cliquesNoMes: number;
  /** contas criadas que vieram deste criador (link, código digitado ou anotadas pela staff) */
  contas: number;
  contasNoMes: number;
  /** quantas dessas contas vieram pelo link */
  peloLink: number;
  /** contas que chegaram ao `NIVEL_JOGADOR_PARCERIA` de treinador */
  jogadores: number;
}

/** Uma conta que veio de um criador (Administração → Parceria → Ver contas). */
export interface ContaDoCriador { usuario: string; via: string; criadaEm: number; nivel: number }
