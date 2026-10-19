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

/**
 * Termos de doação (rascunho nosso, pedido do dono; vale passar por um advogado/contador antes de ligar o pagamento).
 * O jogador precisa marcar "Li e aceito" antes de doar. Mudou o texto: subir `VERSAO_TERMOS_DOACAO`.
 */
export const VERSAO_TERMOS_DOACAO = 1;
export const TERMOS_DOACAO: { titulo: string; texto: string }[] = [
  { titulo: '1. O que é a doação', texto: 'O PokeOrigins é um jogo gratuito feito por fãs. A doação é voluntária e ajuda a pagar o servidor e o desenvolvimento. Ninguém é obrigado a doar para jogar.' },
  { titulo: '2. Itens virtuais', texto: 'Como agradecimento, a conta recebe itens virtuais (Origin Coins, dias de VIP, pacotes e prêmios). Eles existem só dentro do jogo, não têm valor em dinheiro, não podem ser trocados por dinheiro real e pertencem à conta que recebeu.' },
  { titulo: '3. Entrega', texto: 'Os itens chegam pelo Correio do jogo depois que o serviço de pagamento confirma o pagamento. O Pix costuma confirmar em minutos; o cartão pode levar mais tempo. Se algo não chegar em até 24 horas, fale com a equipe pelo Discord.' },
  { titulo: '4. Reembolso', texto: 'Por se tratar de itens digitais entregues na hora, a doação não é reembolsável depois que os itens chegam à conta, salvo quando a lei exigir. Pedir estorno ou contestar o pagamento depois de receber os itens pode levar ao banimento da conta.' },
  { titulo: '5. Fases de teste (Beta)', texto: 'Enquanto o jogo estiver em Beta, o progresso pode ser apagado (wipe). A equipe vai avisar antes e dizer como ficam os itens de doação em cada caso.' },
  { titulo: '6. Mudanças no jogo', texto: 'O jogo pode mudar: preços, bônus, prêmios e sistemas podem ser ajustados para manter o equilíbrio. O PokeOrigins também pode ser pausado ou encerrado, e nesse caso os itens virtuais deixam de existir.' },
  { titulo: '7. Pacotes e limites', texto: 'Os Pacotes Fundador só podem ser adquiridos uma vez por conta. Os dias de VIP se somam aos que a conta já tem. A doação acumulada volta a zero a cada 3 meses.' },
  { titulo: '8. Menores de idade', texto: 'Quem tem menos de 18 anos só pode doar com a autorização dos pais ou responsáveis.' },
  { titulo: '9. Contas e regras', texto: 'Contas banidas por quebrar as regras do jogo não recebem de volta o valor doado nem os itens.' },
  { titulo: '10. Pagamento e dados', texto: 'O pagamento é feito por um serviço de pagamento externo. O PokeOrigins não vê nem guarda os dados do seu cartão ou da sua conta bancária.' },
  { titulo: '11. Código de criador', texto: 'Usar o código de um criador parceiro não muda o que você recebe: parte do valor ajuda quem divulga o jogo.' },
  { titulo: '12. Marcas', texto: 'O PokeOrigins é um projeto de fãs, sem ligação com a Nintendo, a Game Freak, a Creatures ou a The Pokémon Company. A doação apoia o projeto, e não compra nenhum direito sobre marcas ou personagens.' },
];
