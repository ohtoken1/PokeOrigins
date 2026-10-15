// Eventos do servidor: Cofre e Loteria (server/src/eventos.ts). O jogador abre pelo NPC Evento sazonal da cidade;
// a staff controla em Administração → Eventos (`painelEventosStaff`).
import { BILHETES_POR_JOGADOR, DIGITOS_COFRE, PRECO_BILHETE, formatarBilhete } from '../../../shared/eventosRegras';
import { api, ErroApi } from '../conta';
import { adotarSaveDoServidor, salvarAgora, type Save } from '../estado';
import { aoAvisoDoServidor } from '../online';
import { confirmar } from './confirmar';
import { el } from './dom';
import { abrirJanela } from './janela';
import { valorEmMoeda } from './moeda';
import { TODOS_OS_ITENS, nomeCategoriaItem } from '../../../shared/loja';
import { secaoDarPokemon } from '../telas/adminPokemon';
import { iconeItem } from './iconeItem';
import { DURACOES_EXPEDICAO, FAIXAS_EXPEDICAO, POKEMON_POR_EXPEDICAO, faixaDoPower } from '../../../shared/expedicao';
import { BIOMAS } from '../../../shared/biomas';
import { REGIOES } from '../../../shared/regioes';
import { montarTabela } from '../../../shared/encontros';
import { PREMIO_CAPTURA } from '../../../shared/eventosRegras';
import { buscarExpedicao, candidatosDaExpedicao, comecarExpedicao, powerDoGrupo, precoDaExpedicao } from '../expedicao';
import { ninhoAtual, type EstadoNinhoServidor } from '../ninho';
import { pokemonPorId, pokemonsDaRegiao, todosOsPokemons } from '../dados';
import { salvar, type PokemonDoJogador } from '../estado';
import { spritePokemon } from './dom';

interface EstadoEventos {
  boss: { tipo: string; nome: string; fim: number; ativo: boolean; resultado: string | null } | null;
  ninho: EstadoNinhoServidor;
  captura: { especieId: number; nome: string; fim: number; ativo: boolean; vencedor: { nome: string; soma: number } | null; ranking: { nome: string; soma: number }[]; meu: number | null } | null;
  cofre: { aberto: boolean; premio: string; abertoEm: number; tentativas: number; vencedor: { nome: string; quando: number; usuario?: string } | null } | null;
  loteria: { pote: number; vendendo: boolean; pausada: boolean; voltaEm: string | null; meus: number[]; vendidos: number; ultimo: { dia: string; numero: number; vencedor: string | null; premio: number } | null };
}
const numero = (n: number) => n.toLocaleString('pt-BR');
const erro = (e: unknown) => (e instanceof ErroApi ? e.message : 'Não foi possível falar com o servidor.');

/** Janelinha do cofre: três roletas de 0 a 9 e Confirmar. Fecha depois de cada tentativa (contra macro). */
function tentarCofre(aoResultado: (texto: string) => void): void {
  const digitos = Array.from({ length: DIGITOS_COFRE }, () => 0);
  let enviando = false;
  const janela = abrirJanela('Cofre PokeOrigins', () =>
    el('div', { class: 'cofre-tentativa' },
      el('p', { class: 'meta' }, 'Gire as roletas (setas ou rodinha do mouse) e confirme.'),
      el('div', { class: 'cofre-roletas' },
        ...digitos.map((d, i) => {
          const mudar = (passo: number) => ((digitos[i] = (digitos[i] + passo + 10) % 10), janela.redesenhar());
          const roda = el('div', { class: 'cofre-roleta' },
            el('button', { class: 'botao secundario', type: 'button', 'aria-label': 'Subir', onclick: () => mudar(1) }, '▲'),
            el('strong', {}, String(d)),
            el('button', { class: 'botao secundario', type: 'button', 'aria-label': 'Descer', onclick: () => mudar(-1) }, '▼'));
          roda.addEventListener('wheel', (e) => (e.preventDefault(), mudar(e.deltaY < 0 ? 1 : -1)), { passive: false });
          return roda;
        })),
      el('button', {
        class: 'botao', disabled: enviando,
        onclick: async () => {
          enviando = true;
          const senha = digitos.join('');
          try {
            const r = await api<{ acertou: boolean; premio?: string }>('POST', '/eventos/cofre/tentar', { senha });
            aoResultado(r.acertou ? `🔓 A senha ${senha} abriu o cofre! Prêmio: ${r.premio}. Ele já está chegando para você.` : `🔒 ${senha} não é a senha. Tente de novo!`);
          } catch (e) {
            aoResultado(erro(e));
          }
          janela.fechar();
        },
      }, 'Confirmar')),
  { classe: 'janela-cofre' });
}

/** Depois de uma captura nos mapas: se é a espécie do Evento de captura, o servidor confere e guarda a melhor. */
export async function registrarNaCaptura(p: PokemonDoJogador): Promise<void> {
  try {
    await salvarAgora();
    if (typeof p.uid === 'number') await api('POST', '/eventos/captura/registrar', { uid: p.uid });
  } catch {
    // sem servidor: não conta (o evento é do servidor)
  }
}

const tempo = (ms: number) => {
  const min = Math.max(0, Math.ceil(ms / 60_000));
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
};

export function abrirEventos(save: Save, aoMudar: () => void = () => {}): void {
  let estado: EstadoEventos | null = null;
  let escolhendo = false;
  const escolhidos = new Set<PokemonDoJogador>();
  let horas = DURACOES_EXPEDICAO[0];
  let aviso = '';
  let quantidade = 1;
  const carregar = () => api<EstadoEventos>('GET', '/eventos').then((r) => ((estado = r), janela.redesenhar()), (e) => ((aviso = erro(e)), janela.redesenhar()));

  const secaoCofre = (c: EstadoEventos['cofre']) =>
    el('section', { class: 'evento-bloco' },
      el('h3', {}, '🔐 Cofre PokeOrigins'),
      c?.aberto
        ? el('div', {},
            el('p', {}, 'Prêmio: ', el('strong', {}, c.premio)),
            el('p', { class: 'meta' }, `Senha de ${DIGITOS_COFRE} dígitos. Quem acertar primeiro leva. ${numero(c.tentativas)} tentativas até agora.`),
            el('button', { class: 'botao', onclick: () => tentarCofre((texto) => ((aviso = texto), void carregar())) }, 'Tentar abrir'))
        : el('p', { class: 'meta' }, c?.vencedor ? `O último cofre foi aberto por ${c.vencedor.nome} (prêmio: ${c.premio}).` : 'Nenhum cofre trancado agora. Fique de olho nos avisos!'));

  const secaoLoteria = (l: EstadoEventos['loteria']) => {
    const restam = BILHETES_POR_JOGADOR - l.meus.length;
    const comprar = async () => {
      const custo = quantidade * PRECO_BILHETE;
      if (!(await confirmar('Loteria', `Comprar ${quantidade} bilhete(s) por ${numero(custo)} Poké Dólares?`))) return;
      try {
        await salvarAgora();
        const r = await api<EstadoEventos & { save: Save; versao: number }>('POST', '/eventos/loteria/comprar', { quantidade });
        adotarSaveDoServidor(r.save, r.versao);
        estado = r;
        aviso = `Comprou ${quantidade} bilhete(s). Boa sorte!`;
        aoMudar();
      } catch (e) {
        aviso = erro(e);
      }
      janela.redesenhar();
    };
    return el('section', { class: 'evento-bloco' },
      el('h3', {}, '🎰 Loteria PokeOrigins'),
      el('p', {}, 'Prêmio acumulado: ', valorEmMoeda('silver', l.pote)),
      el('p', { class: 'meta' }, `Bilhete de ${numero(PRECO_BILHETE)} com um número de 5 dígitos. Vendas até as 20h; o sorteio sai às 20h05 (Brasília). Ninguém acertou? O prêmio acumula. Máximo de ${BILHETES_POR_JOGADOR} bilhetes por dia.`),
      l.ultimo ? el('p', { class: 'meta' }, `Último sorteio: ${formatarBilhete(l.ultimo.numero)} — ${l.ultimo.vencedor ? `${l.ultimo.vencedor} ganhou ${numero(l.ultimo.premio)}!` : 'ninguém acertou.'}`) : null,
      l.pausada
        ? el('p', {}, `Alguém ganhou este mês! A Loteria volta em ${l.voltaEm?.split('-').reverse().join('/')}.`)
        : !l.vendendo
          ? el('p', {}, 'As vendas de hoje fecharam. Espere o sorteio das 20h05.')
          : el('div', { class: 'evento-compra' },
              el('input', { type: 'number', min: '1', max: String(Math.max(1, restam)), value: String(quantidade), oninput: (e: Event) => (quantidade = Math.max(1, Math.min(restam, Math.floor(Number((e.target as HTMLInputElement).value) || 1)))) }),
              el('button', { class: 'botao', disabled: restam <= 0 || save.silver < PRECO_BILHETE, onclick: () => void comprar() }, 'Comprar bilhetes')),
      el('p', { class: 'meta' }, `Seus bilhetes de hoje (${l.meus.length}/${BILHETES_POR_JOGADOR}): ${l.meus.length ? l.meus.map(formatarBilhete).join(', ') : 'nenhum'}`));
  };

  const secaoExpedicao = () => {
    const e = save.expedicao;
    const bloco = (...filhos: (HTMLElement | string | null)[]) => el('section', { class: 'evento-bloco' }, el('h3', {}, '🧭 Expedição'), ...filhos.filter((x): x is HTMLElement | string => x !== null));
    if (e) {
      const volta = e.fim - Date.now();
      return bloco(
        el('div', { class: 'expedicao-time' }, ...e.pokemons.map((p) => spritePokemon(pokemonPorId(p.especieId), { shiny: p.shiny, animado: false }))),
        el('p', {}, `Power ${numero(e.power)} · faixa ${e.faixa + 1} · ${e.horas} h`),
        volta > 0
          ? el('p', { class: 'meta' }, `Voltam em ${tempo(volta)}.`)
          : el('button', { class: 'botao', onclick: () => { const frases = buscarExpedicao(save); aviso = frases ? `A expedição voltou! ${frases.join(' ')}` : ''; aoMudar(); janela.redesenhar(); } }, 'Buscar a expedição'));
    }
    if (!escolhendo)
      return bloco(
        el('p', { class: 'meta' }, `Mande até ${POKEMON_POR_EXPEDICAO} Pokémon por 1, 3 ou 6 horas. Eles ficam fora do time e do PC e voltam com Berries, Apricorns, Pokébolas, remédios, Energies e, com sorte, um item raro (tudo NT). Quanto maior o Power somado, melhor. Entrada: ${numero(precoDaExpedicao(save))}.`),
        el('button', { class: 'botao', onclick: () => ((escolhendo = true), escolhidos.clear(), janela.redesenhar()) }, 'Montar expedição'));
    const lista = candidatosDaExpedicao(save);
    const total = powerDoGrupo([...escolhidos]);
    return bloco(
      el('p', { class: 'meta' }, `Escolhidos ${escolhidos.size}/${POKEMON_POR_EXPEDICAO} · Power ${numero(total)} · faixa ${faixaDoPower(total) + 1} de ${FAIXAS_EXPEDICAO.length}`),
      el('div', { class: 'expedicao-grade' }, ...lista.map((p) => el('button', {
        class: `expedicao-pokemon ${escolhidos.has(p) ? 'escolhido' : ''}`, type: 'button', title: pokemonPorId(p.especieId).nome,
        onclick: () => (escolhidos.has(p) ? escolhidos.delete(p) : escolhidos.size < POKEMON_POR_EXPEDICAO && escolhidos.add(p), janela.redesenhar()),
      }, spritePokemon(pokemonPorId(p.especieId), { shiny: p.shiny, animado: false }), el('small', {}, `Nv. ${p.nivel}`)))),
      el('div', { class: 'evento-compra' },
        ...DURACOES_EXPEDICAO.map((h) => el('button', { class: `aba ${h === horas ? 'ativa' : ''}`, type: 'button', onclick: () => ((horas = h), janela.redesenhar()) }, `${h} h`)),
        el('button', {
          class: 'botao', disabled: !escolhidos.size,
          onclick: async () => {
            if (!(await confirmar('Expedição', `Mandar ${escolhidos.size} Pokémon por ${horas} h? Custa ${numero(precoDaExpedicao(save))} Poké Dólares e eles só voltam no fim.`))) return;
            const erroExp = comecarExpedicao(save, [...escolhidos], horas);
            aviso = erroExp ?? 'Expedição a caminho!';
            if (!erroExp) escolhendo = false;
            aoMudar();
            janela.redesenhar();
          },
        }, 'Partir'),
        el('button', { class: 'botao secundario', onclick: () => ((escolhendo = false), janela.redesenhar()) }, 'Cancelar')));
  };

  const secaoCaptura = (c: EstadoEventos['captura']) =>
    el('section', { class: 'evento-bloco' },
      el('h3', {}, '🎯 Evento de captura'),
      c?.ativo
        ? el('div', {},
            el('div', { class: 'expedicao-time' }, spritePokemon(pokemonPorId(c.especieId), { animado: false }), el('strong', {}, c.nome)),
            el('p', { class: 'meta' }, `Capture o ${c.nome} em batalha nos mapas (não valem ovo, troca, Safari ou Orb). A maior soma de IVs até a meia-noite leva 1 Ovo Lendário + ${numero(PREMIO_CAPTURA.silver)} Poké Dólares + ${PREMIO_CAPTURA.gold} Origin Coins. Empate: quem capturou primeiro. Termina em ${tempo(c.fim - Date.now())}.`),
            el('p', {}, `Sua melhor: ${c.meu ?? '—'}`),
            el('ol', { class: 'evento-ranking' }, ...c.ranking.map((r) => el('li', {}, `${r.nome} — ${r.soma}`))))
        : el('p', { class: 'meta' }, c?.vencedor ? `O último evento (${c.nome}) foi vencido por ${c.vencedor.nome}, com ${c.vencedor.soma} de IVs.` : 'Nenhum evento de captura agora.'));

  const secaoNinho = () => {
    const n = ninhoAtual();
    return el('section', { class: 'evento-bloco' },
      el('h3', {}, '🪺 Ninho'),
      n
        ? el('p', {}, `Há um ninho de ${n.nome} em ${REGIOES.find((r) => r.id === n.regiao)?.nome} · ${n.bioma.nome}. Some em ${tempo(n.servidor.fim - Date.now())}. Vá até o mapa e clique em "Enfrentar o ninho".`)
        : el('p', { class: 'meta' }, 'Nenhum ninho agora. Um novo aparece a cada 20 minutos.'));
  };

  const janela = abrirJanela('Eventos', () =>
    el('div', { class: 'eventos' },
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso),
      estado ? el('div', {}, secaoExpedicao(), secaoNinho(), secaoCaptura(estado.captura), secaoCofre(estado.cofre), secaoLoteria(estado.loteria)) : el('p', { class: 'meta' }, 'Carregando…')),
  { classe: 'janela-eventos' });
  void carregar();
  const parar = aoAvisoDoServidor((msg) => {
    if (msg.t !== 'eventos') return;
    if (!document.querySelector('.janela-eventos')) return parar?.();
    void carregar();
  });
}

/** Controles da staff (Administração → Eventos): trancar um prêmio no cofre e abastecer a loteria. */
export function painelEventosStaff(): HTMLElement {
  const caixa = el('div', { class: 'eventos-staff' });
  let tipo: 'item' | 'pokemon' = 'item';
  let tipoBoss: 'global' | 'guilda' = 'global';
  /** O que vai no cofre: um item com quantidade (busca pelo nome) ou um Pokémon montado no editor do Dar Pokémon. */
  const montarPremio = (enviar: (caminho: string, corpo: unknown) => Promise<void>): HTMLElement => {
    const abas = el('nav', { class: 'admin-abas' },
      ...(['item', 'pokemon'] as const).map((k) => el('button', { class: `aba ${k === tipo ? 'ativa' : ''}`, type: 'button', onclick: () => ((tipo = k), void desenhar()) }, k === 'item' ? 'Item' : 'Pokémon')));
    if (tipo === 'pokemon') {
      const editor = secaoDarPokemon({
        botao: 'Trancar no cofre',
        enviar: async (pokemon, nome) => (await enviar('/eventos/cofre/abrir', { tipo: 'pokemon', pokemon, nome }), `${nome} trancado no cofre.`),
      });
      return el('div', {}, abas, editor.elemento);
    }
    const lista = el('datalist', { id: 'cofre-itens' }, ...TODOS_OS_ITENS.map((i) => el('option', { value: i.nome }, nomeCategoriaItem(i.categoria))));
    const campo = el('input', { type: 'text', class: 'db-busca', list: 'cofre-itens', placeholder: 'Nome do item (ex.: Orb)', autocomplete: 'off' }) as HTMLInputElement;
    const qtd = el('input', { type: 'number', class: 'db-busca', min: '1', max: '9999', value: '1', 'aria-label': 'Quantidade' }) as HTMLInputElement;
    const visto = el('div', { class: 'linha-escolhido' });
    const achado = () => TODOS_OS_ITENS.find((i) => i.nome.toLowerCase() === campo.value.trim().toLowerCase());
    campo.addEventListener('input', () => {
      const i = achado();
      visto.replaceChildren(...(i ? [iconeItem(i), el('strong', {}, i.nome)] : []));
    });
    return el('div', {}, abas, lista,
      el('div', { class: 'evento-compra' }, campo, qtd,
        el('button', {
          class: 'botao', onclick: () => {
            const i = achado();
            const quantidade = Math.round(Number(qtd.value));
            if (!i) return ((aviso = 'Escolha um item da lista.'), void desenhar());
            if (!confirm(`Trancar ${quantidade}x ${i.nome} no cofre?`)) return;
            void enviar('/eventos/cofre/abrir', { tipo: 'item', item: i.id, quantidade, nome: quantidade > 1 ? `${quantidade}x ${i.nome}` : i.nome });
          },
        }, 'Trancar no cofre')),
      visto);
  };
  let aviso = '';
  const desenhar = async () => {
    let e: EstadoEventos | null = null;
    try {
      e = await api<EstadoEventos>('GET', '/eventos');
    } catch (x) {
      aviso = erro(x);
    }
    const valor = el('input', { type: 'number', min: '1', placeholder: 'Poké Dólares' }) as HTMLInputElement;
    const enviar = async (caminho: string, corpo: unknown) => {
      try {
        await api('POST', caminho, corpo);
        aviso = 'Feito.';
      } catch (x) {
        aviso = erro(x);
      }
      void desenhar();
    };
    const ligar = (evento: string, texto: string) => el('button', { class: 'botao', onclick: () => confirm(`${texto}?`) && void enviar('/eventos/ligar', { evento }) }, texto);
    const linha = (nome: string, acao: HTMLElement | string) => el('div', { class: 'evento-linha' }, el('strong', {}, nome), typeof acao === 'string' ? el('small', { class: 'meta' }, acao) : acao);
    const partes: (HTMLElement | null)[] = [
      el('h2', {}, 'Ligar eventos agora (testes)'),
      el('div', { class: 'eventos-lista' },
        linha('🔥 Outbreak', ligar('outbreak', 'Ativar agora (1 h)')),
        linha('🪺 Ninho', ligar('ninho', 'Ativar agora (10 min)')),
        linha('🎰 Loteria', ligar('loteria', 'Sortear agora')),
        linha('🎯 Evento de captura', 'mais abaixo'),
        linha('🔐 Cofre', 'mais abaixo'),
        linha('🧭 Expedição', 'sempre aberta (NPC Eventos)'),
        linha('🦒 Safari', 'sempre aberto (NPC Safari)'),
        linha('📋 Quadro de missões', 'sempre aberto'),
        linha('👹 Boss global', 'mais abaixo'),
        linha('🛡️ Boss da guilda', 'mais abaixo'),
        linha('🏆 Torneio', 'em breve'),
        linha('⚔️ PvP ranqueado', 'em breve'),
        linha('👑 Liga Pokémon', 'em breve')),
      el('h2', {}, 'Boss (gaiola da cidade)'),
      e?.boss?.ativo
        ? el('p', {}, `Na gaiola: ${e.boss.nome} (${e.boss.tipo === 'global' ? 'global' : 'da guilda'}), termina em ${tempo(e.boss.fim - Date.now())}. `, el('button', { class: 'botao secundario', onclick: () => confirm('Encerrar o boss agora e entregar os prêmios?') && void enviar('/eventos/boss/encerrar', {}) }, 'Encerrar agora'))
        : el('div', {},
            e?.boss?.resultado ? el('p', { class: 'meta' }, `Último: ${e.boss.nome} — ${e.boss.resultado}`) : '',
            el('nav', { class: 'admin-abas' }, ...(['global', 'guilda'] as const).map((k) => el('button', { class: `aba ${k === tipoBoss ? 'ativa' : ''}`, type: 'button', onclick: () => ((tipoBoss = k), void desenhar()) }, k === 'global' ? 'Boss global' : 'Boss da guilda'))),
            el('p', { class: 'meta' }, 'Monte o Pokémon (o nível vira 200 sozinho). Ele fica 2 horas na gaiola; cada jogador luta uma vez.'),
            secaoDarPokemon({ botao: 'Colocar na gaiola', enviar: async (pokemon, nome) => (await enviar('/eventos/boss/iniciar', { tipo: tipoBoss, pokemon, nome }), `${nome} está na gaiola.`) }).elemento),
      el('h2', {}, 'Cofre'),
      e?.cofre?.aberto
        ? el('p', {}, `Trancado com: ${e.cofre.premio} · ${numero(e.cofre.tentativas)} tentativas. `, el('button', { class: 'botao secundario', onclick: () => void enviar('/eventos/cofre/fechar', {}) }, 'Cancelar cofre'))
        : montarPremio(enviar),
      e?.cofre?.vencedor ? el('p', { class: 'meta' }, `Último vencedor: ${e.cofre.vencedor.nome} (conta ${e.cofre.vencedor.usuario}), que levou ${e.cofre.premio}.`) : null,
      el('p', { class: 'meta' }, 'A senha é sorteada pelo sistema. Quem acertar aparece no letreiro e recebe o prêmio sozinho (como no Dar item / Dar Pokémon).'),
      el('h2', {}, 'Evento de captura'),
      e?.captura?.ativo
        ? el('p', {}, `Em andamento: ${e.captura.nome} (até a meia-noite).`)
        : el('button', {
            class: 'botao', onclick: () => {
              // só espécies comuns que aparecem soltas em algum mapa
              const lista = REGIOES.filter((r) => r.disponivel).flatMap((r) => BIOMAS.flatMap((b) => montarTabela(b, pokemonsDaRegiao(r.id), [], todosOsPokemons()).filter((x) => x.grupo === null).map((x) => x.pokemon)));
              const p = lista[Math.floor(Math.random() * lista.length)];
              if (!confirm(`Começar o Evento de captura com ${p.nome}? Vai até a meia-noite.`)) return;
              void enviar('/eventos/captura/iniciar', { especieId: p.id, nome: p.nome });
            },
          }, 'Sortear espécie e começar'),
      el('h2', {}, 'Loteria'),
      e ? el('p', {}, 'Prêmio acumulado: ', valorEmMoeda('silver', e.loteria.pote), ` · ${numero(e.loteria.vendidos)} bilhetes vendidos hoje`) : null,
      el('div', { class: 'evento-compra' }, valor, el('button', { class: 'botao', onclick: () => void enviar('/eventos/loteria/abastecer', { valor: Math.floor(Number(valor.value)) }) }, 'Abastecer prêmio')),
      el('p', { class: 'aviso-bolsa', hidden: !aviso, role: 'status' }, aviso)];
    caixa.replaceChildren(...partes.filter((p): p is HTMLElement => !!p));
  };
  void desenhar();
  return caixa;
}
