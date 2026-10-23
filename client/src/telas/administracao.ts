// Aba "Administração" (só para contas de administrador). Eventos (o que a staff liga na hora: por enquanto a
// Bonificação), Dar item (manda um item para qualquer jogador, pelo servidor), Dar Pokémon e Anúncios (vão para o
// Mural da cidade) funcionam; o Log fica "em breve".
import { comMenuLateral, menuLateral } from '../ui/menuLateral';
import type { Tela } from '../main';
import { painelEventosStaff } from '../ui/eventos';
import { painelRecompensasStaff } from './adminRecompensas';
import { NOMES_BONUS, VALORES_BONUS, textoBonus, type ChaveBonus } from '../../../shared/bonificacao';
import { bonificacao, definirBonus, ehAdministrador } from '../bonificacao';
import { ANUNCIO_TEXTO_MAX, ANUNCIO_TITULO_MAX, AVISO_MAX } from '../../../shared/anuncios';
import { anuncios, aoMudarAnuncios, apagarAnuncio, carregarAnuncios, publicarAnuncio, publicarAviso } from '../anuncios';
import { api, ErroApi } from '../conta';
import { TODOS_OS_ITENS, nomeCategoriaItem } from '../../../shared/loja';
import { darItemAoJogador } from '../entregas';
import { secaoDarPokemon } from './adminPokemon';
import { secaoBanimentos } from './adminBanimentos';
import { secaoAdministradores } from './adminAdministradores';
import { secaoParcerias } from './adminParcerias';
import { secaoLiga } from './adminLiga';
import { secaoTorneio } from './adminTorneio';
import { secaoCorreio } from './adminCorreio';
import { secaoDashboard } from './adminDashboard';
import { iconeItem } from '../ui/iconeItem';
import { el } from '../ui/dom';
import { cartaoAnuncio } from '../ui/mural';
import { confirmar } from '../ui/confirmar';

export type SecaoAdministracao = 'dashboard' | 'correio' | 'itens' | 'pokemon' | 'liga' | 'torneio' | 'banimentos' | 'administradores' | 'parceria' | 'log' | 'eventos' | 'anuncios';

export const SECOES_ADMINISTRACAO: { id: SecaoAdministracao; nome: string; emBreve?: string }[] = [
  { id: 'dashboard', nome: 'Dashboard' },
  // só eventos que a staff ativa direto (pedido do dono); a Bonificação mora aqui
  { id: 'eventos', nome: 'Eventos' },
  { id: 'correio', nome: 'Correio' },
  { id: 'itens', nome: 'Dar item' },
  { id: 'pokemon', nome: 'Dar Pokémon' },
  { id: 'liga', nome: 'Liga' },
  { id: 'torneio', nome: 'Torneio' },
  { id: 'banimentos', nome: 'Banimentos' },
  { id: 'administradores', nome: 'Administradores' },
  { id: 'parceria', nome: 'Parceria' },
  {
    id: 'log',
    nome: 'Log',
    emBreve: 'Registro de tudo o que acontece no jogo: o que entra e sai (Poké Dólares, Origin Coins, itens, Pokémon, tickets), quem fez e quando — para achar abuso de bug. Vai ser ligado com o servidor.',
  },
  { id: 'anuncios', nome: 'Anúncios' },
];

/** Menu na lateral (modelo escolhido pelo dono): as seções por assunto, com ícone. */
const GRUPOS_ADMIN: { titulo: string; secoes: [SecaoAdministracao, string][] }[] = [
  { titulo: 'Visão geral', secoes: [['dashboard', '📊']] },
  { titulo: 'Jogadores', secoes: [['correio', '✉️'], ['itens', '🎁'], ['pokemon', '🐾'], ['banimentos', '⛔'], ['administradores', '🛡️']] },
  { titulo: 'Eventos', secoes: [['eventos', '📅'], ['liga', '👑'], ['torneio', '🏟️']] },
  { titulo: 'Comunicação', secoes: [['anuncios', '📢'], ['log', '📜']] },
  { titulo: 'Negócios', secoes: [['parceria', '🤝']] },
];

/** Anúncios: escrever um aviso novo (vai para o Mural de anúncios da cidade de todos) e apagar os que já estão lá. */
function secaoAnuncios(): { elemento: HTMLElement; parar: () => void } {
  const titulo = el('input', { type: 'text', class: 'db-busca', maxlength: ANUNCIO_TITULO_MAX, placeholder: 'Título', 'aria-label': 'Título do anúncio' }) as HTMLInputElement;
  const texto = el('textarea', { class: 'db-busca anuncio-campo', maxlength: ANUNCIO_TEXTO_MAX, rows: 6, placeholder: 'Texto do anúncio', 'aria-label': 'Texto do anúncio' }) as HTMLTextAreaElement;
  const contador = el('small', { class: 'meta' });
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  const publicados = el('div', { class: 'mural' });
  const erro = (e: unknown) => void (aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.');
  const contar = () => void (contador.textContent = `${texto.value.length}/${ANUNCIO_TEXTO_MAX}`);
  texto.addEventListener('input', contar);
  contar();
  let publicando = false;
  const publicar = async () => {
    if (publicando) return;
    if (!titulo.value.trim() || !texto.value.trim()) return void (aviso.textContent = 'Escreva o título e o texto.');
    publicando = true;
    aviso.textContent = '';
    try {
      await publicarAnuncio(titulo.value, texto.value);
      titulo.value = texto.value = '';
      contar();
      aviso.textContent = 'Anúncio publicado no Mural da cidade.';
    } catch (e) {
      erro(e);
    }
    publicando = false;
  };
  // aviso: só o texto, numa linha, passando na barrinha de avisos (o título não é usado)
  const avisar = async () => {
    if (publicando) return;
    const linha = texto.value.replace(/\s+/g, ' ').trim();
    if (!linha) return void (aviso.textContent = 'Escreva o texto do aviso.');
    if (linha.length > AVISO_MAX) return void (aviso.textContent = `O aviso da barrinha tem até ${AVISO_MAX} letras (este tem ${linha.length}).`);
    publicando = true;
    aviso.textContent = '';
    try {
      await publicarAviso(linha);
      titulo.value = texto.value = '';
      contar();
      aviso.textContent = 'Aviso enviado para a barrinha de avisos de todos.';
    } catch (e) {
      erro(e);
    }
    publicando = false;
  };
  const desenhar = () => {
    const lista = anuncios();
    publicados.replaceChildren(...(lista.length
      ? lista.map((a) => cartaoAnuncio(a, false,
          el('button', { class: 'botao perigo', onclick: async () => (await confirmar('Confirmar', `Apagar o anúncio "${a.titulo}"?`)) && void apagarAnuncio(a.id).then(() => void (aviso.textContent = 'Anúncio apagado.'), erro) }, 'Apagar')))
      : [el('p', { class: 'meta' }, 'Nenhum anúncio publicado.')]));
  };
  const parar = aoMudarAnuncios(desenhar);
  desenhar();
  void carregarAnuncios().catch(erro);
  return {
    parar,
    elemento: el('section', { class: 'bonus-secao' },
      el('p', { class: 'sub' }, `"Publicar anúncio" põe o título e o texto no Mural de anúncios da cidade. "Publicar aviso" manda só o texto (até ${AVISO_MAX} letras, sem título) para a barrinha de avisos embaixo do cabeçalho de todos, por 30 minutos.`),
      el('div', { class: 'cla-formulario' },
        el('label', { class: 'cla-campo' }, 'Título', titulo),
        el('label', { class: 'cla-campo' }, 'Texto', texto, contador),
        el('div', { class: 'anuncio-botoes' },
          el('button', { class: 'botao cla-botao-criar', onclick: () => void publicar() }, 'Publicar anúncio'),
          el('button', { class: 'botao secundario cla-botao-criar', title: 'Só o texto, numa linha', onclick: () => void avisar() }, 'Publicar aviso'))),
      aviso,
      el('h2', { class: 'anuncios-titulo' }, 'No mural agora'),
      publicados),
  };
}

/** Dar item: escolhe um item do jogo, a quantidade e o jogador; o servidor entrega (na hora, se ele está online). */
function secaoItens(): { elemento: HTMLElement; parar: () => void } {
  const listaItens = el('datalist', { id: 'adm-itens' }, ...TODOS_OS_ITENS.map((i) => el('option', { value: i.nome }, nomeCategoriaItem(i.categoria))));
  const listaJogadores = el('datalist', { id: 'adm-jogadores' });
  const campoItem = el('input', { type: 'text', class: 'db-busca', list: 'adm-itens', placeholder: 'Nome do item', 'aria-label': 'Nome do item' }) as HTMLInputElement;
  const campoQtd = el('input', { type: 'number', class: 'db-busca', min: '1', max: '9999', value: '1', 'aria-label': 'Quantidade' }) as HTMLInputElement;
  const campoJogador = el('input', { type: 'text', class: 'db-busca', list: 'adm-jogadores', placeholder: 'Usuário do jogador', 'aria-label': 'Usuário do jogador', autocomplete: 'off' }) as HTMLInputElement;
  const escolhido = el('div', { class: 'linha-escolhido' });
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  const itemEscolhido = () => TODOS_OS_ITENS.find((i) => i.nome.toLowerCase() === campoItem.value.trim().toLowerCase());
  const mostrarItem = () => {
    const item = itemEscolhido();
    escolhido.replaceChildren(...(item ? [iconeItem(item), el('span', {}, el('strong', {}, item.nome), el('small', { class: 'meta' }, ` · ${nomeCategoriaItem(item.categoria)}`))] : []));
  };
  campoItem.addEventListener('input', mostrarItem);
  // sugestões de jogadores enquanto digita (usuário ou nome de treinador)
  let relogio = 0;
  campoJogador.addEventListener('input', () => {
    clearTimeout(relogio);
    const termo = campoJogador.value.trim();
    if (termo.length < 2) return;
    relogio = window.setTimeout(async () => {
      try {
        const achados = await api<{ usuario: string; nome: string | null }[]>('GET', `/jogadores?busca=${encodeURIComponent(termo)}`);
        listaJogadores.replaceChildren(...achados.map((j) => el('option', { value: j.usuario }, j.nome ?? '')));
      } catch {
        // sem sugestões: o envio ainda confere o usuário
      }
    }, 250);
  });
  let enviando = false;
  const enviar = async () => {
    if (enviando) return;
    const item = itemEscolhido();
    const quantidade = Math.round(Number(campoQtd.value));
    const usuario = campoJogador.value.trim();
    if (!item) return void (aviso.textContent = 'Escolha um item da lista.');
    if (!(quantidade >= 1 && quantidade <= 9999)) return void (aviso.textContent = 'A quantidade vai de 1 a 9999.');
    if (!usuario) return void (aviso.textContent = 'Diga para qual jogador vai.');
    if (!(await confirmar('Confirmar', `Dar ${quantidade}x ${item.nome} para ${usuario}?`))) return;
    enviando = true;
    aviso.textContent = '';
    try {
      const r = await darItemAoJogador(usuario, item.id, item.nome, quantidade);
      aviso.textContent = `${quantidade}x ${item.nome} enviado para o Correio de ${r.usuario}.`;
    } catch (e) {
      aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    enviando = false;
  };
  return {
    parar: () => clearTimeout(relogio),
    elemento: el('section', { class: 'bonus-secao' },
      el('p', { class: 'sub' }, 'Manda um item do jogo para um jogador. Chega no Correio dele e vai para a bolsa quando ele resgatar (skins vão para Minhas skins).'),
      listaItens, listaJogadores,
      el('div', { class: 'cla-formulario admin-dar-item' },
        el('label', { class: 'cla-campo' }, 'Item', campoItem),
        escolhido,
        el('label', { class: 'cla-campo' }, 'Quantidade', campoQtd),
        el('label', { class: 'cla-campo' }, 'Jogador', campoJogador),
        el('button', { class: 'botao cla-botao-criar', onclick: () => void enviar() }, 'Dar item')),
      aviso,
      el('small', { class: 'meta' }, 'Futuramente cada envio vai ficar registrado na aba Log.')),
  };
}

export const telaAdministracao = (secaoInicial: SecaoAdministracao): Tela => (raiz, navegar) => {
  const tela = el('main', { class: 'tela tela-administracao' }, el('h1', {}, 'Administração'));
  raiz.append(tela);
  if (!ehAdministrador()) {
    tela.append(el('p', { class: 'sub' }, 'Esta área é só para administradores.'));
    return;
  }
  let secao = secaoInicial;
  const corpo = el('div', { class: 'admin-corpo' });
  // montada uma vez só (redesenhar a tela não apaga o que a pessoa está escrevendo)
  const partesAnuncios = secao === 'anuncios' ? secaoAnuncios() : secao === 'itens' ? secaoItens() : secao === 'correio' ? secaoCorreio() : secao === 'pokemon' ? secaoDarPokemon() : secao === 'banimentos' ? secaoBanimentos() : secao === 'administradores' ? secaoAdministradores() : secao === 'parceria' ? secaoParcerias() : secao === 'liga' ? secaoLiga() : secao === 'torneio' ? secaoTorneio() : secao === 'dashboard' ? secaoDashboard() : null;

  const linhaBonus = (chave: ChaveBonus) => {
    const atual = bonificacao()[chave];
    return el(
      'div',
      { class: 'bonus-linha' },
      el('div', {}, el('strong', {}, NOMES_BONUS[chave].nome), el('small', {}, NOMES_BONUS[chave].descricao)),
      el('div', { class: 'bonus-valores' },
        ...VALORES_BONUS.map((v) => el('button', { class: `aba ${v === atual ? 'ativa' : ''}`, onclick: () => (definirBonus(chave, v), desenhar()) }, textoBonus(v)))),
    );
  };

  function desenhar() {
    const info = SECOES_ADMINISTRACAO.find((s) => s.id === secao)!;
    const b = bonificacao();
    const ativos = (Object.keys(b) as ChaveBonus[]).filter((k) => b[k] > 1);
    corpo.replaceChildren(
      comMenuLateral(menuLateral(GRUPOS_ADMIN.map((g) => ({ titulo: g.titulo, opcoes: g.secoes.map(([id, icone]) => ({ id, icone, nome: SECOES_ADMINISTRACAO.find((s) => s.id === id)!.nome })) })),
        secao, (id) => navegar({ tela: 'administracao', secao: id as SecaoAdministracao })),
      info.emBreve
        ? el('section', { class: 'em-breve' }, el('span', { class: 'selo-em-breve' }, 'Em breve'), el('p', {}, info.emBreve))
        : partesAnuncios ? partesAnuncios.elemento
        : el(
            'section',
            { class: 'bonus-secao' },
            el('p', { class: 'sub' }, 'Eventos que a staff liga e desliga na hora.'),
            el('h2', {}, 'Bonificação'),
            el('p', { class: 'meta' }, 'Multiplicadores para todos os jogadores, de 1x até 3x. Valem na hora para as próximas batalhas e encontros.'),
            ...(['silver', 'xp', 'shiny', 'lendario'] as ChaveBonus[]).map(linhaBonus),
            el('p', { class: 'meta' }, ativos.length ? `Ativos agora: ${ativos.map((k) => `${NOMES_BONUS[k].nome} ${textoBonus(b[k])}`).join(' · ')}` : 'Nenhum bônus ativo (tudo 1x).'),
            ativos.length
              ? el('button', { class: 'botao secundario', onclick: () => ((['silver', 'xp', 'shiny', 'lendario'] as ChaveBonus[]).forEach((k) => definirBonus(k, 1)), desenhar()) }, 'Voltar tudo para 1x')
              : null,
            el('small', { class: 'meta' }, 'Por enquanto fica guardado só neste navegador; com o servidor, vai valer para todo mundo.'),
            painelEventosStaff(),
            painelRecompensasStaff(),
          )),
    );
  }
  desenhar();
  tela.append(corpo);
  return () => partesAnuncios?.parar();
};
