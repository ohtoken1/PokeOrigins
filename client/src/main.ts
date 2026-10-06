import './estilo.css';
import './estilo-pokedex.css';
import { carregarSave } from './estado';
import { telaEscolhaInicial } from './telas/escolhaInicial';
import { telaRegiao } from './telas/regiao';
import { telaBioma } from './telas/bioma';
import { telaPokedex } from './telas/pokedex';
import { montarPainelAdmin } from './ui/admin';
import { montarBarraTopo } from './ui/barraTopo';

export type Destino = { tela: 'inicial' } | { tela: 'regiao' } | { tela: 'bioma'; biomaId: string } | { tela: 'pokedex' };
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
  if (destino.tela === 'inicial') limparTelaAtual = telaEscolhaInicial(raiz, navegar);
  else if (destino.tela === 'regiao') limparTelaAtual = telaRegiao(raiz, navegar);
  else if (destino.tela === 'pokedex') limparTelaAtual = telaPokedex(raiz, navegar);
  else limparTelaAtual = telaBioma(destino.biomaId)(raiz, navegar);
};

montarPainelAdmin(() => navegar(destinoAtual));
marcarAba = montarBarraTopo(navegar);
navegar(carregarSave() ? { tela: 'regiao' } : { tela: 'inicial' });
