// Administração → Whitelist (pedido do dono, 24/10/2026): toda conta criada com o pré-registro ligado cai aqui, sem
// acesso ao jogo. A staff libera uma por uma (Closed Beta, parceiros, Founders), anota (código de criador, pacote
// Founder…) ou abre o jogo para todos no Open Beta. Quem confere é o servidor (server/src/preRegistro.ts).
import { api, ErroApi } from '../conta';
import { el } from '../ui/dom';
import { confirmar } from '../ui/confirmar';

interface Linha { usuario: string; email: string; criadaEm: number; liberada: boolean; codigo: string | null; nota: string; liberadaEm: number | null; liberadaPor: string | null; premio: boolean }
interface Resposta { ligado: boolean; aberto: boolean; contas: Linha[] }
type Filtro = 'todas' | 'esperando' | 'liberadas';

const data = (ms: number | null) => (ms ? new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export function secaoWhitelist(): { elemento: HTMLElement; parar: () => void } {
  const caixa = el('section', { class: 'bonus-secao admin-whitelist' });
  const busca = el('input', { type: 'text', class: 'db-busca', placeholder: 'Buscar por usuário, e-mail, código ou anotação', 'aria-label': 'Buscar' }) as HTMLInputElement;
  let dados: Resposta | null = null;
  let filtro: Filtro = 'esperando';
  let aviso = '';
  const lista = el('div', { class: 'ban-lista' });

  async function chamar(caminho: string, corpo: unknown, mensagem: string): Promise<void> {
    try {
      dados = await api<Resposta>('POST', caminho, corpo);
      aviso = mensagem;
    } catch (e) {
      aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.';
    }
    desenhar();
  }

  function cartao(c: Linha): HTMLElement {
    const nota = el('input', { type: 'text', class: 'db-busca', value: c.nota, maxlength: 200, placeholder: 'Anotação (ex.: Founder Dialga, parceiro…)', 'aria-label': 'Anotação' }) as HTMLInputElement;
    const codigo = el('input', { type: 'text', class: 'db-busca adm-premio-num', value: c.codigo ?? '', maxlength: 20, placeholder: 'Código', 'aria-label': 'Código de criador' }) as HTMLInputElement;
    return el('div', { class: `ban-cartao ${c.liberada ? 'wl-liberada' : ''}`, 'data-sem-traducao': '' },
      el('div', { class: 'ban-topo' },
        el('strong', {}, c.usuario),
        el('span', { class: 'meta' }, c.liberada ? `✅ Liberada em ${data(c.liberadaEm)} por ${c.liberadaPor ?? '?'}${c.premio ? ' · kit enviado' : ''}` : '⏳ Esperando')),
      el('small', { class: 'meta' }, `${c.email} · pré-registro em ${data(c.criadaEm)}${c.codigo ? ` · criador ${c.codigo}` : ''}`),
      el('div', { class: 'adm-premio-linha' },
        nota, codigo,
        el('button', { class: 'botao secundario', onclick: () => chamar('/admin/whitelist', { usuario: c.usuario, nota: nota.value, codigo: codigo.value.trim() }, `Anotação de ${c.usuario} salva.`) }, 'Salvar anotação'),
        c.liberada
          ? el('button', { class: 'botao perigo', onclick: async () => (await confirmar('Whitelist', `Tirar o acesso de ${c.usuario}? A conta sai do jogo e volta para a tela de pré-registro.`)) && chamar('/admin/whitelist', { usuario: c.usuario, liberada: false }, `${c.usuario} voltou para o pré-registro.`) }, 'Tirar acesso')
          : el('button', { class: 'botao', onclick: () => chamar('/admin/whitelist', { usuario: c.usuario, liberada: true }, `${c.usuario} liberada: já pode jogar (o Kit de pré-registro foi para o Correio).`) }, 'Liberar acesso')));
  }

  function desenharLista(): void {
    if (!dados) return;
    const termo = busca.value.trim().toLowerCase();
    const contas = dados.contas
      .filter((c) => filtro === 'todas' || (filtro === 'esperando' ? !c.liberada : c.liberada))
      .filter((c) => !termo || [c.usuario, c.email, c.codigo ?? '', c.nota].some((x) => x.toLowerCase().includes(termo)));
    lista.replaceChildren(...(contas.length ? contas.map(cartao) : [el('p', { class: 'meta' }, 'Nenhuma conta aqui.')]));
  }
  busca.addEventListener('input', desenharLista);

  function desenhar(): void {
    if (!dados) return void caixa.replaceChildren(el('p', { class: 'meta' }, aviso || 'Carregando…'));
    const d = dados;
    const esperando = d.contas.filter((c) => !c.liberada).length;
    caixa.replaceChildren(
      el('p', { class: 'sub' }, 'Contas criadas com o pré-registro ligado ficam aqui sem acesso ao jogo (só veem a página de pré-registro). Libere quem vai jogar o Closed Beta, anote parceiros e Founders, e abra para todos no Open Beta. Contas de antes do pré-registro e da staff jogam sempre.'),
      el('div', { class: 'aviso-perigo-adm' },
        el('strong', {}, d.aberto ? '🟢 JOGO ABERTO PARA TODOS (Open Beta)' : d.ligado ? '🔒 Pré-registro ligado: contas novas NÃO entram no jogo' : '⚪ Pré-registro desligado: contas novas entram direto'),
        el('div', { class: 'adm-premio-acoes' },
          el('button', { class: 'botao secundario', onclick: () => chamar('/admin/whitelist/config', { ligado: !d.ligado }, d.ligado ? 'Pré-registro desligado: contas novas entram direto no jogo.' : 'Pré-registro ligado: contas novas ficam sem acesso.') }, d.ligado ? 'Desligar pré-registro' : 'Ligar pré-registro'),
          el('button', { class: `botao ${d.aberto ? 'secundario' : 'perigo'}`, onclick: async () => (await confirmar('Open Beta', d.aberto ? 'Fechar o jogo de novo? Quem não está liberado volta para a página de pré-registro.' : 'Abrir o jogo para TODAS as contas (Open Beta)? Todo mundo entra e recebe o Kit de pré-registro.')) && chamar('/admin/whitelist/config', { aberto: !d.aberto }, d.aberto ? 'Jogo fechado para quem não está liberado.' : 'Jogo aberto para todos!') }, d.aberto ? 'Fechar o jogo (voltar à whitelist)' : 'Abrir o jogo para todos (Open Beta)'),
          esperando ? el('button', { class: 'botao secundario', onclick: async () => (await confirmar('Whitelist', `Liberar as ${esperando} contas que estão esperando?`)) && chamar('/admin/whitelist/liberar-todas', {}, `${esperando} contas liberadas.`) }, `Liberar todas (${esperando})`) : '')),
      el('p', { class: 'amigos-aviso', role: 'status' }, aviso),
      el('nav', { class: 'admin-abas' }, ...([['esperando', `Esperando (${esperando})`], ['liberadas', `Liberadas (${d.contas.length - esperando})`], ['todas', `Todas (${d.contas.length})`]] as [Filtro, string][]).map(([f, nome]) =>
        el('button', { class: `aba ${f === filtro ? 'ativa' : ''}`, onclick: () => ((filtro = f), desenhar()) }, nome))),
      busca,
      lista);
    desenharLista();
  }

  desenhar();
  api<Resposta>('GET', '/admin/whitelist').then((r) => ((dados = r), desenhar())).catch((e) => ((aviso = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.'), desenhar()));
  return { elemento: caixa, parar: () => undefined };
}
