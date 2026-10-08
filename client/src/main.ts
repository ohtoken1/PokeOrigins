import './estilo.css';
import './estilo-pokedex.css';
import { carregarSave } from './estado';
import { telaEscolhaInicial } from './telas/escolhaInicial';
import { telaRegiao } from './telas/regiao';
import { telaBioma } from './telas/bioma';
import { telaPokedex } from './telas/pokedex';
import { telaDatabase } from './telas/database';
import { telaPersonagem } from './telas/personagem';
import { telaOpcoes } from './telas/opcoes';
import { telaGolpes } from './telas/golpes';
import { telaRanking } from './telas/ranking';
import { telaInicio } from './telas/inicio';
import { telaComunidade, type SecaoComunidade } from './telas/comunidade';
import { montarPainelAdmin } from './ui/admin';
import { montarBarraTopo } from './ui/barraTopo';
import { definirNavegacao } from './ui/navegacao';

export type Destino = { tela: 'inicio' } | { tela: 'inicial' } | { tela: 'regiao' } | { tela: 'bioma'; biomaId: string } | { tela: 'pokedex'; id?: number } | { tela: 'database' } | { tela: 'personagem' } | { tela: 'opcoes' } | { tela: 'golpes' } | { tela: 'ranking' } | { tela: 'comunidade'; secao: SecaoComunidade };
export type Navegar = (destino: Destino) => void;
/** Cada tela desenha dentro de `raiz` e pode devolver uma função de limpeza. */
export type Tela = (raiz: HTMLElement, navegar: Navegar) => (() => void) | void;

const raiz = document.getElementById('app')!;
let limparTelaAtual: (() => void) | void;
let destinoAtual: Destino = { tela: 'inicial' };
let marcarAba: ((destino: Destino) => void) | undefined;

const navegar: Navegar = (destino) => {
  destinoAtual = destino;
  marcarAba?.(destino);
  limparTelaAtual?.();
  raiz.replaceChildren();
  window.scrollTo(0, 0);
  if (destino.tela === 'inicio') limparTelaAtual = telaInicio(raiz, navegar);
  else if (destino.tela === 'inicial') limparTelaAtual = telaEscolhaInicial(raiz, navegar);
  else if (destino.tela === 'regiao') limparTelaAtual = telaRegiao(raiz, navegar);
  else if (destino.tela === 'pokedex') limparTelaAtual = telaPokedex(destino.id)(raiz, navegar);
  else if (destino.tela === 'database') limparTelaAtual = telaDatabase(raiz, navegar);
  else if (destino.tela === 'personagem') limparTelaAtual = telaPersonagem(raiz, navegar);
  else if (destino.tela === 'opcoes') limparTelaAtual = telaOpcoes(raiz, navegar);
  else if (destino.tela === 'golpes') limparTelaAtual = telaGolpes(raiz, navegar);
  else if (destino.tela === 'ranking') limparTelaAtual = telaRanking(raiz, navegar);
  else if (destino.tela === 'comunidade') limparTelaAtual = telaComunidade(destino.secao)(raiz, navegar);
  else limparTelaAtual = telaBioma(destino.biomaId)(raiz, navegar);
};

montarPainelAdmin(() => navegar(destinoAtual));
marcarAba = montarBarraTopo(navegar);
definirNavegacao(navegar);
// com save, o jogo abre na tela de Início (o time lado a lado)
navegar(carregarSave() ? { tela: 'inicio' } : { tela: 'inicial' });
