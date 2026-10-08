import { bonificacao } from '../bonificacao';
import { bonusVip } from '../../../shared/vip';
import { AMIZADE_POR_BATALHA, ganharAmizade } from '../../../shared/amizade';
import { trocarSpriteForma } from '../ui/formas';
import type { Bioma } from '../../../shared/biomas';
import { BatalhaSelvagem, type EventoBatalha, type Lado } from '../../../shared/batalha/motor';
import { atributos, curar, especie, expGanha, expParaNivel, faixaVelocidade, ganharEvs, hpMaximo, nomeGolpe, ppMaximo, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { Dex } from '@pkmn/sim';
import { evoluir, ganharExperiencia, trocarGolpe, type ResultadoProgresso } from '../../../shared/batalha/progresso';
import { pokemonPorId } from '../dados';
import { ITENS, type ItemId } from '../../../shared/itens';
import { efeitoBola } from '../../../shared/bolas';
import { nivelTreinador } from '../../../shared/treinador';
import { MOEDA, SILVER_POR_VITORIA } from '../../../shared/loja';
import { sortearTicketDaBatalha } from '../../../shared/tickets';
import { curarTime, guardarNoPC, registrarCapturaNoRanking, registrarCapturado, salvar, TAMANHO_MAXIMO_TIME, type Save } from '../estado';
import { corTipo, el, seloGenero, seloTipo, selosTipos, spritePokemon } from '../ui/dom';
import { urlSprite3D, usarSprites3D } from './sprites3d';
import { iconeItem } from '../ui/iconeItem';
import { resumoPokemon } from '../ui/resumo';
import { dicaGolpe } from '../ui/dicaGolpe';
import { nomeCategoria, traduzir } from '../../../shared/traducao';
import { animarBola, animarDano, animarDesmaio, animarEntrada, animarEvolucao, animarGolpe, animarRetorno, tremerArena } from './animacoes';

export type ResultadoBatalha = 'vitoria' | 'derrota' | 'captura' | 'fuga';

export interface OpcoesBatalha {
  save: Save;
  /** O selvagem; num duelo, o primeiro Pokémon do treinador. */
  selvagem: PokemonIndividual;
  bioma: Bioma;
  /** Duelo contra treinador NPC (sem captura nem fuga; recompensa em silver ao vencer). */
  treinador?: { nome: string; titulo: string; equipe: PokemonIndividual[]; recompensa: number };
  aoTerminar(resultado: ResultadoBatalha): void;
}

const hex = (cor: number) => `#${cor.toString(16).padStart(6, '0')}`;
const nomeDe = (especieId: number) => pokemonPorId(especieId).nome;
const crescimentoDe = (especieId: number) => pokemonPorId(especieId).crescimento;

const ROTULOS_STATUS: Record<string, string> = { brn: 'QUE', par: 'PAR', slp: 'DOR', frz: 'CON', psn: 'ENV', tox: 'ENV' };
const FRASES_FALHA = ['Ah, não! O Pokémon escapou!', 'Ahh! Parecia que tinha conseguido!', 'Argh! Foi quase!', 'Droga! Foi por pouco!'];

/** Nomes dos atributos nos estágios (em inglês, como os nomes de atributo do jogo). */
const NOMES_BOOST: Record<string, string> = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', accuracy: 'Accuracy', evasion: 'Evasion' };

/** Classe CSS do efeito visual de cada clima e terreno. */
const CLASSE_CLIMA: Record<string, string> = {
  RainDance: 'chuva', PrimordialSea: 'chuva', SunnyDay: 'sol', DesolateLand: 'sol', Sandstorm: 'areia', Hail: 'neve', Snow: 'neve', Snowscape: 'neve', DeltaStream: 'vento',
};
/** Nomes dos climas no quadro do canto (terrenos ficam em inglês, regra do dono). */
const NOMES_CLIMA: Record<string, string> = {
  RainDance: 'Chuva',
  SunnyDay: 'Sol forte',
  Sandstorm: 'Tempestade de areia',
  Snow: 'Neve',
  Snowscape: 'Neve',
  Hail: 'Granizo',
  DesolateLand: 'Sol extremo',
  PrimordialSea: 'Chuva torrencial',
  DeltaStream: 'Ventos misteriosos',
};
const CLASSE_TERRENO: Record<string, string> = { 'Electric Terrain': 'eletrico', 'Grassy Terrain': 'grama', 'Misty Terrain': 'nevoa', 'Psychic Terrain': 'psiquico' };

function caixaInfo(doJogador: boolean) {
  const nome = el('strong');
  const status = el('span', { class: 'chip-status' });
  const nivel = el('span', { class: 'nivel' });
  const preenchido = el('div', { class: 'preenchido verde' });
  const numeros = el('small', { class: 'numeros' });
  const exp = el('div', { class: 'preenchido' });
  // estágios de atributo (+1 Attack, −2 Speed…) em cima da caixa, como nos jogos
  const linhaBoosts = el('div', { class: 'boosts' });
  const boosts: Record<string, number> = {};
  const desenharBoosts = () =>
    linhaBoosts.replaceChildren(
      ...Object.entries(boosts)
        .filter(([, v]) => v !== 0)
        .map(([a, v]) => el('span', { class: `chip-boost ${v > 0 ? 'sobe' : 'desce'}` }, `${NOMES_BOOST[a] ?? a} ${v > 0 ? '+' : '−'}${Math.abs(v)}`)),
    );
  const raiz = el(
    'div',
    { class: `caixa-info ${doJogador ? 'do-jogador' : 'do-selvagem'}` },
    linhaBoosts,
    el('div', { class: 'linha' }, nome, status, nivel),
    el('div', { class: 'linha-hp' }, el('span', { class: 'rotulo' }, 'HP'), el('div', { class: 'barra-hp' }, preenchido)),
    doJogador && numeros,
    doJogador && el('div', { class: 'linha-exp' }, el('span', { class: 'rotulo rotulo-exp' }, 'EXP'), el('div', { class: 'barra-exp' }, exp)),
  );
  return {
    raiz,
    boost(atributo: string, quantidade: number, definir = false) {
      boosts[atributo] = Math.max(-6, Math.min(6, definir ? quantidade : (boosts[atributo] ?? 0) + quantidade));
      desenharBoosts();
    },
    zerarBoosts() {
      for (const a of Object.keys(boosts)) delete boosts[a];
      desenharBoosts();
    },
    hp(hp: number, max: number) {
      const fracao = max > 0 ? Math.max(0, hp) / max : 0;
      preenchido.style.width = `${fracao * 100}%`;
      preenchido.className = `preenchido ${fracao > 0.5 ? 'verde' : fracao > 0.2 ? 'amarela' : 'vermelha'}`;
      numeros.textContent = `${Math.max(0, hp)} / ${max}`;
    },
    status(s: string | null) {
      status.textContent = s ? ROTULOS_STATUS[s] ?? s.toUpperCase() : '';
      status.className = `chip-status ${s ?? ''}`;
    },
    definir(p: PokemonIndividual) {
      nome.replaceChildren(nomeDe(p.especieId), seloGenero(p.genero) ?? '', p.shiny ? ' ✨' : '');
      nivel.textContent = `Nv.${p.nivel}`;
      this.status(p.status);
      const c = crescimentoDe(p.especieId);
      const atual = expParaNivel(c, p.nivel);
      const proximo = expParaNivel(c, p.nivel + 1);
      exp.style.width = `${p.nivel >= 100 ? 100 : Math.min(100, ((p.exp - atual) / Math.max(1, proximo - atual)) * 100)}%`;
    },
  };
}

/**
 * Fundos de batalha dos jogos oficiais (XY, ORAS e BW, via Pokémon Showdown) em client/public/batalha;
 * cada batalha sorteia um do bioma (pedido do dono).
 */
export const FUNDOS_BATALHA: Record<string, string[]> = {
  grama: ['grama-1.jpg', 'grama-2.jpg', 'grama-3.png'],
  agua: ['agua-1.jpg', 'agua-2.jpg', 'agua-3.jpg'],
  vulcao: ['vulcao-1.png', 'vulcao-2.jpg', 'vulcao-3.jpg'],
  caverna: ['caverna-1.jpg', 'caverna-2.jpg'],
  torre: ['torre-1.jpg', 'torre-2.jpg'],
};
/** Sorteia o fundo do bioma para esta batalha. */
function sortearFundo(biomaId: string): string | null {
  const lista = FUNDOS_BATALHA[biomaId];
  return lista ? `batalha/${lista[Math.floor(Math.random() * lista.length)]}` : null;
}

export function abrirBatalha({ save, selvagem: primeiro, bioma, treinador, aoTerminar }: OpcoesBatalha): void {
  /** Quem está em campo do outro lado (num duelo, muda quando o treinador troca). */
  let selvagem = primeiro;
  let dadosSelvagem = pokemonPorId(selvagem.especieId);
  const imagemFundo = sortearFundo(bioma.id);
  const batalha = new BatalhaSelvagem(
    save.time,
    save.time.map((p) => nomeDe(p.especieId)),
    selvagem,
    dadosSelvagem.nome,
    dadosSelvagem.taxaCaptura,
    Math.random,
    treinador ? { nome: treinador.nome, equipe: treinador.equipe, nomesEquipe: treinador.equipe.map((p) => nomeDe(p.especieId)) } : null,
  );

  // ---------- montagem da tela ----------
  const modo3D = usarSprites3D();
  /** Sprite da batalha: pixel art (padrão) ou, no teste 3D, o GIF do Showdown (volta ao pixel art se falhar). */
  const spriteBatalha = (especieId: number, shiny: boolean, costas: boolean) => {
    const img = spritePokemon(pokemonPorId(especieId), { shiny, costas, palco: true });
    if (!modo3D) return img;
    const pixel = img.src;
    img.classList.add('sprite-3d');
    img.addEventListener('error', () => img.src !== pixel && (img.src = pixel), { once: true });
    img.src = urlSprite3D(especieId, { shiny, costas });
    return img;
  };
  let spriteSelvagem = spriteBatalha(selvagem.especieId, selvagem.shiny, false);
  spriteSelvagem.classList.add('sprite-selvagem');
  let spriteJogador = el('img', { class: 'sprite sprite-jogador', alt: '' });
  const lugarJogador = el('div', { class: 'lugar lugar-jogador' }, spriteJogador);
  const lugarSelvagem = el('div', { class: 'lugar lugar-selvagem' }, spriteSelvagem);
  const infoSelvagem = caixaInfo(false);
  const infoJogador = caixaInfo(true);
  infoSelvagem.definir(selvagem);
  infoSelvagem.hp(selvagem.hp, hpMaximo(selvagem));

  // canto esquerdo de cima: caixa do selvagem e, embaixo dela, clima/terreno com os turnos que faltam
  const painelCampo = el('div', { class: 'painel-campo' });
  const arena = el(
    'div',
    {
      class: `arena ${imagemFundo ? 'com-fundo' : ''}`,
      style: { '--chao': hex(bioma.cores.chao), '--zona': hex(bioma.cores.zona), '--fundo-batalha': imagemFundo ? `url(${imagemFundo})` : 'none' },
    },
    el('div', { class: 'canto-esquerdo' }, infoSelvagem.raiz, painelCampo),
    lugarSelvagem,
    lugarJogador,
    infoJogador.raiz,
  );
  // resumo ao passar o mouse em cima de um Pokémon (natureza, gênero, faixa de Speed…)
  const resumo = el('div', { class: 'resumo-pokemon' });
  resumo.hidden = true;
  arena.append(resumo);
  // efeitos de clima (por cima de tudo, menos das caixas) e de terreno (no chão)
  const camadaTerreno = el('div', { class: 'camada-terreno' });
  const camadaClima = el('div', { class: 'camada-clima' });
  arena.prepend(camadaTerreno);
  arena.append(camadaClima);
  const resumoFixo = el('div', { class: 'resumo-pokemon resumo-fixo', hidden: true });
  const mostrarResumo = (lugar: HTMLElement, lado: 'selvagem' | 'jogador', quem: () => PokemonIndividual | undefined) => {
    lugar.addEventListener('mouseenter', () => {
      const p = quem();
      if (!p) return;
      if (lado === 'jogador') {
        // a ficha do seu Pokémon é maior que a arena: flutua por cima da janela (fora do corte da arena)
        const r = arena.getBoundingClientRect();
        if (!resumoFixo.isConnected) fundo.append(resumoFixo);
        resumoFixo.replaceChildren(...resumoPokemon(p, { abilityConhecida: true, completo: true }));
        Object.assign(resumoFixo.style, { left: `${r.left + r.width * 0.36}px`, top: `${r.top + 8}px`, maxHeight: `${window.innerHeight - r.top - 16}px` });
        resumoFixo.hidden = false;
        return;
      }
      resumo.className = `resumo-pokemon ${lado}`;
      resumo.replaceChildren(...resumoPokemon(p, { abilityConhecida: batalha.habilidadeSelvagemRevelada }));
      resumo.hidden = false;
    });
    lugar.addEventListener('mouseleave', () => (resumo.hidden = resumoFixo.hidden = true));
  };
  mostrarResumo(lugarSelvagem, 'selvagem', () => selvagem);
  // o seu Pokémon: ficha completa (HP máximo, atributos, ability, item, golpes) ao passar o mouse
  mostrarResumo(lugarJogador, 'jogador', () => save.time[batalha.ativo]);
  mostrarResumo(infoJogador.raiz, 'jogador', () => save.time[batalha.ativo]);

  const mensagem = el('p', { class: 'mensagem' });
  const acoes = el('div', { class: 'acoes-batalha' });
  const painel = el('div', { class: 'painel-batalha' }, mensagem, acoes);
  // contador de turnos (à esquerda da janela) e chat com o que aconteceu (à direita)
  const contadorTurno = el('strong', {}, '1');
  const contador = el('div', { class: 'contador-turnos' }, el('small', {}, 'Turno'), contadorTurno);
  const listaRegistro = el('div', { class: 'registro-lista' });
  const chat = el('aside', { class: 'registro-batalha' }, el('h4', {}, 'Registro da batalha'), listaRegistro);
  const registrar = (texto: string, classe = '') => {
    listaRegistro.append(el('p', { class: classe }, texto));
    listaRegistro.scrollTop = listaRegistro.scrollHeight;
  };
  const fundo = el('div', { class: 'batalha-fundo' }, el('div', { class: 'batalha-area' }, contador, el('div', { class: 'batalha' }, arena, painel), chat));
  document.body.append(fundo);

  // ---------- mensagens (clique para adiantar) ----------
  let pular: (() => void) | null = null;
  painel.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('button')) pular?.();
  });
  const esperar = (ms: number) =>
    new Promise<void>((resolver) => {
      const fim = () => {
        clearTimeout(timer);
        pular = null;
        resolver();
      };
      const timer = setTimeout(fim, ms);
      pular = fim;
    });
  /** true enquanto os eventos do simulador tocam (eles já vão para o chat pelo `registro`). */
  let tocandoEventos = false;
  const dizer = (texto: string) => {
    if (!tocandoEventos) registrar(texto);
    mensagem.textContent = texto;
    return esperar(650 + texto.length * 18);
  };

  const sprite = (lado: Lado) => (lado === 'jogador' ? spriteJogador : spriteSelvagem);
  const lugar = (lado: Lado) => (lado === 'jogador' ? lugarJogador : lugarSelvagem);

  /** Atualiza o quadro de clima/terreno (nome + turnos que faltam). */
  const atualizarCampo = () => {
    const c = batalha.campo();
    const chip = (nome: string, turnos: number | null, classe: string) =>
      el('div', { class: `chip-campo ${classe}` }, el('span', {}, nome), el('small', {}, turnos === null ? 'sem fim' : `${turnos} turno${turnos === 1 ? '' : 's'}`));
    painelCampo.replaceChildren(
      ...[c.clima ? chip(NOMES_CLIMA[c.clima] ?? c.clima, c.turnosClima, `clima-${CLASSE_CLIMA[c.clima] ?? ''}`) : null, c.terreno ? chip(c.terreno, c.turnosTerreno, `terreno-${CLASSE_TERRENO[c.terreno] ?? ''}`) : null].filter(
        (x): x is HTMLDivElement => !!x,
      ),
    );
  };

  /** Aba do Terastal ao lado direito do Pokémon (some quando ele sai de campo). */
  const marcarTera = (lado: Lado, tipo: string | null) => {
    const l = lugar(lado);
    l.querySelector('.aba-tera')?.remove();
    sprite(lado).classList.toggle('terastalizado', !!tipo);
    if (tipo) l.append(el('div', { class: 'aba-tera', style: { '--cor-tipo': tipo === 'Stellar' ? '#7fd3ff' : corTipo(tipo) } }, el('small', {}, 'TERA'), el('strong', {}, tipo)));
  };
  const info = (lado: Lado) => (lado === 'jogador' ? infoJogador : infoSelvagem);

  function colocarJogador(posicao: number) {
    const p = save.time[posicao];
    const novo = spriteBatalha(p.especieId, p.shiny, true);
    novo.classList.add('sprite-jogador');
    spriteJogador.replaceWith(novo);
    spriteJogador = novo;
    infoJogador.definir(p);
  }

  // ---------- reprodução dos eventos do simulador ----------
  async function reproduzir(eventos: EventoBatalha[]) {
    tocandoEventos = true;
    try {
      await tocarEventos(eventos);
    } finally {
      tocandoEventos = false;
    }
  }

  async function tocarEventos(eventos: EventoBatalha[]) {
    for (const ev of eventos) {
      // chat lateral: a frase do evento (registro) ou o texto dele
      const frase = ev.registro === undefined ? ('texto' in ev ? ev.texto : undefined) : ev.registro;
      if (frase) registrar(frase);
      switch (ev.tipo) {
        case 'turno':
          contadorTurno.textContent = String(ev.numero);
          registrar(`Turno ${ev.numero}`, 'registro-turno');
          break;
        case 'mensagem':
          await dizer(ev.texto);
          break;
        case 'entrar':
          // quem entra em campo começa sem estágios de atributo (e sem Terastal)
          info(ev.lado).zerarBoosts();
          marcarTera(ev.lado, null);
          if (ev.lado === 'selvagem' && treinador && treinador.equipe[ev.indice] && treinador.equipe[ev.indice] !== selvagem) {
            // o treinador mandou outro Pokémon: troca a imagem e a caixa de HP
            selvagem = treinador.equipe[ev.indice];
            dadosSelvagem = pokemonPorId(selvagem.especieId);
            const novo = spriteBatalha(selvagem.especieId, selvagem.shiny, false);
            novo.classList.add('sprite-selvagem');
            spriteSelvagem.replaceWith(novo);
            spriteSelvagem = novo;
            infoSelvagem.definir(selvagem);
            infoSelvagem.hp(ev.hp, ev.hpMax);
            if (ev.texto) mensagem.textContent = ev.texto;
            await animarEntrada(spriteSelvagem);
            await esperar(300);
          }
          if (ev.lado === 'jogador') {
            colocarJogador(ev.indice);
            // forma que depende do item (Giratina-Origin, Arceus-Fire…)
            trocarSpriteForma(spriteJogador as HTMLImageElement, ev.forma, { shiny: save.time[ev.indice].shiny, costas: true });
            infoJogador.hp(ev.hp, ev.hpMax);
            if (ev.texto) mensagem.textContent = ev.texto;
            await animarEntrada(spriteJogador);
            await esperar(400);
          }
          break;
        case 'golpe':
          mensagem.textContent = ev.texto;
          await esperar(350);
          await animarGolpe(arena, sprite(ev.lado), ev.alvo && ev.alvo !== ev.lado ? sprite(ev.alvo) : null, ev.tipoGolpe, ev.categoria);
          break;
        case 'hp': {
          info(ev.lado).hp(ev.hp, ev.hpMax);
          if (ev.texto) {
            void animarDano(sprite(ev.lado));
            await dizer(ev.texto);
          } else await esperar(550);
          break;
        }
        case 'status':
          info(ev.lado).status(ev.status);
          if (ev.texto) await dizer(ev.texto);
          break;
        case 'boost':
          info(ev.lado).boost(ev.atributo, ev.quantidade, ev.definir);
          await dizer(ev.texto);
          break;
        case 'zerarBoosts':
          if (ev.lado) info(ev.lado).zerarBoosts();
          else {
            infoJogador.zerarBoosts();
            infoSelvagem.zerarBoosts();
          }
          if (ev.texto) await dizer(ev.texto);
          break;
        case 'clima':
          camadaClima.className = `camada-clima ${ev.clima ? `clima-${CLASSE_CLIMA[ev.clima] ?? ''}` : ''}`;
          atualizarCampo();
          if (ev.texto) await dizer(ev.texto);
          break;
        case 'terreno':
          camadaTerreno.className = `camada-terreno ${ev.terreno ? `terreno-${CLASSE_TERRENO[ev.terreno] ?? ''}` : ''}`;
          atualizarCampo();
          if (ev.texto) await dizer(ev.texto);
          break;
        case 'impacto':
          if (ev.forte) void tremerArena(arena);
          await dizer(ev.texto);
          break;
        case 'desmaio':
          await animarDesmaio(sprite(ev.lado));
          await dizer(ev.texto);
          break;
        case 'tera':
          marcarTera(ev.lado, ev.teraTipo);
          void animarDano(sprite(ev.lado));
          await dizer(ev.texto);
          break;
        case 'forma':
          // Primal Reversion e outras mudanças de forma no meio da batalha
          trocarSpriteForma(sprite(ev.lado) as HTMLImageElement, ev.forma, { shiny: ev.lado === 'jogador' ? save.time[batalha.ativo].shiny : selvagem.shiny, costas: ev.lado === 'jogador' });
          if (ev.texto) await dizer(ev.texto);
          break;
        case 'fim':
          break;
      }
    }
  }

  // ---------- menus ----------
  const botao = (texto: string | Node[], acao: () => void, extra: Record<string, unknown> = {}) =>
    el('button', { class: 'botao', onclick: acao, ...extra }, texto as never);

  function menuPrincipal() {
    const pedido = batalha.pedido();
    if (pedido.tipo === 'fim') return finalizar(batalha.vencedor === 'jogador' ? 'vitoria' : 'derrota');
    if (pedido.tipo === 'troca') return menuPokemon(true);

    atualizarCampo();
    mensagem.textContent = `O que ${nomeDe(save.time[batalha.ativo].especieId)} vai fazer?`;
    acoes.replaceChildren(
      botao([el('span', { class: 'emote' }, '⚔️'), 'Lutar'] as never, () => menuGolpes(), { class: 'botao grande lutar' }),
      botao([el('span', { class: 'emote' }, '🎒'), 'Bolsa'] as never, menuBolsa, { class: 'botao grande bolsa' }),
      botao([el('span', { class: 'emote' }, '🔄'), 'Pokémon'] as never, () => menuPokemon(false), { class: 'botao grande pokemon', disabled: !pedido.podeTrocar }),
      botao([el('span', { class: 'emote' }, '🏃'), 'Fugir'] as never, tentarFugir, { class: 'botao grande fugir', disabled: !pedido.podeFugir }),
    );
  }

  /** `modo`: 'z' = Z-Move ligado; 'tera' = Terastalizar ligado (os dois não juntos). */
  function menuGolpes(modo: 'z' | 'tera' | null = null) {
    const pedido = batalha.pedido();
    if (pedido.tipo !== 'acao') return menuPrincipal();
    const z = pedido.zGolpes;
    const usarZ = modo === 'z';
    acoes.replaceChildren(
      ...pedido.golpes.map((g, i) =>
        // cartão com as informações do golpe ao passar o mouse
        dicaGolpe(el(
          'button',
          {
            class: `botao golpe ${usarZ && z?.[i] ? 'golpe-z' : ''} ${modo === 'tera' ? 'golpe-tera' : ''}`,
            style: { '--cor-tipo': corTipo(g.tipo) },
            disabled: g.desabilitado || (g.ppMax > 0 && g.pp <= 0) || (usarZ && !z?.[i]),
            onclick: () => executar(() => batalha.usarGolpe(g.indice, usarZ && z?.[i] ? 'z' : modo === 'tera' ? 'tera' : null)),
          },
          el('strong', {}, usarZ && z?.[i] ? z[i]! : g.nome),
          el(
            'span',
            { class: 'detalhes' },
            seloTipo(g.tipo),
            el('span', {}, nomeCategoria(g.categoria)),
            // Z-Move: poder do Z (ex.: Thunder Shock 40 → Gigavolt Havoc 100); Z de golpe de status não tem poder
            el('span', {}, `Poder ${(usarZ && z?.[i] ? (Dex.moves.get(g.id).category === 'Status' ? 0 : Dex.moves.get(g.id).zMove?.basePower) : Dex.moves.get(g.id).basePower) || '—'}`),
            g.ppMax > 0 ? el('span', {}, `PP ${g.pp}/${g.ppMax}`) : '',
          ),
        ), g.id, g.ppMax > 0 ? () => ({ atual: g.pp, max: g.ppMax }) : undefined),
      ),
      // Z-Crystal segurado: liga/desliga o Z-Move (uma vez por batalha)
      z ? botao(usarZ ? 'Z-Move ligado' : 'Z-Move', () => menuGolpes(usarZ ? null : 'z'), { class: `botao secundario botao-z ${usarZ ? 'ligado' : ''}` }) : '',
      // Terastal: uma vez por batalha; o Pokémon vira o Tera Type dele antes de atacar
      pedido.tera
        ? botao(modo === 'tera' ? `Terastalizar ligado (${pedido.tera})` : `Terastalizar (${pedido.tera})`, () => menuGolpes(modo === 'tera' ? null : 'tera'), {
            class: `botao secundario botao-tera ${modo === 'tera' ? 'ligado' : ''}`,
            style: { '--cor-tipo': pedido.tera === 'Stellar' ? '#7fd3ff' : corTipo(pedido.tera) },
          })
        : '',
      botao('← Voltar', menuPrincipal, { class: 'botao secundario voltar' }),
    );
  }

  function menuBolsa() {
    acoes.replaceChildren(
      // só o que o jogador tem; Sacred Ash é só fora da batalha
      ...(Object.keys(ITENS) as ItemId[])
        // contra treinador não dá para jogar Pokébola no Pokémon dele
        .filter((id) => (save.itens[id] ?? 0) > 0 && !ITENS[id].reviverTime && !(treinador && ITENS[id].categoria === 'bola'))
        .map((id) =>
          botao([iconeItem({ id, categoria: ITENS[id].categoria === 'bola' ? 'bolas' : 'remedios' }), el('span', {}, ITENS[id].nome), el('small', {}, `×${save.itens[id]}`)] as never, () => (ITENS[id].categoria === 'bola' ? arremessar(id) : menuAlvoRemedio(id)), {
            class: `botao item ${ITENS[id].categoria}`,
            title: ITENS[id].descricao,
          }),
        ),
      botao('← Voltar', menuPrincipal, { class: 'botao secundario voltar' }),
    );
  }

  function menuAlvoRemedio(id: ItemId) {
    mensagem.textContent = `Usar ${ITENS[id].nome} em qual Pokémon?`;
    acoes.replaceChildren(
      ...save.time.map((p, pos) =>
        el(
          'button',
          { class: 'botao membro', onclick: () => usarRemedioNaBatalha(id, pos) },
          spritePokemon(pokemonPorId(p.especieId), { shiny: p.shiny, animado: false }),
          el('span', {}, `${nomeDe(p.especieId)} Nv. ${p.nivel}`),
        ),
      ),
      botao('← Voltar', menuBolsa, { class: 'botao secundario voltar' }),
    );
  }

  async function usarRemedioNaBatalha(id: ItemId, pos: number) {
    acoes.replaceChildren();
    const resultado = batalha.usarRemedio(pos, ITENS[id], nomeDe(save.time[pos].especieId));
    if (!resultado) {
      await dizer('Não teria efeito.');
      return menuPrincipal();
    }
    save.itens[id]--;
    salvar(save);
    await dizer(`Você usou ${ITENS[id].nome}. ${resultado.mensagem}`);
    await executar(() => resultado.eventos);
  }

  function menuPokemon(obrigatorio: boolean) {
    const reservas = batalha.reservasSaudaveis();
    mensagem.textContent = obrigatorio ? 'Escolha o próximo Pokémon!' : 'Trocar por qual Pokémon?';
    acoes.replaceChildren(
      ...batalha.indices.map((pos) => {
        const p = save.time[pos];
        const ativo = pos === batalha.ativo && !obrigatorio;
        return el(
          'button',
          {
            class: 'botao membro',
            disabled: !reservas.includes(pos),
            onclick: () => trocar(pos, obrigatorio),
          },
          spritePokemon(pokemonPorId(p.especieId), { shiny: p.shiny, animado: false }),
          el('span', {}, `${nomeDe(p.especieId)} Nv. ${p.nivel}${ativo ? ' (em campo)' : ''}`),
        );
      }),
      ...(obrigatorio ? [] : [botao('← Voltar', menuPrincipal, { class: 'botao secundario voltar' })]),
    );
  }

  // ---------- ações ----------
  async function executar(acao: () => EventoBatalha[]) {
    acoes.replaceChildren();
    turno++;
    await reproduzir(acao());
    menuPrincipal();
  }

  async function trocar(pos: number, obrigatorio: boolean) {
    acoes.replaceChildren();
    if (!obrigatorio) {
      await dizer(`Volte, ${nomeDe(save.time[batalha.ativo].especieId)}!`);
      await animarRetorno(spriteJogador);
    }
    await executar(() => batalha.trocar(pos));
  }

  async function arremessar(bola: ItemId) {
    acoes.replaceChildren();
    save.itens[bola]--;
    salvar(save);
    mensagem.textContent = `Você arremessou uma ${ITENS[bola].nome}!`;
    const ativo = save.time[batalha.ativo];
    const efeito = efeitoBola(bola, {
      especieId: selvagem.especieId,
      tipos: dadosSelvagem.tipos,
      velocidadeBase: dadosSelvagem.stats.velocidade,
      pesoKg: dadosSelvagem.peso / 10,
      nivel: selvagem.nivel,
      genero: selvagem.genero,
      status: batalha.statusSelvagem,
      especieAtivo: ativo.especieId,
      nivelAtivo: ativo.nivel,
      generoAtivo: ativo.genero,
      turno,
      bioma: bioma.id,
      jaPossui: [...save.time, ...save.caixa].some((p) => p.especieId === selvagem.especieId),
    });
    const { capturou, tremidas, chance, eventos } = batalha.arremessarBola(efeito);
    const porcentagem = chance >= 1 ? '100' : chance < 0.001 ? '<0,1' : (chance * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    mensagem.textContent = `Você arremessou uma ${ITENS[bola].nome}! Chance de captura: ${porcentagem}%`;
    if (capturou && bola === 'healball') curarAoCapturar = true;
    await animarBola(arena, spriteSelvagem, tremidas, capturou, bola);
    if (capturou) {
      await dizer(`Pegou! ${dadosSelvagem.nome} foi capturado!`);
      return finalizar('captura');
    }
    await dizer(FRASES_FALHA[tremidas]);
    await executar(() => eventos);
  }

  async function tentarFugir() {
    acoes.replaceChildren();
    const { fugiu, eventos } = batalha.fugir();
    if (fugiu) {
      await dizer('Você fugiu em segurança!');
      return finalizar('fuga');
    }
    await dizer('Não conseguiu fugir!');
    await executar(() => eventos);
  }

  // ---------- fim da batalha ----------
  async function perguntarGolpe(p: PokemonIndividual, novo: string) {
    const nome = nomeDe(p.especieId);
    // golpe novo em destaque, com o cartão de informações ao passar o mouse
    mensagem.replaceChildren(
      `${nome} quer aprender `,
      dicaGolpe(el('span', { class: 'golpe-novo', style: { '--cor-tipo': corTipo(Dex.moves.get(novo).type) } }, nomeGolpe(novo)), novo),
      ', mas já conhece 4 golpes. Esquecer qual?',
    );
    const escolha = await new Promise<number | null>((resolver) =>
      acoes.replaceChildren(
        ...p.golpes.map((g, i) => dicaGolpe(botao(nomeGolpe(g.id), () => resolver(i), { class: 'botao golpe', style: { '--cor-tipo': corTipo(Dex.moves.get(g.id).type) } }), g.id, () => ({ atual: g.pp, max: ppMaximo(g.id) }))),
        botao(`Não aprender ${nomeGolpe(novo)}`, () => resolver(null), { class: 'botao secundario' }),
      ),
    );
    acoes.replaceChildren();
    if (escolha === null) return dizer(`${nome} não aprendeu ${nomeGolpe(novo)}.`);
    const esquecido = nomeGolpe(p.golpes[escolha].id);
    trocarGolpe(p, escolha, novo);
    await dizer(`1, 2 e... Pronto! ${nome} esqueceu ${esquecido} e aprendeu ${nomeGolpe(novo)}!`);
  }

  async function mostrarProgresso(pos: number, r: ResultadoProgresso) {
    const p = save.time[pos];
    for (const msg of r.mensagens) {
      if (pos === batalha.ativo) {
        infoJogador.definir(p);
        infoJogador.hp(p.hp, hpMaximo(p));
      }
      await dizer(msg);
    }
    for (const golpe of r.golpesPendentes) await perguntarGolpe(p, golpe);
  }

  /** Derrotados que dão XP/EVs: o selvagem, ou todo o time do treinador NPC. */
  const derrotados = () => (treinador ? treinador.equipe : [selvagem]);
  /** XP que um Pokémon de nível `nivel` ganha pelos derrotados. */
  const xpPelosDerrotados = (nivel: number) => derrotados().reduce((s, d) => s + expGanha(pokemonPorId(d.especieId).experienciaBase ?? 50, d.nivel, nivel, true), 0);

  /** O treinador ganha o mesmo XP que o Pokémon derrotado/capturado dá ao Pokémon em campo. */
  async function darXpTreinador() {
    const nivelAtivo = save.time[batalha.ativo]?.nivel ?? 1;
    const xp = Math.round(xpPelosDerrotados(nivelAtivo) * bonusVip(save, 'xpTreinador') * bonificacao().xp);
    const antes = nivelTreinador(save.xpTreinador);
    save.xpTreinador += xp;
    await dizer(`Você ganhou ${xp} XP de treinador!`);
    const depois = nivelTreinador(save.xpTreinador);
    if (depois > antes) await dizer(`Seu nível de treinador subiu para ${depois}! Os Pokémon selvagens ficaram mais fortes.`);
  }

  /** Turno atual (Quick Ball e Timer Ball) e se a Heal Ball deve curar o capturado. */
  let turno = 1;
  let curarAoCapturar = false;

  async function finalizar(resultado: ResultadoBatalha) {
    acoes.replaceChildren();
    batalha.sincronizar();
    // amizade: +AMIZADE_POR_BATALHA para quem entrou em campo (antes do XP: pode evoluir por amizade ao subir)
    for (const pos of batalha.participantes) ganharAmizade(save.time[pos], AMIZADE_POR_BATALHA);

    // vitória e captura dão XP e EVs a quem entrou em campo
    const darXpTime = async () => {
      const evolucoes: { pos: number; para: number }[] = [];
      for (const pos of batalha.indices) {
        const p = save.time[pos];
        // XP e EVs só para quem entrou em campo nesta batalha (pedido do dono: sem Exp. Share)
        if (p.hp <= 0 || !batalha.participantes.has(pos)) continue;
        for (const d of derrotados()) {
          const ev = pokemonPorId(d.especieId).evsDados;
          ganharEvs(p, { hp: ev.hp, atk: ev.ataque, def: ev.defesa, spa: ev.ataqueEspecial, spd: ev.defesaEspecial, spe: ev.velocidade });
        }
        // bônus de XP da administração (1x a 3x)
        const exp = Math.round(xpPelosDerrotados(p.nivel) * bonificacao().xp);
        const r = ganharExperiencia(p, exp, nomeDe, crescimentoDe);
        await mostrarProgresso(pos, r);
        if (r.evolucao) evolucoes.push({ pos, para: r.evolucao.para });
      }
      for (const { pos, para } of evolucoes) {
        const p = save.time[pos];
        const antes = nomeDe(p.especieId);
        if (pos !== batalha.ativo) colocarJogador(pos);
        const novo = pokemonPorId(para);
        // como nos jogos: dá para parar a evolução (ela é oferecida de novo no próximo nível)
        mensagem.textContent = `O quê? ${antes} quer evoluir para ${novo.nome}!`;
        const evoluirAgora = await new Promise<boolean>((resolver) =>
          acoes.replaceChildren(
            botao('Deixar evoluir', () => resolver(true), { class: 'botao' }),
            botao('Parar a evolução', () => resolver(false), { class: 'botao secundario' }),
          ),
        );
        acoes.replaceChildren();
        if (!evoluirAgora) {
          await dizer(`${antes} não evoluiu.`);
          continue;
        }
        await dizer(`${antes} está evoluindo!`);
        await animarEvolucao(spriteJogador as HTMLImageElement, modo3D ? urlSprite3D(para, { shiny: p.shiny, costas: true }) : ((p.shiny ? novo.sprites.gifCostasShiny : novo.sprites.gifCostas) ?? novo.sprites.costas ?? ''));
        const r = evoluir(p, para, nomeDe);
        registrarCapturado(save, para);
        infoJogador.definir(p);
        await dizer(`Parabéns! ${antes} evoluiu para ${novo.nome}!`);
        await mostrarProgresso(pos, r);
      }
    };

    if (resultado === 'vitoria') {
      if (treinador) await dizer(`Você venceu ${treinador.titulo} ${treinador.nome}!`);
      await darXpTreinador();
      // duelo: recompensa da dificuldade do treinador; selvagem: o silver normal por vitória
      const silver = Math.round((treinador ? treinador.recompensa : SILVER_POR_VITORIA) * bonusVip(save, 'silver') * bonificacao().silver);
      save.silver += silver;
      await dizer(`Você ganhou ${silver.toLocaleString('pt-BR')} ${MOEDA}!`);
      await darXpTime();
    } else if (resultado === 'captura') {
      await darXpTreinador();
      await darXpTime();
      selvagem.hp = Math.max(1, selvagem.hp);
      if (curarAoCapturar) curar(selvagem);
      registrarCapturado(save, selvagem.especieId);
      registrarCapturaNoRanking(save, selvagem);
      if (save.time.length < TAMANHO_MAXIMO_TIME) save.time.push(selvagem);
      else {
        const box = guardarNoPC(save, selvagem);
        await dizer(`${dadosSelvagem.nome} foi enviado para o PC (Box ${box + 1}).`);
      }
    }
    // chance baixa de achar um ticket ao vencer ou capturar
    if (resultado === 'vitoria' || resultado === 'captura') {
      const ticket = sortearTicketDaBatalha();
      if (ticket) {
        save.itens[ticket.id] = (save.itens[ticket.id] ?? 0) + 1;
        await dizer(`Que sorte! Você encontrou um ${ticket.nome}! (está na Bolsa)`);
      }
    }
    if (resultado === 'derrota') {
      await dizer('Você não tem mais Pokémon em condições de lutar!');
      await dizer('Você correu para o Centro Pokémon e seu time foi curado.');
      curarTime(save);
    }

    salvar(save);
    fundo.remove();
    aoTerminar(resultado);
  }

  // ---------- início ----------
  (async () => {
    if (treinador) await dizer(`${treinador.titulo} ${treinador.nome} quer batalhar!`);
    await animarEntrada(spriteSelvagem);
    await dizer(treinador ? `${treinador.nome} enviou ${dadosSelvagem.nome}!` : `Um ${dadosSelvagem.nome} selvagem apareceu!`);
    await reproduzir(batalha.iniciar());
    menuPrincipal();
  })();
}
