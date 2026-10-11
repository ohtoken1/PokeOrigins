// Máquina de cura do Centro Pokémon (modelo aprovado pelo dono): uma tela por cima do jogo com a máquina e o botão
// "Curar meus Pokémon". As Pokébolas do time entram em ordem, a máquina trabalha e SÓ NO FIM o time é curado.
// Jogador comum espera TEMPO_CURA_MS; VIP, TEMPO_CURA_VIP_MS. Sair no meio cancela (não cura).
import { TEMPO_CURA_MS, TEMPO_CURA_VIP_MS, vipAtivo } from '../../../shared/vip';
import { curarTime, type Save } from '../estado';
import { volumeDosEfeitos } from '../sons';
import { el } from './dom';

/** Se o dono colocar este arquivo, ele toca no fim da cura no lugar do toque do jogo. */
const SOM_DO_DONO = 'musicas/cura.mp3';

// toque de cura próprio (composto para o jogo): batidinha a cada bola, pulso enquanto cura e um acorde subindo no fim
let ctx: AudioContext | null = null;
function nota(freq: number, quando: number, dura: number, forca = 0.12, tipo: OscillatorType = 'triangle') {
  const volume = volumeDosEfeitos();
  if (volume <= 0) return;
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + quando;
    o.type = tipo;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(forca * volume * 2, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dura);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dura + 0.05);
  } catch {
    // sem áudio no navegador: a animação segue em silêncio
  }
}
const somDaBola = (i: number) => nota(392 + i * 44, 0, 0.16, 0.1, 'square');
const somDoPulso = () => {
  nota(587, 0, 0.22, 0.07, 'sine');
  nota(880, 0.11, 0.22, 0.06, 'sine');
};
const acordeFinal = () => ([[587, 0], [740, 0.1], [880, 0.2], [1175, 0.32], [880, 0.5], [1175, 0.5], [1480, 0.5]] as const).forEach(([f, t]) => nota(f, t, t >= 0.5 ? 0.9 : 0.22, 0.1));
function somFinal() {
  const volume = volumeDosEfeitos();
  if (volume <= 0) return;
  const audio = new Audio(SOM_DO_DONO);
  audio.volume = Math.min(1, volume);
  audio.play().catch(acordeFinal);
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

let aberta = false;

/** Abre a tela da máquina de cura. `aoCurar` roda quando o time acabou de ser curado. */
export function abrirCura(save: Save, aoCurar: () => void): void {
  if (aberta) return;
  aberta = true;
  const duracao = vipAtivo(save) ? TEMPO_CURA_VIP_MS : TEMPO_CURA_MS;
  let fechada = false, curando = false;

  const bolas = Array.from({ length: 6 }, () => el('div', { class: 'cura-bola' }));
  const barra = el('i', {});
  const visor = el('div', { class: 'cura-visor' });
  visor.innerHTML = '<svg viewBox="0 0 300 64" preserveAspectRatio="none"><path d="M0 34 H70 l10 -6 l8 6 h14 l8 -24 l10 44 l8 -20 h22 l10 -6 l8 6 H300"/></svg>';
  visor.append(el('div', { class: 'cura-barra' }, barra));
  const maquina = el(
    'div',
    { class: 'cura-maquina' },
    visor,
    el('div', { class: 'cura-luzes' }, ...Array.from({ length: 8 }, () => el('span', {}))),
    el('div', { class: 'cura-bandeja' }, ...bolas.map((b) => el('div', { class: 'cura-encaixe' }, b))),
    el('div', { class: 'cura-clarao' }),
  );
  const frase = el('p', { class: 'cura-frase' }, 'Deixe seus Pokémon descansarem um pouco.');
  const botao = el('button', { class: 'cura-botao', onclick: () => void curar() }, 'Curar meus Pokémon') as HTMLButtonElement;

  const fechar = () => {
    if (fechada) return;
    fechada = true;
    aberta = false;
    window.removeEventListener('keydown', aoTeclar, true);
    fundo.remove();
  };
  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    fechar();
  };
  const fundo = el(
    'div',
    {
      class: 'cura-fundo',
      onclick: (e: MouseEvent) => {
        if (e.target === fundo && !curando) fechar();
      },
    },
    el('div', { class: 'cura-tela', role: 'dialog', 'aria-label': 'Centro Pokémon' }, el('h2', { class: 'cura-titulo' }, 'Centro Pokémon'), maquina, frase, botao, el('button', { class: 'cura-sair', onclick: fechar }, 'Sair')),
  );

  async function curar() {
    if (curando) return;
    curando = true;
    botao.disabled = true;
    botao.textContent = 'Curando…';
    frase.textContent = 'Colocando as Pokébolas na máquina…';
    const doTime = bolas.slice(0, Math.max(1, Math.min(6, save.time.length)));
    // as bolas entram em ordem (um terço do tempo); no resto a máquina trabalha
    const entrada = duracao * 0.34, passo = entrada / doTime.length, inicio = performance.now();
    const andar = () => {
      const parte = Math.min(1, (performance.now() - inicio) / duracao);
      barra.style.width = `${parte * 100}%`;
      if (parte < 1 && !fechada) requestAnimationFrame(andar);
    };
    requestAnimationFrame(andar);
    for (let i = 0; i < doTime.length; i++) {
      if (fechada) return;
      doTime[i].classList.add('posta');
      somDaBola(i);
      await esperar(passo);
    }
    maquina.classList.add('curando');
    frase.textContent = 'Curando…';
    const resto = duracao - entrada, pulsos = Math.max(1, Math.round(resto / 700));
    for (let i = 0; i < pulsos; i++) {
      if (fechada) return;
      somDoPulso();
      await esperar(resto / pulsos);
    }
    if (fechada) return;
    curarTime(save);
    aoCurar();
    maquina.classList.replace('curando', 'pronta');
    somFinal();
    frase.textContent = 'Seus Pokémon estão curados!';
    botao.textContent = 'Curados ✓';
    await esperar(1600);
    fechar();
  }

  window.addEventListener('keydown', aoTeclar, true);
  document.body.append(fundo);
  botao.focus();
}
