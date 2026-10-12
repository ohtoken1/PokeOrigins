// Casas temáticas dos NPCs da cidade, desenhadas por código em pixel art (pedido do dono: cada NPC com uma casa que
// combine com o que ele faz). O dono escolheu entre três opções de cada (página client/public/previa-casas.html):
// Guilda = salão, Viajante do tempo = passado e futuro, Safari = creche, Mercado negro = entrada de esgoto; o Banco
// ficou simétrico. As escolhidas estão em `CASAS_DOS_NPCS` e entram no mapa por jogo/cidade.ts; as outras opções
// continuam aqui só para a prévia. Cada desenho devolve um canvas por quadro de animação.
import { elipse, novoCanvas, pokebola, ret } from './cidadeDesenhos';
import { hash2 } from './ruido';

type Ctx = CanvasRenderingContext2D;
/** Quatro tons de um material: contorno, escuro, base, claro. */
type Tons = [string, string, string, string];

const PEDRA: Tons = ['#33363f', '#6a6e7c', '#8c90a0', '#b2b6c4'];
const PEDRA_CLARA: Tons = ['#4a4436', '#a89c84', '#cdc2a8', '#e8dfc8'];
const PEDRA_ESCURA: Tons = ['#16181e', '#383c48', '#545866', '#767a88'];
const MADEIRA: Tons = ['#3a2416', '#6e4526', '#94623a', '#b98654'];
const MADEIRA_ESCURA: Tons = ['#24140c', '#462a16', '#603c20', '#80552e'];
const REBOCO: Tons = ['#5a4a34', '#c9b890', '#e8dcc0', '#f8f0dc'];
const TELHA: Tons = ['#3e1e0e', '#84441e', '#b4642a', '#da8c46'];
const VERMELHO: Tons = ['#461212', '#8a2222', '#b63830', '#da5c4a'];
const AZUL: Tons = ['#14224a', '#28468a', '#3c66b6', '#6892dc'];
const ROXO: Tons = ['#261646', '#462a7c', '#6646a8', '#9070ce'];
const VERDE: Tons = ['#123620', '#226638', '#328c4c', '#5ab66a'];
const VERDE_AGUA: Tons = ['#103c3a', '#1e7670', '#2ea698', '#6ad2c2'];
const ROSA: Tons = ['#5a1e3a', '#b04a78', '#de72a0', '#f6a8c8'];
const DOURADO: Tons = ['#553808', '#ac7616', '#e0b038', '#f8e088'];
const METAL: Tons = ['#1a2634', '#465c74', '#7690a8', '#b2c6d6'];
const CIANO = '#5cf0ff';

// ---------- ferramentas ----------

/** Desenha só dentro do retângulo (o que passar para fora é cortado). */
function recortar(ctx: Ctx, x: number, y: number, w: number, h: number, desenho: () => void) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  desenho();
  ctx.restore();
}

/** Bloco liso com contorno, luz em cima e sombra embaixo. */
function bloco(ctx: Ctx, t: Tons, x: number, y: number, w: number, h: number) {
  ret(ctx, t[0], x, y, w, h);
  ret(ctx, t[2], x + 1, y + 1, w - 2, h - 2);
  ret(ctx, t[3], x + 1, y + 1, w - 2, 1);
  if (h > 4) ret(ctx, t[1], x + 1, y + h - 2, w - 2, 1);
}

/** Parede de tijolos ou pedras em fiadas desencontradas, com alguns mais claros. */
function tijolos(ctx: Ctx, t: Tons, x: number, y: number, w: number, h: number, bw = 10, bh = 5) {
  ret(ctx, t[0], x, y, w, h);
  recortar(ctx, x + 1, y + 1, w - 2, h - 2, () => {
    ret(ctx, t[2], x, y, w, h);
    for (let r = 0; r * bh < h; r++) {
      const yy = y + 1 + r * bh;
      for (let xx = x + 1 - (r % 2 ? bw >> 1 : 0); xx < x + w; xx += bw) {
        const sorte = hash2(xx, yy, 71);
        if (sorte > 0.72) ret(ctx, t[3], xx + 1, yy, bw - 1, bh - 1);
        else if (sorte < 0.16) ret(ctx, t[1], xx + 1, yy, bw - 1, bh - 1);
        ret(ctx, t[1], xx, yy, 1, bh);
      }
      ret(ctx, t[1], x, yy + bh - 1, w, 1);
    }
  });
}

/** Parede de tábuas (em pé) ou de toras (deitadas). */
function tabuas(ctx: Ctx, t: Tons, x: number, y: number, w: number, h: number, passo = 6, deitadas = false) {
  ret(ctx, t[0], x, y, w, h);
  recortar(ctx, x + 1, y + 1, w - 2, h - 2, () => {
    ret(ctx, t[2], x, y, w, h);
    if (deitadas)
      for (let yy = y + 1; yy < y + h; yy += passo) {
        ret(ctx, t[3], x, yy, w, 1);
        ret(ctx, t[1], x, yy + passo - 1, w, 1);
      }
    else
      for (let xx = x + 1; xx < x + w; xx += passo) {
        ret(ctx, t[3], xx, y, 1, h);
        ret(ctx, t[1], xx + passo - 1, y, 1, h);
      }
  });
}

/** Telhado visto de frente (trapézio): fiadas de telhas, beiral escuro embaixo. */
function telhadoFrente(ctx: Ctx, t: Tons, x: number, y: number, w: number, h: number, recuo: number) {
  for (let i = 0; i < h; i++) {
    const r = Math.round(recuo * (1 - i / (h - 1)));
    const [x0, larg] = [x + r, w - 2 * r];
    const fiada = i % 5;
    ret(ctx, fiada === 4 ? t[1] : fiada === 0 ? t[3] : t[2], x0, y + i, larg, 1);
    if (fiada !== 4) for (let xx = x0 + ((Math.floor(i / 5) % 2) * 4 + 2); xx < x0 + larg - 1; xx += 8) ret(ctx, t[1], xx, y + i, 1, 1);
    ret(ctx, t[0], x0, y + i, 1, 1);
    ret(ctx, t[0], x0 + larg - 1, y + i, 1, 1);
  }
  ret(ctx, t[0], x + recuo, y, w - 2 * recuo, 1);
  ret(ctx, t[0], x, y + h - 2, w, 2);
}

/** Frente em bico (empena): faixa de telhado dos dois lados e, se houver `miolo`, a parede no meio. */
function empena(ctx: Ctx, telhado: Tons, miolo: Tons | null, cx: number, y: number, meia: number, h: number, faixa: number) {
  for (let i = 0; i < h; i++) {
    const m = Math.max(1, Math.round((meia * (i + 1)) / h));
    ret(ctx, i % 4 === 3 ? telhado[1] : telhado[2], cx - m, y + i, m * 2, 1);
    ret(ctx, telhado[3], cx - m + 1, y + i, 1, 1);
    ret(ctx, telhado[3], cx + m - 2, y + i, 1, 1);
    ret(ctx, telhado[0], cx - m, y + i, 1, 1);
    ret(ctx, telhado[0], cx + m - 1, y + i, 1, 1);
    const dentro = m - faixa;
    if (miolo && dentro > 0) {
      ret(ctx, miolo[2], cx - dentro, y + i, dentro * 2, 1);
      ret(ctx, telhado[0], cx - dentro - 1, y + i, 1, 1);
      ret(ctx, telhado[0], cx + dentro, y + i, 1, 1);
    }
  }
  ret(ctx, telhado[0], cx - 1, y - 1, 2, 1);
}

/** Linha de 1 px (ou mais grossa) entre dois pontos. */
function linha(ctx: Ctx, cor: string, x0: number, y0: number, x1: number, y1: number, esp = 1) {
  const passos = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= passos; k++) ret(ctx, cor, Math.round(x0 + ((x1 - x0) * k) / passos), Math.round(y0 + ((y1 - y0) * k) / passos), esp, esp);
}

function janela(ctx: Ctx, x: number, y: number, w: number, h: number, moldura = '#f4ecd8', vidro: [string, string] = ['#3f7fd0', '#a6d4ff']) {
  ret(ctx, '#26262e', x, y, w, h);
  ret(ctx, moldura, x + 1, y + 1, w - 2, h - 2);
  ret(ctx, vidro[0], x + 2, y + 2, w - 4, h - 4);
  ret(ctx, vidro[1], x + 2, y + 2, w - 4, 1);
  linha(ctx, vidro[1], x + 3, y + h - 4, x + w - 4, y + 3);
  ret(ctx, moldura, x + (w >> 1), y + 2, 1, h - 4);
  ret(ctx, moldura, x + 2, y + (h >> 1), w - 4, 1);
}
/** Janela com luz quente de dentro. */
const janelaAcesa = (ctx: Ctx, x: number, y: number, w: number, h: number, moldura = '#5a3a1e') => janela(ctx, x, y, w, h, moldura, ['#f2b84a', '#ffe9a0']);

/** Porta de tábuas; `cantos` = cor da parede para arredondar os cantos de cima (porta em arco). */
function porta(ctx: Ctx, t: Tons, x: number, y: number, w: number, h: number, cantos?: string, dupla = false) {
  ret(ctx, t[0], x, y, w, h);
  ret(ctx, t[2], x + 1, y + 1, w - 2, h - 1);
  for (let xx = x + 1; xx < x + w - 1; xx += 4) ret(ctx, t[1], xx + 3, y + 1, 1, h - 1);
  ret(ctx, t[3], x + 1, y + 1, w - 2, 1);
  if (dupla) ret(ctx, t[0], x + (w >> 1), y + 1, 1, h - 1);
  const macaneta = (mx: number) => {
    ret(ctx, DOURADO[0], mx - 1, y + (h >> 1) - 1, 3, 3);
    ret(ctx, DOURADO[3], mx, y + (h >> 1), 1, 1);
  };
  if (dupla) {
    macaneta(x + (w >> 1) - 3);
    macaneta(x + (w >> 1) + 3);
  } else macaneta(x + w - 4);
  if (cantos) {
    for (const [dx, dy, lw] of [[0, 0, 4], [0, 1, 2], [0, 2, 1], [0, 3, 1]] as [number, number, number][]) {
      ret(ctx, cantos, x + dx, y + dy, lw, 1);
      ret(ctx, cantos, x + w - lw, y + dy, lw, 1);
    }
    // contorno do arco
    ret(ctx, t[0], x + 4, y, w - 8, 1);
    for (const [dx, dy] of [[2, 1], [3, 1], [1, 2], [1, 3]]) {
      ret(ctx, t[0], x + dx, y + dy, 1, 1);
      ret(ctx, t[0], x + w - 1 - dx, y + dy, 1, 1);
    }
  }
}

/** Relógio redondo: aro dourado, mostrador creme, marcas das horas e ponteiros. */
function relogio(ctx: Ctx, cx: number, cy: number, r: number, horas = 10, minutos = 10) {
  elipse(ctx, cx, cy, r, r, DOURADO[0]);
  elipse(ctx, cx, cy, r - 1, r - 1, DOURADO[2]);
  elipse(ctx, cx - 1, cy - 1, r - 2, r - 2, DOURADO[3]);
  elipse(ctx, cx, cy, r - 2, r - 2, DOURADO[2]);
  elipse(ctx, cx, cy, r - 3, r - 3, '#3a2a12');
  elipse(ctx, cx, cy, r - 4, r - 4, '#f6eed8');
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const d = r - 6;
    const grande = k % 3 === 0;
    ret(ctx, grande ? '#2a2018' : '#8a7a5a', Math.round(cx + Math.sin(a) * d - (grande ? 1 : 0.5)), Math.round(cy - Math.cos(a) * d - (grande ? 1 : 0.5)), grande ? 2 : 1, grande ? 2 : 1);
  }
  const ponteiro = (fracao: number, comprimento: number, esp: number, cor: string) => {
    const a = fracao * Math.PI * 2;
    linha(ctx, cor, cx - (esp >> 1), cy - (esp >> 1), cx + Math.sin(a) * comprimento - (esp >> 1), cy - Math.cos(a) * comprimento - (esp >> 1), esp);
  };
  ponteiro(minutos / 60, r - 7, 1, '#2a2018');
  ponteiro((horas % 12) / 12 + minutos / 720, (r - 6) * 0.6, 2, '#2a2018');
  ret(ctx, VERMELHO[2], cx - 1, cy - 1, 2, 2);
}

/** Engrenagem de latão com oito dentes. */
function engrenagem(ctx: Ctx, cx: number, cy: number, r: number, giro = 0) {
  for (let k = 0; k < 8; k++) {
    const a = ((k + giro) / 8) * Math.PI * 2;
    ret(ctx, DOURADO[0], Math.round(cx + Math.cos(a) * r - 1.5), Math.round(cy + Math.sin(a) * r - 1.5), 3, 3);
  }
  elipse(ctx, cx, cy, r, r, DOURADO[0]);
  elipse(ctx, cx, cy, r - 1, r - 1, DOURADO[1]);
  elipse(ctx, cx - 1, cy - 1, r - 2, r - 2, DOURADO[2]);
  elipse(ctx, cx, cy, Math.max(1, r >> 1), Math.max(1, r >> 1), DOURADO[0]);
}

/** Estandarte pendurado, com ponta em "V" e um losango dourado no meio. */
function estandarte(ctx: Ctx, t: Tons, x: number, y: number, w: number, h: number) {
  ret(ctx, MADEIRA_ESCURA[0], x - 2, y, w + 4, 2);
  ret(ctx, DOURADO[2], x - 2, y, 1, 2);
  ret(ctx, DOURADO[2], x + w + 1, y, 1, 2);
  for (let i = 0; i < h; i++) {
    // nas últimas linhas, o meio abre em V
    const abre = Math.max(0, i - (h - (w >> 1)));
    const lado = (w >> 1) - abre;
    if (lado <= 0) break;
    // duas metades: o vão do V deixa aparecer a parede de trás
    for (const x0 of abre > 0 ? [x, x + w - lado] : [x]) {
      const larg = abre > 0 ? lado : w;
      ret(ctx, t[2], x0, y + 2 + i, larg, 1);
      if (abre > 0) ret(ctx, t[0], x0 === x ? x0 + larg - 1 : x0, y + 2 + i, 1, 1);
    }
    ret(ctx, t[3], x + 1, y + 2 + i, 1, 1);
    ret(ctx, t[1], x + w - 2, y + 2 + i, 1, 1);
    ret(ctx, t[0], x, y + 2 + i, 1, 1);
    ret(ctx, t[0], x + w - 1, y + 2 + i, 1, 1);
  }
  const [mx, my] = [x + (w >> 1), y + 2 + Math.round(h * 0.38)];
  for (let d = 0; d <= 2; d++) ret(ctx, DOURADO[d === 0 ? 3 : 2], mx - (2 - d), my - d, (2 - d) * 2, d * 2 + 1);
}

/** Escudo vermelho de borda dourada com duas espadas cruzadas atrás. */
function escudo(ctx: Ctx, cx: number, cy: number) {
  for (const s of [-1, 1]) {
    linha(ctx, '#2a2a34', cx - s * 10, cy - 9, cx + s * 9, cy + 8, 3);
    linha(ctx, '#d8dce6', cx - s * 9, cy - 8, cx + s * 8, cy + 7, 1);
    ret(ctx, DOURADO[2], cx + s * 6 - 1, cy + 5, 3, 3);
  }
  for (let i = 0; i < 13; i++) {
    const m = i < 7 ? 6 : Math.max(1, 6 - (i - 6));
    ret(ctx, DOURADO[0], cx - m - 1, cy - 6 + i, m * 2 + 2, 1);
    ret(ctx, DOURADO[2], cx - m, cy - 6 + i, m * 2, 1);
    if (m > 2) ret(ctx, i < 6 ? VERMELHO[3] : VERMELHO[2], cx - m + 2, cy - 6 + i, m * 2 - 4, 1);
  }
  ret(ctx, DOURADO[0], cx - 7, cy - 7, 14, 1);
  ret(ctx, DOURADO[3], cx - 1, cy - 3, 2, 6);
  ret(ctx, DOURADO[3], cx - 3, cy - 1, 6, 2);
}

/** Pegada de Pokémon (símbolo do Safari). */
function pegada(ctx: Ctx, cor: string, cx: number, cy: number) {
  ret(ctx, cor, cx - 2, cy, 5, 3);
  ret(ctx, cor, cx - 1, cy + 3, 3, 1);
  for (const dx of [-3, -1, 1, 3]) ret(ctx, cor, cx + dx - (dx < 0 ? 0 : 0), cy - 3 + (Math.abs(dx) === 3 ? 1 : 0), 2, 2);
}

/** Degrau de pedra na frente da porta. */
const degrau = (ctx: Ctx, x: number, y: number, w: number, t: Tons = PEDRA) => bloco(ctx, t, x, y, w, 5);

/** Lanterna pequena acesa. */
function lanterna(ctx: Ctx, x: number, y: number, luz = '#ffd45c') {
  ret(ctx, '#1e1a16', x, y, 5, 7);
  ret(ctx, luz, x + 1, y + 2, 3, 4);
  ret(ctx, '#fff6c8', x + 2, y + 3, 1, 2);
  ret(ctx, '#1e1a16', x + 1, y - 1, 3, 1);
}

// ---------- GUILDA ----------

/** A: salão medieval de enxaimel, telhado vermelho em bico, estandartes e o escudo da guilda. */
function guildaSalao(): HTMLCanvasElement[] {
  const [c, ctx] = novoCanvas(96, 112);
  tijolos(ctx, PEDRA, 8, 56, 80, 50);
  empena(ctx, VERMELHO, REBOCO, 48, 5, 48, 52, 9);
  // vigas do enxaimel dentro da empena
  ret(ctx, MADEIRA_ESCURA[1], 47, 20, 2, 37);
  ret(ctx, MADEIRA_ESCURA[1], 19, 44, 58, 2);
  linha(ctx, MADEIRA_ESCURA[1], 47, 22, 27, 43, 2);
  linha(ctx, MADEIRA_ESCURA[1], 48, 22, 68, 43, 2);
  // janela redonda
  elipse(ctx, 48, 34, 7, 7, MADEIRA_ESCURA[0]);
  elipse(ctx, 48, 34, 5, 5, '#3f7fd0');
  ret(ctx, '#a6d4ff', 45, 31, 3, 1);
  ret(ctx, MADEIRA_ESCURA[0], 48, 29, 1, 11);
  ret(ctx, MADEIRA_ESCURA[0], 43, 34, 11, 1);
  // viga do beiral e pilares
  bloco(ctx, MADEIRA_ESCURA, 2, 56, 92, 5);
  bloco(ctx, MADEIRA, 8, 60, 6, 46);
  bloco(ctx, MADEIRA, 82, 60, 6, 46);
  // porta dupla em arco, com moldura de pedra clara
  bloco(ctx, PEDRA_CLARA, 34, 72, 28, 34);
  porta(ctx, MADEIRA_ESCURA, 37, 75, 22, 31, PEDRA_CLARA[2], true);
  estandarte(ctx, VERMELHO, 17, 64, 12, 28);
  estandarte(ctx, VERMELHO, 67, 64, 12, 28);
  escudo(ctx, 48, 66);
  lanterna(ctx, 29, 80);
  lanterna(ctx, 62, 80);
  degrau(ctx, 32, 106, 32);
  return [c];
}

/** B: fortaleza de pedra com duas torres, ameias, bandeiras e portão de ferro. */
function guildaFortaleza(): HTMLCanvasElement[] {
  const [c, ctx] = novoCanvas(96, 112);
  const ameias = (x0: number, x1: number, y: number) => {
    for (let x = x0; x + 6 <= x1; x += 9) bloco(ctx, PEDRA, x, y, 6, 8);
  };
  // corpo central
  ameias(26, 72, 30);
  tijolos(ctx, PEDRA, 22, 36, 52, 70);
  // torres
  for (const tx of [1, 71]) {
    ameias(tx, tx + 24, 10);
    tijolos(ctx, PEDRA_ESCURA, tx, 16, 24, 90);
    bloco(ctx, PEDRA, tx - 1 < 0 ? 0 : tx - 1, 16, tx === 1 ? 25 : 25, 4);
    // seteira e janela acesa
    ret(ctx, '#0e0e14', tx + 11, 30, 2, 10);
    ret(ctx, '#0e0e14', tx + 9, 33, 6, 2);
    janelaAcesa(ctx, tx + 7, 58, 10, 12, PEDRA[0]);
    // bandeira
    ret(ctx, MADEIRA_ESCURA[0], tx + 11, 0, 2, 11);
    for (let i = 0; i < 6; i++) ret(ctx, i % 2 ? VERMELHO[2] : VERMELHO[3], tx + 13, 1 + i, 9 - i, 1);
    ret(ctx, DOURADO[2], tx + 11, 0, 2, 1);
  }
  // portão: arco de pedra clara, madeira escura com faixas de ferro
  bloco(ctx, PEDRA_CLARA, 33, 66, 30, 40);
  porta(ctx, MADEIRA_ESCURA, 36, 69, 24, 37, PEDRA_CLARA[2], true);
  for (const y of [80, 94]) {
    ret(ctx, '#1c1c24', 37, y, 22, 2);
    for (let x = 39; x < 58; x += 5) ret(ctx, '#8a8e9a', x, y, 1, 1);
  }
  estandarte(ctx, VERMELHO, 25, 46, 8, 24);
  estandarte(ctx, VERMELHO, 63, 46, 8, 24);
  escudo(ctx, 48, 54);
  degrau(ctx, 30, 106, 36);
  return [c];
}

/** C: taverna de aventureiros, de madeira, com placa de espada, quadro de pedidos e barril. */
function guildaTaverna(): HTMLCanvasElement[] {
  const [c, ctx] = novoCanvas(96, 104);
  // chaminé de tijolos atrás do telhado
  tijolos(ctx, VERMELHO, 66, 0, 13, 22, 6, 4);
  bloco(ctx, PEDRA, 64, 0, 17, 4);
  telhadoFrente(ctx, TELHA, 0, 10, 96, 40, 12);
  tabuas(ctx, MADEIRA, 6, 50, 84, 48, 6, true);
  bloco(ctx, MADEIRA_ESCURA, 6, 50, 6, 48);
  bloco(ctx, MADEIRA_ESCURA, 84, 50, 6, 48);
  porta(ctx, MADEIRA_ESCURA, 22, 66, 18, 32);
  lanterna(ctx, 28, 56);
  janelaAcesa(ctx, 46, 62, 28, 20);
  // floreira debaixo da janela
  bloco(ctx, MADEIRA_ESCURA, 45, 82, 30, 5);
  for (let x = 47; x < 73; x += 4) ret(ctx, x % 8 ? '#e0484a' : '#f2c440', x, 81, 2, 2);
  // quadro de pedidos (pergaminhos pregados)
  bloco(ctx, MADEIRA_ESCURA, 9, 66, 11, 16);
  for (const [dx, dy] of [[2, 2], [6, 3], [2, 8], [6, 9]]) ret(ctx, '#f4ecd0', 9 + dx, 66 + dy, 3, 4);
  // placa pendurada com a espada
  ret(ctx, '#1e1a16', 78, 54, 14, 2);
  ret(ctx, '#1e1a16', 81, 56, 1, 3);
  ret(ctx, '#1e1a16', 88, 56, 1, 3);
  bloco(ctx, MADEIRA, 78, 59, 14, 13);
  linha(ctx, '#e6eaf2', 81, 69, 88, 62, 1);
  ret(ctx, DOURADO[2], 80, 67, 3, 1);
  ret(ctx, DOURADO[2], 81, 66, 1, 3);
  // barril
  bloco(ctx, MADEIRA, 76, 84, 12, 14);
  ret(ctx, '#2a2a34', 76, 87, 12, 1);
  ret(ctx, '#2a2a34', 76, 94, 12, 1);
  degrau(ctx, 19, 98, 24, MADEIRA);
  return [c];
}

// ---------- VIAJANTE DO TEMPO ----------

/** A: torre do relógio, alta e estreita, com o pêndulo balançando na janela. */
function viajanteTorre(): HTMLCanvasElement[] {
  return [-3, 3].map((balanco) => {
    const [c, ctx] = novoCanvas(64, 144);
    // corpo da torre
    tijolos(ctx, PEDRA, 12, 62, 40, 76);
    // caixa do relógio, mais larga, com cornijas
    tijolos(ctx, PEDRA_CLARA, 6, 24, 52, 40, 9, 5);
    bloco(ctx, AZUL, 3, 21, 58, 5);
    bloco(ctx, DOURADO, 3, 62, 58, 4);
    // telhado em ponta com a esfera dourada
    empena(ctx, AZUL, null, 32, 3, 26, 19, 0);
    elipse(ctx, 32, 2, 2, 2, DOURADO[0]);
    ret(ctx, DOURADO[3], 31, 1, 2, 2);
    relogio(ctx, 32, 44, 17);
    // janela do pêndulo
    ret(ctx, '#16161e', 26, 70, 12, 30);
    ret(ctx, '#2a2438', 27, 71, 10, 28);
    linha(ctx, DOURADO[1], 32, 71, 32 + balanco, 92, 1);
    elipse(ctx, 32 + balanco, 93, 3, 3, DOURADO[0]);
    elipse(ctx, 32 + balanco, 93, 2, 2, DOURADO[2]);
    ret(ctx, PEDRA_CLARA[2], 25, 69, 14, 2);
    engrenagem(ctx, 18, 78, 4, balanco > 0 ? 0.5 : 0);
    engrenagem(ctx, 46, 90, 3, balanco > 0 ? 0 : 0.5);
    bloco(ctx, PEDRA_CLARA, 20, 106, 24, 32);
    porta(ctx, MADEIRA_ESCURA, 23, 109, 18, 29, PEDRA_CLARA[2]);
    degrau(ctx, 16, 138, 32);
    return c;
  });
}

/** B: casa com um relógio gigante tomando a frente do telhado, e engrenagens de latão. */
function viajanteCasaRelogio(): HTMLCanvasElement[] {
  return [0, 0.5].map((giro) => {
    const [c, ctx] = novoCanvas(96, 116);
    tijolos(ctx, PEDRA_CLARA, 10, 60, 76, 50, 9, 5);
    empena(ctx, ROXO, REBOCO, 48, 6, 48, 56, 9);
    bloco(ctx, MADEIRA_ESCURA, 2, 60, 92, 5);
    // o relógio é maior que a empena: passa por cima do telhado
    relogio(ctx, 48, 33, 22, 10, 10);
    engrenagem(ctx, 15, 70, 6, giro);
    engrenagem(ctx, 24, 76, 4, 0.5 - giro);
    engrenagem(ctx, 82, 100, 5, giro);
    janela(ctx, 62, 74, 16, 16);
    porta(ctx, MADEIRA_ESCURA, 37, 78, 20, 32, PEDRA_CLARA[2]);
    // ampulheta em cima da porta
    ret(ctx, DOURADO[0], 43, 66, 9, 10);
    ret(ctx, '#f6eed8', 44, 67, 7, 8);
    for (let i = 0; i < 4; i++) {
      ret(ctx, i < 2 ? '#f6eed8' : DOURADO[2], 44 + i, 67 + i, 7 - i * 2, 1);
      ret(ctx, DOURADO[2], 44 + i, 74 - i, 7 - i * 2, 1);
    }
    ret(ctx, DOURADO[0], 43, 66, 9, 1);
    ret(ctx, DOURADO[0], 43, 75, 9, 1);
    lanterna(ctx, 29, 84, CIANO);
    degrau(ctx, 33, 110, 28, PEDRA_CLARA);
    return c;
  });
}

/** C: metade passado (pedra com musgo), metade futuro (metal e luzes), relógio no meio e portal aceso. */
function viajantePortal(): HTMLCanvasElement[] {
  return [0, 1].map((f) => {
    const [c, ctx] = novoCanvas(96, 124);
    // lado do passado
    recortar(ctx, 0, 0, 48, 124, () => {
      telhadoFrente(ctx, TELHA, 0, 44, 96, 22, 8);
      tijolos(ctx, PEDRA, 4, 64, 60, 54, 11, 6);
    });
    for (const [x, y] of [[6, 70], [14, 66], [9, 96], [30, 112], [22, 67], [6, 110], [38, 66]]) {
      ret(ctx, VERDE[2], x, y, 4, 2);
      ret(ctx, VERDE[3], x + 1, y, 2, 1);
    }
    linha(ctx, VERDE[1], 7, 72, 9, 94, 1);
    janela(ctx, 13, 80, 13, 13, MADEIRA[2]);
    // lado do futuro
    recortar(ctx, 48, 0, 48, 124, () => {
      bloco(ctx, METAL, 30, 50, 64, 16);
      bloco(ctx, METAL, 32, 64, 60, 54);
    });
    for (const y of [78, 92, 106]) ret(ctx, METAL[1], 49, y, 42, 1);
    ret(ctx, METAL[1], 70, 66, 1, 51);
    ret(ctx, CIANO, 54, 70, 34, 2);
    ret(ctx, '#d8fbff', 54, 70, 34, 1);
    elipse(ctx, 76, 88, 6, 6, METAL[0]);
    elipse(ctx, 76, 88, 4, 4, f ? '#d8fbff' : CIANO);
    ret(ctx, METAL[0], 84, 36, 2, 15);
    ret(ctx, f ? '#ff6a6a' : '#8a2a2a', 83, 33, 4, 4);
    // coluna do relógio no meio
    tijolos(ctx, PEDRA_CLARA, 35, 36, 26, 30, 8, 5);
    bloco(ctx, DOURADO, 32, 62, 32, 4);
    relogio(ctx, 48, 24, 19, 10, 10);
    // portal
    bloco(ctx, DOURADO, 34, 74, 28, 44);
    ret(ctx, '#12081e', 37, 77, 22, 41);
    elipse(ctx, 48, 97, 9, 17, ROXO[1]);
    elipse(ctx, 48, 97, 7, 14, f ? ROXO[3] : ROXO[2]);
    elipse(ctx, 48, 97, 5, 10, f ? CIANO : '#3ac8e8');
    elipse(ctx, 48, 97, 2, 5, '#f4ffff');
    for (const [x, y] of f ? [[41, 84], [55, 104], [44, 112]] : [[54, 84], [42, 102], [53, 113]]) ret(ctx, '#f4ffff', x, y, 1, 1);
    degrau(ctx, 30, 118, 36, PEDRA_CLARA);
    return c;
  });
}

// ---------- SAFARI ----------

/** A: celeiro vermelho de rancho, com portão em X, janela do feno e fardo ao lado. */
function safariCeleiro(): HTMLCanvasElement[] {
  const [c, ctx] = novoCanvas(96, 104);
  const BRANCO: Tons = ['#5e6474', '#cdd2dc', '#f6f6f2', '#ffffff'];
  const TELHADO: Tons = ['#22242c', '#484c58', '#646876', '#868a98'];
  // telhado de duas águas quebradas (celeiro) com a frente vermelha
  for (let i = 0; i < 42; i++) {
    const m = i < 14 ? 16 + Math.round(i * 1.6) : 38 + Math.round((i - 14) * 0.3);
    ret(ctx, i % 4 === 3 ? TELHADO[1] : TELHADO[2], 48 - m, 4 + i, m * 2, 1);
    ret(ctx, TELHADO[0], 48 - m, 4 + i, 1, 1);
    ret(ctx, TELHADO[0], 48 + m - 1, 4 + i, 1, 1);
    const d = m - 6;
    ret(ctx, VERMELHO[2], 48 - d, 4 + i, d * 2, 1);
    ret(ctx, BRANCO[2], 48 - d, 4 + i, 1, 1);
    ret(ctx, BRANCO[2], 48 + d - 1, 4 + i, 1, 1);
  }
  ret(ctx, TELHADO[0], 32, 3, 32, 1);
  for (let x = 14; x < 82; x += 6) ret(ctx, VERMELHO[1], x, 20, 1, 26);
  tabuas(ctx, VERMELHO, 6, 46, 84, 52, 6);
  ret(ctx, BRANCO[2], 6, 46, 84, 2);
  ret(ctx, BRANCO[2], 6, 46, 2, 52);
  ret(ctx, BRANCO[2], 88, 46, 2, 52);
  // janela do feno
  bloco(ctx, BRANCO, 40, 14, 16, 14);
  ret(ctx, '#2a1810', 42, 16, 12, 10);
  ret(ctx, '#e8c860', 42, 22, 12, 4);
  ret(ctx, '#f8e08a', 44, 21, 3, 1);
  ret(ctx, '#f8e08a', 50, 22, 2, 1);
  // placa com a pegada
  bloco(ctx, MADEIRA, 38, 34, 20, 12);
  pegada(ctx, MADEIRA_ESCURA[0], 48, 39);
  // portão duplo com X
  bloco(ctx, BRANCO, 28, 58, 40, 40);
  for (const x0 of [30, 49]) {
    ret(ctx, VERMELHO[1], x0, 60, 17, 38);
    linha(ctx, BRANCO[2], x0, 60, x0 + 15, 96, 2);
    linha(ctx, BRANCO[2], x0 + 15, 60, x0, 96, 2);
    ret(ctx, BRANCO[2], x0, 77, 17, 2);
  }
  // fardo de feno
  bloco(ctx, ['#6a4a10', '#c09a30', '#e8c860', '#f8e08a'], 74, 84, 16, 14);
  ret(ctx, '#8a5a34', 74, 90, 16, 1);
  return [c];
}

/** B: cabana do guarda-parque, de toras, telhado verde, placa com a pegada e mato alto nos cantos. */
function safariCabana(): HTMLCanvasElement[] {
  const [c, ctx] = novoCanvas(96, 100);
  telhadoFrente(ctx, VERDE, 0, 6, 96, 40, 13);
  tabuas(ctx, MADEIRA, 8, 46, 80, 48, 6, true);
  // pontas das toras nos cantos
  for (let y = 48; y < 92; y += 6)
    for (const x of [8, 83]) {
      bloco(ctx, MADEIRA_ESCURA, x, y, 5, 5);
      ret(ctx, MADEIRA[3], x + 2, y + 2, 1, 1);
    }
  // varanda: telhadinho e postes
  bloco(ctx, VERDE, 26, 56, 44, 6);
  bloco(ctx, MADEIRA_ESCURA, 28, 62, 4, 32);
  bloco(ctx, MADEIRA_ESCURA, 64, 62, 4, 32);
  porta(ctx, MADEIRA_ESCURA, 40, 66, 16, 28);
  janela(ctx, 14, 64, 12, 14, VERDE[2]);
  janela(ctx, 70, 64, 12, 14, VERDE[2]);
  bloco(ctx, REBOCO, 36, 44, 24, 12);
  pegada(ctx, VERDE[0], 48, 49);
  lanterna(ctx, 33, 68);
  // mato alto
  for (const x0 of [0, 4, 84, 88]) for (let k = 0; k < 3; k++) linha(ctx, k % 2 ? VERDE[3] : VERDE[2], x0 + k * 3, 99, x0 + k * 3 + (k - 1), 90 - k * 2, 2);
  degrau(ctx, 36, 94, 24, MADEIRA);
  return [c];
}

/** C: creche de Pokémon, clarinha, com um ovo na empena, Pokébola na porta e floreiras. */
function safariCreche(): HTMLCanvasElement[] {
  const [c, ctx] = novoCanvas(96, 104);
  bloco(ctx, REBOCO, 8, 54, 80, 44);
  ret(ctx, ROSA[3], 9, 88, 78, 9);
  ret(ctx, ROSA[1], 9, 88, 78, 1);
  empena(ctx, VERDE_AGUA, REBOCO, 48, 4, 48, 52, 9);
  bloco(ctx, ['#5e6474', '#cdd2dc', '#f6f6f2', '#ffffff'], 2, 54, 92, 5);
  // ovo pintado na empena
  elipse(ctx, 48, 35, 9, 11, '#4a4436');
  elipse(ctx, 48, 35, 8, 10, '#fbf4e2');
  for (const [x, y, cor] of [[44, 31, VERDE_AGUA[2]], [51, 36, ROSA[2]], [45, 40, '#f2c440'], [51, 29, '#4a86e0']] as [number, number, string][]) ret(ctx, cor, x, y, 3, 3);
  ret(ctx, '#ffffff', 44, 27, 2, 3);
  porta(ctx, ROSA, 39, 68, 18, 30, REBOCO[2]);
  pokebola(ctx, 48, 62, 5, '#e0484a', '#2a2a34');
  for (const x of [15, 67]) {
    janela(ctx, x, 66, 14, 14, '#ffffff');
    bloco(ctx, MADEIRA, x - 1, 80, 16, 5);
    for (let k = 0; k < 4; k++) ret(ctx, ['#e0484a', '#f2c440', '#de72a0', '#f2c440'][k], x + 1 + k * 4, 79, 2, 2);
  }
  // bola de brinquedo
  elipse(ctx, 82, 99, 4, 4, '#2a2a34');
  elipse(ctx, 82, 99, 3, 3, '#4a86e0');
  ret(ctx, '#f2c440', 80, 98, 5, 2);
  degrau(ctx, 35, 98, 26, PEDRA_CLARA);
  return [c];
}

// ---------- MERCADO NEGRO ----------

/** Entrada de esgoto: arco de pedra escura com escada descendo, grade aberta, cano pingando e luz roxa. */
function mercadoEsgoto(): HTMLCanvasElement[] {
  return [0, 1].map((f) => {
    const [c, ctx] = novoCanvas(64, 64);
    bloco(ctx, PEDRA_ESCURA, 1, 8, 62, 7);
    tijolos(ctx, PEDRA_ESCURA, 3, 14, 58, 44, 10, 5);
    // arco de pedras mais claras
    elipse(ctx, 32, 34, 17, 16, PEDRA_ESCURA[0]);
    elipse(ctx, 32, 34, 16, 15, PEDRA[1]);
    ret(ctx, PEDRA_ESCURA[0], 15, 34, 34, 24);
    ret(ctx, PEDRA[1], 16, 34, 32, 24);
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + (k / 6) * Math.PI;
      linha(ctx, PEDRA_ESCURA[0], 32 + Math.cos(a) * 12, 34 + Math.sin(a) * 11, 32 + Math.cos(a) * 16, 34 + Math.sin(a) * 15, 1);
    }
    // boca escura
    elipse(ctx, 32, 35, 12, 11, '#07070c');
    ret(ctx, '#07070c', 20, 35, 24, 23);
    // degraus descendo para o escuro
    ['#4a4e5c', '#363a46', '#262832', '#16171e'].forEach((cor, i) => {
      ret(ctx, cor, 20 + i * 2, 54 - i * 5, 24 - i * 4, 2);
      ret(ctx, '#0c0c12', 20 + i * 2, 56 - i * 5, 24 - i * 4, 2);
    });
    // brilho roxo lá no fundo e lanterna em cima do arco
    elipse(ctx, 32, 34, 3 + f, 2, f ? ROXO[3] : ROXO[2]);
    ret(ctx, '#e8d8ff', 31, 34, 2, 1);
    lanterna(ctx, 30, 13, f ? '#c89cff' : '#a070e8');
    // grade de ferro aberta, encostada na parede
    for (let x = 47; x <= 57; x += 3) ret(ctx, '#0e0e14', x, 26, 2, 32);
    ret(ctx, '#0e0e14', 46, 28, 13, 2);
    ret(ctx, '#0e0e14', 46, 50, 13, 2);
    for (let x = 47; x <= 57; x += 3) ret(ctx, '#7a5a3a', x, 30 + ((x * 7) % 13), 1, 2);
    // cano pingando
    elipse(ctx, 9, 36, 4, 4, '#0e0e14');
    elipse(ctx, 9, 36, 3, 3, '#3a3e4a');
    elipse(ctx, 9, 36, 2, 2, '#07070c');
    ret(ctx, '#58c048', 9, 38, 1, 14);
    ret(ctx, '#9af07a', 9, 42 + f * 6, 1, 2);
    elipse(ctx, 9, 59, 5, 2, '#2a7a2a');
    elipse(ctx, 9, 59, 3, 1, '#58c048');
    return c;
  });
}

// ---------- BANCO ----------

/** Recorte do Banco no core_buildings. */
export const RECORTE_BANCO = { x: 112, y: 0, w: 112, h: 80 };

/**
 * Banco simétrico (pedido do dono): o prédio do tileset tem janelas diferentes de cada lado e o letreiro fora do
 * centro. Aqui o lado direito repete as janelas do esquerdo, espelhadas em volta da porta, e o letreiro vai para o meio.
 */
export function desenharBanco(predios: CanvasImageSource): HTMLCanvasElement {
  const { x, y, w, h } = RECORTE_BANCO;
  const [orig, o] = novoCanvas(w, h);
  o.drawImage(predios, x, y, w, h, 0, 0, w, h);
  const [c, ctx] = novoCanvas(w, h);
  ctx.drawImage(orig, 0, 0);
  // lado direito liso: repete uma coluna de parede (a 14 fica entre duas janelas), menos a borda do prédio
  for (let cx = 66; cx <= 108; cx++) ctx.drawImage(orig, 14, 20, 1, 59, cx, 20, 1, 59);
  // letreiro: 2 px para a esquerda (fica no meio da porta)
  ctx.clearRect(35, 0, 46, 20);
  for (let cx = 35; cx <= 80; cx++) ctx.drawImage(orig, 14, 20, 1, 27, cx, 20, 1, 27);
  ctx.drawImage(orig, 35, 0, 46, 47, 33, 0, 46, 47);
  // janelas da direita = as da esquerda, à mesma distância da porta
  const copiar = (de: number, para: number, y0: number, alt: number) => ctx.drawImage(orig, de, y0, 11, alt, para, y0, 11, alt);
  for (const [de, para] of [[2, 99], [18, 83]]) {
    copiar(de, para, 22, 24);
    copiar(de, para, 59, 17);
  }
  copiar(34, 67, 59, 17);
  return c;
}

// ---------- as escolhidas pelo dono (peças do mapa) ----------

/** Tamanho, desenho e porta (x e largura em pixels) de cada casa temática que está na cidade. */
export const CASAS_DOS_NPCS = {
  guildaSalao: { w: 96, h: 112, desenhar: guildaSalao, porta: { x: 37, w: 22 } },
  viajantePortal: { w: 96, h: 124, desenhar: viajantePortal, porta: { x: 37, w: 22 } },
  safariCreche: { w: 96, h: 104, desenhar: safariCreche, porta: { x: 39, w: 18 } },
  mercadoEsgoto: { w: 64, h: 64, desenhar: mercadoEsgoto, porta: { x: 20, w: 24 }, solidas: 3 },
};

// ---------- lista para a prévia ----------

export interface OpcaoCasa {
  id: string;
  grupo: 'guilda' | 'viajante' | 'safari' | 'mercado';
  letra: string;
  nome: string;
  descricao: string;
  desenhar: () => HTMLCanvasElement[];
}

export const OPCOES_CASAS: OpcaoCasa[] = [
  { id: 'guildaSalao', grupo: 'guilda', letra: 'A', nome: 'Salão da guilda', descricao: 'Casarão medieval de enxaimel, telhado vermelho em bico, estandartes e o escudo com espadas.', desenhar: guildaSalao },
  { id: 'guildaFortaleza', grupo: 'guilda', letra: 'B', nome: 'Fortaleza', descricao: 'Castelinho de pedra com duas torres, ameias, bandeiras e portão reforçado.', desenhar: guildaFortaleza },
  { id: 'guildaTaverna', grupo: 'guilda', letra: 'C', nome: 'Taverna dos aventureiros', descricao: 'Casa de madeira com placa de espada, quadro de pedidos, barril e janela acesa.', desenhar: guildaTaverna },
  { id: 'viajanteTorre', grupo: 'viajante', letra: 'A', nome: 'Torre do relógio', descricao: 'Torre alta e estreita, relógio enorme em cima e o pêndulo balançando na janela.', desenhar: viajanteTorre },
  { id: 'viajanteCasaRelogio', grupo: 'viajante', letra: 'B', nome: 'Casa do relógio', descricao: 'Casa de telhado roxo com um relógio gigante tomando a frente do telhado e engrenagens girando.', desenhar: viajanteCasaRelogio },
  { id: 'viajantePortal', grupo: 'viajante', letra: 'C', nome: 'Passado e futuro', descricao: 'Metade pedra antiga com musgo, metade metal com luzes; relógio no meio e um portal aceso no lugar da porta.', desenhar: viajantePortal },
  { id: 'safariCeleiro', grupo: 'safari', letra: 'A', nome: 'Celeiro do rancho', descricao: 'Celeiro vermelho com portão em X e fardo de feno. Cerca de madeira.', desenhar: safariCeleiro },
  { id: 'safariCabana', grupo: 'safari', letra: 'B', nome: 'Cabana do guarda-parque', descricao: 'Cabana de toras com telhado verde, varanda e placa da pegada. Cerca de madeira.', desenhar: safariCabana },
  { id: 'safariCreche', grupo: 'safari', letra: 'C', nome: 'Creche Pokémon', descricao: 'Casinha clara com um ovo pintado, Pokébola na porta e floreiras. Cerca branca.', desenhar: safariCreche },
  { id: 'mercadoEsgoto', grupo: 'mercado', letra: '', nome: 'Entrada do esgoto', descricao: 'Arco de pedra escura com escada descendo, grade aberta, cano pingando e uma luz roxa lá no fundo.', desenhar: mercadoEsgoto },
];
