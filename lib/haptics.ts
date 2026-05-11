import { Haptics, ImpactStyle } from "@capacitor/haptics";

const noop = () => Promise.resolve();

function wrap(fn: () => Promise<void>) {
  return () => fn().catch(noop);
}

export const hapticsLight = wrap(() => Haptics.impact({ style: ImpactStyle.Light }));
export const hapticsMedium = wrap(() => Haptics.impact({ style: ImpactStyle.Medium }));
export const hapticsHeavy = wrap(() => Haptics.impact({ style: ImpactStyle.Heavy }));
export const hapticsSelection = wrap(() => Haptics.selectionChanged());
