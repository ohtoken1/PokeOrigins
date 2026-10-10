// Aba "Administração" (só para contas de administrador). Bonificação e Anúncios funcionam (os anúncios vão para
// o Mural da cidade, pelo servidor); as outras seções ficam "em breve".
import type { Tela } from '../main';
import { NOMES_BONUS, VALORES_BONUS, textoBonus, type ChaveBonus } from '../../../shared/bonificacao';
import { bonificacao, definirBonus, ehAdministrador } from '../bonificacao';
import { ANUNCIO_TEXTO_MAX, ANUNCIO_TITULO_MAX } from '../../../shared/anuncios';
import { anuncios, aoMudarAnuncios, apagarAnuncio, carregarAnuncios, publicarAnuncio } from '../anuncios';
import { ErroApi } from '../conta';
import { el } from '../ui/dom';
import { cartaoAnuncio } from '../ui/mural';

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
  { id: 'anuncios', nome: 'Anúncios' },
];

/** Anúncios: escrever um aviso novo (vai para o Mural de anúncios da cidade de todos) e apagar os que já estão lá. */
function secaoAnuncios(): { elemento: HTMLElement; parar: () => void } {
  const titulo = el('input', { type: 'text', class: 'db-busca', maxlength: ANUNCIO_TITULO_MAX, placeholder: 'Título', 'aria-label': 'Título do anúncio' }) as HTMLInputElement;
  const texto = el('textarea', { class: 'db-busca anuncio-campo', maxlength: ANUNCIO_TEXTO_MAX, rows: 6, placeholder: 'Texto do anúncio', 'aria-label': 'Texto do anúncio' }) as HTMLTextAreaElement;
  const contador = el('small', { class: 'meta' });
  const aviso = el('p', { class: 'amigos-aviso', role: 'status' });
  const publicados = el('div', { class: 'mural' });
  const erro = (e: unknown) => void (aviso.textContent = e instanceof ErroApi ? e.message : 'Sem conexão com o servidor.');
  const contar = () => void (contador.textContent = `${texto.value.length}/${ANUNCIO_TEXTO_MAX}`);
  texto.addEventListener('input', contar);
  contar();
  let publicando = false;
  const publicar = async () => {
    if (publicando) return;
    if (!titulo.value.trim() || !texto.value.trim()) return void (aviso.textContent = 'Escreva o título e o texto.');
    publicando = true;
    aviso.textContent = '';
    try {
      await publicarAnuncio(titulo.value, texto.value);
      titulo.value = texto.value = '';
      contar();
      aviso.textContent = 'Anúncio publicado no Mural da cidade.';
    } catch (e) {
      erro(e);
    }
    publicando = false;
  };
  const desenhar = () => {
    const lista = anuncios();
    publicados.replaceChildren(...(lista.length
      ? lista.map((a) => cartaoAnuncio(a, false,
          el('button', { class: 'botao perigo', onclick: () => confirm(`Apagar o anúncio "${a.titulo}"?`) && void apagarAnuncio(a.id).then(() => void (aviso.textContent = 'Anúncio apagado.'), erro) }, 'Apagar')))
      : [el('p', { class: 'meta' }, 'Nenhum anúncio publicado.')]));
  };
  const parar = aoMudarAnuncios(desenhar);
  desenhar();
  void carregarAnuncios().catch(erro);
  return {
    parar,
    elemento: el('section', { class: 'bonus-secao' },
      el('p', { class: 'sub' }, 'O que você publicar aqui aparece no Mural de anúncios da cidade para todos os jogadores. Quem estiver com o jogo aberto recebe um aviso na hora.'),
      el('div', { class: 'cla-formulario' },
        el('label', { class: 'cla-campo' }, 'Título', titulo),
        el('label', { class: 'cla-campo' }, 'Texto', texto, contador),
        el('button', { class: 'botao cla-botao-criar', onclick: () => void publicar() }, 'Publicar anúncio')),
      aviso,
      el('h2', { class: 'anuncios-titulo' }, 'No mural agora'),
      publicados),
  };
}

export const telaAdministracao = (secaoInicial: SecaoAdministracao): Tela => (raiz, navegar) => {
  const tela = el('main', { class: 'tela tela-administracao' }, el('h1', {}, 'Administração'));
  raiz.append(tela);
  if (!ehAdministrador()) {
    tela.append(el('p', { class: 'sub' }, 'Esta área é só para administradores.'));
    return;
  }
  let secao = secaoInicial;
  const corpo = el('div', { class: 'admin-corpo' });
  // montada uma vez só (redesenhar a tela não apaga o que a pessoa está escrevendo)
  const partesAnuncios = secao === 'anuncios' ? secaoAnuncios() : null;

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
        : partesAnuncios ? partesAnuncios.elemento
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
  return () => partesAnuncios?.parar();
};
