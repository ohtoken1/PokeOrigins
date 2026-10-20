// Comunidade → Clã. Sem clã: criar (bandeira + nome, custa gold) ou entrar num da lista. Com clã: bandeira, nível
// (só a porcentagem), missões do nível, membros com o cargo (líder, vice-líder, membro) e a gestão de quem pode.
import { abrirLojaDaGuilda } from '../ui/lojaGuilda';
import {
  BANDEIRA_PADRAO, bonusDoCla, DESCRICAO_CLA_MAX, XP_CLA_POR_POKEMON_DE_TREINADOR, XP_CLA_POR_SELVAGEM, XP_CLA_POR_TORNEIO, limparNomeCla, NIVEL_MAX_CLA, NOME_CLA_MAX, NOME_CLA_VALIDO, PRECO_CRIAR_CLA_GOLD, VAGAS_CLA, type Bandeira,
} from '../../../shared/cla';
import {
  aoMudarCla, cancelarPedidoDeCla, carregarCla, criarCla, editarCla, entrarNoCla, expulsarDoCla, listarClas, meuCla, meusPedidosDeCla,
  mudarCargoNoCla, NOME_CARGO, responderPedidoDeCla, sairDoCla, verCla, type DetalheCla, type MembroCla, type ResumoCla,
} from '../cla';
import { api, conta, ErroApi } from '../conta';
import { adotarSaveDoServidor, carregarSave, salvarAgora, type Save } from '../estado';
import type { Tela } from '../main';
import { NIVEL_MINIMO, textoTranca } from '../../../shared/trancas';
import { conteudoLiberado } from '../trancas';
import { desenharBandeira, editorDeBandeira } from '../ui/bandeira';
import { el } from '../ui/dom';
import { abrirJanela } from '../ui/janela';
import { abrirPerfilDe } from './jogadores';
import { valorEmMoeda } from '../ui/moeda';
import { confirmar } from '../ui/confirmar';

const mensagemDe = (e: unknown) => (e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.');
const pct = (v: number) => `+${Math.round(v * 100)}%`;
/** Os bônus que o nível da guilda dá a todos os membros, e o que o próximo nível acrescenta. */
function secaoBonus(nivel: number): HTMLElement {
  const agora = bonusDoCla(nivel);
  const linhas: [string, number][] = [['Aparição de shiny', agora.shiny], ['XP de Pokémon e de treinador', agora.xp], ['Aparição de lendários e iniciais', agora.raros], ['Poké Dólares em batalhas', agora.silver]];
  const proximo = nivel >= NIVEL_MAX_CLA ? '' : (nivel + 1) % 2 ? 'No próximo nível: +1% de shiny e de XP.' : 'No próximo nível: +1% de lendários e de Poké Dólares.';
  return el('section', { class: 'cla-missoes' },
    el('h3', {}, 'Bônus da guilda'),
    el('ul', {}, ...linhas.map(([nome, v]) => el('li', { class: v > 0 ? 'feita' : '' }, `${nome}: ${pct(v)}`))),
    el('small', {}, `Valem para todos os membros. ${proximo}`));
}

const seloNivel = (nivel: number) => el('span', { class: 'cla-nivel', title: `Guilda nível ${nivel}` }, `Nv. ${nivel}`);
const seloCargo = (cargo: MembroCla['cargo']) => el('span', { class: `cla-cargo cargo-${cargo}` }, NOME_CARGO[cargo]);

/** Cartão de um clã (bandeira, nível, barra, descrição e membros com o cargo); `acoes` monta os botões de cada membro. */
function cartaoDoCla(c: DetalheCla, acoes: (m: MembroCla) => (HTMLElement | null)[] = () => []): HTMLElement {
  const noMaximo = c.nivel >= NIVEL_MAX_CLA;
  return el('div', { class: 'cla-cartao' },
    el('header', { class: 'cla-topo' },
      desenharBandeira(c.bandeira, 120),
      el('div', { class: 'cla-identidade' },
        el('h2', {}, c.nome, seloNivel(c.nivel)),
        el('p', { class: 'cla-descricao' }, c.descricao || 'Sem descrição.'),
        el('div', { class: 'cla-barra', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': c.progresso, title: noMaximo ? 'Nível máximo' : `${c.progresso.toLocaleString('pt-BR')}% para o nível ${c.nivel + 1}` },
          el('span', { style: { width: `${c.progresso}%` } }),
          el('strong', {}, noMaximo ? 'Nível máximo' : `${c.progresso.toLocaleString('pt-BR')}%`)),
        el('small', { class: 'cla-meta' }, `${c.membros.length}/${c.vagas} membros · ${c.aberto ? 'Entrada livre' : 'Entrada por pedido'} · desde ${new Date(c.criadoEm).toLocaleDateString('pt-BR')}`))),
    noMaximo ? null : el('section', { class: 'cla-missoes' },
      el('h3', {}, `Para o nível ${c.nivel + 1}`),
      el('ul', {},
        el('li', { class: c.progresso >= 99.9 ? 'feita' : '' }, `Experiência da guilda: ${c.progresso.toLocaleString('pt-BR')}%`),
        ...c.missoes.map((m) => el('li', { class: m.feita ? 'feita' : '' }, m.texto))),
      el('small', {}, `A experiência é da guilda inteira: cada Pokémon selvagem derrotado ou capturado por um membro vale ${XP_CLA_POR_SELVAGEM} ponto, cada Pokémon do time de um treinador vencido vale ${XP_CLA_POR_POKEMON_DE_TREINADOR} e cada torneio vale ${XP_CLA_POR_TORNEIO}.`)),
    secaoBonus(c.nivel),
    el('section', { class: 'cla-membros' },
      el('h3', {}, 'Membros'),
      ...c.membros.map((m) => el('div', { class: `cla-membro${m.usuario === conta()?.usuario ? ' eu' : ''}` },
        c.meuCargo ? el('span', { class: `perfil-bolinha ${m.online ? 'online' : 'offline'}`, title: m.online ? 'Online' : 'Offline' }) : null,
        el('span', { class: 'amigo-quem' }, el('strong', {}, m.nome), el('small', {}, `@${m.usuario}`)),
        seloCargo(m.cargo),
        el('span', { class: 'cla-parte', title: 'Parte da experiência da guilda que veio deste membro' }, `${m.parte}%`),
        el('span', { class: 'amigo-botoes' }, el('button', { class: 'botao secundario', onclick: () => void abrirPerfilDe(m.usuario) }, 'Perfil'), ...acoes(m)))),
      ...Array.from({ length: Math.max(0, c.vagas - c.membros.length) }, () => el('div', { class: 'cla-membro vaga' }, 'Vaga livre'))));
}

export const telaCla: Tela = (raiz) => {
  const tela = el('main', { class: 'tela tela-cla' });
  raiz.append(tela);
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  const fazer = (acao: Promise<unknown>, sucesso = '') => {
    aviso.textContent = '';
    return acao.then(() => void (aviso.textContent = sucesso), (e) => void (aviso.textContent = mensagemDe(e)));
  };

  // ---- com clã ----
  const meuClaNaTela = (c: DetalheCla) => {
    const lider = c.meuCargo === 'lider';
    const gestor = lider || c.meuCargo === 'vice';
    const botao = (texto: string, acao: () => void, classe = 'secundario') => el('button', { class: `botao ${classe}`, onclick: acao }, texto);
    const acoes = (m: MembroCla) => {
      if (m.usuario === conta()?.usuario) return [];
      return [
        lider && m.cargo === 'membro' ? botao('Tornar vice-líder', () => void fazer(mudarCargoNoCla(m.usuario, 'vice'))) : null,
        lider && m.cargo === 'vice' ? botao('Tornar membro', () => void fazer(mudarCargoNoCla(m.usuario, 'membro'))) : null,
        lider ? botao('Passar liderança', async () => (await confirmar('Confirmar', `Passar a liderança da guilda para ${m.nome}? Você vira vice-líder.`)) && void fazer(mudarCargoNoCla(m.usuario, 'lider'))) : null,
        gestor && (lider || m.cargo === 'membro') ? botao('Expulsar', async () => (await confirmar('Confirmar', `Expulsar ${m.nome} da guilda?`)) && void fazer(expulsarDoCla(m.usuario)), 'perigo') : null,
      ];
    };
    const editar = () => {
      const bandeira: Bandeira = { ...(c.bandeira ?? BANDEIRA_PADRAO) };
      const descricao = el('input', { type: 'text', class: 'db-busca', maxlength: DESCRICAO_CLA_MAX, value: c.descricao, placeholder: 'Descrição da guilda' }) as HTMLInputElement;
      const aberto = el('input', { type: 'checkbox', checked: c.aberto }) as HTMLInputElement;
      const erro = el('p', { class: 'amigos-aviso' });
      const janela = abrirJanela('Editar guilda', () => el('div', { class: 'cla-formulario' },
        editorDeBandeira(bandeira),
        el('label', { class: 'cla-campo' }, 'Descrição', descricao),
        el('label', { class: 'cla-campo linha' }, aberto, 'Entrada livre (desligado: só entra quem o líder ou vice-líder aceitar)'),
        erro,
        el('button', { class: 'botao', onclick: () => editarCla({ bandeira, descricao: descricao.value, aberto: aberto.checked }).then(() => janela.fechar(), (e) => void (erro.textContent = mensagemDe(e))) }, 'Salvar')),
        { classe: 'janela-cla' });
    };
    tela.replaceChildren(el('div', {},
      el('h1', {}, 'Minha guilda'),
      cartaoDoCla(c, acoes),
      gestor && c.pedidos.length ? el('section', { class: 'amigos-secao' }, el('h2', {}, `Pedidos de entrada (${c.pedidos.length})`),
        el('div', { class: 'amigos-lista' }, ...c.pedidos.map((p) => el('div', { class: 'amigo-linha' },
          el('span', { class: 'amigo-quem' }, el('strong', {}, p.nome), el('small', {}, `@${p.usuario}`)),
          el('span', { class: 'amigo-botoes' },
            botao('Perfil', () => void abrirPerfilDe(p.usuario)),
            botao('Aceitar', () => void fazer(responderPedidoDeCla(p.usuario, true)), ''),
            botao('Recusar', () => void fazer(responderPedidoDeCla(p.usuario, false)))))))) : null,
      aviso,
      el('div', { class: 'cla-rodape' },
        botao('🛒 Loja da guilda', () => abrirLojaDaGuilda(), ''),
        lider ? botao('Editar bandeira e descrição', editar) : null,
        botao('Sair da guilda', async () => {
          const sozinho = c.membros.length === 1;
          const texto = sozinho ? 'Você é o único membro: ao sair, a guilda é apagada. Sair mesmo assim?'
            : lider ? 'Ao sair, a liderança passa para o vice-líder (ou o membro mais antigo). Sair da guilda?' : 'Sair da guilda?';
          if ((await confirmar('Confirmar', texto))) void fazer(sairDoCla());
        }, 'perigo'))));
  };

  // ---- sem clã: criar ou entrar ----
  const bandeiraNova: Bandeira = { ...BANDEIRA_PADRAO };
  const nome = el('input', { type: 'text', class: 'db-busca', maxlength: NOME_CLA_MAX, placeholder: 'Nome da guilda', 'aria-label': 'Nome da guilda' }) as HTMLInputElement;
  const descricao = el('input', { type: 'text', class: 'db-busca', maxlength: DESCRICAO_CLA_MAX, placeholder: 'Descrição (opcional)', 'aria-label': 'Descrição da guilda' }) as HTMLInputElement;
  const aberto = el('input', { type: 'checkbox', checked: true }) as HTMLInputElement;
  const busca = el('input', { type: 'search', class: 'db-busca', placeholder: 'Buscar guilda pelo nome…', 'aria-label': 'Buscar guilda' }) as HTMLInputElement;
  const lista = el('div', { class: 'amigos-lista' });
  let clas: ResumoCla[] = [];
  let relogio = 0;
  let pedido = 0;

  let criando = false;
  const criar = async () => {
    if (criando) return;
    const n = limparNomeCla(nome.value);
    if (!NOME_CLA_VALIDO.test(n)) return void (aviso.textContent = 'Nome da guilda: de 3 a 16 letras ou números.');
    if ((carregarSave()?.gold ?? 0) < PRECO_CRIAR_CLA_GOLD) return void (aviso.textContent = `Criar uma guilda custa ${PRECO_CRIAR_CLA_GOLD} Origin Coins.`);
    if (!(await confirmar('Confirmar', `Criar a guilda "${n}" por ${PRECO_CRIAR_CLA_GOLD} Origin Coins?`))) return;
    criando = true;
    await fazer((async () => {
      // o servidor cobra o gold no save guardado: salva antes e pega o save de volta depois
      await salvarAgora();
      await criarCla({ nome: n, bandeira: bandeiraNova, descricao: descricao.value, aberto: aberto.checked });
      const r = await api<{ save: Save; versao: number }>('GET', '/eu');
      adotarSaveDoServidor(r.save, r.versao);
    })());
    criando = false;
  };
  const mostrarLista = () => {
    const pedidos = meusPedidosDeCla();
    lista.replaceChildren(...(clas.length
      ? clas.map((c) => {
          const cheio = c.membros >= c.vagas;
          // clã que liberou a entrada depois do meu pedido: dá para entrar direto
          const acao = pedidos.includes(c.id) && !c.aberto ? el('button', { class: 'botao secundario', onclick: () => void fazer(cancelarPedidoDeCla(c.id)) }, 'Cancelar pedido')
            : cheio ? el('small', { class: 'amigo-estado' }, 'Cheio')
            : el('button', { class: 'botao', onclick: () => void fazer(entrarNoCla(c.id), c.aberto ? '' : `Pedido enviado para ${c.nome}.`) }, c.aberto ? 'Entrar' : 'Pedir para entrar');
          return el('div', { class: 'amigo-linha cla-linha' },
            desenharBandeira(c.bandeira, 34),
            el('span', { class: 'amigo-quem' }, el('strong', {}, c.nome, seloNivel(c.nivel)), el('small', {}, `${c.membros}/${c.vagas} membros · ${c.aberto ? 'entrada livre' : 'por pedido'}`)),
            el('span', { class: 'amigo-botoes' },
              el('button', { class: 'botao secundario', onclick: () => void verCla(c.id).then((d) => abrirJanela(d.nome, () => cartaoDoCla(d), { classe: 'janela-cla' }), (e) => void (aviso.textContent = mensagemDe(e))) }, 'Ver'),
              acao));
        })
      : [el('p', { class: 'meta' }, busca.value.trim() ? `Nenhuma guilda encontrada com "${busca.value.trim()}".` : 'Ainda não existe nenhuma guilda. Crie a primeira!')]));
  };
  const buscar = (espera = 250) => {
    clearTimeout(relogio);
    relogio = window.setTimeout(async () => {
      const este = ++pedido;
      try {
        const r = await listarClas(busca.value.trim());
        if (este !== pedido) return;
        clas = r;
        mostrarLista();
      } catch (e) {
        if (este === pedido) lista.replaceChildren(el('p', { class: 'meta' }, mensagemDe(e)));
      }
    }, espera);
  };
  busca.addEventListener('input', () => buscar());
  const criacao = el('section', { class: 'cla-cartao cla-criar' },
    el('h2', {}, 'Criar sua guilda'),
    el('p', { class: 'meta' }, `Monte a bandeira, escolha o nome e chame até ${VAGAS_CLA - 1} amigos (${VAGAS_CLA} vagas com você).`),
    editorDeBandeira(bandeiraNova),
    el('div', { class: 'cla-formulario' },
      el('label', { class: 'cla-campo' }, 'Nome', nome),
      el('label', { class: 'cla-campo' }, 'Descrição', descricao),
      el('label', { class: 'cla-campo linha' }, aberto, 'Entrada livre (desligado: só entra quem você aceitar)'),
      el('button', { class: 'botao botao-gold cla-botao-criar', onclick: () => void criar() }, 'Criar guilda · ', valorEmMoeda('gold', PRECO_CRIAR_CLA_GOLD))));
  const procura = el('section', { class: 'amigos-secao' }, el('h2', {}, 'Entrar em uma guilda'), el('div', { class: 'jogadores-busca' }, busca), lista);

  let tinhaCla: boolean | null = null;
  const desenhar = () => {
    const c = meuCla();
    if (c) meuClaNaTela(c);
    else if (!conteudoLiberado('guilda')) {
      // tranca de nível: sem guilda e abaixo do nível, não cria nem entra
      tela.replaceChildren(el('h1', {}, 'Guildas'),
        el('section', { class: 'em-breve' }, el('span', { class: 'selo-em-breve' }, textoTranca('guilda')),
          el('p', {}, `As guildas abrem no nível ${NIVEL_MINIMO.guilda} de treinador. Continue batalhando e capturando para subir de nível.`)));
    } else {
      // o formulário de criar fica montado (não perde o que a pessoa já escolheu)
      if (tinhaCla !== false) tela.replaceChildren(el('h1', {}, 'Guildas'), aviso, procura, criacao);
      if (tinhaCla !== false) buscar(0);
      else mostrarLista();
    }
    tinhaCla = !!c;
  };
  const parar = aoMudarCla(desenhar);
  desenhar();
  void carregarCla().catch((e) => void (aviso.textContent = mensagemDe(e)));
  return () => (parar(), clearTimeout(relogio));
};
