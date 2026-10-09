// Janela de troca: duas colunas (você à esquerda, o outro jogador à direita), cada um monta a oferta no seu tempo
// (Pokémon, itens, silver, gold) e confirma. Com os dois confirmados, aparece TROCAR no meio; a troca acontece
// quando os dois clicam. "Cancelar troca" no canto. Também: o aviso de convite recebido (Aceitar / Recusar).
import { itemDaLoja } from '../../../shared/loja';
import { nomeItemEquipado } from '../../../shared/usoItens';
import { api, ErroApi } from '../conta';
import { pokemonPorId } from '../dados';
import { adotarSaveDoServidor, carregarSave, salvarAgora, type PokemonDoJogador, type Save } from '../estado';
import {
  cancelarTroca, clicarTrocar, confirmarOferta, mudarOferta, responderConvite, trocasAgora, trocasDisponiveis,
  type LadoTroca, type Oferta, type PokemonNaTroca, type Troca,
} from '../trocas';
import { iconeItem } from './iconeItem';
import { el, spritePokemon } from './dom';
import { abrirJanela, type Janela } from './janela';

const ATUALIZAR_MS = 1000;
const VIGIAR_CONVITES_MS = 4000;
const nomeItem = (id: string) => itemDaLoja(id)?.nome ?? nomeItemEquipado(id);
const iconeDoItem = (id: string) => iconeItem(itemDaLoja(id) ?? { id, categoria: 'batalha' });
const formatar = (n: number) => n.toLocaleString('pt-BR');

let janelaAberta: { id: string; janela: Janela } | null = null;

// ---------- convites ----------
/** Vigia convites recebidos (só quando as trocas estão disponíveis) e abre a janela de quem já está numa troca. */
export function vigiarTrocas(): void {
  const aviso = el('div', { class: 'aviso-convite', hidden: true });
  document.body.append(aviso);
  let mostrando = '';
  const verificar = async () => {
    if (!trocasDisponiveis()) return;
    try {
      const { troca, convites } = await trocasAgora();
      if (troca && (troca.status === 'aberta' || troca.status === 'convite') && janelaAberta?.id !== troca.id) abrirTroca(troca);
      const convite = convites[0];
      if (!convite) {
        aviso.hidden = true;
        mostrando = '';
        return;
      }
      if (mostrando === convite.id) return;
      mostrando = convite.id;
      const responder = async (aceitar: boolean) => {
        aviso.hidden = true;
        try {
          const t = await responderConvite(convite.id, aceitar);
          if (aceitar) abrirTroca(t);
        } catch (e) {
          alert(e instanceof ErroApi ? e.message : 'Não foi possível responder ao convite.');
        }
      };
      aviso.replaceChildren(
        el('strong', {}, convite.de),
        el('span', {}, ' quer trocar com você.'),
        el('div', { class: 'aviso-convite-botoes' },
          el('button', { class: 'botao', onclick: () => responder(true) }, 'Aceitar'),
          el('button', { class: 'botao secundario', onclick: () => responder(false) }, 'Recusar')),
      );
      aviso.hidden = false;
    } catch {
      // sem conexão: tenta na próxima
    }
  };
  setInterval(verificar, VIGIAR_CONVITES_MS);
  void verificar();
}

// ---------- janela da troca ----------
export function abrirTroca(inicial: Troca): void {
  if (janelaAberta?.id === inicial.id) return;
  janelaAberta?.janela.fechar();
  const save = carregarSave();
  if (!save) return;

  let troca = inicial;
  let terminou = false;
  let ocupado = false;
  // o que EU estou oferecendo (uids); a verdade é a do servidor, isto só monta o próximo envio
  let minha: Oferta = { pokemons: troca.eu.oferta.pokemons.map((p) => p.uid), itens: { ...troca.eu.oferta.itens }, silver: troca.eu.oferta.silver, gold: troca.eu.oferta.gold };
  let escolhendo: 'pokemon' | 'item' | null = null;
  const mensagem = el('p', { class: 'troca-mensagem', role: 'status' });

  const raiz = el('div', { class: 'troca' });
  const janela = abrirJanela(`Troca com ${troca.outro.usuario}`, () => raiz, {
    classe: 'janela-troca',
    aoFechar: () => {
      clearInterval(relogio);
      janelaAberta = null;
      // fechar a janela no meio = cancelar
      if (!terminou && (troca.status === 'aberta' || troca.status === 'convite')) void cancelarTroca(troca.id).catch(() => {});
    },
  });
  janelaAberta = { id: troca.id, janela };

  const erro = (e: unknown) => (mensagem.textContent = e instanceof ErroApi ? e.message : 'Algo deu errado. Tente de novo.');
  const agir = async (acao: () => Promise<Troca>) => {
    if (ocupado) return;
    ocupado = true;
    mensagem.textContent = '';
    try {
      aplicar(await acao());
    } catch (e) {
      erro(e);
      // o servidor pode ter tirado as confirmações (algo mudou): pega o estado certo
      await trocasAgora().then((r) => r.troca?.id === troca.id && aplicar(r.troca)).catch(() => {});
    } finally {
      ocupado = false;
    }
  };
  const enviarOferta = () => agir(async () => {
    await salvarAgora();
    return mudarOferta(troca.id, minha);
  });

  // ---- recebe o estado do servidor ----
  const aplicar = (t: Troca) => {
    troca = t;
    if (!ocupado) minha = { pokemons: t.eu.oferta.pokemons.map((p) => p.uid), itens: { ...t.eu.oferta.itens }, silver: t.eu.oferta.silver, gold: t.eu.oferta.gold };
    if (t.status === 'feita' && !terminou) {
      terminou = true;
      void api<{ save: Save; versao: number }>('GET', '/eu').then((r) => adotarSaveDoServidor(r.save, r.versao));
    }
    if (t.status === 'cancelada') terminou = true;
    desenhar();
  };
  const relogio = window.setInterval(async () => {
    if (terminou || ocupado) return;
    try {
      const r = await trocasAgora();
      if (r.troca?.id === troca.id) aplicar(r.troca);
    } catch {
      // sem conexão: tenta de novo
    }
  }, ATUALIZAR_MS);

  // ---- desenho ----
  const cartaoPokemon = (p: PokemonNaTroca, tirar?: () => void) => {
    const base = pokemonPorId(p.especieId);
    return el('div', { class: `troca-pokemon${p.shiny ? ' shiny' : ''}` },
      spritePokemon(base, { shiny: p.shiny, animado: false }),
      el('div', { class: 'troca-pokemon-info' },
        el('strong', {}, base.nome, p.shiny ? el('span', { class: 'troca-shiny', title: 'Shiny' }, ' ★') : null),
        el('small', {}, `Nv. ${p.nivel}${p.item ? ` · ${nomeItem(p.item)}` : ''}`)),
      tirar ? el('button', { class: 'troca-tirar', title: 'Tirar da troca', 'aria-label': 'Tirar da troca', onclick: tirar }, '✕') : null);
  };
  const linhaItem = (id: string, qtd: number, tirar?: () => void) =>
    el('div', { class: 'troca-item' }, iconeDoItem(id), el('span', {}, nomeItem(id)), el('strong', {}, `×${qtd}`),
      tirar ? el('button', { class: 'troca-tirar', title: 'Tirar da troca', 'aria-label': 'Tirar da troca', onclick: tirar }, '✕') : null);
  const moedas = (o: Oferta<unknown>) => [
    o.silver ? el('div', { class: 'troca-moeda silver' }, el('span', { class: 'icone-moeda moeda-silver' }), `${formatar(o.silver)} silver`) : null,
    o.gold ? el('div', { class: 'troca-moeda gold' }, el('span', { class: 'icone-moeda moeda-gold' }), `${formatar(o.gold)} gold`) : null,
  ];
  const vazio = (o: Oferta<unknown>) => !o.pokemons.length && !Object.keys(o.itens).length && !o.silver && !o.gold;
  const selo = (l: LadoTroca) =>
    l.trocar ? el('span', { class: 'troca-selo trocar' }, 'Clicou em Trocar') : l.confirmado ? el('span', { class: 'troca-selo ok' }, '✓ Confirmado') : el('span', { class: 'troca-selo' }, 'Montando…');

  const colunaOutro = () =>
    el('section', { class: `troca-coluna${troca.outro.confirmado ? ' confirmada' : ''}` },
      el('header', {}, el('h3', {}, troca.outro.usuario), selo(troca.outro)),
      el('div', { class: 'troca-oferta' },
        vazio(troca.outro.oferta) ? el('p', { class: 'troca-vazio' }, 'Nada oferecido ainda.') : null,
        ...troca.outro.oferta.pokemons.map((p) => cartaoPokemon(p)),
        ...Object.entries(troca.outro.oferta.itens).map(([id, q]) => linhaItem(id, q)),
        ...moedas(troca.outro.oferta)));

  const colunaMinha = () => {
    const travada = troca.eu.confirmado || troca.status !== 'aberta';
    const mudar = (f: () => void) => () => {
      f();
      void enviarOferta();
    };
    const campoMoeda = (tipo: 'silver' | 'gold') => {
      const entrada = el('input', { type: 'number', min: 0, max: save[tipo], step: 1, value: minha[tipo], disabled: travada, class: 'troca-campo-moeda' }) as HTMLInputElement;
      entrada.addEventListener('change', mudar(() => (minha[tipo] = Math.max(0, Math.min(save[tipo], Math.floor(Number(entrada.value) || 0))))));
      return el('label', { class: `troca-moeda-campo ${tipo}` }, el('span', { class: `icone-moeda moeda-${tipo}` }), entrada,
        el('small', {}, `de ${formatar(save[tipo])}`));
    };
    return el('section', { class: `troca-coluna minha${troca.eu.confirmado ? ' confirmada' : ''}` },
      el('header', {}, el('h3', {}, 'Você'), selo(troca.eu)),
      el('div', { class: 'troca-oferta' },
        vazio(troca.eu.oferta) ? el('p', { class: 'troca-vazio' }, 'Adicione Pokémon, itens ou moedas.') : null,
        ...troca.eu.oferta.pokemons.map((p) => cartaoPokemon(p, travada ? undefined : mudar(() => (minha.pokemons = minha.pokemons.filter((u) => u !== p.uid))))),
        ...Object.entries(troca.eu.oferta.itens).map(([id, q]) => linhaItem(id, q, travada ? undefined : mudar(() => delete minha.itens[id]))),
        ...moedas(troca.eu.oferta)),
      travada ? null : el('div', { class: 'troca-controles' },
        el('div', { class: 'troca-adicionar' },
          el('button', { class: `botao secundario${escolhendo === 'pokemon' ? ' ativo' : ''}`, onclick: () => ((escolhendo = escolhendo === 'pokemon' ? null : 'pokemon'), desenhar()) }, '+ Pokémon'),
          el('button', { class: `botao secundario${escolhendo === 'item' ? ' ativo' : ''}`, onclick: () => ((escolhendo = escolhendo === 'item' ? null : 'item'), desenhar()) }, '+ Item')),
        escolhendo === 'pokemon' ? seletorPokemon() : escolhendo === 'item' ? seletorItem() : null,
        el('div', { class: 'troca-moedas' }, campoMoeda('silver'), campoMoeda('gold'))),
      // depois de confirmar não volta atrás: só Trocar ou Cancelar troca
      troca.status === 'aberta' && !troca.eu.confirmado
        ? el('button', {
            class: 'botao troca-confirmar',
            onclick: () => agir(async () => {
              await salvarAgora();
              return confirmarOferta(troca.id, true);
            }),
          }, 'Confirmar')
        : null);
  };

  const seletorPokemon = () => {
    const todos: { p: PokemonDoJogador; ondeTime: boolean }[] = [...save.time.map((p) => ({ p, ondeTime: true })), ...save.caixa.map((p) => ({ p, ondeTime: false }))];
    const motivo = (p: PokemonDoJogador, ondeTime: boolean) =>
      p.inegociavel ? 'NT: não pode ser trocado'
        : p.trancado ? 'Trancado (destranque no PC)'
          : ondeTime && save.time.filter((x) => !minha.pokemons.includes(x.uid!)).length <= 1 ? 'Precisa ficar 1 no time'
            : null;
    const lista = todos.filter(({ p }) => !minha.pokemons.includes(p.uid!));
    return el('div', { class: 'troca-seletor' },
      lista.length ? null : el('p', { class: 'troca-vazio' }, 'Nenhum Pokémon disponível.'),
      ...lista.map(({ p, ondeTime }) => {
        const bloqueio = motivo(p, ondeTime);
        const base = pokemonPorId(p.especieId);
        return el('button', {
          class: 'troca-opcao', disabled: !!bloqueio, title: bloqueio ?? `Oferecer ${base.nome}`,
          onclick: () => {
            minha.pokemons = [...minha.pokemons, p.uid!];
            escolhendo = null;
            void enviarOferta();
          },
        }, spritePokemon(base, { shiny: p.shiny, animado: false }), el('small', {}, `${base.nome} · Nv. ${p.nivel}`), el('em', {}, bloqueio ?? (ondeTime ? 'Time' : `Box ${(p.box ?? 0) + 1}`)));
      }));
  };

  const seletorItem = () => {
    const itens = Object.entries(save.itens).filter(([id, q]) => q > (minha.itens[id] ?? 0));
    return el('div', { class: 'troca-seletor itens' },
      itens.length ? null : el('p', { class: 'troca-vazio' }, 'Sua bolsa está vazia.'),
      ...itens.map(([id, q]) => {
        const livre = q - (minha.itens[id] ?? 0);
        const qtd = el('input', { type: 'number', min: 1, max: livre, value: 1, class: 'troca-qtd', 'aria-label': 'Quantidade' }) as HTMLInputElement;
        return el('div', { class: 'troca-opcao-item' }, iconeDoItem(id), el('span', {}, nomeItem(id), el('small', {}, ` (tem ${livre})`)), qtd,
          el('button', {
            class: 'botao secundario',
            onclick: () => {
              const n = Math.max(1, Math.min(livre, Math.floor(Number(qtd.value) || 1)));
              minha.itens = { ...minha.itens, [id]: (minha.itens[id] ?? 0) + n };
              escolhendo = null;
              void enviarOferta();
            },
          }, 'Adicionar'));
      }));
  };

  const centro = () => {
    if (troca.status === 'convite') return el('div', { class: 'troca-centro' }, el('p', {}, troca.souConvidado ? 'Aceite o convite para começar.' : `Esperando ${troca.outro.usuario} aceitar o convite…`));
    if (troca.status === 'feita') return el('div', { class: 'troca-centro feita' }, el('p', { class: 'troca-fim' }, 'Troca feita!'), el('small', {}, 'O que você recebeu já está no seu time, PC e bolsa.'), el('button', { class: 'botao', onclick: () => janela.fechar() }, 'Fechar'));
    if (troca.status === 'cancelada') return el('div', { class: 'troca-centro cancelada' }, el('p', { class: 'troca-fim' }, 'Troca cancelada'), el('small', {}, troca.motivo ?? ''), el('button', { class: 'botao secundario', onclick: () => janela.fechar() }, 'Fechar'));
    const ambos = troca.eu.confirmado && troca.outro.confirmado;
    if (!ambos) return el('div', { class: 'troca-centro' }, el('p', {}, 'Monte a sua oferta e clique em Confirmar. Quando os dois confirmarem, aparece o botão Trocar.'));
    return el('div', { class: 'troca-centro pronta' },
      troca.eu.trocar
        ? el('p', {}, `Esperando ${troca.outro.usuario} clicar em Trocar…`)
        : el('button', { class: 'botao troca-trocar', onclick: () => agir(async () => (await salvarAgora(), clicarTrocar(troca.id))) }, '⇄ Trocar'),
      troca.outro.trocar && !troca.eu.trocar ? el('small', {}, `${troca.outro.usuario} já clicou em Trocar.`) : null);
  };

  const desenhar = () => {
    const aberta = troca.status === 'aberta' || troca.status === 'convite';
    raiz.replaceChildren(
      ...(aberta ? [el('button', { class: 'botao secundario troca-cancelar', onclick: () => void cancelarTroca(troca.id).then(aplicar).catch(erro) }, 'Cancelar troca')] : []),
      el('div', { class: 'troca-colunas' }, colunaMinha(), centro(), colunaOutro()),
      mensagem,
    );
  };
  desenhar();
}
