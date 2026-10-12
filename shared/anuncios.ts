// Anúncios da staff (Administração → Anúncios), que aparecem no Mural de anúncios da cidade.
// Este arquivo não importa nada: o servidor usa.

export const ANUNCIO_TITULO_MAX = 60;
export const ANUNCIO_TEXTO_MAX = 1000;
/** Aviso da staff que passa na barrinha de avisos (uma linha só). */
export const AVISO_MAX = 200;

export interface Anuncio {
  id: number;
  titulo: string;
  texto: string;
  /** usuário de quem publicou */
  autor: string;
  criadoEm: number;
}
