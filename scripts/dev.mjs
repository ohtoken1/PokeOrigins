// `npm run dev`: liga o servidor (contas, porta 3001) e o jogo (Vite, porta 5173) juntos.
import { spawn } from 'node:child_process';

const processos = [
  // PORT fixo: quem chama o `npm run dev` pode ter PORT=5173 no ambiente (é a porta do Vite)
  spawn('npm run dev -w server', { stdio: 'inherit', shell: true, env: { ...process.env, PORT: '3001' } }),
  spawn('npm run dev -w client', { stdio: 'inherit', shell: true }),
];
const parar = () => processos.forEach((p) => p.kill());
process.on('SIGINT', parar);
process.on('SIGTERM', parar);
processos.forEach((p) => p.on('exit', (codigo) => { parar(); process.exit(codigo ?? 0); }));
