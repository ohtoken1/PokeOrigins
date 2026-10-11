// Itens dados pela administração (Administração → Dar item): o pedido fica guardado como uma ENTREGA e entra no
// save quando o jogo do jogador vem buscar (na hora, se ele está online; no próximo login, se não está). Assim o
// save de quem está jogando não é trocado por baixo dele. Futuramente estas linhas também alimentam o Log.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisar } from './mundo.ts';

/** Limites de um pedido. */
const QUANTIDADE_MAX = 9999;
const PENDENTES_MAX = 200;

const lerNome = (v: unknown) => (typeof v === 'string' ? v.replace(/\p{Cc}|\p{Cf}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) : '');

/** A administração manda um item para um jogador. */
export function darItem(conta: banco.Conta, dados: Record<string, unknown>) {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
  const usuario = typeof dados.usuario === 'string' ? dados.usuario.trim() : '';
  const para = usuario ? banco.contaPorUsuario(usuario) : undefined;
  if (!para) throw new ErroConta('Jogador não encontrado.', 404);
  const item = typeof dados.item === 'string' ? dados.item : '';
  if (!/^[a-z0-9-]{1,60}$/.test(item)) throw new ErroConta('Item inválido.');
  const quantidade = dados.quantidade;
  if (typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MAX) throw new ErroConta(`A quantidade vai de 1 a ${QUANTIDADE_MAX}.`);
  if (banco.entregasDaConta(para.id).length >= PENDENTES_MAX) throw new ErroConta('Este jogador já tem entregas demais esperando.', 409);
  banco.criarEntrega(para.id, item, lerNome(dados.nome) || item, quantidade, conta.usuario);
  // quem está com o jogo aberto vem buscar agora
  avisar(para.id, { t: 'entrega' });
  return { usuario: para.usuario };
}

/** Quantas entregas esperam por este jogador. */
export const pendentes = (conta: banco.Conta) => ({ pendentes: banco.entregasDaConta(conta.id).length });

/** O jogo veio buscar: põe os itens no save guardado e apaga as entregas (tudo numa mudança só). */
export function receber(conta: banco.Conta) {
  if (!banco.lerSave(conta.id)) return { entregas: [] };
  let entregues: { nome: string; quantidade: number }[] = [];
  banco.mudarSaves([conta.id], ([save]) => {
    const lista = banco.entregasDaConta(conta.id);
    const itens = (save.itens && typeof save.itens === 'object' ? save.itens : (save.itens = {})) as Record<string, unknown>;
    for (const e of lista) {
      const tem = typeof itens[e.item] === 'number' && Number.isFinite(itens[e.item]) ? Math.max(0, Math.floor(itens[e.item] as number)) : 0;
      itens[e.item] = tem + e.quantidade;
      banco.apagarEntrega(e.id);
    }
    entregues = lista.map((e) => ({ nome: e.nome, quantidade: e.quantidade }));
  });
  const guardado = banco.lerSave(conta.id)!;
  return { entregas: entregues, save: JSON.parse(guardado.dados), versao: guardado.versao };
}
