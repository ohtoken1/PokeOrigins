// Códigos de parceria dos criadores de conteúdo (pedido do dono): o jogador digita o código na doação, o valor fica
// somado no código e a equipe faz o repasse ao criador no fim do mês, à mão. Sem imports: o servidor também usa.

/** Código: 3 a 20 letras ou números, sempre em maiúsculas (o jogador pode digitar em minúsculas). */
export const CODIGO_PARCERIA = /^[A-Z0-9]{3,20}$/;
export const lerCodigoParceria = (v: unknown): string | null => {
  const c = typeof v === 'string' ? v.trim().toUpperCase() : '';
  return CODIGO_PARCERIA.test(c) ? c : null;
};
export const CRIADOR_MAX = 40;

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
}
