// Banco da cidade: comprar gold com silver e vender gold por silver. Quem faz a troca é o servidor
// (server/src/cambio.ts): o jogo salva antes, pede, e troca o save dele pelo que o servidor devolve.
// O banco tem um cofre próprio e só entrega o que tem guardado (não cria moeda): a janela mostra o cofre, que
// muda na hora quando outro jogador troca.
import { GOLD_CUSTA_SILVER, GOLD_VALE_SILVER, maximoDoCambio, silverDaOperacao, type Cofre, type OperacaoCambio } from '../../../shared/cambio';
import { api, ErroApi } from '../conta';
import { adotarSaveDoServidor, salvarAgora, type Save } from '../estado';
import { aoAvisoDoServidor } from '../online';
import { el } from './dom';
import { abrirJanela } from './janela';
import { valorEmMoeda } from './moeda';

const numero = (n: number) => n.toLocaleString('pt-BR');
const moeda = valorEmMoeda;

export function abrirBanco(save: Save, aoMudar: () => void = () => {}): void {
  let operacao: OperacaoCambio = 'comprar';
  let quantidade = 1;
  let ocupado = false;
  let aviso = '';
  /** O que o banco tem guardado (null = ainda buscando). */
  let cofre: Cofre | null = null;
  /** Atualiza só os números da janela aberta (sem refazer o campo onde a pessoa digita). */
  let atualizarNumeros = () => {};

  const janela = abrirJanela('Banco', () => {
    const comprando = operacao === 'comprar';
    const maximo = () => (cofre ? maximoDoCambio(operacao, save, cofre) : 0);
    const campo = el('input', { type: 'number', class: 'banco-campo', min: 1, step: 1, value: quantidade, disabled: ocupado, 'aria-label': 'Quantidade de Origin Coins' }) as HTMLInputElement;
    const cofreEl = el('div', { class: 'banco-saldo banco-cofre' });
    const resumo = el('div', { class: 'banco-resumo' });
    const falta = el('p', { class: 'banco-aviso' });
    const botao = el('button', { class: 'botao banco-trocar', type: 'button', onclick: () => void trocar() }, ocupado ? 'Trocando…' : comprando ? 'Comprar' : 'Vender') as HTMLButtonElement;
    const rapidos = ([['10', () => 10], ['100', () => 100], ['Máximo', maximo]] as const).map(([texto, valor]) =>
      el('button', { class: 'botao secundario', type: 'button', onclick: () => definir(valor(), true) }, texto) as HTMLButtonElement);
    const pode = () => !ocupado && quantidade >= 1 && quantidade <= maximo();

    atualizarNumeros = () => {
      const silver = silverDaOperacao(operacao, quantidade);
      cofreEl.replaceChildren(el('small', {}, 'Cofre do banco'), ...(cofre ? [moeda('silver', cofre.silver), moeda('gold', cofre.gold)] : [el('span', { class: 'meta' }, 'Consultando…')]));
      resumo.replaceChildren(
        el('span', {}, 'Você paga', comprando ? moeda('silver', silver) : moeda('gold', quantidade)),
        el('span', { class: 'banco-seta', 'aria-hidden': 'true' }, '→'),
        el('span', {}, 'Você recebe', comprando ? moeda('gold', quantidade) : moeda('silver', silver)));
      // por que não dá para trocar: falta saldo ao jogador ou falta a moeda no cofre
      const semSaldo = comprando ? save.silver < GOLD_CUSTA_SILVER : save.gold < 1;
      const semCofre = !!cofre && (comprando ? cofre.gold < 1 : cofre.silver < GOLD_VALE_SILVER);
      falta.textContent = !cofre || maximo() >= 1 ? ''
        : semSaldo ? (comprando ? 'Você não tem Poké Dólares suficientes.' : 'Você não tem Origin Coins para vender.')
        : semCofre ? (comprando ? 'O banco está sem Origin Coins agora. Ele só tem os Origin Coins que os jogadores venderam para ele.' : 'O banco está sem Poké Dólares agora.')
        : '';
      campo.max = String(Math.max(1, maximo()));
      for (const b of rapidos) b.disabled = ocupado || maximo() < 1;
      botao.disabled = !pode();
    };
    // digitando: vale o que está escrito (acima do limite o botão desliga); ao sair do campo, ajusta para o que dá
    const definir = (n: number, ajustar: boolean) => {
      quantidade = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
      if (ajustar) {
        quantidade = Math.max(1, Math.min(Math.max(1, maximo()), quantidade));
        campo.value = String(quantidade);
      }
      atualizarNumeros();
    };
    campo.addEventListener('input', () => definir(Number(campo.value), false));
    campo.addEventListener('change', () => definir(Number(campo.value), true));
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void trocar();
    });

    async function trocar() {
      if (!pode()) return;
      ocupado = true;
      aviso = '';
      janela.redesenhar();
      const feita = quantidade;
      try {
        // o servidor confere o saldo no save guardado e o que há no cofre
        await salvarAgora();
        const r = await api<{ save: Save; versao: number; cofre: Cofre }>('POST', '/cambio', { operacao, quantidade: feita });
        adotarSaveDoServidor(r.save, r.versao);
        cofre = r.cofre;
        aviso = comprando ? `Você comprou ${numero(feita)} Origin Coins.` : `Você vendeu ${numero(feita)} Origin Coins.`;
        quantidade = 1;
        aoMudar();
      } catch (e) {
        aviso = e instanceof ErroApi ? e.message : 'Não foi possível trocar agora.';
        // o cofre pode ter mudado (outro jogador trocou antes): busca de novo
        void buscarCofre();
      }
      ocupado = false;
      janela.redesenhar();
    }

    atualizarNumeros();
    return el('div', { class: 'banco' },
      el('div', { class: 'banco-saldo' }, el('small', {}, 'Seu saldo'), moeda('silver', save.silver), moeda('gold', save.gold)),
      cofreEl,
      el('div', { class: 'banco-abas', role: 'tablist' },
        ...(['comprar', 'vender'] as OperacaoCambio[]).map((o) =>
          el('button', {
            class: `aba ${o === operacao ? 'ativa' : ''}`, role: 'tab', 'aria-selected': String(o === operacao), type: 'button', disabled: ocupado,
            onclick: () => {
              operacao = o;
              quantidade = 1;
              aviso = '';
              janela.redesenhar();
            },
          }, o === 'comprar' ? 'Comprar Origin Coins' : 'Vender Origin Coins'))),
      el('p', { class: 'meta' }, `${comprando ? `1 Origin Coin custa ${numero(GOLD_CUSTA_SILVER)} Poké Dólares` : `1 Origin Coin vale ${numero(GOLD_VALE_SILVER)} Poké Dólares`}. O banco só entrega o que tem no cofre.`),
      el('label', { class: 'banco-quantidade' }, 'Quantidade de Origin Coins', el('span', {}, campo, ...rapidos)),
      resumo,
      falta,
      el('p', { class: 'banco-aviso', role: 'status' }, aviso),
      botao);
  }, { classe: 'janela-banco', aoFechar: () => pararDeOuvir() });

  const buscarCofre = () => api<{ cofre: Cofre }>('GET', '/cambio').then((r) => {
    cofre = r.cofre;
    atualizarNumeros();
  }, () => {
    aviso = 'Sem conexão com o servidor.';
    janela.redesenhar();
  });
  // outro jogador trocou: o cofre muda na janela aberta
  const pararDeOuvir = aoAvisoDoServidor((msg) => {
    if (msg.t !== 'cofre') return;
    cofre = msg.cofre as Cofre;
    atualizarNumeros();
  });
  void buscarCofre();
}
