// Barra no topo do site: ícone da Pokédex (atalho), Início (o time lado a lado), Jogar (Mapas, Cidade, Continentes, Duelos com treinadores, Ginásios), Golpes,
// Informações (Opções, Ranking, Database) e Comunidade (Amigos, Clã). Menus com setinha abrem ao clicar.
import { ehAdministrador } from '../bonificacao';
import { aoMudarAjustesSom, ajustesSom, mudarAjustesSom } from '../sons';
import { SECOES_ADMINISTRACAO } from '../telas/administracao';
import type { Destino, Navegar } from '../main';
import { carregarSave } from '../estado';
import { el } from './dom';

type Item = { nome: string; destino: () => Destino; emBreve?: boolean };
/** Aba simples (`itens` com 1 item, sem menu) ou grupo com menu. `telas` = telas em que a aba fica marcada. */
type Aba = { nome: string; telas: string[]; itens: Item[]; menu?: boolean; soAdmin?: boolean };

const ABAS: Aba[] = [
  { nome: 'Início', telas: ['inicio'], itens: [{ nome: 'Início', destino: () => (carregarSave() ? { tela: 'inicio' } : { tela: 'inicial' }) }] },
  {
    nome: 'Jogar',
    menu: true,
    telas: ['inicial', 'regiao', 'bioma', 'personagem', 'cidade', 'continentes', 'duelos', 'ginasios'],
    itens: [
      { nome: 'Mapas', destino: () => (carregarSave() ? { tela: 'regiao' } : { tela: 'inicial' }) },
      { nome: 'Cidade', destino: () => (carregarSave() ? { tela: 'cidade' } : { tela: 'inicial' }) },
      { nome: 'Continentes', destino: () => ({ tela: 'comunidade', secao: 'continentes' }), emBreve: true },
      { nome: 'Duelos com treinadores', destino: () => ({ tela: 'duelos' }) },
      { nome: 'Ginásios', destino: () => ({ tela: 'ginasios' }) },
    ],
  },
  { nome: 'Golpes', telas: ['golpes'], itens: [{ nome: 'Golpes', destino: () => ({ tela: 'golpes' }) }] },
  {
    nome: 'Informações',
    menu: true,
    telas: ['ranking', 'database'],
    itens: [
      { nome: 'Ranking', destino: () => ({ tela: 'ranking' }) },
      { nome: 'Database', destino: () => ({ tela: 'database' }) },
    ],
  },
  {
    nome: 'Minha conta',
    menu: true,
    telas: ['conta-perfil', 'conta-achievements', 'conta-skins', 'opcoes'],
    itens: [
      { nome: 'Meu perfil', destino: () => ({ tela: 'conta', secao: 'perfil' }) },
      { nome: 'Achievements', destino: () => ({ tela: 'conta', secao: 'achievements' }) },
      { nome: 'Minhas skins', destino: () => ({ tela: 'conta', secao: 'skins' }) },
      { nome: 'Opções', destino: () => ({ tela: 'opcoes' }) },
    ],
  },
  {
    nome: 'Comunidade',
    menu: true,
    telas: ['amigos', 'cla', 'jogadores'],
    itens: [
      { nome: 'Buscar jogadores', destino: () => ({ tela: 'jogadores' }) },
      { nome: '👥 Amigos', destino: () => ({ tela: 'comunidade', secao: 'amigos' }), emBreve: true },
      { nome: '🛡️ Clã', destino: () => ({ tela: 'comunidade', secao: 'cla' }), emBreve: true },
    ],
  },
  {
    nome: 'Administração',
    menu: true,
    soAdmin: true,
    telas: SECOES_ADMINISTRACAO.map((x) => `admin-${x.id}`),
    itens: SECOES_ADMINISTRACAO.map((x) => ({ nome: x.nome, destino: () => ({ tela: 'administracao', secao: x.id }), emBreve: !!x.emBreve })),
  },
];

/** Pokédex vermelha clássica (Kanto): lente azul grande, três luzinhas, dobradiça e telinha. */
export function iconePokedex(): HTMLElement {
  const caixa = el('span', { class: 'icone-pokedex' });
  caixa.innerHTML = `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
    <rect x="3" y="2" width="22" height="28" rx="3" fill="#d8262c" stroke="#5a0b0e" stroke-width="1.4"/>
    <rect x="25" y="5" width="4" height="22" rx="1.5" fill="#a81c21" stroke="#5a0b0e" stroke-width="1.2"/>
    <path d="M3.7 10.5h8.5l2-2.6h10.1" fill="none" stroke="#5a0b0e" stroke-width="1.2"/>
    <circle cx="8" cy="6.3" r="3.2" fill="#e9f4ff" stroke="#5a0b0e" stroke-width="1"/>
    <circle cx="8" cy="6.3" r="2.2" fill="#2f8cff"/>
    <circle cx="7.2" cy="5.5" r="0.8" fill="#cfe6ff"/>
    <circle cx="14" cy="4.2" r="1" fill="#ff4a4a" stroke="#5a0b0e" stroke-width="0.5"/>
    <circle cx="17" cy="4.2" r="1" fill="#ffd23a" stroke="#5a0b0e" stroke-width="0.5"/>
    <circle cx="20" cy="4.2" r="1" fill="#4fd36a" stroke="#5a0b0e" stroke-width="0.5"/>
    <rect x="6.5" y="13" width="15" height="9.5" rx="1.3" fill="#f2f2f2" stroke="#5a0b0e" stroke-width="1"/>
    <rect x="8" y="14.4" width="12" height="6.7" rx="0.8" fill="#8fd18a"/>
    <circle cx="8.5" cy="26" r="1.5" fill="#222"/>
    <rect x="13" y="25" width="7" height="2" rx="1" fill="#5a0b0e"/>
  </svg>`;
  return caixa;
}

/** Cria a barra e devolve a função que marca a aba da tela atual. */
/** Canto direito da barra: volume geral (música e gritos) e botão de mudo. */
function controlesSom(): HTMLElement {
  const barra = el('input', { type: 'range', class: 'volume-topo', min: 0, max: 100, step: 5, value: Math.round(ajustesSom().geral * 100), title: 'Volume', 'aria-label': 'Volume' }) as HTMLInputElement;
  barra.addEventListener('input', () => mudarAjustesSom({ geral: Number(barra.value) / 100, mudo: false }));
  aoMudarAjustesSom((a) => (barra.value = String(Math.round(a.geral * 100))));
  return el('div', { class: 'som-topo' }, barra, botaoMudo());
}

/** Botão de mudo: liga/desliga música e gritos de uma vez. */
function botaoMudo(): HTMLElement {
  const botao = el('button', { class: 'botao-mudo' });
  const desenhar = (mudo: boolean) => {
    botao.innerHTML = mudo
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
    botao.title = mudo ? 'Ligar o som' : 'Silenciar o jogo';
    botao.setAttribute('aria-label', botao.title);
    botao.classList.toggle('mudo', mudo);
  };
  botao.addEventListener('click', (e) => {
    e.stopPropagation();
    mudarAjustesSom({ mudo: !ajustesSom().mudo });
  });
  aoMudarAjustesSom((a) => desenhar(a.mudo));
  desenhar(ajustesSom().mudo);
  return botao;
}

export function montarBarraTopo(navegar: Navegar): (destino: Destino) => void {
  const menus: { menu: HTMLElement; botao: HTMLElement }[] = [];
  const fecharTodos = () =>
    menus.forEach(({ menu, botao }) => {
      menu.hidden = true;
      botao.classList.remove('aberta');
    });

  // Administração só aparece para contas de administrador
  const abas = ABAS.filter((a) => !a.soAdmin || ehAdministrador());
  const botoes = abas.map((aba) => {
    if (!aba.menu) {
      const b = el('button', { class: 'aba-topo', onclick: () => navegar(aba.itens[0].destino()) }, aba.nome);
      return { botao: b, raiz: b };
    }
    const menu = el('div', { class: 'menu-topo', hidden: true },
      ...aba.itens.map((item) => el('button', { onclick: () => (fecharTodos(), navegar(item.destino())) }, item.nome, item.emBreve ? el('small', {}, 'em breve') : null)));
    const botao = el('button', { class: 'aba-topo aba-menu', 'aria-haspopup': 'true' }, aba.nome, el('span', { class: 'setinha' }, '▾'));
    botao.addEventListener('click', (e) => {
      e.stopPropagation();
      const abrir = !!menu.hidden;
      fecharTodos();
      menu.hidden = !abrir;
      botao.classList.toggle('aberta', abrir);
    });
    menus.push({ menu, botao });
    return { botao, raiz: el('div', { class: 'aba-com-menu' }, botao, menu) };
  });
  document.addEventListener('click', fecharTodos);


  document.body.prepend(
    el('nav', { class: 'barra-topo' },
      el(
        'div',
        { class: 'barra-topo-conteudo' },
        el('strong', { class: 'marca' }, 'Jogo Claude'),
        el('div', { class: 'abas-topo' }, ...botoes.map((b) => b.raiz)),
        controlesSom(),
      ),
    ),
  );
  return (destino) => {
    // telas "em breve" usam a tela de comunidade com uma seção: a seção diz de qual grupo ela é
    const tela = destino.tela === 'comunidade' ? destino.secao : destino.tela === 'administracao' ? `admin-${destino.secao}` : destino.tela === 'conta' ? `conta-${destino.secao}` : destino.tela;
    botoes.forEach((b, i) => b.botao.classList.toggle('ativa', abas[i].telas.includes(tela)));
  };
}
