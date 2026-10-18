// Arena da cidade: tudo de duelos fica aqui (pedido do dono). Clicar na Arena abre esta janela para escolher
// entre Ginásios, Duelos com treinadores, Torneio e Liga Pokémon.
import { REGIOES } from '../../../shared/regioes';
import type { Destino, Navegar } from '../main';
import { ehAdministrador } from '../bonificacao';
import { carregarSave } from '../estado';
import { aoMudarViagem, viagemAtual } from '../viagem';
import { textoTranca } from '../../../shared/trancas';
import { conteudoLiberado } from '../trancas';
import { el } from './dom';
import { abrirJanela } from './janela';
import { abrirTorneio } from './torneio';

const nomeDaRegiao = (id: string) => REGIOES.find((r) => r.id === id)?.nome ?? id;

export function abrirArena(navegar: Navegar, abrirLiga?: () => void): void {
  const janela = abrirJanela('Arena', () => {
    const save = carregarSave();
    const viagem = ehAdministrador() ? null : viagemAtual();
    const opcoes: { nome: string; descricao: string; destino?: Destino; acao?: () => void; fechado?: string }[] = [
      {
        nome: 'Ginásios',
        descricao: save ? `Os 8 líderes de ${nomeDaRegiao(save.regiao)}. Vença para ganhar as insígnias.` : 'Vença os líderes para ganhar as insígnias.',
        destino: { tela: 'ginasios' },
        // viajando, o jogador não está em região nenhuma
        fechado: viagem ? `Fechado até o trem chegar a ${nomeDaRegiao(viagem.para)}` : undefined,
      },
      { nome: 'Duelos com treinadores', descricao: 'Enfrente treinadores e ganhe Poké Dólares.', destino: { tela: 'duelos' } },
      { nome: 'Torneio', descricao: 'Mata-mata de 16 jogadores, às 12h30 e 18h30.', acao: abrirTorneio, fechado: conteudoLiberado('torneio') ? undefined : textoTranca('torneio') },
      { nome: 'Liga Pokémon', descricao: 'Elite 4 + Campeão e a Liga Nightmare, com um treinador de cada tipo.', acao: abrirLiga, fechado: !conteudoLiberado('liga') ? textoTranca('liga') : abrirLiga ? undefined : 'Em breve' },
    ];
    return el('div', { class: 'arena-opcoes' },
      ...opcoes.map((o) =>
        el('button', {
          class: 'arena-opcao', type: 'button', disabled: !!o.fechado || (!o.destino && !o.acao),
          onclick: () => {
            janela.fechar();
            if (o.acao) o.acao();
            else navegar(o.destino!);
          },
        }, el('strong', {}, o.nome), el('span', {}, o.descricao), o.fechado ? el('small', {}, o.fechado) : null)));
  }, { classe: 'janela-banco', aoFechar: () => parar() });
  // o trem partiu ou chegou com a janela aberta
  const parar = aoMudarViagem(() => janela.redesenhar());
}
