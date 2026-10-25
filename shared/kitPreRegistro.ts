// Kit de pré-registro (pedido do dono, 24/10/2026). SEM imports: o servidor lê.
// Chega pelo Correio quando a conta pré-registrada ganha acesso ao jogo (server/src/preRegistro.ts) e é aberto pela
// Bolsa. O CONTEÚDO a staff define em Administração → Prêmios → "Kit de pré-registro" (shared/premiosEventos.ts,
// seção `kitPreRegistro`); enquanto estiver vazio, a tela de pré-registro mostra "em breve" e o kit não abre.
export const KIT_PRE_REGISTRO = 'kit-pre-registro';
