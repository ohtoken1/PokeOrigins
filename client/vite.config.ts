import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // permite importar a pasta shared/ que fica fora de client/
    fs: { allow: ['..'] },
  },
});
