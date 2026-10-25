// Administração → Ver jogador (pedido do dono, 24/10/2026): a staff olha a conta inteira de um jogador (dados da
// conta, moedas, time, PC, bolsa) para entender o que aconteceu. Só leitura: nada aqui muda o save.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { estaOnline } from './mundo.ts';

export function verJogador(conta: banco.Conta, usuario: string) {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
  const alvo = banco.contaPorUsuario(usuario.trim().toLowerCase()) ?? banco.contaPorUsuario(usuario.trim());
  if (!alvo) throw new ErroConta('Jogador não encontrado.', 404);
  const guardado = banco.lerSave(alvo.id);
  return {
    conta: { id: alvo.id, usuario: alvo.usuario, email: alvo.email, criadaEm: alvo.criada_em, admin: alvo.admin === 1, online: estaOnline(alvo.id) },
    save: guardado ? JSON.parse(guardado.dados) : null,
    versao: guardado?.versao ?? null,
  };
}
