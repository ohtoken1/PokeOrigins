import type { Bioma } from '../../../shared/biomas';
import { BatalhaSelvagem, type EventoBatalha, type Lado } from '../../../shared/batalha/motor';
import { atributos, curar, especie, expGanha, expParaNivel, faixaVelocidade, ganharEvs, hpMaximo, nomeGolpe, type PokemonIndividual } from '../../../shared/batalha/pokemon';
import { Dex } from '@pkmn/sim';
import { evoluir, ganharExperiencia, trocarGolpe, type ResultadoProgresso } from '../../../shared/batalha/progresso';
import { pokemonPorId } from '../dados';
import { ITENS, type ItemId } from '../../../shared/itens';
import { efeitoBola } from '../../../shared/bolas';
import { nivelTreinador } from '../../../shared/treinador';
import { MOEDA, SILVER_POR_VITORIA } from '../../../shared/loja';
import { curarTime, guardarNoPC, registrarCapturado, salvar, TAMANHO_MAXIMO_TIME, type Save } from '../estado';
import { corTipo, el, seloGenero, seloTipo, selosTipos, spritePokemon } from '../ui/dom';
import { urlSprite3D, usarSprites3D } from './sprites3d';
import { iconeItem } from '../ui/iconeItem';
import { resumoPokemon } from '../ui/resumo';
import { nomeCategoria, traduzir } from '../../../shared/traducao';
import { animarBola, animarDano, animarDesmaio, animarEntrada, animarEvolucao, animarGolpe, animarRetorno, tremerArena } from './animacoes';

export type ResultadoBatalha = 'vitoria' | 'derrota' | 'captura' | 'fuga';

export interface OpcoesBatalha {
  save: Save;
  selvagem: PokemonIndividual;
  bioma: Bioma;
  aoTerminar(resultado: ResultadoBatalha): void;
}

const hex = (cor: number) => `#${cor.toString(16).padStart(6, '0')}`;
const nomeDe = (especieId: number) => pokemonPorId(especieId).nome;
const crescimentoDe = (especieId: number) => pokemonPorId(especieId).crescimento;

const ROTULOS_STATUS: Record<string, string> = { brn: 'QUE', par: 'PAR', slp: 'DOR', frz: 'CON', psn: 'ENV', tox: 'ENV' };
const FRASES_FALHA = ['Ah, não! O Pokémon escapou!', 'Ahh! Parecia que tinha conseguido!', 'Argh! Foi quase!', 'Droga! Foi por pouco!'];

function caixaInfo(doJogador: boolean) {
  const nome = el('strong');
  const status = el('span', { class: 'chip-status' });
  const nivel = el('span', { class: 'nivel' });
  const preenchido = el('div', { class: 'preenchido verde' });
  const numeros = el('small', { class: 'numeros' });
  const exp = el('div', { class: 'preenchido' });
  const raiz = el(
    'div',
    { class: `caixa-info ${doJogador ? 'do-jogador' : 'do-selvagem'}` },
    el('div', { class: 'linha' }, nome, status, nivel),
    el('div', { class: 'linha-hp' }, el('span', { class: 'rotulo' }, 'HP'), el('div', { class: 'barra-hp' }, preenchido)),
    doJogador && numeros,
    doJogador && el('div', { class: 'barra-exp' }, exp),
  );
  return {
    raiz,
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
      nivel.textContent = `Nv. ${p.nivel}`;
      this.status(p.status);
      const c = crescimentoDe(p.especieId);
      const atual = expParaNivel(c, p.nivel);
      const proximo = expParaNivel(c, p.nivel + 1);
      exp.style.width = `${p.nivel >= 100 ? 100 : Math.min(100, ((p.exp - atual) / Math.max(1, proximo - atual)) * 100)}%`;
    },
  };
}

export function abrirBatalha({ save, selvagem, bioma, aoTerminar }: OpcoesBatalha): void {
  const dadosSelvagem = pokemonPorId(selvagem.especieId);
  const batalha = new BatalhaSelvagem(
    save.time,
    save.time.map((p) => nomeDe(p.especieId)),
    selvagem,
    dadosSelvagem.nome,
    dadosSelvagem.taxaCaptura,
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
  const spriteSelvagem = spriteBatalha(selvagem.especieId, selvagem.shiny, false);
  spriteSelvagem.classList.add('sprite-selvagem');
  let spriteJogador = el('img', { class: 'sprite sprite-jogador', alt: '' });
  const lugarJogador = el('div', { class: 'lugar lugar-jogador' }, spriteJogador);
  const lugarSelvagem = el('div', { class: 'lugar lugar-selvagem' }, spriteSelvagem);
  const infoSelvagem = caixaInfo(false);
  const infoJogador = caixaInfo(true);
  infoSelvagem.definir(selvagem);
  infoSelvagem.hp(selvagem.hp, hpMaximo(selvagem));

  const arena = el(
    'div',
    { class: 'arena', style: { '--chao': hex(bioma.cores.chao), '--zona': hex(bioma.cores.zona) } },
    infoSelvagem.raiz,
    lugarSelvagem,
    lugarJogador,
    infoJogador.raiz,
  );
  // resumo ao passar o mouse em cima de um Pokémon (natureza, gênero, faixa de Speed…)
  const resumo = el('div', { class: 'resumo-pokemon' });
  resumo.hidden = true;
  arena.append(resumo);
  const mostrarResumo = (lugar: HTMLElement, lado: 'selvagem' | 'jogador', quem: () => PokemonIndividual | undefined) => {
    lugar.addEventListener('mouseenter', () => {
      const p = quem();
      if (!p) return;
      resumo.className = `resumo-pokemon ${lado}`;
      resumo.replaceChildren(...resumoPokemon(p, { abilityConhecida: lado === 'jogador' || batalha.habilidadeSelvagemRevelada }));
      resumo.hidden = false;
    });
    lugar.addEventListener('mouseleave', () => (resumo.hidden = true));
  };
  mostrarResumo(lugarSelvagem, 'selvagem', () => selvagem);

  const mensagem = el('p', { class: 'mensagem' });
  const acoes = el('div', { class: 'acoes-batalha' });
  const painel = el('div', { class: 'painel-batalha' }, mensagem, acoes);
  const fundo = el('div', { class: 'batalha-fundo' }, el('div', { class: 'batalha' }, arena, painel));
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
  const dizer = (texto: string) => {
    mensagem.textContent = texto;
    return esperar(650 + texto.length * 18);
  };

  const sprite = (lado: Lado) => (lado === 'jogador' ? spriteJogador : spriteSelvagem);
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
    for (const ev of eventos) {
      switch (ev.tipo) {
        case 'mensagem':
          await dizer(ev.texto);
          break;
        case 'entrar':
          if (ev.lado === 'jogador') {
            colocarJogador(ev.indice);
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
        case 'impacto':
          if (ev.forte) void tremerArena(arena);
          await dizer(ev.texto);
          break;
        case 'desmaio':
          await animarDesmaio(sprite(ev.lado));
          await dizer(ev.texto);
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

    mensagem.textContent = `O que ${nomeDe(save.time[batalha.ativo].especieId)} vai fazer?`;
    acoes.replaceChildren(
      botao([el('span', { class: 'emote' }, '⚔️'), 'Lutar'] as never, menuGolpes, { class: 'botao grande lutar' }),
      botao([el('span', { class: 'emote' }, '🎒'), 'Bolsa'] as never, menuBolsa, { class: 'botao grande bolsa' }),
      botao([el('span', { class: 'emote' }, '🔄'), 'Pokémon'] as never, () => menuPokemon(false), { class: 'botao grande pokemon', disabled: !pedido.podeTrocar }),
      botao([el('span', { class: 'emote' }, '🏃'), 'Fugir'] as never, tentarFugir, { class: 'botao grande fugir', disabled: !pedido.podeFugir }),
    );
  }

  function menuGolpes() {
    const pedido = batalha.pedido();
    if (pedido.tipo !== 'acao') return menuPrincipal();
    acoes.replaceChildren(
      ...pedido.golpes.map((g) =>
        el(
          'button',
          {
            class: 'botao golpe',
            // descrição do golpe ao passar o mouse (traduzida)
            title: (() => {
              const m = Dex.moves.get(g.id);
              const precisao = m.accuracy === true ? 'nunca erra' : `precisão ${m.accuracy}%`;
              return `${traduzir(m.shortDesc || m.desc)}
${nomeCategoria(m.category)} · ${precisao}${m.priority ? ` · prioridade ${m.priority > 0 ? '+' : ''}${m.priority}` : ''}`;
            })(),
            style: { '--cor-tipo': corTipo(g.tipo) },
            disabled: g.desabilitado || (g.ppMax > 0 && g.pp <= 0),
            onclick: () => executar(() => batalha.usarGolpe(g.indice)),
          },
          el('strong', {}, g.nome),
          el(
            'span',
            { class: 'detalhes' },
            seloTipo(g.tipo),
            el('span', {}, nomeCategoria(g.categoria)),
            el('span', {}, `Poder ${Dex.moves.get(g.id).basePower || '—'}`),
            g.ppMax > 0 ? el('span', {}, `PP ${g.pp}/${g.ppMax}`) : '',
          ),
        ),
      ),
      botao('← Voltar', menuPrincipal, { class: 'botao secundario voltar' }),
    );
  }

  function menuBolsa() {
    acoes.replaceChildren(
      // só o que o jogador tem; Sacred Ash é só fora da batalha
      ...(Object.keys(ITENS) as ItemId[])
        .filter((id) => (save.itens[id] ?? 0) > 0 && !ITENS[id].reviverTime)
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
    mensagem.textContent = `${nome} quer aprender ${nomeGolpe(novo)}, mas já conhece 4 golpes. Esquecer qual?`;
    const escolha = await new Promise<number | null>((resolver) =>
      acoes.replaceChildren(
        ...p.golpes.map((g, i) => botao(nomeGolpe(g.id), () => resolver(i), { class: 'botao golpe' })),
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

  /** O treinador ganha o mesmo XP que o Pokémon derrotado/capturado dá ao Pokémon em campo. */
  async function darXpTreinador() {
    const nivelAtivo = save.time[batalha.ativo]?.nivel ?? 1;
    const xp = expGanha(dadosSelvagem.experienciaBase ?? 50, selvagem.nivel, nivelAtivo, true);
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

    // vitória e captura dão XP e EVs a quem entrou em campo
    const darXpTime = async () => {
      const evolucoes: { pos: number; para: number }[] = [];
      for (const pos of batalha.indices) {
        const p = save.time[pos];
        // XP e EVs só para quem entrou em campo nesta batalha (pedido do dono: sem Exp. Share)
        if (p.hp <= 0 || !batalha.participantes.has(pos)) continue;
        const ev = dadosSelvagem.evsDados;
        ganharEvs(p, { hp: ev.hp, atk: ev.ataque, def: ev.defesa, spa: ev.ataqueEspecial, spd: ev.defesaEspecial, spe: ev.velocidade });
        const exp = expGanha(dadosSelvagem.experienciaBase ?? 50, selvagem.nivel, p.nivel, true);
        const r = ganharExperiencia(p, exp, nomeDe, crescimentoDe);
        await mostrarProgresso(pos, r);
        if (r.evolucao) evolucoes.push({ pos, para: r.evolucao.para });
      }
      for (const { pos, para } of evolucoes) {
        const p = save.time[pos];
        const antes = nomeDe(p.especieId);
        if (pos !== batalha.ativo) colocarJogador(pos);
        await dizer(`O quê? ${antes} está evoluindo!`);
        const novo = pokemonPorId(para);
        await animarEvolucao(spriteJogador as HTMLImageElement, modo3D ? urlSprite3D(para, { shiny: p.shiny, costas: true }) : ((p.shiny ? novo.sprites.gifCostasShiny : novo.sprites.gifCostas) ?? novo.sprites.costas ?? ''));
        const r = evoluir(p, para, nomeDe);
        registrarCapturado(save, para);
        infoJogador.definir(p);
        await dizer(`Parabéns! ${antes} evoluiu para ${novo.nome}!`);
        await mostrarProgresso(pos, r);
      }
    };

    if (resultado === 'vitoria') {
      await darXpTreinador();
      save.silver += SILVER_POR_VITORIA;
      await dizer(`Você ganhou ${SILVER_POR_VITORIA} ${MOEDA}!`);
      await darXpTime();
    } else if (resultado === 'captura') {
      await darXpTreinador();
      await darXpTime();
      selvagem.hp = Math.max(1, selvagem.hp);
      if (curarAoCapturar) curar(selvagem);
      registrarCapturado(save, selvagem.especieId);
      if (save.time.length < TAMANHO_MAXIMO_TIME) save.time.push(selvagem);
      else {
        const box = guardarNoPC(save, selvagem);
        await dizer(`${dadosSelvagem.nome} foi enviado para o PC (Box ${box + 1}).`);
      }
    } else if (resultado === 'derrota') {
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
    await animarEntrada(spriteSelvagem);
    await dizer(`Um ${dadosSelvagem.nome} selvagem apareceu!`);
    await reproduzir(batalha.iniciar());
    menuPrincipal();
  })();
}
