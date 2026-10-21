// Administração → Correio: a staff manda uma carta para um jogador ou para TODOS (aviso de atualização,
// compensação…), com anexos opcionais (itens e moedas). Chega na caixa de cada um (server/src/correio.ts).
import { TODOS_OS_ITENS, nomeCategoriaItem } from '../../../shared/loja';
import { api, ErroApi } from '../conta';
import { enviarCartaDaStaff } from '../correio';
import { confirmar } from '../ui/confirmar';
import { el } from '../ui/dom';

/** Saldos que também podem ir anexados (o servidor põe no saldo, não na bolsa). */
const MOEDAS = [
  { id: 'silver', nome: 'Poké Dólares' },
  { id: 'gold', nome: 'Origin Coins' },
  { id: 'fragmentos', nome: 'Fragmentos Temporais' },
  { id: 'league-coins', nome: 'League Coins' },
  { id: 'league-coins-nightmare', nome: 'League Coins Nightmare' },
  { id: 'pontos-guilda', nome: 'Pontos de guilda' },
  // quantidade = número de dias; soma ao VIP que o jogador já tem
  { id: 'vip-dias', nome: 'Dias de VIP' },
];
const TITULO_MAX = 60;
const TEXTO_MAX = 2000;
const ANEXOS_MAX = 10;

export function secaoCorreio(): { elemento: HTMLElement; parar: () => void } {
  const opcoes = [...MOEDAS.map((m) => ({ ...m, rotulo: 'Moeda' })), ...TODOS_OS_ITENS.map((i) => ({ id: i.id, nome: i.nome, rotulo: nomeCategoriaItem(i.categoria) }))];
  const listaItens = el('datalist', { id: 'adm-correio-itens' }, ...opcoes.map((o) => el('option', { value: o.nome }, o.rotulo)));
  const listaJogadores = el('datalist', { id: 'adm-correio-jogadores' });
  const campo = (atributos: Record<string, unknown>) => el('input', { class: 'db-busca', ...atributos }) as HTMLInputElement;
  const campoTodos = campo({ type: 'checkbox', 'aria-label': 'Para todos os jogadores' });
  const campoJogador = campo({ type: 'text', list: 'adm-correio-jogadores', placeholder: 'Usuário do jogador', 'aria-label': 'Usuário do jogador', autocomplete: 'off' });
  const campoTitulo = campo({ type: 'text', maxlength: TITULO_MAX, placeholder: 'Ex.: Atualização 0.5 chegou!', 'aria-label': 'Título' });
  const campoTexto = el('textarea', { class: 'db-busca', rows: 6, maxlength: TEXTO_MAX, placeholder: 'Texto da carta (pode pular linhas)', 'aria-label': 'Texto' }) as HTMLTextAreaElement;
  const campoItem = campo({ type: 'text', list: 'adm-correio-itens', placeholder: 'Item ou moeda (opcional)', 'aria-label': 'Item ou moeda', autocomplete: 'off' });
  const campoQtd = campo({ type: 'number', min: 1, max: 999999999, value: 1, 'aria-label': 'Quantidade' });
  const listaAnexos = el('div', { class: 'correio-anexos-lista' });
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  const anexos: { item: string; nome: string; quantidade: number }[] = [];

  const desenharAnexos = () =>
    listaAnexos.replaceChildren(...anexos.map((a, i) => el('span', { class: 'correio-anexo' }, `${a.quantidade.toLocaleString('pt-BR')}x ${a.nome}`,
      el('button', { class: 'botao secundario', type: 'button', 'aria-label': 'Tirar', onclick: () => { anexos.splice(i, 1); desenharAnexos(); } }, '✕'))));
  const anexar = () => {
    const achado = opcoes.find((o) => o.nome.toLowerCase() === campoItem.value.trim().toLowerCase());
    const quantidade = Math.round(Number(campoQtd.value));
    if (!achado) return void (aviso.textContent = 'Escolha um item ou moeda da lista.');
    if (!(quantidade >= 1 && quantidade <= 999_999_999)) return void (aviso.textContent = 'Quantidade inválida.');
    if (anexos.length >= ANEXOS_MAX) return void (aviso.textContent = `No máximo ${ANEXOS_MAX} anexos por carta.`);
    anexos.push({ item: achado.id, nome: achado.nome, quantidade });
    campoItem.value = '';
    campoQtd.value = '1';
    aviso.textContent = '';
    desenharAnexos();
  };
  campoTodos.addEventListener('change', () => (campoJogador.disabled = campoTodos.checked));

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
    const todos = campoTodos.checked;
    const usuario = campoJogador.value.trim();
    const titulo = campoTitulo.value.trim();
    const texto = campoTexto.value.trim();
    if (!todos && !usuario) return void (aviso.textContent = 'Diga para qual jogador vai (ou marque "Todos os jogadores").');
    if (titulo.length < 3) return void (aviso.textContent = 'Escreva um título (3 letras ou mais).');
    if (!texto && !anexos.length) return void (aviso.textContent = 'A carta está vazia: escreva um texto ou anexe algo.');
    const para = todos ? 'TODOS os jogadores' : usuario;
    const comAnexos = anexos.length ? ` com ${anexos.length} anexo(s)` : '';
    if (!(await confirmar('Enviar carta', `Mandar "${titulo}"${comAnexos} para ${para}?`))) return;
    enviando = true;
    aviso.textContent = '';
    try {
      const r = await enviarCartaDaStaff({ ...(todos ? { todos: true } : { usuario }), titulo, texto, itens: anexos });
      aviso.textContent = `Carta enviada para ${r.enviadas} jogador(es).`;
      campoTitulo.value = '';
      campoTexto.value = '';
      anexos.length = 0;
      desenharAnexos();
    } catch (e) {
      aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    enviando = false;
  };

  return {
    parar: () => clearTimeout(relogio),
    elemento: el('section', { class: 'bonus-secao' },
      el('p', { class: 'sub' }, 'Manda uma carta para o Correio de um jogador ou de todos (aviso de atualização, compensação, presente). Os anexos só entram na conta quando o jogador clica em Resgatar. Para mandar um Pokémon, use a aba Dar Pokémon (ele também chega pelo Correio).'),
      listaItens, listaJogadores,
      el('div', { class: 'cla-formulario admin-correio' },
        el('label', { class: 'cla-campo' }, 'Jogador', campoJogador),
        el('label', { class: 'cla-campo adm-correio-todos' }, campoTodos, ' Todos os jogadores'),
        el('label', { class: 'cla-campo' }, 'Título', campoTitulo),
        el('label', { class: 'cla-campo' }, 'Texto', campoTexto),
        el('div', { class: 'adm-correio-anexar' },
          el('label', { class: 'cla-campo' }, 'Anexo', campoItem),
          el('label', { class: 'cla-campo' }, 'Quantidade', campoQtd),
          el('button', { class: 'botao secundario', type: 'button', onclick: anexar }, '+ Anexar')),
        listaAnexos,
        el('button', { class: 'botao cla-botao-criar', onclick: () => void enviar() }, '✉️ Enviar carta')),
      aviso),
  };
}
