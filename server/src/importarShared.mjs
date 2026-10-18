// Deixa o servidor importar o código de shared/ do jeito que o jogo escreve (imports sem ".ts" e JSON), para as
// batalhas PvP rodarem com o MESMO motor do jogo (shared/batalha/motor.ts): base do anti-trapaça do lançamento.
// Carregado com `node --import ./src/importarShared.mjs` (scripts do server/package.json).
import { register } from 'node:module';

register('./ganchosShared.mjs', import.meta.url);
