// Safari: as 3 salas do jogador (ninguém mais entra: sem sala online). Os Pokémon andam no mapa e a batalha começa
// ao clicar em um; os outros somem e a saída de cima leva à sala seguinte. Mapa e Pokémon em jogo/safariVida.ts,
// regras em shared/safari.ts, entradas no servidor.
import { aplicarLiderNoSelvagem } from '../../../shared/campo';
import { SALAS_SAFARI } from '../../../shared/safari';
import { nomeTipo } from '../../../shared/traducao';
import { abrirBatalha } from '../batalha/telaBatalha';
import { pokemonPorId } from '../dados';
import { carregarSave, novoPokemon, salvar, usarSave } from '../estado';
import { sortearIvs } from '../../../shared/ovos';
import { IV_MIN_SHINY, hpMaximo } from '../../../shared/batalha/pokemon';
import { IVS_MINIMOS_SAFARI } from '../../../shared/safari';
import type { BiomaScene, OpcoesBioma } from '../jogo/BiomaScene';
import { mostrarJogo } from '../jogo/jogoUnico';
import type { Tela } from '../main';
import { aparenciaDoSave } from '../personagem/aparencia';
import { montarPersonagem } from '../personagem/lpc';
import { biomaDoTipo, fecharSafari, guardarSafari, prepararSafari } from '../safari';
import { montarChat } from '../ui/chat';
import { el } from '../ui/dom';
import { aoMudarJanelas } from '../ui/janela';
import { botoesMenus } from '../ui/menus';
import { acompanharTime, painelTime } from '../ui/time';

export const telaSafari: Tela = (raiz, navegar) => {
  const save = carregarSave();
  if (!save) return navegar({ tela: 'inicial' });
  usarSave(save);
  const aberto = prepararSafari(save);
  if (!aberto) return navegar({ tela: 'cidade' });
  const bioma = biomaDoTipo(aberto.tipo);
  document.body.dataset.fundo = bioma.id;

  let cena: () => BiomaScene | null = () => null;
  const caixaTime = el('div', {});
  const atualizarTime = () => {
    caixaTime.replaceChildren(
      painelTime(save.time, () => {
        salvar(save);
        atualizarTime();
      }),
    );
    cena()?.definirSeguidor(save.time[0] ? { especie: save.time[0].especieId, shiny: save.time[0].shiny } : null);
  };
  atualizarTime();
  // o time mudou por fora (PC, bolsa…): aparece na hora
  acompanharTime(caixaTime, atualizarTime);

  const subtitulo = el('small', {});
  const dica = el('p', { class: 'dica' });
  const atualizarTextos = () => {
    subtitulo.textContent = ` · Sala ${aberto.sala + 1} de ${SALAS_SAFARI}`;
    dica.textContent = !aberto.escolhido
      ? 'Passe o mouse para ver quem é cada Pokémon e clique no que você quer enfrentar. Os outros vão embora.'
      : aberto.sala + 1 < SALAS_SAFARI
        ? 'A saída de cima abriu: siga por ela até a próxima sala.'
        : 'Última sala feita! Siga pela saída de cima para terminar o Safari.';
  };
  atualizarTextos();

  let saindo = false;
  const sair = () => {
    if (saindo) return;
    saindo = true;
    fecharSafari(save);
    navegar({ tela: 'cidade' });
  };
  let confirmando = false;
  const botaoSair = el('button', {
    class: 'botao secundario', type: 'button',
    onclick: () => {
      if (confirmando) return sair();
      confirmando = true;
      botaoSair.textContent = 'Sair mesmo? A entrada não volta';
      window.setTimeout(() => {
        confirmando = false;
        botaoSair.textContent = '← Sair do Safari';
      }, 4000);
    },
  }, '← Sair do Safari');

  const areaJogo = el('div', { class: 'area-jogo' });
  const chat = montarChat();
  raiz.append(
    el('main', { class: 'tela tela-bioma tela-safari' },
      el('header', { class: 'barra' }, botaoSair, el('h1', {}, `Safari de ${nomeTipo(aberto.tipo)}`, subtitulo), ...botoesMenus(save, () => atualizarTime(), true)),
      el('div', { class: 'layout-bioma' },
        el('section', {}, areaJogo, dica),
        el('aside', {}, caixaTime, chat.elemento))),
  );

  const carregando = el('div', { class: 'carregando-mapa' }, el('span', { class: 'giro' }), 'Carregando Safari…');
  const aviso = el('div', { class: 'cidade-aviso', role: 'status' });
  areaJogo.append(carregando, aviso);
  let relogioAviso = 0;
  const avisar = (texto: string) => {
    aviso.textContent = texto;
    aviso.classList.add('visivel');
    clearTimeout(relogioAviso);
    relogioAviso = window.setTimeout(() => aviso.classList.remove('visivel'), 2600);
  };

  let emBatalha = false;
  let janelaAberta = false;
  const atualizarPausa = () => cena()?.pausar(emBatalha || janelaAberta);

  const aparencia = aparenciaDoSave(save);
  const opcoes: OpcoesBioma = {
    bioma,
    aoPronto: () => carregando.remove(),
    seguidor: save.time[0] ? { especie: save.time[0].especieId, shiny: save.time[0].shiny } : null,
    aoPisar: () => {
      save.passos++;
      salvar(save);
    },
    personagem: { chave: JSON.stringify(aparencia), folhas: montarPersonagem(aparencia) },
    nomeJogador: save.aparencia?.nome,
    safari: {
      salas: aberto.salas.map((sala) =>
        sala.map((p) => ({ especie: p.id, shiny: p.shiny, rotulo: `${p.shiny ? '★ ' : ''}${pokemonPorId(p.id).nome} Nv. ${p.nivel}` }))),
      sala: aberto.sala,
      escolhido: aberto.escolhido,
      aoClicar: (indice) => {
        const sorteado = aberto.salas[aberto.sala]?.[indice];
        if (!sorteado || aberto.escolhido || emBatalha || janelaAberta) return;
        if (!save.time.some((p) => p.hp > 0)) return avisar('Seu time está desmaiado. Cure no Centro Pokémon e volte: o Safari fica guardado.');
        // a escolha vale a partir daqui (fugir ou perder também gasta a sala)
        aberto.escolhido = true;
        guardarSafari(save, aberto);
        if (!save.vistos.includes(sorteado.id)) save.vistos.push(sorteado.id);
        cena()?.escolherNoSafari();
        atualizarTextos();
        const selvagem = novoPokemon(sorteado.id, sorteado.nivel, sorteado.shiny);
        // só Pokémon tier A ou melhor no Safari (pedido do dono): soma dos IVs 120+; shiny continua com 15+ em cada
        selvagem.ivs = sortearIvs(IVS_MINIMOS_SAFARI, sorteado.shiny ? IV_MIN_SHINY : 0);
        selvagem.hp = hpMaximo(selvagem);
        // Synchronize (Nature) e Cute Charm (gênero) do primeiro do time valem como nos mapas
        aplicarLiderNoSelvagem(selvagem, save.time[0]);
        emBatalha = true;
        atualizarPausa();
        abrirBatalha({
          save,
          bioma,
          selvagem,
          aoTerminar: (resultado) => {
            // perdeu: o Safari acaba (o time é curado, como nos mapas)
            if (resultado === 'derrota') return sair();
            atualizarTime();
            emBatalha = false;
            atualizarPausa();
          },
        });
      },
      aoMudarSala: (sala) => {
        aberto.sala = sala;
        aberto.escolhido = false;
        guardarSafari(save, aberto);
        atualizarTextos();
      },
      aoSair: sair,
    },
  };
  const jogo = mostrarJogo(areaJogo, opcoes);
  cena = jogo.cena;

  const pararDeOuvirJanelas = aoMudarJanelas((abertaAgora) => {
    janelaAberta = abertaAgora;
    atualizarPausa();
  });

  return () => {
    delete document.body.dataset.fundo;
    pararDeOuvirJanelas();
    chat.parar();
    clearTimeout(relogioAviso);
    jogo.tirar();
  };
};
