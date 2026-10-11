// A aparência com que o jogador aparece no mapa, na cidade e no perfil: a do save + a skin escolhida em
// Minha conta → Minhas skins (`save.skinVisual`), se ele ainda tem o item e a skin já tem arte.
import { temSkin, type ComSkins } from '../../../shared/skins';
import { APARENCIA_PADRAO, type Aparencia } from './lpc';
import { temArteDeSkin } from './skinsDesenho';

/** Skin que o jogador está vestindo (id do item) ou null. */
export const skinVestida = (save: ComSkins): string | null => (temSkin(save, save.skinVisual) && temArteDeSkin(save.skinVisual) ? save.skinVisual : null);

/** Aparência para desenhar o jogador. O boné fica guardado para depois (pedido do dono). */
export function aparenciaDoSave(save: ComSkins & { aparencia?: Aparencia }): Aparencia {
  const skin = skinVestida(save);
  return { ...APARENCIA_PADRAO, ...(save.aparencia ?? {}), bone: 'nenhum', ...(skin ? { skin } : {}) };
}
