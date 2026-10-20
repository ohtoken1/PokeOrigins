// "Toque e segure" (pedido do dono, para o celular): segurar o dedo uns instantes em cima de algo mostra o mesmo
// cartão que aparece ao passar o mouse no PC (golpe, item, ficha do Pokémon na batalha, dicas). O cartão fica na
// tela até o próximo toque, e soltar o dedo depois de segurar NÃO aperta o botão.
// Como funciona: ao segurar, este arquivo finge que o mouse entrou no elemento (mouseover/mouseenter/mousemove);
// assim todos os cartões que já existem funcionam sem mudar nada neles. Os eventos de mouse que o próprio celular
// inventa depois de um toque comum são barrados (senão um toque rápido num golpe deixava o cartão preso na tela).

/** quanto tempo segurando para abrir o cartão */
const TEMPO_SEGURAR_MS = 450;
/** quanto o dedo pode mexer sem cancelar */
const TOLERANCIA_PX = 10;

const nossos = new WeakSet<Event>();
let ultimoToque = 0;
let timer = 0;
let inicio: { x: number; y: number; alvo: Element } | null = null;
/** o que está "com o mouse em cima" por causa de um toque longo (para tirar no próximo toque) */
let aberto: { alvo: Element; cadeia: Element[]; x: number; y: number } | null = null;
let engolirClique = 0;

function disparar(tipo: string, alvo: Element, x: number, y: number, bolha: boolean): void {
  const e = new MouseEvent(tipo, { bubbles: bolha, cancelable: true, clientX: x, clientY: y, view: window });
  nossos.add(e);
  alvo.dispatchEvent(e);
}

/** Tira o "mouse" do que o toque longo anterior abriu. */
function fecharAberto(): void {
  if (!aberto) return;
  const { alvo, cadeia, x, y } = aberto;
  aberto = null;
  disparar('mouseout', alvo, x, y, true);
  for (const e of [...cadeia].reverse()) disparar('mouseleave', e, x, y, false);
}

function segurou(): void {
  if (!inicio) return;
  const { x, y, alvo } = inicio;
  inicio = null;
  if (!alvo.isConnected) return;
  const cadeia: Element[] = [];
  for (let e: Element | null = alvo; e && e !== document.documentElement; e = e.parentElement) cadeia.unshift(e);
  aberto = { alvo, cadeia, x, y };
  // na ordem do navegador: mouseover (sobe), mouseenter de fora para dentro, mousemove
  disparar('mouseover', alvo, x, y, true);
  for (const e of cadeia) disparar('mouseenter', e, x, y, false);
  disparar('mousemove', alvo, x, y, true);
  engolirClique = Date.now() + 800;
}

const cancelar = () => {
  clearTimeout(timer);
  inicio = null;
};

export function ativarToqueLongo(): void {
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    ultimoToque = Date.now();
    fecharAberto();
    cancelar();
    if (!(e.target instanceof Element) || e.target.closest('canvas, input, textarea, select')) return;
    inicio = { x: e.clientX, y: e.clientY, alvo: e.target };
    timer = window.setTimeout(segurou, TEMPO_SEGURAR_MS);
  }, true);
  window.addEventListener('pointermove', (e) => {
    if (inicio && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > TOLERANCIA_PX) cancelar();
  }, true);
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') ultimoToque = Date.now();
    cancelar();
  }, true);
  window.addEventListener('pointercancel', cancelar, true);
  window.addEventListener('scroll', cancelar, true);
  // soltar depois de segurar não aperta o botão
  window.addEventListener('click', (e) => {
    if (Date.now() < engolirClique) {
      engolirClique = 0;
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  // segurar no celular abriria o menu do navegador (copiar, salvar imagem)
  window.addEventListener('contextmenu', (e) => {
    if (Date.now() - ultimoToque < 1500) e.preventDefault();
  }, true);
  // mouse "de mentira" que o celular manda depois de um toque comum: barrado (só os nossos passam)
  for (const tipo of ['mouseover', 'mouseenter', 'mousemove', 'mouseout', 'mouseleave'])
    window.addEventListener(tipo, (e) => {
      if (!nossos.has(e) && Date.now() - ultimoToque < 1000) e.stopImmediatePropagation();
    }, true);
}
