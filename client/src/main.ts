import './estilo.css';
import { lembrarLugar, ultimoLugar } from './lugar';
import { destinoDaBatalha } from './batalha/retomada';
import './estilo-pokedex.css';
import { carregarSave, salvar } from './estado';
import { ajustarTimeAoLimite } from './limiteNivel';
import { iniciarMusica } from './sons';
import { telaEscolhaInicial } from './telas/escolhaInicial';
import { telaRegiao } from './telas/regiao';
import { telaBioma } from './telas/bioma';
import { telaCidade } from './telas/cidade';
import { telaSafari } from './telas/safari';
import { telaPokedex } from './telas/pokedex';
import { telaDatabase } from './telas/database';
import { telaPersonagem } from './telas/personagem';
import { telaOpcoes } from './telas/opcoes';
import { telaGolpes } from './telas/golpes';
import { telaRanking } from './telas/ranking';
import { telaInicio } from './telas/inicio';
import { telaAdministracao, type SecaoAdministracao } from './telas/administracao';
import { telaJogadores } from './telas/jogadores';
import { telaConta, type SecaoConta } from './telas/conta';
import { telaDuelos } from './telas/duelos';
import { telaGinasios } from './telas/ginasios';
import { telaComunidade, type SecaoComunidade } from './telas/comunidade';
import { montarPainelAdmin } from './ui/admin';
import { montarBarraTopo } from './ui/barraTopo';
import { montarCabecalho } from './ui/cabecalho';
import { definirNavegacao } from './ui/navegacao';
import { montarAvisoSincronia } from './ui/sincronia';
import { ativarDeslizantes } from './ui/deslizante';
import { garantirConta } from './telas/entrada';
import { vigiarTrocas } from './ui/troca';
import { conectarOnline } from './online';
import { vigiarAmigos } from './amigos';
import { vigiarCla } from './cla';
import { vigiarAnuncios } from './anuncios';
import { aoMudarViagem, vigiarViagem } from './viagem';
import { vigiarOutbreak } from './outbreak';
import { vigiarNinho } from './ninho';
import { vigiarExpedicao } from './expedicao';
import { vigiarBoss } from './boss';
import { vigiarConquistas } from './conquistas';
import { vigiarPvp } from './pvp';
import { vigiarCorreio } from './correio';
import { vigiarRecompensas } from './recompensas';
import { ativarAtalhos } from './atalhos';
import { ativarDicasDoJogo, avisar } from './ui/avisos';
import { vigiarTorneio } from './ui/torneio';
import { vigiarRanqueado } from './ui/ranqueado';
import { vigiarLiga } from './ui/liga';
import { vigiarAjustes } from './ajustesJogo';
import { vigiarEntregas } from './entregas';
import { vigiarCreche } from './creche';
import { vigiarMercado } from './mercado';
import { vigiarQuadro } from './missoesQuadro';
import { prepararIdioma } from './idioma';
// o chat ouve o servidor desde a conexão (guarda as mensagens mesmo fora do mapa)
import './ui/chat';
import { vigiarTutorial } from './tutorial';
import { definirTela, tutorialFez } from './tutorialEventos';
import { ativarDicaDeItens } from './ui/dicaItem';
import { ativarToqueLongo } from './ui/toqueLongo';
import { prepararApp } from './instalar';
import { vigiarNovaVersao } from './novaVersao';

export type Destino = { tela: 'inicio' } | { tela: 'inicial' } | { tela: 'regiao' } | { tela: 'bioma'; biomaId: string } | { tela: 'pokedex'; id?: number; mega?: string } | { tela: 'database' } | { tela: 'personagem' } | { tela: 'opcoes' } | { tela: 'golpes'; professor?: 'relembrar' | 'tutor'; daCidade?: boolean } | { tela: 'ranking'; categoria?: 'ranqueado' } | { tela: 'comunidade'; secao: SecaoComunidade } | { tela: 'administracao'; secao: SecaoAdministracao } | { tela: 'jogadores' } | { tela: 'conta'; secao: SecaoConta } | { tela: 'duelos' } | { tela: 'ginasios' } | { tela: 'cidade' } | { tela: 'safari' };
export type Navegar = (destino: Destino) => void;
/** Cada tela desenha dentro de `raiz` e pode devolver uma função de limpeza. */
export type Tela = (raiz: HTMLElement, navegar: Navegar) => (() => void) | void;

const raiz = document.getElementById('app')!;
let limparTelaAtual: (() => void) | void;
let destinoAtual: Destino = { tela: 'inicial' };
let marcarAba: ((destino: Destino) => void) | undefined;
let atualizarCabecalho: ((destino: Destino) => void) | undefined;

const navegar: Navegar = (destino) => {
  destinoAtual = destino;
  lembrarLugar(destino);
  // missões do Professor (client/src/tutorial.ts)
  definirTela(destino.tela);
  if (destino.tela === 'cidade') tutorialFez('cidade');
  else if (destino.tela === 'bioma') tutorialFez('bioma');
  else if (destino.tela === 'comunidade' && destino.secao === 'cla') tutorialFez('guildas');
  marcarAba?.(destino);
  atualizarCabecalho?.(destino);
  limparTelaAtual?.();
  raiz.replaceChildren();
  window.scrollTo(0, 0);
  if (destino.tela === 'inicio') limparTelaAtual = telaInicio(raiz, navegar);
  else if (destino.tela === 'inicial') limparTelaAtual = telaEscolhaInicial(raiz, navegar);
  else if (destino.tela === 'regiao') limparTelaAtual = telaRegiao(raiz, navegar);
  else if (destino.tela === 'pokedex') limparTelaAtual = telaPokedex(destino.id, destino.mega)(raiz, navegar);
  else if (destino.tela === 'database') limparTelaAtual = telaDatabase(raiz, navegar);
  else if (destino.tela === 'personagem') limparTelaAtual = telaPersonagem(raiz, navegar);
  else if (destino.tela === 'opcoes') limparTelaAtual = telaOpcoes(raiz, navegar);
  else if (destino.tela === 'golpes') limparTelaAtual = telaGolpes(destino.professor, destino.daCidade)(raiz, navegar);
  else if (destino.tela === 'ranking') limparTelaAtual = telaRanking(raiz, navegar, destino.categoria);
  else if (destino.tela === 'comunidade') limparTelaAtual = telaComunidade(destino.secao)(raiz, navegar);
  else if (destino.tela === 'administracao') limparTelaAtual = telaAdministracao(destino.secao)(raiz, navegar);
  else if (destino.tela === 'jogadores') limparTelaAtual = telaJogadores(raiz, navegar);
  else if (destino.tela === 'conta') limparTelaAtual = telaConta(destino.secao)(raiz, navegar);
  else if (destino.tela === 'duelos') limparTelaAtual = telaDuelos(raiz, navegar);
  else if (destino.tela === 'ginasios') limparTelaAtual = telaGinasios(raiz, navegar);
  else if (destino.tela === 'cidade') limparTelaAtual = telaCidade(raiz, navegar);
  else if (destino.tela === 'safari') limparTelaAtual = telaSafari(raiz, navegar);
  else limparTelaAtual = telaBioma(destino.biomaId)(raiz, navegar);
};

ativarDeslizantes();
// primeiro a conta (tela de entrada); só depois o jogo monta barra, cabeçalho e painel
// o idioma vem antes de tudo: a tela de entrada já aparece traduzida
// avisos e dicas no visual do jogo (nada de janela do navegador); alert esquecido também vira aviso
ativarDicasDoJogo();
// celular: tocar e segurar mostra os cartões que no PC aparecem com o mouse em cima
ativarToqueLongo();
// app instalável (PWA): pedido de instalação e assistente de fundo
prepararApp();
vigiarNovaVersao();
window.alert = (texto?: unknown) => avisar(String(texto ?? ''));
void prepararIdioma().then(() => garantirConta(raiz)).then((conta) => {
  if (conta.admin) montarPainelAdmin(() => navegar(destinoAtual));
  marcarAba = montarBarraTopo(navegar);
  // música de fundo começa no primeiro clique/tecla
  iniciarMusica();
  atualizarCabecalho = montarCabecalho(navegar);
  definirNavegacao(navegar);
  montarAvisoSincronia();
  // mundo compartilhado (ver os outros jogadores no mapa) e convites de troca
  conectarOnline();
  vigiarTrocas();
  vigiarAmigos();
  vigiarCla();
  vigiarAnuncios();
  // trem: contagem no canto e, ao partir/chegar, o cabeçalho (região) e a tela dos mapas se atualizam
  vigiarViagem();
  vigiarOutbreak();
  vigiarNinho();
  vigiarExpedicao();
  vigiarBoss();
  // limite de nível pelo treinador: quem estava no time acima do limite (save de antes da regra) vai para o PC
  {
    const s = carregarSave();
    // com uma batalha em andamento o time fica como está (ela é refeita com ele)
    if (s && !s.batalhaAberta && ajustarTimeAoLimite(s)) salvar(s);
  }
  // conquistas: confere agora e depois de cada salvamento
  vigiarConquistas(() => navegar({ tela: 'conta', secao: 'achievements' }));
  ativarDicaDeItens();
  // itens dados pela administração
  vigiarEntregas();
  vigiarPvp();
  vigiarCorreio();
  vigiarRecompensas();
  // atalhos de teclado (I Bolsa, P PC, X Pokédex… F1 mostra todos)
  ativarAtalhos(navegar, () => destinoAtual);
  vigiarTorneio();
  vigiarRanqueado();
  vigiarLiga();
  vigiarAjustes();
  vigiarCreche();
  vigiarMercado();
  vigiarQuadro();
  vigiarTutorial(navegar);
  aoMudarViagem(() => (destinoAtual.tela === 'regiao' ? navegar(destinoAtual) : atualizarCabecalho?.(destinoAtual)));
  // com save, o jogo abre na cidade (pedido do dono)
  // recarregou no meio de uma batalha do navegador: abre a tela de onde ela saiu, que volta para a batalha
  const salvo = carregarSave();
  navegar(salvo?.batalhaAberta ? destinoDaBatalha(salvo.batalhaAberta) : salvo ? ultimoLugar() : { tela: 'inicial' });
});
