// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom doesn't implement ResizeObserver; Radix's Slider (used by the
// temperature control) reads element size via it on mount.
global.ResizeObserver = global.ResizeObserver ?? class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

const useSessionMock = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { SettingsModal } from "@/components/ui/SettingsModal";
import { useChatStore } from "@/lib/store";

afterEach(() => {
  cleanup();
  useChatStore.getState().setSettingsOpen(false);
});

describe("SettingsModal mobile layout", () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated", update: vi.fn() });
    useChatStore.getState().setSettingsOpen(true);
  });

  it("renders the mobile grouped list without crashing when signed out", () => {
    render(<SettingsModal />);

    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sign in with Google").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Appearance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Personalization").length).toBeGreaterThan(0);
  });

  it("renders account/data rows and the delete-account trigger when signed in", () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", email: "team@example.com", isAdmin: false } },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<SettingsModal />);

    expect(screen.getAllByText("team@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sign out").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Delete account").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Redo onboarding").length).toBeGreaterThan(0);
  });

  it("shows the admin panel row only for admin sessions", () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", email: "admin@example.com", isAdmin: true } },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<SettingsModal />);

    expect(screen.getAllByText("Admin panel").length).toBeGreaterThan(0);
  });

  it("does not show the admin panel row for non-admin sessions", () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", email: "team@example.com", isAdmin: false } },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<SettingsModal />);

    expect(screen.queryByText("Admin panel")).toBeNull();
  });
});
