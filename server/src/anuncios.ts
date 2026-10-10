// Anúncios da staff: quem é administrador publica e apaga (Administração → Anúncios); todos os jogadores leem no
// Mural de anúncios da cidade. Quem está com o jogo aberto é avisado na hora pelo /ws.
import * as banco from './banco.ts';
import { ErroConta } from './contas.ts';
import { avisarTodos } from './mundo.ts';
import { ANUNCIO_TEXTO_MAX, ANUNCIO_TITULO_MAX } from '../../shared/anuncios.ts';

/** Quantos ficam guardados (os mais antigos são apagados) e quantos o mural mostra. */
const MAX_GUARDADOS = 50;
const NO_MURAL = 30;

function exigirStaff(conta: banco.Conta): void {
  if (!conta.admin) throw new ErroConta('Só a administração pode fazer isso.', 403);
}

/** Uma linha só, sem caracteres de controle. */
const lerTitulo = (v: unknown) => (typeof v === 'string' ? v.replace(/\p{Cc}|\p{Cf}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, ANUNCIO_TITULO_MAX) : '');
/** Texto com quebras de linha (no máximo uma linha em branco seguida), sem outros caracteres de controle. */
const lerTexto = (v: unknown) =>
  typeof v === 'string'
    ? v.replace(/\r\n?/g, '\n').replace(/\t/g, ' ').replace(/[^\P{Cc}\n]|\p{Cf}/gu, '').replace(/[^\S\n]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, ANUNCIO_TEXTO_MAX)
    : '';

const paraFora = (a: banco.AnuncioGuardado) => ({ id: a.id, titulo: a.titulo, texto: a.texto, autor: a.autor_nome, criadoEm: a.criado_em });

export const listar = () => banco.listarAnuncios(NO_MURAL).map(paraFora);

export function publicar(conta: banco.Conta, dados: Record<string, unknown>) {
  exigirStaff(conta);
  const titulo = lerTitulo(dados.titulo);
  const texto = lerTexto(dados.texto);
  if (!titulo) throw new ErroConta('Escreva o título do anúncio.');
  if (!texto) throw new ErroConta('Escreva o texto do anúncio.');
  banco.transacao(() => banco.criarAnuncio(titulo, texto, conta.id, conta.usuario, MAX_GUARDADOS));
  avisarTodos({ t: 'anuncios' });
  return listar();
}

export function apagar(conta: banco.Conta, id: number) {
  exigirStaff(conta);
  if (!banco.apagarAnuncio(id)) throw new ErroConta('Este anúncio não existe mais.', 404);
  avisarTodos({ t: 'anuncios' });
  return listar();
}
