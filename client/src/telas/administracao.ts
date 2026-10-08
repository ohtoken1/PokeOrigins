// Aba "Administração" (só para contas de administrador; sem contas ainda, aparece para todos).
// Bonificação funciona; as outras seções ficam "em breve" até existir servidor.
import type { Tela } from '../main';
import { NOMES_BONUS, VALORES_BONUS, textoBonus, type ChaveBonus } from '../../../shared/bonificacao';
import { bonificacao, definirBonus, ehAdministrador } from '../bonificacao';
import { el } from '../ui/dom';

export type SecaoAdministracao = 'bonificacao' | 'log' | 'jogadores' | 'eventos' | 'anuncios';

export const SECOES_ADMINISTRACAO: { id: SecaoAdministracao; nome: string; emBreve?: string }[] = [
  { id: 'bonificacao', nome: 'Bonificação' },
  {
    id: 'log',
    nome: 'Log',
    emBreve: 'Registro de tudo o que acontece no jogo: o que entra e sai (silver, gold, itens, Pokémon, tickets), quem fez e quando — para achar abuso de bug. Vai ser ligado com o servidor.',
  },
  { id: 'jogadores', nome: 'Jogadores', emBreve: 'Ver e editar contas, banir e dar itens a jogadores (precisa do servidor).' },
  { id: 'eventos', nome: 'Eventos', emBreve: 'Agendar eventos, como fim de semana com bônus ou Pokémon especiais.' },
  { id: 'anuncios', nome: 'Anúncios', emBreve: 'Mandar avisos para todos os jogadores.' },
];

export const telaAdministracao = (secaoInicial: SecaoAdministracao): Tela => (raiz, navegar) => {
  const tela = el('main', { class: 'tela tela-administracao' }, el('h1', {}, 'Administração'));
  raiz.append(tela);
  if (!ehAdministrador()) {
    tela.append(el('p', { class: 'sub' }, 'Esta área é só para administradores.'));
    return;
  }
  let secao = secaoInicial;
  const corpo = el('div', { class: 'admin-corpo' });

  const linhaBonus = (chave: ChaveBonus) => {
    const atual = bonificacao()[chave];
    return el(
      'div',
      { class: 'bonus-linha' },
      el('div', {}, el('strong', {}, NOMES_BONUS[chave].nome), el('small', {}, NOMES_BONUS[chave].descricao)),
      el('div', { class: 'bonus-valores' },
        ...VALORES_BONUS.map((v) => el('button', { class: `aba ${v === atual ? 'ativa' : ''}`, onclick: () => (definirBonus(chave, v), desenhar()) }, textoBonus(v)))),
    );
  };

  function desenhar() {
    const info = SECOES_ADMINISTRACAO.find((s) => s.id === secao)!;
    const b = bonificacao();
    const ativos = (Object.keys(b) as ChaveBonus[]).filter((k) => b[k] > 1);
    corpo.replaceChildren(
      el('nav', { class: 'admin-abas' },
        ...SECOES_ADMINISTRACAO.map((s) => el('button', { class: `aba ${s.id === secao ? 'ativa' : ''}`, onclick: () => navegar({ tela: 'administracao', secao: s.id }) }, s.nome))),
      info.emBreve
        ? el('section', { class: 'em-breve' }, el('span', { class: 'selo-em-breve' }, 'Em breve'), el('p', {}, info.emBreve))
        : el(
            'section',
            { class: 'bonus-secao' },
            el('p', { class: 'sub' }, 'Multiplicadores para todos os jogadores, de 1x até 3x. Valem na hora para as próximas batalhas e encontros.'),
            ...(['silver', 'xp', 'shiny', 'lendario'] as ChaveBonus[]).map(linhaBonus),
            el('p', { class: 'meta' }, ativos.length ? `Ativos agora: ${ativos.map((k) => `${NOMES_BONUS[k].nome} ${textoBonus(b[k])}`).join(' · ')}` : 'Nenhum bônus ativo (tudo 1x).'),
            ativos.length
              ? el('button', { class: 'botao secundario', onclick: () => ((['silver', 'xp', 'shiny', 'lendario'] as ChaveBonus[]).forEach((k) => definirBonus(k, 1)), desenhar()) }, 'Voltar tudo para 1x')
              : null,
            el('small', { class: 'meta' }, 'Por enquanto fica guardado só neste navegador; com o servidor, vai valer para todo mundo.'),
          ),
    );
  }
  desenhar();
  tela.append(corpo);
};
