// Nomes de treinador que só a equipe pode usar (sem imports: o servidor lê). Quem não é da staff não pode se chamar
// "ADM", "Staff", "Moderador"… para não se passar pela equipe no chat e no mapa.

const IGUAIS = ['adm', 'admin', 'administrador', 'administracao', 'staff', 'mod', 'moderador', 'moderacao', 'gm', 'suporte', 'sistema', 'equipe', 'pokeorigins', 'oficial'];
const CONTEM = ['admin', 'staff', 'moderador', 'pokeorigins', 'suporte'];

/** Sem acentos, sem espaços e em minúsculas, trocando os números parecidos com letras ("4DM1N" = "admin"). */
const chave = (nome: string) =>
  nome.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');

export function nomeReservado(nome: string): boolean {
  const c = chave(nome);
  return IGUAIS.includes(c) || CONTEM.some((p) => c.includes(p));
}
