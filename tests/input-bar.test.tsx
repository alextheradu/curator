// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InputBar } from "../components/chat/InputBar";

// jsdom doesn't implement matchMedia; InputBar uses it to decide whether to
// auto-focus on mount.
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

afterEach(() => {
  cleanup();
});

describe("InputBar", () => {
  it("opts the chat textarea out of Grammarly and browser text suggestions", () => {
    const markup = renderToStaticMarkup(<InputBar onSend={() => undefined} />);

    expect(markup).toContain('data-gramm="false"');
    expect(markup).toContain('data-gramm_editor="false"');
    expect(markup).toContain('data-enable-grammarly="false"');
    expect(markup).toContain('spellCheck="false"');
    expect(markup).toContain('autoComplete="off"');
    expect(markup).toContain('autoCorrect="off"');
    expect(markup).toContain('autoCapitalize="off"');
  });

  it("renders fact check and deep search as persistent menu options", () => {
    const markup = renderToStaticMarkup(
      <InputBar
        onSend={() => undefined}
        factCheckEnabled
        searchMode="deep"
        onFactCheckChange={() => undefined}
        onSearchModeChange={() => undefined}
      />
    );

    expect(markup).toContain("More options: Fact check on, Search mode deep");
  });

  it("marks the keyboard action as Send", () => {
    const markup = renderToStaticMarkup(<InputBar onSend={() => undefined} />);
    expect(markup).toContain('enterKeyHint="send"');
  });

  it("submits once on a single click and clears the composer", () => {
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} compact />);
    const textarea = screen.getByPlaceholderText("Ask anything...") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "rules of frc" } });
    fireEvent.click(screen.getByLabelText("Send"));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("rules of frc");
    expect(textarea.value).toBe("");
  });

  it("does not double-submit on a same-tick rapid double click", () => {
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} compact />);
    const textarea = screen.getByPlaceholderText("Ask anything...") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "hello" } });
    const sendButton = screen.getByLabelText("Send");
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("does not submit an empty or whitespace-only message", () => {
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} compact />);
    const textarea = screen.getByPlaceholderText("Ask anything...") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.click(screen.getByLabelText("Send"));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends on Enter and inserts a newline on Shift+Enter", () => {
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} compact />);
    const textarea = screen.getByPlaceholderText("Ask anything...") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "line one" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("line one");
  });

  it("keeps focus on the textarea when the send button is pressed, so the tap isn't swallowed by a keyboard-dismiss reflow", () => {
    render(<InputBar onSend={() => undefined} compact />);
    const textarea = screen.getByPlaceholderText("Ask anything...") as HTMLTextAreaElement;
    textarea.focus();
    expect(document.activeElement).toBe(textarea);

    const event = new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
    const prevented = !fireEvent(screen.getByLabelText("Send"), event);

    expect(prevented).toBe(true);
  });

  it("restores a lost draft into an empty composer via curator:restore-draft", () => {
    render(<InputBar onSend={() => undefined} compact />);
    const textarea = screen.getByPlaceholderText("Ask anything...") as HTMLTextAreaElement;

    act(() => {
      window.dispatchEvent(new CustomEvent("curator:restore-draft", { detail: { text: "lost message" } }));
    });

    expect(textarea.value).toBe("lost message");
  });

  it("does not clobber newer typing when a stale restore-draft event arrives", () => {
    render(<InputBar onSend={() => undefined} compact />);
    const textarea = screen.getByPlaceholderText("Ask anything...") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "already typing something new" } });

    act(() => {
      window.dispatchEvent(new CustomEvent("curator:restore-draft", { detail: { text: "stale draft" } }));
    });

    expect(textarea.value).toBe("already typing something new");
  });
});
