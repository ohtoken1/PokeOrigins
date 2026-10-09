// Minimapa da cidade (canto de cima à direita do jogo): o chão e as árvores reduzidos, os prédios pintados,
// um botão redondo em cada lugar com função (clicar = mesmo que clicar no nome no mapa), o retângulo do que a
// câmera mostra e o jogador piscando.
import type { BiomaScene } from '../jogo/BiomaScene';
import { PECAS } from '../jogo/cidade';
import { TAM } from '../jogo/mapa';
import { el } from './dom';

const LARGURA = 200;
/** Cor e letra do marcador de cada lugar. */
const MARCADORES: Record<string, { cor: string; letra: string }> = {
  centro: { cor: '#e2484a', letra: '+' },
  loja: { cor: '#3a78d8', letra: '$' },
  reminder: { cor: '#9a5ad8', letra: 'R' },
  tutor: { cor: '#2aa8a0', letra: 'T' },
  estacao: { cor: '#6a6f7c', letra: 'E' },
  arena: { cor: '#d8902a', letra: 'A' },
  banco: { cor: '#c8a640', letra: 'B' },
  mural: { cor: '#8a6a4a', letra: 'M' },
  torneios: { cor: '#8a6a4a', letra: 'Q' },
};

export function montarMinimapa(area: HTMLElement, cena: () => BiomaScene | null, aoClicar: (acao: string) => void): { parar(): void } {
  const fundo = el('canvas', { class: 'minimapa-fundo' }) as HTMLCanvasElement;
  const frente = el('canvas', { class: 'minimapa-frente' }) as HTMLCanvasElement;
  const marcadores = el('div', { class: 'minimapa-marcadores' });
  const caixa = el('div', { class: 'minimapa', title: '' }, el('div', { class: 'minimapa-mapa' }, fundo, frente, marcadores));
  let escala = 0;
  let montado = false;

  const montar = (): boolean => {
    const info = cena()?.infoMinimapa();
    if (!info) return false;
    const { mapa, chao } = info;
    escala = LARGURA / (mapa.largura * TAM);
    const altura = Math.round(mapa.altura * TAM * escala);
    for (const c of [fundo, frente]) [c.width, c.height] = [LARGURA, altura];
    const ctx = fundo.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(chao, 0, 0, LARGURA, altura);
    // prédios (peças grandes) como blocos coloridos
    for (const o of mapa.objetos ?? []) {
      const p = PECAS[o.peca];
      if (!p || p.h < 48 || p.alto) continue;
      const acao = o.acao ?? p.acao;
      const [x, y, w, h] = [o.x * TAM * escala, (o.base * TAM - p.h * 0.75) * escala, p.w * escala, p.h * 0.75 * escala];
      ctx.fillStyle = '#1a2030';
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
      ctx.fillStyle = acao ? MARCADORES[acao]?.cor ?? '#b08a6a' : '#b08a6a';
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    // botões dos lugares com função
    const lugares: { acao: string; nome: string; x: number; y: number }[] = [];
    for (const o of mapa.objetos ?? []) {
      const p = PECAS[o.peca];
      const acao = o.acao ?? p?.acao;
      if (p && acao) lugares.push({ acao, nome: o.rotulo ?? p.rotulo ?? acao, x: o.x * TAM + p.w / 2, y: o.base * TAM - p.h / 2 });
    }
    for (const n of mapa.npcs ?? []) if (n.acao) lugares.push({ acao: n.acao, nome: n.nome, x: n.x * TAM + 8, y: n.y * TAM });
    marcadores.replaceChildren(
      ...lugares.map((l) => {
        const m = MARCADORES[l.acao] ?? { cor: '#888', letra: '?' };
        return el('button', {
          class: 'minimapa-marcador', title: l.nome, 'aria-label': l.nome,
          style: `left:${Math.round(l.x * escala)}px;top:${Math.round(l.y * escala)}px;background:${m.cor}`,
          onclick: () => aoClicar(l.acao),
        }, m.letra);
      }),
    );
    return true;
  };

  // jogador e retângulo da câmera, redesenhados algumas vezes por segundo
  let pisca = 0;
  const atualizar = () => {
    const c = cena();
    if (!c) return;
    if (!montado) montado = montar();
    if (!montado) return;
    const info = c.infoMinimapa();
    if (!info) return;
    const ctx = frente.getContext('2d')!;
    ctx.clearRect(0, 0, frente.width, frente.height);
    const vista = c.cameras.main.worldView;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(vista.x * escala) + 0.5, Math.round(vista.y * escala) + 0.5, Math.round(vista.width * escala), Math.round(vista.height * escala));
    const [px, py] = [(info.jogador.x + 0.5) * TAM * escala, (info.jogador.y + 0.5) * TAM * escala];
    pisca = (pisca + 1) % 4;
    ctx.fillStyle = '#16243a';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pisca < 2 ? '#ffe680' : '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 2.6, 0, Math.PI * 2);
    ctx.fill();
  };
  area.append(caixa);
  const relogio = window.setInterval(atualizar, 150);
  return {
    parar: () => {
      clearInterval(relogio);
      caixa.remove();
    },
  };
}
