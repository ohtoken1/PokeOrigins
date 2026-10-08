// Sons do jogo. Gritos OFICIAIS dos Pokémon vêm do repositório de sons da PokéAPI (carregados pela internet, como
// os sprites). Música: fora da batalha, a do Centro Pokémon (arquivo colocado pelo dono em
// client/public/musicas/centro-pokemon.mp3; sem o arquivo, fica sem música); na batalha (selvagem ou treinador),
// um dos temas de batalha oficiais hospedados pelo Pokémon Showdown. Golpes sem som (pedido do dono).
// Volume e mudo ficam no navegador (barra do topo e aba Opções).

const CHAVE = 'jogo-claude:sons';
const URL_GRITOS = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/';

export interface AjustesSom {
  /** Volume geral (controle da barra do topo), 0 a 1: multiplica a música e os gritos. */
  geral: number;
  /** Gritos dos Pokémon, 0 a 1. */
  volume: number;
  /** Música, 0 a 1. */
  volumeMusica: number;
  mudo: boolean;
}

let ajustes: AjustesSom = { geral: 0.5, volume: 0.6, volumeMusica: 0.35, mudo: false };
try {
  ajustes = { ...ajustes, ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') };
} catch {
  /* sem armazenamento: usa o padrão */
}

export const ajustesSom = (): AjustesSom => ({ ...ajustes });
export function mudarAjustesSom(novos: Partial<AjustesSom>): void {
  ajustes = { ...ajustes, ...novos };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(ajustes));
  } catch {
    /* ignora */
  }
  atualizarMusica();
  for (const fn of aoMudarSom) fn(ajustes);
}
const aoMudarSom: ((a: AjustesSom) => void)[] = [];
/** Avisado quando volume/mudo mudam (barra do topo, aba Opções). */
export function aoMudarAjustesSom(fn: (a: AjustesSom) => void): void {
  aoMudarSom.push(fn);
}

// ---------- música ----------

/** Música fora da batalha (em loop). */
export const MUSICA_FUNDO = 'musicas/centro-pokemon.mp3';
/** Temas de batalha (um por geração): cada batalha sorteia um. */
export const MUSICAS_BATALHA = ['hgss-kanto-trainer', 'dpp-trainer', 'bw-trainer', 'xy-trainer', 'sm-trainer'];

type ModoMusica = 'fundo' | 'batalha';
let musica: HTMLAudioElement | null = null;
let modo: ModoMusica = 'fundo';
let liberado = false;

function urlDoModo(m: ModoMusica): string {
  if (m === 'fundo') return MUSICA_FUNDO;
  const nome = MUSICAS_BATALHA[Math.floor(Math.random() * MUSICAS_BATALHA.length)];
  return `https://play.pokemonshowdown.com/audio/${nome}.mp3`;
}

/** Troca a música: 'batalha' ao começar uma batalha, 'fundo' ao voltar. */
export function tocarMusica(novo: ModoMusica): void {
  modo = novo;
  if (!liberado) return;
  musica ??= new Audio();
  musica.loop = true;
  musica.src = urlDoModo(novo);
  musica.currentTime = 0;
  musica.onerror = () => musica?.pause(); // sem o arquivo do Centro Pokémon: fica em silêncio
  atualizarMusica(true);
}

function atualizarMusica(reiniciar = false): void {
  if (!musica) return;
  const v = ajustes.mudo ? 0 : ajustes.volumeMusica * ajustes.geral;
  musica.volume = Math.min(1, v);
  if (v > 0 && (musica.paused || reiniciar)) musica.play().catch(() => {});
  else if (v === 0 && !musica.paused) musica.pause();
}

/** Liga a música no primeiro clique/tecla (o navegador não deixa tocar som antes do jogador interagir). */
export function iniciarMusica(): void {
  const comecar = () => {
    window.removeEventListener('pointerdown', comecar);
    window.removeEventListener('keydown', comecar);
    liberado = true;
    if (!musica) tocarMusica(modo);
  };
  window.addEventListener('pointerdown', comecar);
  window.addEventListener('keydown', comecar);
}
const volume = () => (ajustes.mudo ? 0 : ajustes.volume * ajustes.geral);

// ---------- gritos ----------

/**
 * Toca o grito oficial (número da PokéAPI: espécie, forma regional 10091…, Mega 10034…).
 * `grave` = desmaio (mais lento e grave, como nos jogos). Resolve quando o grito acaba (máx. 2,5 s).
 */
export function tocarGrito(numero: number, grave = false): Promise<void> {
  if (!volume()) return Promise.resolve();
  return new Promise((fim) => {
    const audio = new Audio(`${URL_GRITOS}${numero}.ogg`);
    audio.volume = Math.min(1, volume() * 0.9);
    if (grave) {
      audio.preservesPitch = false;
      audio.playbackRate = 0.75;
    }
    const acabar = () => fim();
    audio.addEventListener('ended', acabar);
    audio.addEventListener('error', acabar);
    setTimeout(acabar, 2500);
    audio.play().catch(acabar);
  });
}
