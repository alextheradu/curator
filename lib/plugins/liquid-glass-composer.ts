import { registerPlugin } from '@capacitor/core';

export interface LiquidGlassComposerPlugin {
  show(options?: { placeholder?: string }): Promise<void>;
  hide(): Promise<void>;
  setPlaceholder(options: { value: string }): Promise<void>;
  setStreaming(options: { value: boolean }): Promise<void>;
  setDisabled(options: { value: boolean }): Promise<void>;
  clear(): Promise<void>;
  addListener(
    event: 'send',
    handler: (data: { value: string }) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    event: 'stop',
    handler: () => void
  ): Promise<{ remove: () => void }>;
  removeAllListeners(): Promise<void>;
}

export const LiquidGlassComposer =
  registerPlugin<LiquidGlassComposerPlugin>('LiquidGlassComposer');
