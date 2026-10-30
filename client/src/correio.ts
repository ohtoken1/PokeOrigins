// Correio (server/src/correio.ts): uma caixa por conta. Prêmios de eventos, presentes da staff e avisos chegam como
// cartas; os anexos só entram no save quando o jogador clica em Resgatar (o servidor põe no save guardado e devolve).
import type { PokemonIndividual } from '../../shared/batalha/pokemon';
import { api } from './conta';
import { adotarSaveDoServidor, carregarSave, salvarAgora, type Save } from './estado';
import { aoAvisoDoServidor } from './online';
import { avisar } from './ui/avisos';

export type AnexoCarta =
  | { tipo: 'item'; item: string; nome: string; quantidade: number }
  | { tipo: 'pokemon'; nome: string; especieId: number; nivel: number; shiny: boolean };

export interface Carta {
  id: number;
  titulo: string;
  texto: string;
  /** quem mandou: staff, liga, torneio, cofre, loteria, captura, boss… */
  de: string;
  criadoEm: number;
  lida: boolean;
  resgatada: boolean;
  anexos: AnexoCarta[];
}

let cartas: Carta[] = [];
const ouvintes = new Set<() => void>();
const avisarMudanca = () => ouvintes.forEach((f) => f());

export const cartasDoCorreio = () => cartas;
/** Tem anexo esperando o jogador resgatar? */
export const esperaResgate = (c: Carta) => !c.resgatada && c.anexos.length > 0;
/** Número do selo do envelope: cartas não lidas ou com anexo esperando. */
export const cartasNovas = () => cartas.filter((c) => !c.lida || esperaResgate(c)).length;

/** Avisa quando a caixa muda (selo do cabeçalho, janela aberta). Devolve a função que para de ouvir. */
export function aoMudarCorreio(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

function adotar(r: { cartas: Carta[] }) {
  cartas = r.cartas;
  avisarMudanca();
}

export async function buscarCorreio(): Promise<void> {
  if (!carregarSave()) return;
  adotar(await api<{ cartas: Carta[] }>('GET', '/correio'));
}

export async function marcarLida(id: number): Promise<void> {
  const c = cartas.find((x) => x.id === id);
  if (!c || c.lida) return;
  c.lida = true;
  avisarMudanca();
  adotar(await api('POST', '/correio/ler', { id }));
}

/** Resgata uma carta (ou todas). Devolve o que entrou no save. */
export async function resgatar(alvo: { id: number } | { todas: true }): Promise<{ nome: string; quantidade: number }[]> {
  // o servidor mexe no save guardado: manda antes o que ainda não subiu
  await salvarAgora();
  const r = await api<{ cartas: Carta[]; recebidos: { nome: string; quantidade: number }[]; esperando?: number; save: Save; versao: number }>('POST', '/correio/resgatar', alvo);
  // "Resgatar tudo" com o PC cheio: as cartas com Pokémon que não cabe ficam esperando
  if (r.esperando) avisar(r.esperando > 1 ? `${r.esperando} cartas com Pokémon ficaram esperando: seu PC está cheio.` : '1 carta com Pokémon ficou esperando: seu PC está cheio.', 'info', 8000);
  adotarSaveDoServidor(r.save, r.versao);
  adotar(r);
  return r.recebidos;
}

export async function apagarCarta(alvo: { id: number } | { lidas: true }): Promise<void> {
  adotar(await api('POST', '/correio/apagar', alvo));
}

/** Staff (Administração → Correio): carta para um jogador ou para todos, com anexos opcionais. */
export const enviarCartaDaStaff = (dados: { usuario?: string; todos?: boolean; titulo: string; texto: string; itens: { item: string; nome: string; quantidade: number }[]; pokemon?: PokemonIndividual; nomePokemon?: string }) =>
  api<{ enviadas: number }>('POST', '/admin/correio', dados);

let ligado = false;
export function vigiarCorreio(): void {
  if (ligado) return;
  ligado = true;
  const tentar = () => buscarCorreio().catch(() => setTimeout(tentar, 15000));
  aoAvisoDoServidor((msg) => {
    if (msg.t === 'correio') void tentar();
  });
  void tentar();
}
