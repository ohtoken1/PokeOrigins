// Aba "Minha conta": Meu perfil (com os títulos), Conquistas e Minhas skins (Opções fica no mesmo menu, tela própria).
import { bonusAtivoDaSkin, bonusDaSkin, moverSkin, skinsNaBolsa, skinsNaColecao, temSkin, textoBonusSkin } from '../../../shared/skins';
import { itemInegociavel } from '../../../shared/naoTrocavel';
import { BONUS_DO_TITULO, bonusDasConquistas, conquistaFeita, GRUPOS_CONQUISTA, textoRecompensa, TITULOS, tituloAtivo, tituloLiberado, type Conquista } from '../../../shared/conquistas';
import { aoConcluirConquista, progressoDasConquistas, resgatarConquista } from '../conquistas';
import type { Tela } from '../main';
import { TODOS_OS_ITENS } from '../../../shared/loja';
import { carregarSave, salvar, salvarAgora, type Save } from '../estado';
import { aparenciaDoSave } from '../personagem/aparencia';
import { LINHA_DIRECAO, montarPersonagem } from '../personagem/lpc';
import { temArteDeSkin } from '../personagem/skinsDesenho';
import { el } from '../ui/dom';
import { balaoTitulo } from '../ui/titulo';
import { textoDeItem } from '../ui/dicaItem';
import { comDica, linhaDaDica } from '../ui/dica';
import { bonusAtuais } from '../bonificacao';
import { enquadrarPersonagem } from '../personagem/enquadrar';
import { iconeItem } from '../ui/iconeItem';
import { perfilJogador } from './jogadores';
import { TERMOS_DOACAO, pacoteJaComprado, PACOTES_FUNDADOR, PACOTES_VIP, DOACAO_MAXIMA, DOACAO_MINIMA, DOACOES_LIGADAS, goldDoPacote, GOLD_POR_REAL, PACOTES_DOACAO } from '../../../shared/doacao';
import { valorEmMoeda } from '../ui/moeda';
import { avisar } from '../ui/avisos';
import { confirmar } from '../ui/confirmar';
import { api, ErroApi } from '../conta';
import { abrirJanela } from '../ui/janela';
import { conteudoLiberado } from '../trancas';
import { textoTranca } from '../../../shared/trancas';
import { DIAS_LOGIN, DIAS_LOGIN_TRINTA, METAS_DOACAO, PREMIOS_LOGIN, PREMIOS_LOGIN_TRINTA, RECUPERACOES_VIP, type EstadoRecompensas, type PremioRecompensa } from '../../../shared/recompensas';
import { aoMudarRecompensas, buscarRecompensas, estadoRecompensas, recuperarDia } from '../recompensas';

export type SecaoConta = 'perfil' | 'achievements' | 'skins' | 'doacao' | 'recompensas';

/** Conquistas: resumo dos bônus ganhos e a lista por grupo, com o progresso e a recompensa de cada uma. */
function achievements(save: Save): HTMLElement {
  const secao = el('section', { class: 'conta-secao' });
  const pct = (v: number) => `+${(Math.round(v * 1000) / 10).toLocaleString('pt-BR')}%`;
  const desenhar = () => {
    const todas = progressoDasConquistas(save);
    const feitas = todas.filter((x) => x.feita || x.aResgatar).length;
    const esperando = todas.filter((x) => x.aResgatar);
    const bonus = bonusDasConquistas(save);
    const resgatar = (ids: string[]) => {
      const nomes = ids.map((id) => resgatarConquista(save, id)).filter((c) => !!c).map((c) => c!.nome);
      if (!nomes.length) return;
      salvar(save);
      desenhar();
    };
    secao.replaceChildren(
      el('p', { class: 'sub' }, `${feitas} de ${todas.length} concluídas. Ao concluir uma conquista, clique em Resgatar para receber a recompensa.`),
      esperando.length
        ? el('div', { class: 'conquistas-a-resgatar' },
            el('strong', {}, esperando.length > 1 ? `${esperando.length} recompensas esperando por você!` : '1 recompensa esperando por você!'),
            esperando.length > 1 ? el('button', { class: 'botao', onclick: () => resgatar(esperando.map((x) => x.conquista.id)) }, 'Resgatar todas') : null)
        : '',
      el('div', { class: 'skins-total' },
        el('span', {}, 'Poké Dólares em batalhas: ', el('strong', {}, pct(bonus.silver))),
        el('span', {}, 'Shiny, lendários e iniciais: ', el('strong', {}, pct(bonus.raros))),
        el('span', {}, 'Captura: ', el('strong', {}, pct(bonus.captura)))),
      ...GRUPOS_CONQUISTA.map((g) => {
        const doGrupo = todas.filter((x) => x.conquista.grupo === g.id);
        return el('details', { class: 'grupo-conquistas', open: true },
          el('summary', {}, g.nome, el('small', {}, ` ${doGrupo.filter((x) => x.feita || x.aResgatar).length}/${doGrupo.length}`)),
          el('div', { class: 'lista-achievements' },
            ...doGrupo.map(({ conquista: c, valor, meta, feita, aResgatar }) =>
              el('div', { class: `achievement ${feita ? 'feito' : ''} ${aResgatar ? 'a-resgatar' : ''}` },
                el('span', { class: 'achievement-selo' }, feita ? '★' : aResgatar ? '🎁' : ''),
                el('div', { class: 'achievement-texto' },
                  el('strong', {}, c.nome),
                  el('small', {}, c.descricao),
                  el('small', { class: 'achievement-recompensa' }, 'Recompensa: ', recompensaComDica(c)),
                  el('div', { class: 'barra-exp' }, el('div', { class: 'preenchido', style: { width: `${(valor / meta) * 100}%` } }))),
                aResgatar
                  ? el('button', { class: 'botao achievement-resgatar', onclick: () => resgatar([c.id]) }, 'Resgatar')
                  : el('span', { class: 'achievement-progresso' }, feita ? 'Concluída' : meta === 1 ? '' : `${valor.toLocaleString('pt-BR')} / ${meta.toLocaleString('pt-BR')}`)))));
      }),
    );
  };
  desenhar();
  // concluiu alguma com a tela aberta: redesenha (para de ouvir quando a tela sai)
  const parar = aoConcluirConquista(() => (secao.isConnected ? desenhar() : parar()));
  return secao;
}

const emPorcento = (mult: number) => `+${(Math.round((mult - 1) * 1000) / 10).toLocaleString('pt-BR')}%`;

/**
 * O texto da recompensa de uma conquista, com um cartão ao passar o mouse (pedido do dono): item = imagem e
 * descrição; bônus = os bônus que o jogador tem AGORA (todas as fontes juntas); título = o balão e o bônus dele.
 */
function recompensaComDica(c: Conquista): HTMLElement | string {
  const r = c.recompensa;
  const texto = textoRecompensa(r);
  if (r.tipo === 'item') return textoDeItem(r.id, texto);
  if (r.tipo === 'bonus')
    return comDica(el('span', {}, texto), () => {
      const b = bonusAtuais();
      // conquista ainda não concluída: mostra "agora → com a recompensa" nas linhas que ela muda (pedido do dono)
      const save = carregarSave();
      const depois = save && !conquistaFeita(save, c.id) ? bonusAtuais({ alvo: r.alvo, valor: r.valor }) : null;
      const linha = (rotulo: string, chave: keyof typeof b, muda: boolean) =>
        linhaDaDica(rotulo, muda && depois ? `${emPorcento(b[chave])} → ${emPorcento(depois[chave])}` : emPorcento(b[chave]), muda);
      return [
        el('strong', {}, 'Seus bônus agora'),
        el('div', { class: 'dica-linhas' },
          linha('Shiny', 'shiny', r.alvo === 'raros'),
          linha('Lendário, mítico e Ultra Beast', 'lendario', r.alvo === 'raros'),
          linha('Inicial', 'inicial', r.alvo === 'raros'),
          linha('Poké Dólares em batalhas', 'silver', r.alvo === 'silver'),
          linha('XP', 'xp', false),
          linha('Captura', 'captura', r.alvo === 'captura')),
        depois ? null : el('small', { class: 'dica-ja-conta' }, 'Esta conquista já está concluída: o bônus dela já está na conta.'),
        el('p', { class: 'dica-golpe-desc' }, 'Soma de tudo o que está valendo: VIP, skin, conquistas, guilda, título e eventos. O charm do tipo e os itens que o Pokémon segura entram por fora.'),
      ];
    });
  if (r.tipo === 'titulo')
    return comDica(el('span', {}, texto), () => {
      const bonus = emPorcento(1 + (BONUS_DO_TITULO[c.id] ?? 0));
      return [
        balaoTitulo(c.id),
        el('div', { class: 'dica-linhas' },
          linhaDaDica('Shiny', bonus),
          linhaDaDica('Lendário, mítico, Ultra Beast e inicial', bonus),
          linhaDaDica('Poké Dólares em batalhas', bonus),
          linhaDaDica('XP', bonus)),
        el('p', { class: 'dica-golpe-desc' }, 'Só vale enquanto o título estiver em uso (Meu perfil). Não mexe na captura.'),
      ];
    });
  return texto;
}

/** Títulos (Meu perfil): os liberados pelas conquistas; o escolhido aparece no perfil (por enquanto só lá). */
function painelTitulos(save: Save, aoMudar: () => void): HTMLElement {
  const emUso = tituloAtivo(save);
  return el('section', { class: 'perfil-painel painel-titulos' },
    el('h3', {}, 'Títulos'),
    el('p', { class: 'meta' }, 'Escolha um título para mostrar no seu perfil. Eles são liberados por conquistas e pelo passe de batalha. O título em uso dá o bônus dele em shiny, lendários e iniciais, Poké Dólares e XP.'),
    el('div', { class: 'lista-titulos' },
      ...TITULOS.map((t) => {
        const liberado = tituloLiberado(save, t.id);
        const usando = liberado && save.titulo === t.id;
        return el('button', {
          class: `titulo-opcao${usando ? ' em-uso' : ''}`, disabled: !liberado, 'aria-pressed': String(usando),
          title: liberado ? (usando ? 'Clique para tirar' : 'Clique para usar') : t.origem ?? `Conclua a conquista "${t.conquista}"`,
          onclick: () => {
            // clicar de novo no que está em uso tira
            save.titulo = usando ? null : t.id;
            salvar(save);
            aoMudar();
          },
        }, balaoTitulo(t.id), el('small', {},`+${Math.round(t.bonus * 100)}% de bônus · ${liberado ? (usando ? 'Em uso' : 'Liberado') : t.origem ?? `Conquista: ${t.conquista}`}`));
      })),
    emUso ? null : el('small', { class: 'meta' }, 'Nenhum título em uso.'));
}

/**
 * Minhas skins: as skins que o jogador tem (os tickets mandam as skins para cá, não para a bolsa). Duas escolhas
 * separadas: qual skin usar no visual e de qual skin vem o bônus (dá para usar o visual de uma e o bônus de outra).
 */
function skins(save: Save): HTMLElement {
  const secao = el('section', { class: 'conta-secao' });
  const desenhar = () => secao.replaceChildren(...conteudoSkins(save, desenhar));
  desenhar();
  return secao;
}

/** Provador: o personagem andando com a skin escolhida para o visual (e o brilho, se for shiny). */
function provador(save: Save): HTMLElement {
  const canvas = el('canvas', { width: 64, height: 64, class: 'skin-provador-canvas' }) as HTMLCanvasElement;
  void montarPersonagem(aparenciaDoSave(save)).then((f) => {
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    let quadro = 1;
    const y = LINHA_DIRECAO.baixo * 64;
    enquadrarPersonagem(canvas, [f.aura, f.walk], 0, y, 136);
    const passo = () => {
      // a tela foi redesenhada ou fechada: para
      if (!canvas.isConnected) return clearInterval(relogio);
      ctx.clearRect(0, 0, 64, 64);
      if (f.aura) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 270);
        ctx.drawImage(f.aura, quadro * 64, y, 64, 64, 0, 0, 64, 64);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(f.walk, quadro * 64, y, 64, 64, 0, 0, 64, 64);
      quadro = quadro >= 8 ? 1 : quadro + 1;
    };
    const relogio = setInterval(passo, 110);
    passo();
  });
  return el('div', { class: 'skin-provador' }, canvas);
}

function conteudoSkins(save: Save, redesenhar: () => void): HTMLElement[] {
  // só as que estão na coleção (as levadas para a bolsa aparecem lá, como item)
  const minhas = TODOS_OS_ITENS.filter((i) => i.categoria === 'skins' && skinsNaColecao(save, i.id) > 0);
  const naBolsa = TODOS_OS_ITENS.filter((i) => i.categoria === 'skins').reduce((n, i) => n + skinsNaBolsa(save, i.id), 0);
  const levar = (id: string) => {
    if (!moverSkin(save, id, true)) return;
    salvar(save);
    // trocas e mercado conferem o save guardado no servidor (e o visual dos outros jogadores também)
    void salvarAgora();
    redesenhar();
  };
  const total = bonusAtivoDaSkin(save);
  const visual = temSkin(save, save.skinVisual) && temArteDeSkin(save.skinVisual) ? save.skinVisual : null;
  const bonus = temSkin(save, save.skinBonus) ? save.skinBonus : null;
  const nomeDe = (id: string | null) => minhas.find((i) => i.id === id)?.nome ?? 'nenhuma';
  const escolher = (campo: 'skinVisual' | 'skinBonus', id: string) => {
    // clicar de novo na que está em uso tira
    save[campo] = save[campo] === id ? null : id;
    salvar(save);
    // o servidor mostra aos outros jogadores a skin do save guardado: manda logo
    if (campo === 'skinVisual') void salvarAgora();
    redesenhar();
  };
  return [
    el('p', { class: 'sub' }, 'Escolha uma skin para o visual e uma para o bônus: podem ser skins diferentes. O visual muda o seu personagem no mapa e na cidade (os outros jogadores também veem); só vale o bônus da skin escolhida.'),
    el('div', { class: 'skins-provador-linha' }, provador(save), el('small', { class: 'meta' }, visual ? 'É assim que você aparece no mapa.' : 'Sem skin no visual: você aparece com o seu personagem normal.')),
    el('div', { class: 'skins-total' }, el('span', {}, 'Visual: ', el('strong', {}, nomeDe(visual))), el('span', {}, 'Bônus de: ', el('strong', {}, nomeDe(bonus)))),
    el('div', { class: 'skins-total' }, ...([['shiny', 'Shiny'], ['raros', 'Lendário, mítico, Ultra Beast e inicial'], ['silver', 'Poké Dólares em batalhas'], ['captura', 'Captura'], ['xp', 'XP']] as const).map(([k, nome]) =>
      el('span', {}, `${nome}: `, el('strong', {}, `+${(Math.round(total[k] * 1000) / 10).toLocaleString('pt-BR')}%`)))),
    minhas.length
      ? el('div', { class: 'grade-skins' },
          ...minhas.map((i) => el('div', { class: `cartao-skin${i.id === visual || i.id === bonus ? ' em-uso' : ''}` },
            iconeItem(i), el('strong', {}, i.nome), el('small', {}, `×${skinsNaColecao(save, i.id)}`), el('small', { class: 'skin-bonus' }, textoBonusSkin(bonusDaSkin(i.id))),
            el('div', { class: 'skin-botoes' },
              temArteDeSkin(i.id)
                ? el('button', { class: `botao ${i.id === visual ? '' : 'secundario'}`, 'aria-pressed': String(i.id === visual), onclick: () => escolher('skinVisual', i.id) }, i.id === visual ? '✓ Visual' : 'Usar visual')
                : el('button', { class: 'botao secundario', disabled: true, title: 'O desenho desta skin ainda não está pronto' }, 'Visual em breve'),
              el('button', { class: `botao ${i.id === bonus ? '' : 'secundario'}`, 'aria-pressed': String(i.id === bonus), onclick: () => escolher('skinBonus', i.id) }, i.id === bonus ? '✓ Bônus' : 'Usar bônus'),
              // skin NT (conquistas, Kit iniciante) é da conta: não vai para a bolsa
              itemInegociavel(i.id)
                ? el('small', { class: 'meta skin-nt', title: 'Esta skin não pode ser trocada nem vendida' }, '🔒 NT')
                : el('button', { class: 'botao secundario skin-levar', title: 'Na bolsa a skin vira um item: pode ser trocada ou vendida no Mercado negro, mas não dá visual nem bônus', onclick: () => levar(i.id) }, 'Levar para a bolsa')))))
      : el('p', { class: 'meta' }, 'Você ainda não tem nenhuma skin. Elas saem no lendário e no mítico das Orbs, de conquistas e de eventos.'),
    naBolsa ? el('p', { class: 'meta' }, `Skins na bolsa: ${naBolsa}. Para voltar a usar, abra a bolsa e clique em Usar.`) : el('span', {}),
  ];
}

// ---- Recompensas: login de boas-vindas (7 dias) e login dos 30 dias; a doação acumulada fica na página de Doação (server/src/recompensas.ts decide) ----
const dataHora = (ms: number) => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const listaPremios = (premios: PremioRecompensa[]) =>
  el('div', { class: 'recompensa-premios' }, ...premios.map((x) => {
    const item = TODOS_OS_ITENS.find((i) => i.id === x.id);
    const icone = item ? iconeItem(item) : x.id === 'silver' || x.id === 'gold' ? el('span', { class: `icone-moeda moeda-${x.id}` }) : x.id === 'mint' || x.id === 'charm' ? el('span', { class: 'icone-simbolo' }, '🎲') : '';
    return el('span', { class: 'recompensa-premio' }, icone, textoDeItem(x.id, `${x.quantidade > 1 ? `${x.quantidade.toLocaleString('pt-BR')}× ` : ''}${x.nome}`));
  }));

/** Login de boas-vindas: uma casinha por dia em que o jogador entrou (✔), a de hoje destacada e a próxima. */
function gradeDeLogin(premios: PremioRecompensa[][], dia: number, hoje: boolean): HTMLElement {
  return el('div', { class: 'recompensas-grade' },
    ...premios.map((p, i) => {
      const n = i + 1;
      const recebido = n <= dia;
      const estado = recebido ? (hoje && n === dia ? 'recebido hoje' : 'recebido') : n === dia + 1 ? 'proximo' : '';
      return el('div', { class: `recompensa-dia ${estado}` },
        el('small', { class: 'recompensa-numero' }, recebido ? `✔ Dia ${n}` : `Dia ${n}`),
        listaPremios(p));
    }));
}

/** Janela que abre no primeiro login do dia com prêmio de boas-vindas (pedido do dono): os 7 prêmios e o dia atual. */
export function janelaDoLogin(dia: number): void {
  abrirJanela(`🎁 Login de boas-vindas: dia ${dia} de ${DIAS_LOGIN}`, () => el('div', { class: 'janela-login' },
    el('p', { class: 'sub' }, `Obrigado por entrar hoje! Nos ${DIAS_LOGIN} primeiros dias da sua conta, cada dia em que você entra anda uma casinha. O prêmio de hoje já está no seu Correio (NT).`),
    gradeDeLogin(PREMIOS_LOGIN, dia, true)), { classe: 'janela-login-diario' });
}

/** Login dos 30 dias: cada dia do calendário tem o seu prêmio; pego ✔, perdido ✖ (VIP recupera), hoje e os que vêm. */
function gradeDosTrinta(t: EstadoRecompensas['trinta']): HTMLElement {
  const hoje = t.diaAtual ?? 0;
  const restam = RECUPERACOES_VIP - t.recuperacoes;
  const recuperar = async (dia: number) => {
    if (!(await confirmar('Recuperar prêmio', `Usar 1 das suas ${restam} recuperações VIP para pegar o prêmio do dia ${dia}?`))) return;
    try {
      await recuperarDia(dia);
      avisar(`Prêmio do dia ${dia} recuperado! Ele chegou no Correio.`, 'ok');
    } catch (e) {
      avisar(e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.', 'erro');
    }
  };
  return el('div', { class: 'recompensas-grade' },
    ...PREMIOS_LOGIN_TRINTA.map((p, i) => {
      const n = i + 1;
      const pego = t.pegos.includes(n);
      const perdido = !pego && n < hoje;
      const estado = pego ? (n === hoje ? 'recebido hoje' : 'recebido') : perdido ? 'perdido' : n === hoje ? 'proximo' : '';
      return el('div', { class: `recompensa-dia ${estado}` },
        el('small', { class: 'recompensa-numero' }, pego ? `✔ Dia ${n}` : perdido ? `✖ Dia ${n}: perdido` : n === hoje ? `Dia ${n}: hoje` : `Dia ${n}`),
        listaPremios(p),
        perdido && t.vip && restam > 0 ? el('button', { class: 'botao recompensa-recuperar', onclick: () => recuperar(n) }, 'Recuperar (VIP)') : '');
    }));
}

/** Explicação do Login dos 30 dias com a contagem: que dia é hoje, quantos pegou/perdeu e as recuperações do VIP. */
function explicacaoDosTrinta(t: EstadoRecompensas['trinta']): HTMLElement {
  const hoje = t.diaAtual ?? 0;
  const perdidos = Array.from({ length: Math.max(0, hoje - 1) }, (_, i) => i + 1).filter((n) => !t.pegos.includes(n)).length;
  const restam = RECUPERACOES_VIP - t.recuperacoes;
  return el('div', { class: 'recompensa-explicacao' },
    el('div', { class: 'recompensa-contagem' },
      el('span', {}, 'Hoje é o ', el('strong', {}, `dia ${hoje} de ${DIAS_LOGIN_TRINTA}`)),
      el('span', {}, 'Prêmios pegos: ', el('strong', {}, String(t.pegos.length))),
      el('span', {}, 'Perdidos: ', el('strong', {}, String(perdidos))),
      el('span', {}, 'Recuperações VIP: ', el('strong', {}, `${restam} de ${RECUPERACOES_VIP}`))),
    el('p', {}, `Nos ${DIAS_LOGIN_TRINTA} primeiros dias do servidor, cada dia tem o seu prêmio. Entrou no jogo naquele dia, o prêmio é seu e chega pelo Correio. Não entrou, o prêmio daquele dia é perdido (exemplo: entrou no dia 1, faltou no dia 2 e voltou no dia 3 = pega os prêmios 1 e 3).`),
    el('p', {}, t.vip
      ? `⭐ Você é VIP: pode recuperar até ${RECUPERACOES_VIP} prêmios de dias que perdeu (botão "Recuperar" no dia perdido).`
      : `⭐ Jogadores VIP podem recuperar até ${RECUPERACOES_VIP} prêmios de dias perdidos.`),
    el('small', { class: 'meta' }, `Todos os prêmios são NT. Depois do dia ${DIAS_LOGIN_TRINTA}, este login acaba.`));
}

/** Doação acumulada do trimestre: barra até a próxima meta, aviso do reset e a lista de metas. Também na página de Doação. */
function blocoDoacaoAcumulada(r: EstadoRecompensas | null): HTMLElement {
  if (!r) return el('p', { class: 'meta' }, 'Carregando…');
  const d = r.doacao;
  const proxima = METAS_DOACAO.find((m) => d.gold < m.gold);
  const anterior = [...METAS_DOACAO].reverse().find((m) => d.gold >= m.gold)?.gold ?? 0;
  const faltamDias = Math.max(0, Math.ceil((d.fim - Date.now()) / 86_400_000));
  return el('div', { class: 'doacao-acumulada' },
    el('p', { class: 'doacao-reset' }, `⏳ O acumulado zera a cada 3 meses. Este período termina em ${new Date(d.fim - 1).toLocaleDateString('pt-BR')} (${faltamDias === 1 ? 'falta 1 dia' : `faltam ${faltamDias} dias`}); depois disso, todos começam do zero e as metas podem ser ganhas de novo.`),
    el('p', {}, 'Doado neste período: ', valorEmMoeda('gold', d.gold)),
    proxima
      ? el('div', {},
          el('div', { class: 'barra-exp' }, el('div', { class: 'preenchido', style: { width: `${((d.gold - anterior) / (proxima.gold - anterior)) * 100}%` } })),
          el('small', { class: 'meta' }, `Próxima meta: ${proxima.gold.toLocaleString('pt-BR')} (faltam ${(proxima.gold - d.gold).toLocaleString('pt-BR')} Origin Coins)`))
      : el('p', { class: 'meta' }, '🏆 Você alcançou todas as metas deste período. Obrigado!'),
    el('div', { class: 'recompensas-grade metas' },
      ...METAS_DOACAO.map((m) => {
        const ganhou = d.metas.includes(m.gold) || d.gold >= m.gold;
        return el('div', { class: `recompensa-dia ${ganhou ? 'recebido' : m === proxima ? 'proximo' : ''}` },
          el('small', { class: 'recompensa-numero' }, `${ganhou ? '✔ ' : ''}${m.gold.toLocaleString('pt-BR')}`),
          listaPremios(m.premios));
      })),
    el('small', { class: 'meta' }, 'Cada doação soma as Origin Coins doadas (sem o bônus dos pacotes). O prêmio chega pelo Correio assim que você passa da meta.'));
}

function recompensas(): HTMLElement {
  const secao = el('section', { class: 'conta-secao recompensas' });
  const desenhar = () => {
    const r = estadoRecompensas();
    if (!r) return void secao.replaceChildren(el('p', { class: 'meta' }, 'Carregando…'));
    const partes: (HTMLElement | string)[] = [];
    // trava de nível: mostra o aviso no topo da seção (o servidor não dá o prêmio abaixo dela)
    const tranca = (c: 'loginBoasVindas' | 'loginTrinta') => (conteudoLiberado(c) ? '' : el('p', { class: 'recompensa-quebrou' }, textoTranca(c)));
    if (r.trinta.diaAtual !== null)
      partes.push(el('h2', {}, `📅 Login dos ${DIAS_LOGIN_TRINTA} dias`), tranca('loginTrinta'), explicacaoDosTrinta(r.trinta), gradeDosTrinta(r.trinta));
    if (r.login.fim !== null)
      partes.push(
        el('h2', {}, `🎁 Login de boas-vindas (${DIAS_LOGIN} dias)`),
        tranca('loginBoasVindas'),
        el('p', { class: 'sub' }, `Nos ${DIAS_LOGIN} primeiros dias da sua conta, cada dia em que você entra no jogo anda uma casinha e ganha o prêmio dela. Todos são NT e chegam pelo Correio. Termina em ${dataHora(r.login.fim)}.`),
        gradeDeLogin(PREMIOS_LOGIN, r.login.dia, r.login.hoje));
    if (!partes.length) partes.push(el('p', { class: 'meta' }, 'Nenhum login com prêmio acontecendo agora.'));
    secao.replaceChildren(...partes);
  };
  desenhar();
  void buscarRecompensas().catch(() => {});
  const parar = aoMudarRecompensas(() => (secao.isConnected ? desenhar() : parar()));
  return secao;
}

/** Página de doação: pacotes fixos com bônus e valor livre (R$ 1 = 10). O pagamento ainda não está ligado (`DOACOES_LIGADAS`). */
function doacao(save: Save): HTMLElement {
  const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  // código de criador (parceria): conferido no servidor; quando o pagamento for ligado, vai junto com a doação
  let codigoCriador: string | null = null;
  const campoCodigo = el('input', { type: 'text', class: 'db-busca doacao-codigo', maxlength: 20, placeholder: 'Código de criador (opcional)', 'aria-label': 'Código de criador', autocomplete: 'off' }) as HTMLInputElement;
  const statusCodigo = el('small', { class: 'doacao-codigo-status', role: 'status' });
  const aplicarCodigo = async () => {
    const valor = campoCodigo.value.trim().toUpperCase();
    codigoCriador = null;
    if (!valor) return void (statusCodigo.textContent = '');
    try {
      const r = await api<{ codigo: string; criador: string }>('GET', `/parcerias/${encodeURIComponent(valor)}`);
      codigoCriador = r.codigo;
      statusCodigo.textContent = `✅ Apoiando ${r.criador}`;
      statusCodigo.className = 'doacao-codigo-status ok';
    } catch (e) {
      statusCodigo.textContent = e instanceof ErroApi ? `❌ ${e.message}` : '❌ Sem conexão com o servidor.';
      statusCodigo.className = 'doacao-codigo-status erro';
    }
  };
  campoCodigo.addEventListener('input', () => (campoCodigo.value = campoCodigo.value.toUpperCase().replace(/[^A-Z0-9]/g, '')));
  /** Janela de confirmação (pedido do dono): resumo, forma de pagamento (ainda desligada) e o aceite dos termos. */
  const doar = (valor: number, titulo = 'Doação', linhas: (string | HTMLElement)[] = []) => {
    let aceito = false;
    abrirJanela('💛 Confirmar doação', (janela) => {
      const botao = el('button', { class: 'botao doacao-confirmar', disabled: !aceito || !DOACOES_LIGADAS,
        onclick: () => avisar('As doações ainda não estão abertas. Em breve!', 'info') }, `Doar ${reais(valor)}`);
      const caixa = el('input', { type: 'checkbox', checked: aceito, onchange: (e: Event) => ((aceito = (e.target as HTMLInputElement).checked), janela.redesenhar()) });
      return el('div', { class: 'doacao-checkout' },
        el('div', { class: 'doacao-resumo' },
          el('strong', {}, titulo),
          el('span', { class: 'doacao-resumo-valor' }, reais(valor)),
          linhas.length ? el('ul', { class: 'doacao-conteudo' }, ...linhas.map((l) => el('li', {}, l))) : '',
          codigoCriador ? el('small', {}, `🎥 Apoiando o código ${codigoCriador}`) : ''),
        el('h3', {}, 'Forma de pagamento'),
        el('div', { class: 'doacao-formas' },
          el('button', { class: 'botao secundario', disabled: true }, '⚡ Pix ', el('small', {}, '(em breve)')),
          el('button', { class: 'botao secundario', disabled: true }, '💳 Cartão ', el('small', {}, '(em breve)'))),
        el('h3', {}, 'Termos de doação'),
        el('div', { class: 'doacao-termos' }, ...TERMOS_DOACAO.map((t) => el('p', {}, el('strong', {}, t.titulo), el('br'), t.texto))),
        el('label', { class: 'doacao-aceite' }, caixa, ' Li e aceito os Termos de doação'),
        botao,
        DOACOES_LIGADAS ? '' : el('small', { class: 'meta' }, 'Os pagamentos ainda não estão abertos. Em breve!'));
    }, { classe: 'janela-doacao' });
  };
  // valor livre
  const campo = el('input', { type: 'number', min: String(DOACAO_MINIMA), max: String(DOACAO_MAXIMA), step: '1', value: '15', class: 'doacao-campo' }) as HTMLInputElement;
  const recebe = el('strong', { class: 'doacao-gold' });
  const botaoLivre = el('button', { class: 'botao', onclick: () => doar(valorLivre(), 'Outro valor', [valorEmMoeda('gold', goldDoPacote({ reais: valorLivre() }))]) }) as HTMLButtonElement;
  const valorLivre = () => Math.floor(Number(campo.value) || 0);
  const atualizar = () => {
    const v = valorLivre();
    const ok = v >= DOACAO_MINIMA && v <= DOACAO_MAXIMA;
    recebe.replaceChildren(valorEmMoeda('gold', ok ? goldDoPacote({ reais: v }) : 0));
    botaoLivre.disabled = !ok;
    botaoLivre.textContent = ok ? `Doar ${reais(v)}` : `De ${reais(DOACAO_MINIMA)} a ${reais(DOACAO_MAXIMA)}`;
  };
  campo.addEventListener('input', atualizar);
  atualizar();
  const acumulada = el('div', {}, blocoDoacaoAcumulada(estadoRecompensas()));
  const pararAcumulada = aoMudarRecompensas(() => (acumulada.isConnected || pacotes.isConnected ? acumulada.replaceChildren(blocoDoacaoAcumulada(estadoRecompensas())) : pararAcumulada()));
  void buscarRecompensas().catch(() => {});
  const pacotes = el('div', { class: 'doacao-aba-pacotes' },
    el('p', { class: 'sub' }, `O PokeOrigins é grátis. Quem quiser ajudar a manter o servidor no ar pode fazer uma doação e recebe Origin Coins como agradecimento (R$ 1 = ${GOLD_POR_REAL} Origin Coins).`),
    el('div', { class: 'doacao-criador' },
      el('strong', {}, '🎥 Apoie um criador de conteúdo'),
      el('small', {}, 'Tem o código de um streamer ou criador parceiro? Digite aqui: parte da sua doação ajuda quem divulga o PokeOrigins.'),
      el('div', { class: 'doacao-criador-linha' }, campoCodigo, el('button', { class: 'botao', onclick: aplicarCodigo }, 'Aplicar')),
      statusCodigo),
    el('h2', {}, 'Pacotes'),
    el('div', { class: 'doacao-pacotes' },
      ...PACOTES_DOACAO.map((p) => el('div', { class: 'doacao-pacote' },
        p.bonus ? el('span', { class: 'doacao-bonus' }, `+${Math.round(p.bonus * 100)}% de bônus`) : '',
        el('span', { class: 'doacao-moeda' }),
        el('strong', { class: 'doacao-gold' }, valorEmMoeda('gold', goldDoPacote(p))),
        p.bonus ? el('small', { class: 'doacao-base' }, `${goldDoPacote({ reais: p.reais }).toLocaleString('pt-BR')} + ${(goldDoPacote(p) - goldDoPacote({ reais: p.reais })).toLocaleString('pt-BR')} de bônus`) : el('small', { class: 'doacao-base' }, ' '),
        el('span', { class: 'doacao-vip' }, `+ ${p.vipDias} ${p.vipDias === 1 ? 'dia' : 'dias'} de VIP`),
        el('button', { class: 'botao', onclick: () => doar(p.reais, `Pacote de ${reais(p.reais)}`, [valorEmMoeda('gold', goldDoPacote(p)), `${p.vipDias} ${p.vipDias === 1 ? 'dia' : 'dias'} de VIP`]) }, `Doar ${reais(p.reais)}`)))),
    el('h2', {}, 'Pacotes Fundador'),
    el('div', { class: 'doacao-pacotes' },
      ...PACOTES_FUNDADOR.map((p) => el('div', { class: `doacao-pacote doacao-fundador ${p.id}` },
        el('img', { class: 'doacao-fundador-img', src: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.numero}.png`, alt: p.nome }),
        el('strong', { class: 'doacao-gold' }, p.nome),
        el('ul', { class: 'doacao-conteudo' },
          el('li', {}, valorEmMoeda('gold', p.gold)),
          el('li', {}, `${p.vipDias} dias de VIP`),
          el('li', {}, `Título: ${p.nome}`),
          ...p.itens.map((i) => {
            const item = TODOS_OS_ITENS.find((x) => x.id === i.id);
            return el('li', {}, item ? iconeItem(item) : '', textoDeItem(i.id, `${i.quantidade}× ${item?.nome ?? i.id}`));
          })),
        el('small', { class: 'doacao-limite' }, 'Limite: 1 por conta'),
        pacoteJaComprado(save, p.id)
          ? el('button', { class: 'botao', disabled: true }, '✔ Já adquirido')
          : el('button', { class: 'botao', onclick: () => doar(p.reais, p.nome, [valorEmMoeda('gold', p.gold), `${p.vipDias} dias de VIP`, `Título: ${p.nome}`, ...p.itens.map((i) => `${i.quantidade}× ${TODOS_OS_ITENS.find((x) => x.id === i.id)?.nome ?? i.id}`)]) }, `Doar ${reais(p.reais)}`)))),
    el('h2', {}, 'Pacotes VIP'),
    el('div', { class: 'doacao-pacotes' },
      ...PACOTES_VIP.map((p) => el('div', { class: 'doacao-pacote' },
        el('span', { class: 'selo-vip-doacao' }, 'VIP'),
        el('strong', { class: 'doacao-gold' }, p.nome),
        el('span', { class: 'doacao-vip' }, `${p.vipDias} dias de VIP`),
        el('button', { class: 'botao', onclick: () => doar(p.reais, p.nome, [`${p.vipDias} dias de VIP`]) }, `Doar ${reais(p.reais)}`)))),
    el('h2', {}, 'Outro valor'),
    el('div', { class: 'doacao-livre' },
      el('label', {}, 'R$ ', campo),
      el('span', {}, '→'), recebe, botaoLivre),
    el('p', { class: 'sub doacao-nota' }, 'As Origin Coins chegam pelo Correio depois que o pagamento for confirmado.'));
  // abas (pedido do dono): os pacotes numa, a doação acumulada em outra
  const corpo = el('div', {});
  const abas = el('nav', { class: 'admin-abas doacao-abas' });
  const mostrar = (qual: 'pacotes' | 'acumulada') => {
    abas.replaceChildren(
      el('button', { class: `aba ${qual === 'pacotes' ? 'ativa' : ''}`, type: 'button', onclick: () => mostrar('pacotes') }, '💛 Pacotes'),
      el('button', { class: `aba ${qual === 'acumulada' ? 'ativa' : ''}`, type: 'button', onclick: () => mostrar('acumulada') }, '🏆 Doação acumulada'));
    corpo.replaceChildren(qual === 'pacotes' ? pacotes : acumulada);
  };
  mostrar('pacotes');
  return el('section', { class: 'conta-secao doacao' }, abas, corpo);
}

export const telaConta = (secao: SecaoConta): Tela => (raiz, navegar) => {
  const save = carregarSave();
  const titulos: Record<SecaoConta, string> = { perfil: 'Meu perfil', achievements: 'Conquistas', skins: 'Minhas skins', doacao: 'Doação', recompensas: 'Recompensas' };
  const tela = el('main', { class: 'tela tela-conta' }, el('h1', {}, titulos[secao]));
  raiz.append(tela);
  if (!save) {
    tela.append(el('p', { class: 'sub' }, 'Comece um jogo para ver sua conta.'), el('button', { class: 'botao', onclick: () => navegar({ tela: 'inicial' }) }, 'Começar'));
    return;
  }
  if (secao === 'perfil') {
    const corpo = el('div', { class: 'conta-perfil' });
    const desenhar = () => corpo.replaceChildren(perfilJogador(save), painelTitulos(save, desenhar));
    desenhar();
    tela.append(corpo);
  }
  else if (secao === 'achievements') tela.append(achievements(save));
  else if (secao === 'doacao') tela.append(doacao(save));
  else if (secao === 'recompensas') tela.append(recompensas());
  else tela.append(skins(save));
};
