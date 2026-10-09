// Aba Opções (barra do topo): perfil (nome fixo; trocar fica na tela do personagem), privacidade e convites, teto dos encontros, som e desempenho.
// Liga/desliga são interruptores (checkbox com o visual de chave: apagado à esquerda, aceso à direita).
import type { Tela } from '../main';
import { carregarSave, salvar } from '../estado';
import { nivelMaximoEncontro, nivelTreinador } from '../../../shared/treinador';
import { PRECO_TROCAR_NOME_GOLD } from '../../../shared/loja';
import { aoMudarAjustesSom, ajustesSom, mudarAjustesSom } from '../sons';
import { el } from '../ui/dom';
import { modoDesempenho, mudarModoDesempenho } from '../desempenho';

export const telaOpcoes: Tela = (raiz, navegar) => {
  const save = carregarSave();
  const tela = el('main', { class: 'tela tela-opcoes' }, el('h1', {}, 'Opções'));
  raiz.append(tela);
  if (!save) {
    tela.append(
      el('p', { class: 'sub' }, 'Comece um jogo para ver as opções.'),
      el('button', { class: 'botao', onclick: () => navegar({ tela: 'inicial' }) }, 'Começar'),
    );
    return;
  }

  const salvo = el('small', { class: 'opcoes-salvo', role: 'status' }, '');
  let relogio = 0;
  const avisarSalvo = (texto = 'Salvo') => {
    salvar(save);
    salvo.textContent = `✓ ${texto}`;
    clearTimeout(relogio);
    relogio = window.setTimeout(() => (salvo.textContent = ''), 1800);
  };
  const secao = (titulo: string, ...filhos: (HTMLElement | null)[]) => el('section', { class: 'opcoes-secao' }, el('h2', {}, titulo), ...filhos);
  const campo = (rotulo: string, controle: HTMLElement, ajuda?: string) =>
    el('label', { class: 'opcoes-campo' }, el('span', {}, rotulo), controle, ajuda ? el('small', {}, ajuda) : null);

  // ---------- perfil ----------
  // o nome de treinador é fixo aqui: trocar (com gold) fica em "Mudar o visual do personagem"
  const nomeTreinador = el('strong', { class: 'opcoes-nome' }, save.aparencia?.nome ?? 'Treinador');

  // ---------- privacidade e convites (valem quando houver jogadores online) ----------
  const mostrarTime = interruptor(save.mostrarTime !== false, (ligado) => {
    save.mostrarTime = ligado;
    avisarSalvo();
  });
  const aceitarTrocas = interruptor(save.aceitarTrocas !== false, (ligado) => {
    save.aceitarTrocas = ligado;
    avisarSalvo();
  });
  const aceitarDuelos = interruptor(save.aceitarDuelos !== false, (ligado) => {
    save.aceitarDuelos = ligado;
    avisarSalvo();
  });

  // ---------- encontros ----------
  const teto = nivelMaximoEncontro(nivelTreinador(save.xpTreinador));
  const valor = el('strong', {}, '');
  const deslizante = el('input', { id: 'op-encontros', type: 'range', min: 1, max: teto, value: Math.min(save.nivelEncontro ?? teto, teto) }) as HTMLInputElement;
  const auto = el('input', { id: 'op-encontros-auto', type: 'checkbox', role: 'switch', checked: save.nivelEncontro === null }) as HTMLInputElement;
  const mostrarValor = () => {
    deslizante.disabled = auto.checked;
    valor.textContent = auto.checked ? `Nv. ${teto} (máximo do seu nível)` : `Nv. ${deslizante.value}`;
  };
  const aplicar = () => {
    save.nivelEncontro = auto.checked ? null : Number(deslizante.value);
    mostrarValor();
    avisarSalvo();
  };
  deslizante.addEventListener('input', mostrarValor);
  deslizante.addEventListener('change', aplicar);
  auto.addEventListener('change', aplicar);
  mostrarValor();

  // ---------- desempenho ----------
  const desempenho = interruptor(modoDesempenho(), (ligado) => {
    mudarModoDesempenho(ligado);
    salvo.textContent = '✓ Salvo';
  });

  // ---------- som ----------
  const controleVolume = (chave: 'geral' | 'volume' | 'volumeMusica') => {
    const barra = el('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(ajustesSom()[chave] * 100) }) as HTMLInputElement;
    const texto = el('strong', {}, `${barra.value}%`);
    barra.addEventListener('input', () => {
      texto.textContent = `${barra.value}%`;
      mudarAjustesSom({ [chave]: Number(barra.value) / 100 });
    });
    return el('div', { class: 'opcoes-linha' }, barra, texto);
  };
  const semSom = interruptor(ajustesSom().mudo, (ligado) => mudarAjustesSom({ mudo: ligado }));
  aoMudarAjustesSom((a) => (semSom.checked = a.mudo));

  tela.append(
    el('p', { class: 'sub' }, 'As mudanças são salvas sozinhas.', salvo),
    secao(
      'Perfil',
      campo('Nome de treinador', nomeTreinador, `Aparece em cima do seu personagem no mapa. Para trocar (${PRECO_TROCAR_NOME_GOLD} gold), use "Mudar o visual do personagem".`),
      el('button', { class: 'botao secundario', onclick: () => navegar({ tela: 'personagem' }) }, 'Mudar o visual do personagem'),
    ),
    secao(
      'Privacidade e convites',
      linhaInterruptor(mostrarTime, 'Mostrar minha equipe', 'Outros jogadores veem o seu time no seu perfil.'),
      linhaInterruptor(aceitarTrocas, 'Aceitar pedidos de troca', 'Desligado: pedidos de troca de outros jogadores são recusados sozinhos.'),
      linhaInterruptor(aceitarDuelos, 'Aceitar desafios de duelo', 'Desligado: desafios de duelo de outros jogadores são recusados sozinhos.'),
      el('small', {}, 'Trocas e duelos entre jogadores ainda vão chegar; a sua escolha já fica guardada.'),
    ),
    secao(
      'Encontros',
      el('div', { class: 'opcoes-campo' },
        el('span', {}, 'Nível máximo dos Pokémon selvagens'),
        el('div', { class: 'opcoes-linha' }, deslizante, valor),
        linhaInterruptor(auto, 'Automático (sempre o máximo do seu nível de treinador)'),
        el('small', {}, 'Só dá para escolher um nível menor que o seu máximo, nunca maior. Os encontros vão de 4 níveis abaixo até o nível escolhido.'),
      ),
    ),
    secao(
      'Som',
      el('div', { class: 'opcoes-campo' }, el('span', {}, 'Música de fundo'), controleVolume('volumeMusica')),
      el('div', { class: 'opcoes-campo' }, el('span', {}, 'Gritos dos Pokémon'), controleVolume('volume')),
      el('div', { class: 'opcoes-campo' }, el('span', {}, 'Volume geral'), controleVolume('geral'), el('small', {}, 'O mesmo controle do canto da barra do topo.')),
      linhaInterruptor(semSom, 'Silenciar o jogo', 'O mesmo botão do canto da barra do topo.'),
    ),
    secao(
      'Desempenho',
      el('div', { class: 'opcoes-campo' },
        el('span', {}, 'Modo desempenho'),
        linhaInterruptor(desempenho, 'Ativar o modo desempenho'),
        el('small', {}, 'Para computadores e celulares mais fracos: desliga nuvens, folhas, pássaros, vaga-lumes, borboletas, moradores e Pokémon passeando na cidade, e desenha o jogo na resolução normal (o pixel art fica um pouco serrilhado). Vale a partir do próximo mapa que você abrir.'),
      ),
    ),
  );
  return () => clearTimeout(relogio);
};

/** Interruptor liga/desliga (checkbox com visual de chave). */
function interruptor(ligado: boolean, aoMudar: (ligado: boolean) => void): HTMLInputElement {
  const caixa = el('input', { type: 'checkbox', role: 'switch', checked: ligado }) as HTMLInputElement;
  caixa.addEventListener('change', () => aoMudar(caixa.checked));
  return caixa;
}

/** Linha clicável: interruptor + texto (+ explicação embaixo). */
function linhaInterruptor(caixa: HTMLInputElement, texto: string, ajuda?: string): HTMLElement {
  return el('label', { class: 'opcoes-check' }, caixa, el('span', { class: 'opcoes-check-texto' }, texto, ajuda ? el('small', {}, ajuda) : null));
}
