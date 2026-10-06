// Criação/edição do personagem (antes da roleta do inicial, ou depois pelo menu da região).
// Camadas do LPC + detalhes Pokémon (boné, estampa, Pokébolas no cinto) em lpc.ts.
import type { Tela } from '../main';
import { carregarSave, salvar } from '../estado';
import {
  APARENCIA_PADRAO, CABELOS, CORES_CABELO, CORES_ROUPA, ESTAMPAS, PELES, carregarPaletas, montarPersonagem,
  type Aparencia, type FolhasPersonagem,
} from '../personagem/lpc';
import { el } from '../ui/dom';

const CHAVE_NOVA = 'jogo-claude:aparencia-nova';

/** Aparência escolhida antes de existir save (vai para o save quando o jogo começa). */
export function aparenciaNova(): Aparencia | null {
  try {
    const t = localStorage.getItem(CHAVE_NOVA);
    return t ? { ...APARENCIA_PADRAO, ...JSON.parse(t) } : null;
  } catch {
    return null;
  }
}
export function limparAparenciaNova(): void {
  try {
    localStorage.removeItem(CHAVE_NOVA);
  } catch {
    /* ignora */
  }
}

export const telaPersonagem: Tela = (raiz, navegar) => {
  const save = carregarSave();
  const a: Aparencia = { ...APARENCIA_PADRAO, ...(save?.aparencia ?? aparenciaNova() ?? {}) };
  a.bone = 'nenhum';
  let direcao = 2;
  let folhas: FolhasPersonagem | null = null;
  let versao = 0;

  const canvas = el('canvas', { width: 64, height: 64, class: 'personagem-grande' }) as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const remontar = async () => {
    const minha = ++versao;
    const f = await montarPersonagem(a);
    if (minha === versao) folhas = f;
  };
  let quadro = 0;
  const relogio = setInterval(() => {
    quadro++;
    if (!folhas) return;
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(folhas.walk, (1 + (quadro % 8)) * 64, direcao * 64, 64, 64, 0, 0, 64, 64);
  }, 125);

  const grupo = (titulo: string, itens: [string, string, string?][], atual: () => string, escolher: (v: string) => void) => {
    const caixa = el('div', { class: 'opcoes-personagem' });
    for (const [valor, rotulo, cor] of itens) {
      const b = el('button', { class: `${cor ? 'cor-personagem' : 'botao secundario'} ${valor === atual() ? 'ativo' : ''}`, title: rotulo, style: cor ? { background: cor } : {} }, cor ? '' : rotulo);
      b.addEventListener('click', () => {
        escolher(valor);
        caixa.querySelectorAll('button').forEach((x) => x.classList.remove('ativo'));
        b.classList.add('ativo');
        remontar();
      });
      caixa.append(b);
    }
    return el('div', { class: 'grupo-personagem' }, el('span', {}, titulo), caixa);
  };

  const painel = el('div', { class: 'painel-personagem' }, el('p', { class: 'meta' }, 'Carregando cores…'));
  carregarPaletas().then((p) => {
    const meio = (cores: string[]) => cores[Math.floor(cores.length / 2)];
    const cor = (lista: string[], tabela: Record<string, string[]>) => lista.map((k): [string, string, string] => [k, k, meio(tabela[k])]);
    painel.replaceChildren(
      el('h3', {}, 'Estilo Pokémon'),
      // boné: guardado para depois (pedido do dono)
      grupo('Estampa da camiseta', Object.entries(ESTAMPAS), () => a.estampa, (v) => (a.estampa = v as Aparencia['estampa'])),
      grupo('Pokébolas no cinto', [['sim', 'Com'], ['nao', 'Sem']], () => (a.cinto ? 'sim' : 'nao'), (v) => (a.cinto = v === 'sim')),
      el('h3', {}, 'Corpo'),
      grupo('Corpo', [['masc', 'Masculino'], ['fem', 'Feminino']], () => a.corpo, (v) => (a.corpo = v as Aparencia['corpo'])),
      grupo('Tom de pele', cor(PELES, p.body), () => a.pele, (v) => (a.pele = v)),
      grupo('Cabelo', Object.entries(CABELOS), () => a.cabelo, (v) => (a.cabelo = v)),
      grupo('Cor do cabelo', cor(CORES_CABELO, p.hair), () => a.corCabelo, (v) => (a.corCabelo = v)),
      el('h3', {}, 'Roupas'),
      grupo('Camiseta', cor(CORES_ROUPA, p.cloth), () => a.camiseta, (v) => (a.camiseta = v)),
      grupo('Calça', cor(CORES_ROUPA, p.cloth), () => a.calca, (v) => (a.calca = v)),
      grupo('Tênis', cor(CORES_ROUPA, p.cloth), () => a.tenis, (v) => (a.tenis = v)),
    );
  });
  remontar();

  // um botão só: cada clique vira o personagem (baixo → esquerda → cima → direita)
  const ORDEM_GIRO = [2, 1, 0, 3];
  const direcoes = el(
    'div',
    { class: 'direcoes-personagem' },
    el('button', {
      class: 'botao secundario',
      title: 'Virar o personagem',
      onclick: () => (direcao = ORDEM_GIRO[(ORDEM_GIRO.indexOf(direcao) + 1) % 4]),
    }, '↻ Virar'),
  );

  // nome de treinador (username): aparece em cima do personagem no mapa
  const campoNome = el('input', { class: 'campo-nome', type: 'text', maxlength: 16, placeholder: 'Ex.: Ash', value: a.nome ?? '' }) as HTMLInputElement;
  const avisoNome = el('small', { class: 'aviso-nome' }, '');
  const nomeSobre = el('div', { class: 'nome-sobre' }, campoNome.value);
  campoNome.addEventListener('input', () => {
    avisoNome.textContent = '';
    nomeSobre.textContent = campoNome.value.trim();
  });
  const concluir = () => {
    const nome = campoNome.value.trim().replace(/\s+/g, ' ');
    if (nome.length < 3) {
      avisoNome.textContent = 'Escolha um nome de 3 a 16 letras.';
      campoNome.focus();
      return;
    }
    a.nome = nome;
    if (save) {
      save.aparencia = { ...a };
      salvar(save);
      navegar({ tela: 'regiao' });
    } else {
      try {
        localStorage.setItem(CHAVE_NOVA, JSON.stringify(a));
      } catch {
        /* ignora */
      }
      navegar({ tela: 'inicial' });
    }
  };

  raiz.append(
    el(
      'main',
      { class: 'tela tela-personagem' },
      el('h1', {}, save ? 'Editar personagem' : 'Crie seu treinador'),
      el('p', { class: 'sub' }, 'Escolha o visual do seu personagem. Dá para mudar depois pelo menu da região.'),
      el(
        'div',
        { class: 'layout-personagem' },
        el('section', { class: 'palco-personagem' },
          el('label', { class: 'grupo-nome' }, el('span', {}, 'Nome de treinador'), campoNome, avisoNome),
          el('div', { class: 'chao-personagem' }, nomeSobre, canvas), direcoes,
          el('button', { class: 'botao grande', onclick: concluir }, save ? 'Salvar' : 'Continuar →')),
        painel,
      ),
      el('small', { class: 'creditos-lpc' }, 'Personagem: Universal LPC Spritesheet Character Generator — artistas em lpc/CREDITOS-LPC.csv (CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0). Boné, estampas e Pokébolas: desenho próprio.'),
    ),
  );
  return () => clearInterval(relogio);
};
