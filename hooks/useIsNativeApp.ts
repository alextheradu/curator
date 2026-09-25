"use client";

import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

const subscribe = () => () => {};

// True inside the iOS/Android Capacitor shell, false on the web and during SSR.
export function useIsNativeApp() {
  return useSyncExternalStore(subscribe, () => Capacitor.isNativePlatform(), () => false);
}
