// Dar ou tirar administrador de uma conta: `npm run admin -- <usuario>` (ou `-- <usuario> nao`).
import { definirAdmin } from './banco.ts';

const [usuario, opcao] = process.argv.slice(2);
if (!usuario) {
  console.log('Uso: npm run admin -- <usuario> [nao]');
  process.exit(1);
}
const admin = opcao !== 'nao';
console.log(definirAdmin(usuario, admin) ? `${usuario}: ${admin ? 'agora é administrador' : 'não é mais administrador'}.` : `Conta "${usuario}" não encontrada.`);
