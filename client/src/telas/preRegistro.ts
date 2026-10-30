// Tela de pré-registro (pedido do dono, 24/10/2026). Aparece em dois casos:
// • quem abre o link /pre-registro sem estar logado: informações do jogo, kit de pré-registro, comunidades
//   e o formulário para criar a conta (com "Por onde conheceu o jogo?", ui/comoConheceu.ts);
// • quem está logado numa conta que ainda não tem acesso (server/src/preRegistro.ts): a mesma página, com
//   "Você está pré-registrado!" no lugar do formulário. Quando a staff libera, a página recarrega e o jogo abre.
import { TODOS_OS_ITENS } from '../../../shared/loja';
import type { Premio } from '../../../shared/premiosEventos';
import { api, cadastrar, entrar, ErroApi, sairDaConta, type Conta } from '../conta';
import { seletorDeIdioma } from '../idioma';
import { LINK_DISCORD, LINK_WHATSAPP } from '../ui/barraTopo';
import { campoComoConheceu } from '../ui/comoConheceu';
import { el } from '../ui/dom';
import { icone, iconeNoTexto, type NomeIcone } from '../ui/icones';
import { iconeItem } from '../ui/iconeItem';
import { valorEmMoeda } from '../ui/moeda';
import { criadorDoLink, esquecerCriador } from '../linkCriador';

interface Publico { total: number; aberto: boolean; kit: Premio[] }
interface Meu extends Publico { preRegistrado: boolean; acesso: boolean; desde: number; codigo: string | null }

/** O que o jogo tem (texto da divulgação). */
const DESTAQUES: [NomeIcone, string, string][] = [
  ['mapa', 'Todas as regiões', 'De Kanto a Paldea, num mapa 2D visto de cima, no estilo clássico.'],
  ['duelos', 'Batalhas fiéis', 'Regras oficiais com o motor do Showdown: Mega, Z-Move, Tera e Dynamax.'],
  ['brilho', 'Shiny e lendários', 'Caçadas, IVs com tiers, breeding, Safari, Ninho e Bosses.'],
  ['conquistas', 'Competitivo', 'Torneios PvP, PvP Ranqueado com elos e a Liga Pokémon.'],
  ['guilda', 'Jogue junto', 'Guildas, trocas, mercado entre jogadores, chat e amigos.'],
  ['celular', 'Em qualquer lugar', 'Direto no navegador do PC e do celular, sem baixar nada. Grátis.'],
];

const numero = (n: number) => n.toLocaleString('pt-BR');

function linhaDePremio(p: Premio): HTMLElement {
  const item = TODOS_OS_ITENS.find((i) => i.id === p.id);
  const simbolo = p.id === 'silver' || p.id === 'gold' ? valorEmMoeda(p.id, p.quantidade) : item ? iconeItem(item) : el('span', { class: 'pre-icone-vazio' }, icone('recompensas'));
  return el('li', { class: 'pre-kit-item' }, simbolo, el('span', {}, p.id === 'silver' || p.id === 'gold' ? p.nome : `${numero(p.quantidade)}× ${p.nome}`));
}

/** Formulário de criar conta (ou entrar). Ao terminar, recarrega: o jogo decide se abre o jogo ou esta página. */
function formulario(): HTMLElement {
  let criar = true;
  const campo = (a: Record<string, unknown>) => el('input', { class: 'campo-entrada', ...a }) as HTMLInputElement;
  const usuario = campo({ autocomplete: 'username', maxlength: 16, placeholder: 'Ex.: Ash_123', 'aria-label': 'Nome de usuário' });
  const login = campo({ autocomplete: 'username', maxlength: 254, 'aria-label': 'Usuário ou e-mail' });
  const email = campo({ type: 'email', autocomplete: 'email', maxlength: 254, 'aria-label': 'E-mail' });
  const senha = campo({ type: 'password', autocomplete: 'new-password', maxlength: 200, 'aria-label': 'Senha' });
  const confirmar = campo({ type: 'password', autocomplete: 'new-password', maxlength: 200, 'aria-label': 'Confirmar senha' });
  // veio pelo link de um criador: "Criador de conteúdo" e o código já vêm preenchidos
  const link = criadorDoLink();
  const comoConheceu = campoComoConheceu(link);
  const veioDoLink = link ? el('p', { class: 'pre-link-criador' }, iconeNoTexto('coracao'), `Você veio pelo link de ${link.criador}.`) : null;
  const manter = el('input', { type: 'checkbox', checked: true }) as HTMLInputElement;
  const erro = el('p', { class: 'entrada-erro', role: 'alert' });
  const enviar = el('button', { type: 'submit', class: 'botao botao-entrada' }) as HTMLButtonElement;
  const rotulo = (texto: string, entrada: HTMLElement) => el('label', { class: 'rotulo-entrada' }, el('span', {}, texto), entrada);
  const linhas = { usuario: rotulo('Nome de usuário', usuario), login: rotulo('Usuário ou e-mail', login), email: rotulo('E-mail', email), confirmar: rotulo('Confirmar senha', confirmar), codigo: comoConheceu.elemento };
  const abaCriar = el('button', { type: 'button', class: 'aba-entrada', onclick: () => trocar(true) }, 'Pré-registrar');
  const abaEntrar = el('button', { type: 'button', class: 'aba-entrada', onclick: () => trocar(false) }, 'Já tenho conta');
  const trocar = (c: boolean) => {
    criar = c;
    abaCriar.classList.toggle('ativa', c);
    abaEntrar.classList.toggle('ativa', !c);
    linhas.login.hidden = c;
    linhas.usuario.hidden = linhas.email.hidden = linhas.confirmar.hidden = linhas.codigo.hidden = !c;
    if (veioDoLink) veioDoLink.hidden = !c;
    senha.autocomplete = c ? 'new-password' : 'current-password';
    enviar.textContent = c ? 'Fazer meu pré-registro' : 'Entrar';
    erro.textContent = '';
  };
  const form = el('form', { class: 'formulario-entrada pre-form', novalidate: true },
    el('div', { class: 'abas-entrada', role: 'tablist' }, abaCriar, abaEntrar),
    linhas.usuario, linhas.login, linhas.email, rotulo('Senha', senha), linhas.confirmar, linhas.codigo, veioDoLink ?? '',
    el('label', { class: 'manter-entrada' }, manter, 'Manter conectado neste computador'),
    erro, enviar) as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.textContent = '';
    if (criar && !/^[A-Za-z0-9_]{3,16}$/.test(usuario.value)) return void (erro.textContent = 'Nome de usuário: 3 a 16 letras, números ou _.');
    if (criar && !email.checkValidity()) return void (erro.textContent = 'E-mail inválido.');
    if (!criar && !login.value.trim()) return void (erro.textContent = 'Digite seu usuário ou e-mail.');
    if (criar && senha.value.length < 6) return void (erro.textContent = 'A senha precisa ter pelo menos 6 caracteres.');
    if (criar && senha.value !== confirmar.value) return void (erro.textContent = 'As senhas não são iguais.');
    const origem = comoConheceu.ler();
    if (criar && typeof origem === 'string') return void (erro.textContent = origem);
    enviar.disabled = true;
    try {
      if (criar && typeof origem !== 'string') await cadastrar(usuario.value, email.value.trim(), senha.value, manter.checked, origem);
      if (criar) esquecerCriador();
      else await entrar(login.value.trim(), senha.value, manter.checked);
      location.reload();
    } catch (falha) {
      erro.textContent = falha instanceof ErroApi ? falha.message : 'Algo deu errado. Tente de novo.';
      enviar.disabled = false;
    }
  });
  trocar(true);
  return form;
}

/** Monta a página. `conta` = logado sem acesso (mostra o status) ou null (mostra o formulário). Nunca termina. */
export function telaPreRegistro(raiz: HTMLElement, conta: Conta | null): Promise<never> {
  const contador = el('strong', { class: 'pre-contador' }, '…');
  const kit = el('ul', { class: 'pre-kit-lista' });
  const status = el('div', { class: 'pre-status' });

  const mostrar = (p: Publico | Meu) => {
    contador.textContent = numero(p.total);
    kit.replaceChildren(...(p.kit.length ? p.kit.map(linhaDePremio) : [el('li', { class: 'meta' }, iconeNoTexto('recompensas'), 'Os itens do kit serão anunciados em breve no Discord!')]));
    if (conta && 'acesso' in p) {
      if (p.acesso) return location.reload();
      status.replaceChildren(
        el('h2', {}, iconeNoTexto('confirmado'), 'Você está pré-registrado!'),
        el('p', {}, `Conta ${conta.usuario}, pré-registrada em ${new Date(p.desde).toLocaleDateString('pt-BR')}.${p.codigo ? ` Apoiando o criador ${p.codigo}.` : ''}`),
        el('p', {}, 'Quando o jogo abrir para a sua conta, esta página vira o jogo sozinha. O seu Kit de pré-registro chega pelo Correio.'),
        el('button', { class: 'botao secundario', onclick: async () => { await sairDaConta(); location.reload(); } }, 'Sair da conta'));
    }
  };
  const buscar = () => (conta ? api<Meu>('GET', '/pre-registro/eu') : api<Publico>('GET', '/pre-registro')).then(mostrar).catch(() => undefined);
  void buscar();
  // logado: confere de tempos em tempos se a conta já foi liberada
  if (conta) setInterval(buscar, 60_000);

  raiz.replaceChildren(el('main', { class: 'pre-registro' },
    el('header', { class: 'pre-topo' },
      seletorDeIdioma(),
      el('img', { class: 'pre-logo', src: '/logo/origens-antigas.svg', alt: 'PokeOrigins' }),
      el('p', { class: 'pre-chamada' }, 'O MMO de Pokémon no seu navegador. Grátis, no PC e no celular.'),
      el('div', { class: 'pre-selo' }, iconeNoTexto('lapis'), 'Pré-registro aberto'),
      el('p', { class: 'pre-total' }, contador, ' treinadores já se pré-registraram')),
    el('section', { class: 'pre-bloco pre-principal' },
      conta ? status : el('div', { class: 'pre-cadastro' }, el('h2', {}, 'Faça seu pré-registro'), el('p', { class: 'meta' }, 'Crie sua conta agora: quando o jogo abrir, é só entrar. Quem se pré-registra ganha o Kit de pré-registro.'), formulario()),
      el('div', { class: 'pre-kit' },
        el('h2', {}, iconeNoTexto('recompensas'), 'Kit de pré-registro'),
        el('p', { class: 'meta' }, 'Chega no seu Correio quando o jogo abrir para a sua conta.'),
        kit)),
    el('section', { class: 'pre-bloco' },
      el('h2', {}, 'O que você vai encontrar'),
      el('div', { class: 'pre-destaques' }, ...DESTAQUES.map(([nome, titulo, texto]) => el('article', { class: 'pre-destaque' }, el('span', { class: 'pre-emoji' }, icone(nome)), el('h3', {}, titulo), el('p', {}, texto))))),
    el('section', { class: 'pre-bloco pre-comunidade' },
      el('h2', {}, 'Entre na comunidade'),
      el('p', { class: 'meta' }, 'Novidades, data de lançamento, sorteios e a galera do jogo.'),
      el('div', { class: 'pre-links' },
        el('a', { class: 'botao pre-discord', href: LINK_DISCORD, target: '_blank', rel: 'noopener' }, el('img', { src: '/discord.svg', alt: '' }), 'Discord'),
        LINK_WHATSAPP ? el('a', { class: 'botao pre-whatsapp', href: LINK_WHATSAPP, target: '_blank', rel: 'noopener' }, iconeNoTexto('conversa'), 'WhatsApp') : '')),
    el('p', { class: 'pre-rodape meta' }, 'Projeto de fãs, gratuito para jogar. Sem ligação com a Nintendo, a Game Freak ou a The Pokémon Company.')));
  return new Promise<never>(() => undefined);
}
