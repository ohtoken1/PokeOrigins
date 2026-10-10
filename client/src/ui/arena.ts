// Arena da cidade: tudo de duelos fica aqui (pedido do dono). Clicar na Arena abre esta janela para escolher
// entre Ginásios, Duelos com treinadores, Torneio e Liga Pokémon (os dois últimos ainda não existem).
import { REGIOES } from '../../../shared/regioes';
import type { Destino, Navegar } from '../main';
import { ehAdministrador } from '../bonificacao';
import { carregarSave } from '../estado';
import { aoMudarViagem, viagemAtual } from '../viagem';
import { el } from './dom';
import { abrirJanela } from './janela';

const nomeDaRegiao = (id: string) => REGIOES.find((r) => r.id === id)?.nome ?? id;

export function abrirArena(navegar: Navegar): void {
  const janela = abrirJanela('Arena', () => {
    const save = carregarSave();
    const viagem = ehAdministrador() ? null : viagemAtual();
    const opcoes: { nome: string; descricao: string; destino?: Destino; fechado?: string }[] = [
      {
        nome: 'Ginásios',
        descricao: save ? `Os 8 líderes de ${nomeDaRegiao(save.regiao)}. Vença para ganhar as insígnias.` : 'Vença os líderes para ganhar as insígnias.',
        destino: { tela: 'ginasios' },
        // viajando, o jogador não está em região nenhuma
        fechado: viagem ? `Fechado até o trem chegar a ${nomeDaRegiao(viagem.para)}` : undefined,
      },
      { nome: 'Duelos com treinadores', descricao: 'Enfrente treinadores e ganhe silver.', destino: { tela: 'duelos' } },
      { nome: 'Torneio', descricao: 'Torneios entre jogadores.', fechado: 'Em breve' },
      { nome: 'Liga Pokémon', descricao: 'O desafio final de cada região.', fechado: 'Em breve' },
    ];
    return el('div', { class: 'arena-opcoes' },
      ...opcoes.map((o) =>
        el('button', {
          class: 'arena-opcao', type: 'button', disabled: !!o.fechado || !o.destino,
          onclick: () => {
            janela.fechar();
            navegar(o.destino!);
          },
        }, el('strong', {}, o.nome), el('span', {}, o.descricao), o.fechado ? el('small', {}, o.fechado) : null)));
  }, { classe: 'janela-banco', aoFechar: () => parar() });
  // o trem partiu ou chegou com a janela aberta
  const parar = aoMudarViagem(() => janela.redesenhar());
}
