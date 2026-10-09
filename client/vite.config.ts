import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // permite importar a pasta shared/ que fica fora de client/
    fs: { allow: ['..'] },
    // contas e save: o servidor do jogo (server/, porta 3001)
    proxy: { '/api': 'http://localhost:3001', '/ws': { target: 'ws://localhost:3001', ws: true } },
  },
});
