// Trancas de nível no jogo (regras em shared/trancas.ts): confere pelo save de agora; administrador passa.
import { liberado, type ConteudoTrancado } from '../../shared/trancas';
import { nivelTreinador } from '../../shared/treinador';
import { ehAdministrador } from './bonificacao';
import { carregarSave } from './estado';

export const conteudoLiberado = (conteudo: ConteudoTrancado): boolean => liberado(conteudo, nivelTreinador(carregarSave()?.xpTreinador ?? 0), ehAdministrador());
