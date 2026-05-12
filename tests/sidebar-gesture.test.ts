import { describe, expect, it } from "vitest";
import {
  clampMobileSidebarOffset,
  resolveMobileSidebarOpen,
} from "@/lib/sidebar-gesture";

describe("mobile sidebar gesture", () => {
  it("clamps drag offset to the drawer width", () => {
    expect(clampMobileSidebarOffset(-20, 288)).toBe(0);
    expect(clampMobileSidebarOffset(144, 288)).toBe(144);
    expect(clampMobileSidebarOffset(400, 288)).toBe(288);
  });

  it("opens after a deliberate right swipe from closed", () => {
    expect(resolveMobileSidebarOpen({ deltaX: 120, velocityX: 0.2, width: 288, wasOpen: false })).toBe(true);
    expect(resolveMobileSidebarOpen({ deltaX: 40, velocityX: 0.2, width: 288, wasOpen: false })).toBe(false);
  });

  it("uses swipe velocity to settle the drawer", () => {
    expect(resolveMobileSidebarOpen({ deltaX: 36, velocityX: 0.7, width: 288, wasOpen: false })).toBe(true);
    expect(resolveMobileSidebarOpen({ deltaX: -36, velocityX: -0.7, width: 288, wasOpen: true })).toBe(false);
  });
});
