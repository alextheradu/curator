export const MOBILE_SIDEBAR_WIDTH_PX = 288;

export function clampMobileSidebarOffset(offset: number, width: number) {
  return Math.max(0, Math.min(width, offset));
}

export function resolveMobileSidebarOpen({
  deltaX,
  velocityX,
  width,
  wasOpen,
}: {
  deltaX: number;
  velocityX: number;
  width: number;
  wasOpen: boolean;
}) {
  if (velocityX > 0.45) return true;
  if (velocityX < -0.45) return false;

  if (wasOpen) {
    return width + deltaX > width * 0.58;
  }

  return deltaX > width * 0.35;
}
