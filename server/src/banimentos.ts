// Banimentos: a administração tira um jogador do jogo por um tempo (ou para sempre), com o motivo registrado.
// Banir derruba as sessões e a conexão do jogador e bloqueia o login até o prazo acabar. Nenhuma linha é apagada:
// a tabela é o histórico de quem baniu, quem, quando e por quê.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisarBanimento, derrubar } from './mundo.ts';
import { DURACOES_DE_BANIMENTO, MOTIVO_BANIMENTO_MAX, MOTIVO_BANIMENTO_MIN, type BanimentoPublico } from '../../shared/banimentos.ts';

const NA_LISTA = 200;

function exigirStaff(conta: banco.Conta): void {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
}

const paraFora = (b: banco.Banimento): BanimentoPublico => ({
  id: b.id, usuario: b.usuario, motivo: b.motivo, por: b.por, criadoEm: b.criado_em, ate: b.ate, revogadoEm: b.revogado_em, revogadoPor: b.revogado_por,
});

const data = (ms: number) => new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Frase que o jogador banido lê ao tentar entrar. */
export const textoDoBanimento = (b: banco.Banimento) =>
  `Esta conta está banida ${b.ate === null ? 'para sempre' : `até ${data(b.ate)} (horário de Brasília)`}. Motivo: ${b.motivo}`;

/** Recusa (403) a conta que está banida agora. */
export function exigirSemBanimento(contaId: number): void {
  const b = banco.banimentoAtivo(contaId);
  if (b) throw new ErroConta(textoDoBanimento(b), 403);
}

export const listar = (conta: banco.Conta) => {
  exigirStaff(conta);
  return { agora: Date.now(), banimentos: banco.listarBanimentos(NA_LISTA).map(paraFora) };
};

export function banir(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const alvo = typeof dados.usuario === 'string' ? banco.contaPorUsuario(dados.usuario.trim()) : undefined;
  if (!alvo) throw new ErroConta('Jogador não encontrado.', 404);
  if (alvo.admin) throw new ErroConta('Administradores não podem ser banidos.', 403);
  const duracao = DURACOES_DE_BANIMENTO.find((d) => d.id === dados.duracao);
  if (!duracao) throw new ErroConta('Escolha o tempo do banimento.');
  const motivo = typeof dados.motivo === 'string' ? dados.motivo.replace(/\p{Cc}|\p{Cf}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, MOTIVO_BANIMENTO_MAX) : '';
  if (motivo.length < MOTIVO_BANIMENTO_MIN) throw new ErroConta('Escreva o motivo do banimento.');
  if (banco.banimentoAtivo(alvo.id)) throw new ErroConta(`${alvo.usuario} já está banido. Tire o banimento atual antes de aplicar outro.`, 409);
  banco.transacao(() => {
    banco.criarBanimento(alvo.id, alvo.usuario, motivo, conta.usuario, duracao.ms === null ? null : Date.now() + duracao.ms);
    banco.apagarSessoesDaConta(alvo.id);
  });
  derrubar(alvo.id);
  // na barrinha de avisos aparece o nome de treinador (o que os outros veem no jogo)
  const save = banco.lerSave(alvo.id);
  let nome = alvo.usuario;
  try {
    const n = save ? (JSON.parse(save.dados) as { aparencia?: { nome?: unknown } }).aparencia?.nome : null;
    if (typeof n === 'string' && n.trim()) nome = n.trim().slice(0, 16);
  } catch {
    // fica o usuário
  }
  avisarBanimento(nome);
  return listar(conta);
}

export function desbanir(conta: banco.Conta, usuario: string) {
  exigirStaff(conta);
  const alvo = banco.contaPorUsuario(usuario);
  if (!alvo) throw new ErroConta('Jogador não encontrado.', 404);
  if (!banco.revogarBanimentos(alvo.id, conta.usuario)) throw new ErroConta(`${alvo.usuario} não está banido.`, 409);
  return listar(conta);
}
