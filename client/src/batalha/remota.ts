// Motor "remoto" da batalha PvP: a tela de batalha (telaBatalha.ts) usa este objeto no lugar do BatalhaSelvagem.
// Nada é calculado aqui: a escolha vai para o servidor (server/src/pvp.ts), que roda o turno e devolve os eventos e
// a "foto" do nosso lado (pedido, quem está em campo, golpes vistos do adversário…).
import type { EventoBatalha, Pedido } from '../../../shared/batalha/motor';
import type { FotoPvp } from '../../../shared/batalha/pvp';
import { api } from '../conta';

/** `retomada`: a página foi recarregada no meio da batalha; `eventos` traz tudo desde o começo. */
export interface TurnoPvp { id: number; eventos: EventoBatalha[]; foto: FotoPvp; prazo: number; tempo: number; retomada?: boolean }

export class BatalhaRemota {
  private foto: FotoPvp;
  /** hora (do relógio do navegador) em que o tempo de escolher acaba */
  prazo: number;
  readonly tempo: number;
  private turnos = 0;
  private acumulados: EventoBatalha[] = [];
  private esperando: { depoisDe: number; resolver: (e: EventoBatalha[]) => void } | null = null;
  /** Turno que chegou sem ninguém esperando (o outro desistiu, o tempo acabou): a tela toca e volta ao menu. */
  aoTurnoSolto: ((eventos: EventoBatalha[]) => void) | null = null;
  readonly participantes = new Set<number>();

  constructor(readonly id: number, private inicio: TurnoPvp) {
    this.foto = inicio.foto;
    this.tempo = inicio.tempo;
    this.prazo = this.acertarPrazo(inicio.prazo);
  }
  // o prazo vem no relógio do servidor; o tempo que falta é o que importa
  private acertarPrazo(prazoServidor: number) {
    return Date.now() + Math.max(0, Math.min(this.inicio.tempo + 25_000, prazoServidor - Date.now()));
  }

  /** Mensagem `pvp-turno` desta batalha. */
  receber(t: TurnoPvp): void {
    this.turnos++;
    this.foto = t.foto;
    this.prazo = this.acertarPrazo(t.prazo);
    this.acumulados.push(...t.eventos);
    // a vez ainda é do outro (ele precisa trocar de Pokémon): continua juntando
    if (this.foto.pedido.tipo === 'espera') return;
    const eventos = this.acumulados;
    this.acumulados = [];
    if (this.esperando && this.turnos > this.esperando.depoisDe) {
      const r = this.esperando.resolver;
      this.esperando = null;
      r(eventos);
    } else this.aoTurnoSolto?.(eventos);
  }

  private async mandar(caminho: string, corpo: Record<string, unknown>): Promise<EventoBatalha[]> {
    const depoisDe = this.turnos;
    const resposta = new Promise<EventoBatalha[]>((resolver) => (this.esperando = { depoisDe, resolver }));
    try {
      await api('POST', caminho, { id: this.id, ...corpo });
    } catch (erro) {
      this.esperando = null;
      throw erro;
    }
    return resposta;
  }

  // ---- o que a tela de batalha usa ----
  iniciar(): EventoBatalha[] {
    return this.inicio.eventos;
  }
  /** Voltando para a batalha depois de recarregar: a tela toca o que já aconteceu sem animações. */
  get retomada(): boolean {
    return !!this.inicio.retomada;
  }
  usarGolpe(indice: number, especial: 'z' | 'tera' | 'mega' | 'dynamax' | null = null): Promise<EventoBatalha[]> {
    return this.mandar('/pvp/escolha', { escolha: { tipo: 'golpe', indice, especial } });
  }
  trocar(posicao: number): Promise<EventoBatalha[]> {
    return this.mandar('/pvp/escolha', { escolha: { tipo: 'troca', posicao } });
  }
  desistir(): Promise<EventoBatalha[]> {
    return this.mandar('/pvp/desistir', {});
  }
  pedido(): Pedido {
    return this.foto.pedido;
  }
  get ativo(): number {
    return this.foto.ativo;
  }
  get indices(): number[] {
    return this.foto.indices;
  }
  reservasSaudaveis(): number[] {
    return this.foto.reservas;
  }
  atributosEmCampo() {
    return this.foto.atributos;
  }
  campo() {
    return this.foto.campo;
  }
  get adversarioAtivo(): number {
    return this.foto.adversarioAtivo;
  }
  golpesUsadosAdversario() {
    return this.foto.golpesAdversario;
  }
  get habilidadeSelvagemRevelada(): boolean {
    return this.foto.habilidadeRevelada;
  }
  get terminou(): boolean {
    return this.foto.pedido.tipo === 'fim';
  }
  get vencedor() {
    return this.foto.vencedor;
  }
  /** HP e PP não voltam para o save: o PvP usa cópias curadas do time. */
  sincronizar(): void {}
}
