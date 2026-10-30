// "Por onde conheceu o jogo?" (pedido do dono, 29/10/2026): pergunta obrigatória do cadastro, no lugar do antigo campo
// opcional "Código de criador". Algumas respostas pedem um detalhe (qual site, qual servidor, o código do criador).
// A resposta fica guardada na conta (tabela `conta_origem`) e aparece somada no Dashboard da Administração.
// Sem imports: o servidor também usa.

export interface OpcaoComoConheceu {
  id: string;
  nome: string;
  /** a caixa extra que aparece com esta resposta (e a mensagem se ficar vazia) */
  detalhe?: { rotulo: string; exemplo: string; falta: string };
}

export const COMO_CONHECEU: readonly OpcaoComoConheceu[] = [
  { id: 'divulgacao', nome: 'Divulgação' },
  { id: 'sites', nome: 'Sites', detalhe: { rotulo: 'Qual site?', exemplo: 'Nome ou endereço do site', falta: 'Escreva em qual site você conheceu o jogo.' } },
  { id: 'discord', nome: 'Discord', detalhe: { rotulo: 'Qual servidor?', exemplo: 'Nome do servidor', falta: 'Escreva em qual servidor do Discord você conheceu o jogo.' } },
  { id: 'criador', nome: 'Criador de conteúdo', detalhe: { rotulo: 'Código do criador', exemplo: 'Ex.: ASH123', falta: 'Digite o código do criador de conteúdo.' } },
  { id: 'amigo', nome: 'Indicação de amigo' },
  { id: 'outros', nome: 'Outros' },
];

export const DETALHE_COMO_CONHECEU_MAX = 60;

/** Confere a resposta do cadastro. Devolve a resposta limpa ou a mensagem de erro. */
export function lerComoConheceu(tipo: unknown, detalhe: unknown): { tipo: string; detalhe: string } | string {
  const opcao = COMO_CONHECEU.find((o) => o.id === tipo);
  if (!opcao) return 'Conte por onde você conheceu o jogo.';
  if (!opcao.detalhe) return { tipo: opcao.id, detalhe: '' };
  const d = typeof detalhe === 'string' ? detalhe.replace(/\p{Cc}|\p{Cf}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, DETALHE_COMO_CONHECEU_MAX) : '';
  return d ? { tipo: opcao.id, detalhe: d } : opcao.detalhe.falta;
}
