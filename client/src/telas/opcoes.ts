// Aba Opções (barra do topo): nome de treinador, nome real, mostrar o nome no mapa e o teto dos encontros.
import type { Tela } from '../main';
import { carregarSave, salvar } from '../estado';
import { APARENCIA_PADRAO } from '../personagem/lpc';
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
  const nomeTreinador = el('input', { id: 'op-nome', type: 'text', maxlength: 16, value: save.aparencia?.nome ?? '', placeholder: 'Ex.: Ash' }) as HTMLInputElement;
  const erroNome = el('small', { class: 'opcoes-erro' }, '');
  nomeTreinador.addEventListener('change', () => {
    const nome = nomeTreinador.value.trim().replace(/\s+/g, ' ');
    if (nome.length < 3) {
      erroNome.textContent = 'Use de 3 a 16 letras.';
      nomeTreinador.value = save.aparencia?.nome ?? '';
      return;
    }
    if (nome === save.aparencia?.nome) return;
    // trocar o nome custa gold
    if (save.gold < PRECO_TROCAR_NOME_GOLD) {
      erroNome.textContent = `Gold insuficiente: trocar o nome custa ${PRECO_TROCAR_NOME_GOLD} gold (você tem ${save.gold}).`;
      nomeTreinador.value = save.aparencia?.nome ?? '';
      return;
    }
    erroNome.textContent = '';
    save.gold -= PRECO_TROCAR_NOME_GOLD;
    save.aparencia = { ...APARENCIA_PADRAO, ...save.aparencia, nome };
    avisarSalvo('Nome de treinador salvo');
  });
  const nomeReal = el('input', { id: 'op-nome-real', type: 'text', maxlength: 60, value: save.nomeReal ?? '', placeholder: 'Ex.: Maria Souza' }) as HTMLInputElement;
  nomeReal.addEventListener('change', () => {
    save.nomeReal = nomeReal.value.trim();
    avisarSalvo('Nome real salvo');
  });
  const mostrarNome = el('input', { id: 'op-mostrar-nome', type: 'checkbox', checked: save.mostrarNome !== false }) as HTMLInputElement;
  mostrarNome.addEventListener('change', () => {
    save.mostrarNome = mostrarNome.checked;
    avisarSalvo();
  });

  // ---------- encontros ----------
  const teto = nivelMaximoEncontro(nivelTreinador(save.xpTreinador));
  const valor = el('strong', {}, '');
  const deslizante = el('input', { id: 'op-encontros', type: 'range', min: 1, max: teto, value: Math.min(save.nivelEncontro ?? teto, teto) }) as HTMLInputElement;
  const auto = el('input', { id: 'op-encontros-auto', type: 'checkbox', checked: save.nivelEncontro === null }) as HTMLInputElement;
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
  const botaoDesempenho = el('button', { class: 'botao botao-alternar', 'aria-pressed': 'false' }) as HTMLButtonElement;
  const mostrarDesempenho = () => {
    const ligado = modoDesempenho();
    botaoDesempenho.textContent = ligado ? 'Ativado (clique para desativar)' : 'Desativado (clique para ativar)';
    botaoDesempenho.classList.toggle('ligado', ligado);
    botaoDesempenho.setAttribute('aria-pressed', String(ligado));
  };
  botaoDesempenho.addEventListener('click', () => {
    mudarModoDesempenho(!modoDesempenho());
    mostrarDesempenho();
    salvo.textContent = '✓ Salvo';
  });
  mostrarDesempenho();

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
  const semSom = el('input', { type: 'checkbox', checked: ajustesSom().mudo }) as HTMLInputElement;
  semSom.addEventListener('change', () => mudarAjustesSom({ mudo: semSom.checked }));
  aoMudarAjustesSom((a) => (semSom.checked = a.mudo));

  tela.append(
    el('p', { class: 'sub' }, 'As mudanças são salvas sozinhas.', salvo),
    secao(
      'Perfil',
      campo('Nome de treinador', nomeTreinador, `Aparece em cima do seu personagem no mapa (3 a 16 letras). Trocar custa ${PRECO_TROCAR_NOME_GOLD} gold.`),
      erroNome,
      campo('Nome real', nomeReal, 'Opcional. Só você vê, por enquanto.'),
      el('label', { class: 'opcoes-check' }, mostrarNome, ' Mostrar meu nome em cima do personagem'),
      el('button', { class: 'botao secundario', onclick: () => navegar({ tela: 'personagem' }) }, 'Mudar o visual do personagem'),
    ),
    secao(
      'Encontros',
      el('div', { class: 'opcoes-campo' },
        el('span', {}, 'Nível máximo dos Pokémon selvagens'),
        el('div', { class: 'opcoes-linha' }, deslizante, valor),
        el('label', { class: 'opcoes-check' }, auto, ' Automático (sempre o máximo do seu nível de treinador)'),
        el('small', {}, 'Só dá para escolher um nível menor que o seu máximo, nunca maior. Os encontros vão de 4 níveis abaixo até o nível escolhido.'),
      ),
    ),
    secao(
      'Som',
      el('div', { class: 'opcoes-campo' }, el('span', {}, 'Música de fundo'), controleVolume('volumeMusica')),
      el('div', { class: 'opcoes-campo' }, el('span', {}, 'Gritos dos Pokémon'), controleVolume('volume')),
      el('div', { class: 'opcoes-campo' }, el('span', {}, 'Volume geral'), controleVolume('geral'), el('small', {}, 'O mesmo controle do canto da barra do topo.')),
      el('label', { class: 'opcoes-check' }, semSom, ' Silenciar o jogo (o mesmo botão do canto da barra do topo)'),
    ),
    secao(
      'Desempenho',
      el('div', { class: 'opcoes-campo' },
        el('span', {}, 'Modo desempenho'),
        botaoDesempenho,
        el('small', {}, 'Para computadores e celulares mais fracos: desliga nuvens, folhas, pássaros, vaga-lumes, borboletas, moradores e Pokémon passeando na cidade, e desenha o jogo na resolução normal (o pixel art fica um pouco serrilhado). Vale a partir do próximo mapa que você abrir.'),
      ),
    ),
  );
  return () => clearTimeout(relogio);
};
