// Itens dados pela administração (server/src/entregas.ts): o jogo busca as entregas ao abrir e quando o servidor
// avisa, salva o que está pendente, recebe o save já com os itens e mostra um aviso. Durante uma batalha espera
// ela acabar (trocar o save no meio perderia o que a batalha está mexendo).
import type { PokemonIndividual } from '../../shared/batalha/pokemon';
import { api } from './conta';
import { adotarSaveDoServidor, carregarSave, salvarAgora, type Save } from './estado';
import { aoAvisoDoServidor } from './online';
import { el } from './ui/dom';

type Resposta = { entregas: { nome: string; quantidade: number }[]; save?: Save; versao?: number };

/** A administração manda um item para um jogador (só contas de administrador; o servidor confere). */
export const darItemAoJogador = (usuario: string, item: string, nome: string, quantidade: number) =>
  api<{ usuario: string }>('POST', '/admin/itens', { usuario, item, nome, quantidade });

/** A administração manda um Pokémon montado (Administração → Dar Pokémon). `nome` é o que aparece no aviso de quem recebe. */
export const darPokemonAoJogador = (usuario: string, pokemon: PokemonIndividual, nome: string) =>
  api<{ usuario: string }>('POST', '/admin/pokemon', { usuario, pokemon, nome });

export function vigiarEntregas(): void {
  const aviso = el('div', { class: 'aviso-anuncio aviso-entrega', role: 'status', hidden: true });
  document.body.append(aviso);
  let relogio = 0;
  let esconder = 0;
  let buscando = false;
  const emBatalha = () => !!document.querySelector('.batalha-fundo');
  const depois = (ms: number) => {
    clearTimeout(relogio);
    relogio = window.setTimeout(() => void buscar(), ms);
  };
  async function buscar(): Promise<void> {
    if (buscando) return;
    if (!carregarSave()) return;
    if (emBatalha()) return depois(5000);
    buscando = true;
    try {
      const { pendentes } = await api<{ pendentes: number }>('GET', '/entregas');
      if (!pendentes) return;
      // o servidor mexe no save guardado: manda antes o que ainda não subiu
      await salvarAgora();
      if (emBatalha()) return depois(5000);
      const r = await api<Resposta>('POST', '/entregas/receber');
      if (!r.entregas.length || !r.save || r.versao === undefined) return;
      adotarSaveDoServidor(r.save, r.versao);
      aviso.replaceChildren(el('strong', {}, 'Você recebeu da administração'), ...r.entregas.map((e) => el('span', {}, `${e.quantidade}x ${e.nome}`)));
      aviso.hidden = false;
      clearTimeout(esconder);
      esconder = window.setTimeout(() => (aviso.hidden = true), 9000);
    } catch {
      // sem conexão ou save ocupado: tenta de novo daqui a pouco (a entrega continua guardada no servidor)
      depois(15000);
    } finally {
      buscando = false;
    }
  }
  aoAvisoDoServidor((msg) => {
    if (msg.t === 'entrega') void buscar();
  });
  void buscar();
}
