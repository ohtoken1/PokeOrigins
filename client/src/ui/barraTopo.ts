// Barra no topo do site: Início (o time lado a lado), Jogar (jogador comum: vai direto para a Cidade; administrador:
// menu com Mapas, Cidade, Duelos e Ginásios), Minha conta e Comunidade (Buscar jogadores, Amigos, Guilda, Ranking,
// Database). Cada item tem um iconezinho. Menus com setinha abrem ao clicar.
import { avisar } from './avisos';
import { abrirGuia } from './guia';
import { ehAdministrador } from '../bonificacao';
import { aoMudarAjustesSom, ajustesSom, mudarAjustesSom } from '../sons';
import { SECOES_ADMINISTRACAO } from '../telas/administracao';
import type { Destino, Navegar } from '../main';
import { carregarSave } from '../estado';
import { sairDaConta } from '../conta';
import { el } from './dom';
import { relogioBrasilia } from './relogio';

/** Ícone do Guia: moeda de borda dourada com o miolo escuro e um "?" dourado (no estilo da Origin Coin). */
function iconeGuia(): HTMLElement {
  const caixa = el('span', { class: 'icone-guia', 'aria-hidden': 'true' });
  caixa.innerHTML = `<svg viewBox="0 0 40 40" width="100%" height="100%"><defs>
    <linearGradient id="guia-aro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a6"/><stop offset=".45" stop-color="#e9b949"/><stop offset="1" stop-color="#8a5f14"/></linearGradient>
    <radialGradient id="guia-miolo" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#3a3226"/><stop offset="1" stop-color="#14120f"/></radialGradient>
    <linearGradient id="guia-letra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c2"/><stop offset=".55" stop-color="#e9b949"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs>
    <circle cx="20" cy="20" r="19" fill="url(#guia-aro)"/>
    <circle cx="20" cy="20" r="15.2" fill="url(#guia-miolo)" stroke="#5a3d0c" stroke-width="1"/>
    <circle cx="20" cy="20" r="13.4" fill="none" stroke="#e9b949" stroke-opacity=".35" stroke-width=".8" stroke-dasharray="1.6 1.6"/>
    <path d="M15.2 15.6c0-3 2.2-5 5-5s4.9 1.8 4.9 4.5c0 2.2-1.3 3.3-2.6 4.1-1.1.7-1.6 1.2-1.6 2.4v.9h-2.9v-1.1c0-2 .9-3 2.3-3.9 1.1-.7 1.7-1.2 1.7-2.3 0-1.1-.8-1.9-1.9-1.9-1.2 0-2 .9-2 2.3z" fill="url(#guia-letra)" stroke="#5a3d0c" stroke-width=".6"/>
    <circle cx="19.5" cy="27.2" r="1.9" fill="url(#guia-letra)" stroke="#5a3d0c" stroke-width=".6"/>
    <ellipse cx="13.5" cy="9.5" rx="5" ry="2.2" fill="#fff" opacity=".45" transform="rotate(-35 13.5 9.5)"/></svg>`;
  return caixa;
}

/** Link do grupo do WhatsApp. Vazio = ainda não existe (o botão avisa "em breve"). */
const LINK_WHATSAPP = 'https://chat.whatsapp.com/JSaPynYUewEHZLl06t0XVH';
import { pintarDeslizante } from './deslizante';

/** `acao`: em vez de navegar, faz outra coisa (ex.: sair da conta). */
type Item = { nome: string; destino: () => Destino; emBreve?: boolean; acao?: () => void; soAdmin?: boolean };
/** Aba simples (`itens` com 1 item, sem menu) ou grupo com menu. `telas` = telas em que a aba fica marcada. */
type Aba = { nome: string; telas: string[]; itens: Item[]; menu?: boolean; soAdmin?: boolean };

const ABAS: Aba[] = [
  { nome: 'Início', telas: ['inicio'], itens: [{ nome: 'Início', destino: () => (carregarSave() ? { tela: 'inicio' } : { tela: 'inicial' }) }] },
  {
    nome: 'Jogar',
    menu: true,
    telas: ['inicial', 'regiao', 'bioma', 'personagem', 'cidade', 'safari', 'duelos', 'ginasios'],
    itens: [
      // jogadores chegam aos mapas pela saída do sul da cidade (pedido do dono); o atalho fica só para administradores
      { nome: '🗺️ Mapas', soAdmin: true, destino: () => (carregarSave() ? { tela: 'regiao' } : { tela: 'inicial' }) },
      { nome: '🏙️ Cidade', destino: () => (carregarSave() ? { tela: 'cidade' } : { tela: 'inicial' }) },
      // tudo de duelos fica na Arena da cidade (pedido do dono); os atalhos ficam só para administradores
      { nome: '⚔️ Duelos com treinadores', soAdmin: true, destino: () => ({ tela: 'duelos' }) },
      { nome: '🏅 Ginásios', soAdmin: true, destino: () => ({ tela: 'ginasios' }) },
    ],
  },
  // Golpes saiu da barra (pedido do dono): os professores ficam na cidade (Move Reminder / Move Tutor).
  // A aba Informações também saiu: Ranking e Database ficam em Comunidade.
  {
    nome: 'Minha conta',
    menu: true,
    telas: ['conta-perfil', 'conta-achievements', 'conta-skins', 'conta-recompensas', 'conta-doacao', 'opcoes'],
    itens: [
      { nome: '🧑 Meu perfil', destino: () => ({ tela: 'conta', secao: 'perfil' }) },
      { nome: '🏆 Conquistas', destino: () => ({ tela: 'conta', secao: 'achievements' }) },
      { nome: '🎨 Minhas skins', destino: () => ({ tela: 'conta', secao: 'skins' }) },
      { nome: '🎁 Recompensas', destino: () => ({ tela: 'conta', secao: 'recompensas' }) },
      { nome: '💛 Doação', destino: () => ({ tela: 'conta', secao: 'doacao' }) },
      { nome: '⚙️ Opções', destino: () => ({ tela: 'opcoes' }) },
      { nome: '🚪 Sair da conta', destino: () => ({ tela: 'inicio' }), acao: () => void sairDaConta() },
    ],
  },
  {
    nome: 'Comunidade',
    menu: true,
    telas: ['amigos', 'cla', 'eventos', 'jogadores', 'ranking', 'database'],
    itens: [
      { nome: '🔎 Buscar jogadores', destino: () => ({ tela: 'jogadores' }) },
      { nome: '👥 Amigos', destino: () => ({ tela: 'comunidade', secao: 'amigos' }) },
      { nome: '🛡️ Guilda', destino: () => ({ tela: 'comunidade', secao: 'cla' }) },
      { nome: '📅 Eventos', destino: () => ({ tela: 'comunidade', secao: 'eventos' }) },
      { nome: '📊 Ranking', destino: () => ({ tela: 'ranking' }) },
      { nome: '📚 Database', destino: () => ({ tela: 'database' }) },
    ],
  },
  {
    nome: 'Administração',
    menu: true,
    soAdmin: true,
    telas: SECOES_ADMINISTRACAO.map((x) => `admin-${x.id}`),
    // botão direto (pedido do dono): as seções ficam no menu da lateral da própria tela
    itens: [{ nome: 'Administração', destino: () => ({ tela: 'administracao', secao: SECOES_ADMINISTRACAO[0].id }) }],
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
  aoMudarAjustesSom((a) => {
    barra.value = String(Math.round(a.geral * 100));
    pintarDeslizante(barra);
  });
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
    const itens = aba.itens.filter((item) => !item.soAdmin || ehAdministrador());
    // sem menu, ou com um item só (Jogar para o jogador comum = só a Cidade): o botão leva direto
    if (!aba.menu || itens.length === 1) {
      const b = el('button', { class: 'aba-topo', onclick: () => (fecharTodos(), itens[0].acao ? itens[0].acao() : navegar(itens[0].destino())) }, aba.nome);
      return { botao: b, raiz: b };
    }
    const menu = el('div', { class: 'menu-topo', hidden: true },
      ...itens.map((item) => el('button', { onclick: () => (fecharTodos(), item.acao ? item.acao() : navegar(item.destino())) }, item.nome, item.emBreve ? el('small', {}, 'em breve') : null)));
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


  // celular (pedido do dono): as abas e os botões ficam num menu que abre pelo ☰; no PC o ☰ não aparece e o
  // `.barra-topo-menu` some do layout (display: contents), então a barra continua igual
  const menuCelular = el('div', { class: 'barra-topo-menu' });
  const botaoMenu = el('button', { class: 'botao-menu-celular', type: 'button', 'aria-label': 'Menu', 'aria-expanded': 'false' }, '☰');
  const abrirMenuCelular = (abrir: boolean) => {
    menuCelular.classList.toggle('aberto', abrir);
    botaoMenu.textContent = abrir ? '✕' : '☰';
    botaoMenu.setAttribute('aria-expanded', String(abrir));
  };
  botaoMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    abrirMenuCelular(!menuCelular.classList.contains('aberto'));
  });
  // escolheu um destino (item de menu ou aba direta): fecha o menu do celular
  menuCelular.addEventListener('click', (e) => {
    if ((e.target as Element).closest('.menu-topo button, .aba-topo:not(.aba-menu), a')) abrirMenuCelular(false);
  });
  document.addEventListener('click', (e) => !menuCelular.contains(e.target as Node) && abrirMenuCelular(false));

  document.body.prepend(
    el('nav', { class: 'barra-topo' },
      el(
        'div',
        { class: 'barra-topo-conteudo' },
        // Guia do jogo: dúvidas sobre eventos e sistemas (pedido do dono)
        el('button', { class: 'botao-guia', type: 'button', title: 'Guia do jogo: como funcionam os eventos e sistemas', 'aria-label': 'Guia do jogo', onclick: abrirGuia }, iconeGuia()),
        el('img', { class: 'marca', src: '/logo/origens-antigas-barra.svg', alt: 'PokeOrigins' }),
        botaoMenu,
        menuCelular,
      ),
    ),
  );
  menuCelular.append(
        el('div', { class: 'abas-topo' }, ...botoes.map((b) => b.raiz)),
        relogioBrasilia(),
        controlesSom(),
        // convite do Discord da comunidade (pedido do dono)
        el('a', { class: 'botao-discord', href: 'https://discord.gg/zqkXC8Hddu', target: '_blank', rel: 'noopener', title: 'Entre no nosso Discord', 'aria-label': 'Discord do PokeOrigins' },
          el('img', { src: 'discord.svg', alt: '' })),
        // grupo do WhatsApp (pedido do dono): enquanto `LINK_WHATSAPP` estiver vazio, o botão só avisa "em breve"
        el('a', {
          class: 'botao-whatsapp', href: LINK_WHATSAPP || '#', target: '_blank', rel: 'noopener', title: 'Entre no nosso grupo do WhatsApp', 'aria-label': 'WhatsApp do PokeOrigins',
          onclick: (e: Event) => { if (!LINK_WHATSAPP) { e.preventDefault(); avisar('O grupo do WhatsApp ainda não está aberto. Em breve!', 'info'); } },
        }, el('img', { src: 'whatsapp.svg', alt: '' })),
  );
  return (destino) => {
    // telas "em breve" usam a tela de comunidade com uma seção: a seção diz de qual grupo ela é
    const tela = destino.tela === 'comunidade' ? destino.secao : destino.tela === 'administracao' ? `admin-${destino.secao}` : destino.tela === 'conta' ? `conta-${destino.secao}` : destino.tela;
    botoes.forEach((b, i) => b.botao.classList.toggle('ativa', abas[i].telas.includes(tela)));
  };
}
