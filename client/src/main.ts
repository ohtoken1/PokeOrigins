import './estilo.css';
import { carregarSave } from './estado';
import { telaEscolhaInicial } from './telas/escolhaInicial';
import { telaRegiao } from './telas/regiao';
import { telaBioma } from './telas/bioma';
import { montarPainelAdmin } from './ui/admin';
import { montarBarraTopo } from './ui/barraTopo';

export type Destino = { tela: 'inicial' } | { tela: 'regiao' } | { tela: 'bioma'; biomaId: string };
export type Navegar = (destino: Destino) => void;
/** Cada tela desenha dentro de `raiz` e pode devolver uma função de limpeza. */
export type Tela = (raiz: HTMLElement, navegar: Navegar) => (() => void) | void;

const raiz = document.getElementById('app')!;
let limparTelaAtual: (() => void) | void;
let destinoAtual: Destino = { tela: 'inicial' };

const navegar: Navegar = (destino) => {
  destinoAtual = destino;
  limparTelaAtual?.();
  raiz.replaceChildren();
  window.scrollTo(0, 0);
  if (destino.tela === 'inicial') limparTelaAtual = telaEscolhaInicial(raiz, navegar);
  else if (destino.tela === 'regiao') limparTelaAtual = telaRegiao(raiz, navegar);
  else limparTelaAtual = telaBioma(destino.biomaId)(raiz, navegar);
};

montarPainelAdmin(() => navegar(destinoAtual));
montarBarraTopo(() => navegar(carregarSave() ? { tela: 'regiao' } : { tela: 'inicial' }));
navegar(carregarSave() ? { tela: 'regiao' } : { tela: 'inicial' });
