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
  useChatStore.setState({ defaultChatMode: "veteran" });
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

  it("explains what Temperature does and labels the slider ends", () => {
    render(<SettingsModal />);

    expect(
      screen.getAllByText(
        "Controls how focused or varied responses are. Lower values are more consistent and predictable. Higher values are more creative and varied."
      ).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Focused").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Creative").length).toBeGreaterThan(0);
  });

  it("gives the temperature slider an accessible name and value for VoiceOver", () => {
    render(<SettingsModal />);

    const sliders = screen.getAllByRole("slider", { name: "Temperature" });
    expect(sliders.length).toBeGreaterThan(0);
    expect(sliders[0].getAttribute("aria-valuetext")).toContain("focused");
  });

  it("switches the selected chat mode immediately and persists it for signed-in users", async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined);
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", email: "team@example.com", isAdmin: false } },
      status: "authenticated",
      update: updateMock,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ defaultChatMode: "rookie" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsModal />);

    expect(useChatStore.getState().defaultChatMode).toBe("veteran");
    screen.getAllByText("Rookie")[0].click();

    expect(useChatStore.getState().defaultChatMode).toBe("rookie");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ defaultChatMode: "rookie" }),
      })
    );

    await vi.waitFor(() => expect(updateMock).toHaveBeenCalled());
    vi.unstubAllGlobals();
  });

  it("rolls back the local selection when the account save fails", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", email: "team@example.com", isAdmin: false } },
      status: "authenticated",
      update: vi.fn(),
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Unable to update the default chat style." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsModal />);

    screen.getAllByText("Rookie")[0].click();
    expect(useChatStore.getState().defaultChatMode).toBe("rookie");

    await vi.waitFor(() => expect(useChatStore.getState().defaultChatMode).toBe("veteran"));
    vi.unstubAllGlobals();
  });

  it("does not roll back the local selection when only the session refresh fails after a successful save", async () => {
    const updateMock = vi.fn().mockRejectedValue(new Error("network drop"));
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", email: "team@example.com", isAdmin: false } },
      status: "authenticated",
      update: updateMock,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ defaultChatMode: "rookie" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsModal />);

    screen.getAllByText("Rookie")[0].click();
    await vi.waitFor(() => expect(updateMock).toHaveBeenCalled());

    // The account write already succeeded - a dropped session refresh must
    // not revert the UI back to the stale mode.
    expect(useChatStore.getState().defaultChatMode).toBe("rookie");
    vi.unstubAllGlobals();
  });

  it("switching chat mode does not touch existing conversations or their messages", async () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated", update: vi.fn() });
    const conversationId = useChatStore.getState().newConversation();
    useChatStore.getState().addMessage(conversationId, { role: "user", content: "draft in progress" });

    render(<SettingsModal />);
    screen.getAllByText("Rookie")[0].click();

    const conversation = useChatStore.getState().conversations.find((c) => c.id === conversationId);
    expect(conversation?.messages).toHaveLength(1);
    expect(useChatStore.getState().activeConversationId).toBe(conversationId);

    useChatStore.setState({ conversations: [], activeConversationId: null });
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
