// Idiomas do jogo (pedido do dono): português (o original), inglês e espanhol, escolhidos em Opções.
// O código continua todo em português. A tradução acontece NA TELA: um dicionário "texto em português → tradução"
// (shared/data/idiomas/en.json e es.json) é aplicado em todo texto que aparece na página (e nos rótulos do mapa, por
// `tr`). Textos montados (`Você ganhou ${n} moedas`) entram no dicionário com {0}, {1}… no lugar das partes que mudam.
// O que não está no dicionário fica como está: nomes de Pokémon, golpes, itens, Abilities, Natures e tipos já são em
// inglês em todos os idiomas (regra do dono). Texto novo: rodar `npm run idiomas` para ver o que falta traduzir.
export type Idioma = 'pt' | 'en' | 'es';

export const IDIOMAS: { id: Idioma; nome: string }[] = [
  { id: 'pt', nome: 'Português' },
  { id: 'en', nome: 'English' },
  { id: 'es', nome: 'Español' },
];
const CHAVE = 'jogo-claude:idioma';

export function idiomaAtual(): Idioma {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === 'en' || v === 'es' ? v : 'pt';
  } catch {
    return 'pt';
  }
}

/** Guarda o idioma e recarrega a página (tudo é redesenhado já traduzido). */
export function escolherIdioma(idioma: Idioma): void {
  if (idioma === idiomaAtual()) return;
  try {
    localStorage.setItem(CHAVE, idioma);
  } catch {
    return;
  }
  location.reload();
}

// ---------- dicionário ----------

interface Modelo {
  /** quantas letras fixas o modelo tem (os mais específicos são testados primeiro) */
  peso: number;
  re: RegExp;
  saida: string;
}
let exatos = new Map<string, string>();
/** pedaços soltos (começam ou acabam com espaço: " (em campo)", " · trancado no PC") que o jogo cola em outros textos */
let soltos: [string, string][] = [];
/** modelos que começam com texto fixo, pelas duas primeiras letras; '' = os que começam com uma parte que muda */
let modelos = new Map<string, Modelo[]>();
const guardado = new Map<string, string>();
let ligado = false;

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function montar(dicionario: Record<string, string>): void {
  exatos = new Map();
  modelos = new Map();
  soltos = [];
  guardado.clear();
  for (const [pt, traducao] of Object.entries(dicionario)) {
    if (!traducao || traducao === pt) continue;
    if (!/\{\d+\}/.test(pt)) {
      exatos.set(pt, traducao);
      if (pt.length >= 7 && /^\s|\s$/.test(pt)) soltos.push([pt, traducao]);
      continue;
    }
    const partes = pt.split(/\{\d+\}/);
    // modelo com pouco texto fixo ("{0} de {1}") só casa com pedaços curtos, sem pontuação de frase: senão pegaria qualquer coisa
    const fixo = partes.join('').trim().length;
    // (o ponto só fecha frase quando vem seguido de espaço: "1.250" e "Sp. Atk" passam)
    const parte = fixo < 8 ? '((?:Sp\\. |\\.(?=\\S)|[^.!?:\\n]){1,40}?)' : '([\\s\\S]+?)';
    // a parte que muda no FIM do modelo pode vir vazia ("…({3} da vida){4}": os avisos do golpe nem sempre existem)
    const ultima = partes[partes.length - 1] === '' && partes.length > 2 ? parte.replace('{1,40}?', '{0,40}?').replace('+?)', '*?)') : parte;
    const re = new RegExp('^' + partes.map(escapar).reduce((junto, pedaco, i) => junto + (i === partes.length - 1 ? ultima : parte) + pedaco) + '$');
    const inicio = partes[0].length >= 2 ? partes[0].slice(0, 2) : '';
    const lista = modelos.get(inicio) ?? [];
    lista.push({ peso: partes.join('').length, re, saida: traducao });
    modelos.set(inicio, lista);
  }
  for (const lista of modelos.values()) lista.sort((a, b) => b.peso - a.peso);
}

function traduzirMiolo(texto: string): string | null {
  const exato = exatos.get(texto);
  if (exato !== undefined) return exato;
  for (const lista of [modelos.get(texto.slice(0, 2)), modelos.get('')]) {
    for (const m of lista ?? []) {
      const achou = m.re.exec(texto);
      // cada parte que muda também passa pela tradução (pode ser outro texto do jogo)
      if (achou) return m.saida.replace(/\{(\d+)\}/g, (_, n) => tr(achou[Number(n) + 1] ?? ''));
    }
  }
  return null;
}

/** Traduz um texto do jogo para o idioma escolhido (em português, devolve igual). */
export function tr(texto: string): string {
  if (!ligado || !texto || texto.length > 600) return texto;
  const pronto = guardado.get(texto);
  if (pronto !== undefined) return pronto;
  let saida = traduzirMiolo(texto);
  if (saida === null) {
    // sem os espaços das pontas
    const miolo = texto.trim();
    if (miolo && miolo !== texto) {
      const t = traduzirMiolo(miolo);
      if (t !== null) saida = texto.slice(0, texto.indexOf(miolo)) + t + texto.slice(texto.indexOf(miolo) + miolo.length);
    }
  }
  if (saida === null && /[.!?:·]\s|\n/.test(texto)) {
    // várias frases juntas ("X evoluiu! Aprendeu Y."): traduz uma por uma
    const partes = texto.split(/(?<=[.!?:])(?<!Sp\.)(\s+)|(\s*·\s*|\n+)/).filter((p) => p !== undefined && p !== '');
    if (partes.length > 1) {
      const novas = partes.map((p) => (/^\s*·?\s*$/.test(p) ? p : (traduzirMiolo(p) ?? traduzirMiolo(p.trim()) ?? p)));
      if (novas.some((p, i) => p !== partes[i])) saida = novas.join('');
    }
  }
  if (saida === null) {
    // pedaço solto colado no fim ou no começo ("Boulder Badge" + " (ainda não conquistada)")
    for (const [pt, traducao] of soltos) {
      if (texto.length > pt.length && (texto.endsWith(pt) || texto.startsWith(pt))) {
        saida = texto.endsWith(pt) ? tr(texto.slice(0, -pt.length)) + traducao : traducao + tr(texto.slice(pt.length));
        break;
      }
    }
  }
  if (saida === null && texto.length <= 80) {
    // fim de frase montado com modelo ("Charizard" + " aumentou muito"): procura, espaço por espaço, um final conhecido
    for (let i = texto.indexOf(' ', 1); i > 0 && saida === null; i = texto.indexOf(' ', i + 1)) {
      const fim = traduzirMiolo(texto.slice(i)) ?? traduzirMiolo(texto.slice(i + 1));
      if (fim !== null) saida = tr(texto.slice(0, i)) + (fim.startsWith(' ') ? '' : ' ') + fim;
    }
  }
  if (guardado.size > 5000) guardado.clear();
  guardado.set(texto, saida ?? texto);
  return saida ?? texto;
}

// ---------- aplicar na página ----------

const ATRIBUTOS = ['title', 'placeholder', 'aria-label', 'alt'];
/** o que nunca é traduzido: o que o jogador escreve e conversa de outros jogadores */
const FORA = 'script, style, textarea, [data-sem-traducao], .chat-mensagens, .conversa-mensagens';
const feitos = new WeakMap<Node, string>();

function traduzirNo(no: Node): void {
  if (no.nodeType === Node.TEXT_NODE) {
    const texto = no.nodeValue ?? '';
    if (!texto.trim() || feitos.get(no) === texto) return;
    if ((no.parentElement as Element | null)?.closest(FORA)) return;
    const novo = tr(texto);
    feitos.set(no, novo);
    if (novo !== texto) no.nodeValue = novo;
    return;
  }
  if (no.nodeType !== Node.ELEMENT_NODE) return;
  const elemento = no as Element;
  if (elemento.matches(FORA) || elemento.closest(FORA)) return;
  for (const a of ATRIBUTOS) {
    const v = elemento.getAttribute(a);
    if (v) {
      const novo = tr(v);
      if (novo !== v) elemento.setAttribute(a, novo);
    }
  }
  for (const filho of Array.from(elemento.childNodes)) traduzirNo(filho);
}

/**
 * Carrega o dicionário do idioma escolhido e liga a tradução da página. Chamar antes de montar qualquer tela.
 * Em português não faz nada.
 */
export async function prepararIdioma(): Promise<void> {
  const idioma = idiomaAtual();
  document.documentElement.lang = idioma === 'pt' ? 'pt-BR' : idioma;
  if (idioma === 'pt') return;
  const dicionario = (idioma === 'en' ? await import('../../shared/data/idiomas/en.json') : await import('../../shared/data/idiomas/es.json')).default as Record<string, string>;
  montar(dicionario);
  ligado = true;
  traduzirNo(document.body);
  new MutationObserver((mudancas) => {
    for (const m of mudancas) {
      if (m.type === 'childList') m.addedNodes.forEach(traduzirNo);
      else if (m.type === 'characterData') traduzirNo(m.target);
      else if (m.type === 'attributes' && m.attributeName) {
        const alvo = m.target as Element;
        const v = alvo.getAttribute(m.attributeName);
        if (v && !alvo.closest(FORA)) {
          const novo = tr(v);
          if (novo !== v) alvo.setAttribute(m.attributeName, novo);
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
  // janelas do navegador (confirm/alert) também
  const [confirmar, avisar] = [window.confirm.bind(window), window.alert.bind(window)];
  window.confirm = (texto?: string) => confirmar(tr(texto ?? ''));
  window.alert = (texto?: unknown) => avisar(tr(String(texto ?? '')));
}

// ---------- bandeiras ----------

const BANDEIRAS: Record<Idioma, string> = {
  // Brasil
  pt: '<rect width="30" height="20" fill="#229e45"/><path d="M15 2.6 27 10 15 17.4 3 10z" fill="#f8e509"/><circle cx="15" cy="10" r="4.4" fill="#2b49a3"/><path d="M10.8 9.1c2.9-.6 6-.1 8.5 1.6" fill="none" stroke="#fff" stroke-width=".9"/>',
  // Estados Unidos
  en: '<rect width="30" height="20" fill="#fff"/><rect y="0.00" width="30" height="1.54" fill="#b22234"/><rect y="3.08" width="30" height="1.54" fill="#b22234"/><rect y="6.15" width="30" height="1.54" fill="#b22234"/><rect y="9.23" width="30" height="1.54" fill="#b22234"/><rect y="12.31" width="30" height="1.54" fill="#b22234"/><rect y="15.38" width="30" height="1.54" fill="#b22234"/><rect y="18.46" width="30" height="1.54" fill="#b22234"/><rect width="12" height="10.77" fill="#3c3b6e"/><circle cx="1.4" cy="1.30" r=".45" fill="#fff"/><circle cx="3.6" cy="1.30" r=".45" fill="#fff"/><circle cx="5.8" cy="1.30" r=".45" fill="#fff"/><circle cx="8.0" cy="1.30" r=".45" fill="#fff"/><circle cx="10.2" cy="1.30" r=".45" fill="#fff"/><circle cx="2.5" cy="2.95" r=".45" fill="#fff"/><circle cx="4.7" cy="2.95" r=".45" fill="#fff"/><circle cx="6.9" cy="2.95" r=".45" fill="#fff"/><circle cx="9.1" cy="2.95" r=".45" fill="#fff"/><circle cx="1.4" cy="4.60" r=".45" fill="#fff"/><circle cx="3.6" cy="4.60" r=".45" fill="#fff"/><circle cx="5.8" cy="4.60" r=".45" fill="#fff"/><circle cx="8.0" cy="4.60" r=".45" fill="#fff"/><circle cx="10.2" cy="4.60" r=".45" fill="#fff"/><circle cx="2.5" cy="6.25" r=".45" fill="#fff"/><circle cx="4.7" cy="6.25" r=".45" fill="#fff"/><circle cx="6.9" cy="6.25" r=".45" fill="#fff"/><circle cx="9.1" cy="6.25" r=".45" fill="#fff"/><circle cx="1.4" cy="7.90" r=".45" fill="#fff"/><circle cx="3.6" cy="7.90" r=".45" fill="#fff"/><circle cx="5.8" cy="7.90" r=".45" fill="#fff"/><circle cx="8.0" cy="7.90" r=".45" fill="#fff"/><circle cx="10.2" cy="7.90" r=".45" fill="#fff"/><circle cx="2.5" cy="9.55" r=".45" fill="#fff"/><circle cx="4.7" cy="9.55" r=".45" fill="#fff"/><circle cx="6.9" cy="9.55" r=".45" fill="#fff"/><circle cx="9.1" cy="9.55" r=".45" fill="#fff"/>',
  // Espanha
  es: '<rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/><rect x="7" y="7.6" width="3.4" height="4.8" rx=".8" fill="#ad1519"/><rect x="7.7" y="6.6" width="2" height="1.2" fill="#c8a000"/>',
};

/** Botões de idioma com a bandeira de cada um (Opções e tela de entrada). */
export function seletorDeIdioma(): HTMLElement {
  const caixa = document.createElement('div');
  caixa.className = 'idiomas';
  caixa.setAttribute('data-sem-traducao', '');
  const atual = idiomaAtual();
  for (const { id, nome } of IDIOMAS) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = `idioma ${id === atual ? 'ativo' : ''}`;
    botao.title = nome;
    botao.innerHTML = `<svg viewBox="0 0 30 20" aria-hidden="true">${BANDEIRAS[id]}</svg><span>${nome}</span>`;
    botao.addEventListener('click', () => escolherIdioma(id));
    caixa.append(botao);
  }
  return caixa;
}
