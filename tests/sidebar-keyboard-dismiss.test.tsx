// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Sidebar, SidebarProvider, useSidebar } from "@/components/ui/sidebar";

// jsdom doesn't implement matchMedia; useIsMobile uses it to watch for
// viewport changes (the initial mobile/desktop read comes from innerWidth).
window.matchMedia = window.matchMedia ?? ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
} as unknown as MediaQueryList));

function setMobileViewport() {
  Object.defineProperty(window, "innerWidth", { value: 400, configurable: true, writable: true });
}

function ToggleButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button type="button" data-testid="toggle" onClick={toggleSidebar}>
      toggle
    </button>
  );
}

function Harness() {
  return (
    <SidebarProvider>
      <input data-testid="composer" placeholder="composer" />
      <ToggleButton />
      <Sidebar>sidebar content</Sidebar>
    </SidebarProvider>
  );
}

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true, writable: true });
});

describe("mobile sidebar dismisses the keyboard on open, from every entry point", () => {
  beforeEach(() => {
    setMobileViewport();
  });

  it("blurs the focused composer when the sidebar opens via the shared toggle handler", () => {
    const { getByTestId } = render(<Harness />);
    const input = getByTestId("composer") as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.click(getByTestId("toggle"));

    expect(document.activeElement).not.toBe(input);
  });

  it("blurs the focused composer when the sidebar opens via the swipe gesture, not just the trigger button", () => {
    const { getByTestId } = render(<Harness />);
    const input = getByTestId("composer") as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    // A deliberate left-to-right swipe past the open threshold, mirroring
    // what Sidebar's document-level touch handlers listen for.
    fireEvent.touchStart(document, { touches: [{ clientX: 0, clientY: 0 }] });
    fireEvent.touchMove(document, { touches: [{ clientX: 160, clientY: 0 }] });
    fireEvent.touchEnd(document, { changedTouches: [{ clientX: 160, clientY: 0 }] });

    expect(document.activeElement).not.toBe(input);
  });

  it("does not refocus the composer when the sidebar closes", () => {
    const { getByTestId } = render(<Harness />);
    const input = getByTestId("composer") as HTMLInputElement;
    const toggle = getByTestId("toggle");

    fireEvent.click(toggle); // open
    input.blur();
    fireEvent.click(toggle); // close

    expect(document.activeElement).not.toBe(input);
  });

  it("does not blur anything when the sidebar closes (only opening should dismiss the keyboard)", () => {
    const { getByTestId } = render(<Harness />);
    const toggle = getByTestId("toggle");

    fireEvent.click(toggle); // open (nothing focused, nothing to blur)
    const otherInput = document.createElement("input");
    document.body.appendChild(otherInput);
    otherInput.focus();
    expect(document.activeElement).toBe(otherInput);

    fireEvent.click(toggle); // close

    expect(document.activeElement).toBe(otherInput);
    otherInput.remove();
  });
});
