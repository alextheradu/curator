// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MessageBubble } from "../components/chat/MessageBubble";
import type { Message } from "../lib/store";

// jsdom doesn't implement clipboard or ResizeObserver (used by Radix bits
// pulled in via ReportButton's Dialog).
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
global.ResizeObserver = global.ResizeObserver ?? class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function assistantMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    role: "assistant",
    content: "Here is the answer.",
    timestamp: new Date(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  }));
});

describe("MessageBubble action buttons", () => {
  it("shows a selected state after liking a response, and prevents a duplicate submit from a rapid second tap", async () => {
    render(<MessageBubble message={assistantMessage()} />);
    const likeButton = screen.getByLabelText("Mark response helpful");

    fireEvent.click(likeButton);
    fireEvent.click(likeButton); // rapid second tap while the first is in flight

    await waitFor(() => {
      expect(screen.getByLabelText("Marked helpful. Tap to remove.")).not.toBeNull();
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("allows switching from like to dislike without a contradictory state", async () => {
    render(<MessageBubble message={assistantMessage()} />);

    fireEvent.click(screen.getByLabelText("Mark response helpful"));
    await waitFor(() => screen.getByLabelText("Marked helpful. Tap to remove."));

    fireEvent.click(screen.getByLabelText("Marked helpful. Tap to remove."));
    await waitFor(() => screen.getByLabelText("Mark response helpful"));

    fireEvent.click(screen.getByLabelText("Mark response not helpful"));
    await waitFor(() => {
      expect(screen.getByLabelText("Marked not helpful. Tap to remove.")).not.toBeNull();
    });
    expect(screen.queryByLabelText("Marked helpful. Tap to remove.")).toBeNull();
  });

  it("rolls back the selected state and surfaces an error if the feedback request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "nope" }),
    }));
    const { toast } = await import("sonner");

    render(<MessageBubble message={assistantMessage()} />);
    fireEvent.click(screen.getByLabelText("Mark response helpful"));

    await waitFor(() => {
      expect(screen.getByLabelText("Mark response helpful")).not.toBeNull();
    });
    expect(toast.error).toHaveBeenCalled();
  });

  it("copies the response text and shows a temporary confirmation", async () => {
    render(<MessageBubble message={assistantMessage({ content: "Copy me" })} />);

    fireEvent.click(screen.getByLabelText("Copy response"));

    await waitFor(() => {
      expect(screen.getByLabelText("Response copied")).not.toBeNull();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Copy me");
  });

  it("persists the selected reaction across a remount, mirroring reopening the conversation", async () => {
    const message = assistantMessage();
    const { unmount } = render(<MessageBubble message={message} />);
    fireEvent.click(screen.getByLabelText("Mark response not helpful"));
    await waitFor(() => screen.getByLabelText("Marked not helpful. Tap to remove."));
    unmount();

    render(<MessageBubble message={message} />);
    await waitFor(() => {
      expect(screen.getByLabelText("Marked not helpful. Tap to remove.")).not.toBeNull();
    });
  });

  it("does not render action buttons while the response is still streaming", () => {
    render(<MessageBubble message={assistantMessage()} isStreaming />);
    expect(screen.queryByLabelText("Mark response helpful")).toBeNull();
  });
});
