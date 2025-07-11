import { mountStateService, MountPosition } from "./mount-state.service";

/**
 * Placeholder for telescope mount control.
 */
export async function slewToCoordinates(position: MountPosition): Promise<void> {
  // TODO: implement mount slewing with actual hardware
  await mountStateService.updatePosition(position);
}

export function getLastMountPosition(): MountPosition | undefined {
  return mountStateService.getState().lastPosition;
}

export async function selectMount(id: string): Promise<void> {
  await mountStateService.updateSelectedMount(id);
}
