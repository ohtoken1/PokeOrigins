// Doações (pedido do dono): o jogo é grátis e quem quiser ajudar a manter o servidor recebe Origin Coins.
// Âncora do dono: R$ 1 = 10 Origin Coins. Sem imports: o servidor vai ler isto quando o pagamento for ligado
// (quem credita as moedas é o SERVIDOR, pela confirmação do pagamento; nunca o navegador).

export const GOLD_POR_REAL = 10;

/** Pacotes fixos (pedido do dono): bônus de Origin Coins a partir do de 100 e dias de VIP em todos. */
export const PACOTES_DOACAO: { reais: number; bonus?: number; vipDias: number }[] = [
  { reais: 5, vipDias: 1 },
  { reais: 10, bonus: 0.05, vipDias: 2 },
  { reais: 25, bonus: 0.1, vipDias: 3 },
  { reais: 50, bonus: 0.15, vipDias: 5 },
  { reais: 100, bonus: 0.2, vipDias: 7 },
  { reais: 200, bonus: 0.25, vipDias: 15 },
  { reais: 500, bonus: 0.3, vipDias: 30 },
];

/** Pacotes só de VIP, sem Origin Coins (pedido do dono). */
export const PACOTES_VIP: { reais: number; vipDias: number; nome: string }[] = [
  { reais: 15, vipDias: 7, nome: 'VIP semanal' },
  { reais: 25, vipDias: 15, nome: 'VIP quinzenal' },
  { reais: 40, vipDias: 30, nome: 'VIP mensal' },
];

/**
 * Pacotes Fundador (planilha do dono, 19/10/2026): cada um só pode ser comprado UMA vez por conta.
 * Quem guarda o que já foi comprado é o servidor (`save.pacotesComprados`, ids; quando o pagamento for ligado,
 * só o servidor escreve ali e o `PUT /api/save` tem de proteger o campo). `titulo` = id em TITULOS_EXTRAS de shared/conquistas.ts. */
export type PacoteFundador = { id: string; nome: string; numero: number; reais: number; gold: number; vipDias: number; titulo: string; itens: { id: string; quantidade: number }[] };
const orbs = (n: number) => [{ id: 'ticket-palkia', quantidade: n }, { id: 'ticket-dialga', quantidade: n }, { id: 'ticket-giratina', quantidade: n }];
export const PACOTES_FUNDADOR: PacoteFundador[] = [
  { id: 'fundador-palkia', nome: 'Palkia Founder', numero: 484, reais: 50, gold: 500, vipDias: 10, titulo: 'fundador-palkia',
    itens: [{ id: 'masterball', quantidade: 1 }, ...orbs(3), { id: 'ovo-comum-s', quantidade: 1 }, { id: 'abilitycapsule', quantidade: 1 }, { id: 'abilitypatch', quantidade: 1 }] },
  { id: 'fundador-dialga', nome: 'Dialga Founder', numero: 483, reais: 100, gold: 1000, vipDias: 20, titulo: 'fundador-dialga',
    itens: [{ id: 'masterball', quantidade: 1 }, ...orbs(7), { id: 'ovo-inicial', quantidade: 1 }, { id: 'abilitycapsule', quantidade: 2 }, { id: 'abilitypatch', quantidade: 2 }] },
  { id: 'fundador-giratina', nome: 'Giratina Founder', numero: 487, reais: 200, gold: 2000, vipDias: 30, titulo: 'fundador-giratina',
    itens: [{ id: 'masterball', quantidade: 1 }, ...orbs(15), { id: 'ovo-lendario', quantidade: 1 }, { id: 'abilitycapsule', quantidade: 3 }, { id: 'abilitypatch', quantidade: 3 }] },
];

/** Esta conta já comprou este pacote de compra única? */
export const pacoteJaComprado = (save: { pacotesComprados?: string[] }, id: string) => Array.isArray(save.pacotesComprados) && save.pacotesComprados.includes(id);

/** Valor livre: o jogador escolhe quanto doar (sem bônus). */
export const DOACAO_MINIMA = 1;
export const DOACAO_MAXIMA = 1000;

/** Quantas Origin Coins um pacote dá (com o bônus, se houver). */
export const goldDoPacote = (p: { reais: number; bonus?: number }) => Math.round(p.reais * GOLD_POR_REAL * (1 + (p.bonus ?? 0)));

/** O pagamento ainda não existe (a conta no serviço de pagamento é com a equipe). */
export const DOACOES_LIGADAS = false;
