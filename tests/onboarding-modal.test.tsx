// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// jsdom doesn't implement these; the onboarding sheet's scroll-reset and
// keyboard-dismiss handling read/call them.
Element.prototype.scrollTo = Element.prototype.scrollTo ?? (() => {});
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

const routerMocks = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

const updateMock = vi.fn().mockResolvedValue(undefined);
vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: updateMock }),
}));

import { OnboardingModal } from "@/components/auth/OnboardingModal";
import { useChatStore } from "@/lib/store";

async function flushRaf() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useChatStore.setState({ defaultChatMode: "veteran", defaultSearchMode: "fast" });
});

describe("OnboardingModal", () => {
  it("opens on step 1, at the top", async () => {
    render(<OnboardingModal open />);
    await flushRaf();

    expect(screen.getByText("1 of 4")).not.toBeNull();
    expect(screen.getByText("What should Curator call you?")).not.toBeNull();
  });

  it("uses a plain text keyboard for the name step and a numeric keyboard for the team step", async () => {
    render(<OnboardingModal open />);
    await flushRaf();

    const nameInput = screen.getByLabelText("Preferred name") as HTMLInputElement;
    expect(nameInput.type).toBe("text");
    expect(nameInput.getAttribute("enterkeyhint")).toBe("next");

    fireEvent.change(nameInput, { target: { value: "Alex" } });
    fireEvent.click(screen.getByText("Next"));
    await flushRaf();

    const teamInput = screen.getByLabelText("Team number") as HTMLInputElement;
    expect(teamInput.type).toBe("number");
    expect(teamInput.getAttribute("inputmode")).toBe("numeric");
    expect(teamInput.getAttribute("enterkeyhint")).toBe("done");
  });

  it("resets the scroll position to the top on every step change, forward and back", async () => {
    render(<OnboardingModal open />);
    await flushRaf();

    const scrollArea = screen.getByTestId("onboarding-scroll-area");
    const scrollToSpy = vi.spyOn(scrollArea, "scrollTo");

    fireEvent.change(screen.getByLabelText("Preferred name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByText("Next"));
    await flushRaf();
    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));

    scrollToSpy.mockClear();
    fireEvent.click(screen.getByText("Back"));
    await flushRaf();
    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it("does not advance two steps from a rapid double press of Next", async () => {
    render(<OnboardingModal open />);
    await flushRaf();

    fireEvent.change(screen.getByLabelText("Preferred name"), { target: { value: "Alex" } });
    const nextButton = screen.getByText("Next");
    // Both fire before the guard's queued microtask resets - simulates a
    // key-repeat or double tap landing on the same step.
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    await flushRaf();

    expect(screen.getByText("2 of 4")).not.toBeNull();
    expect(screen.queryByText("3 of 4")).toBeNull();
  });

  it("preserves entered text when navigating back", async () => {
    render(<OnboardingModal open />);
    await flushRaf();

    fireEvent.change(screen.getByLabelText("Preferred name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByText("Next"));
    await flushRaf();
    fireEvent.click(screen.getByText("Back"));
    await flushRaf();

    expect((screen.getByLabelText("Preferred name") as HTMLInputElement).value).toBe("Alex");
  });

  it("keeps Back and Next outside the scrollable content area", async () => {
    render(<OnboardingModal open />);
    await flushRaf();

    const scrollArea = screen.getByTestId("onboarding-scroll-area");
    const nextButton = screen.getByText("Next");
    const backButton = screen.getByText("Back");

    expect(scrollArea.contains(nextButton)).toBe(false);
    expect(scrollArea.contains(backButton)).toBe(false);
  });

  it("dismisses the keyboard when tapping empty space in the content area without closing the sheet", async () => {
    render(<OnboardingModal open />);
    await flushRaf();

    const nameInput = screen.getByLabelText("Preferred name") as HTMLInputElement;
    nameInput.focus();
    expect(document.activeElement).toBe(nameInput);

    const scrollArea = screen.getByTestId("onboarding-scroll-area");
    fireEvent.pointerDown(scrollArea);

    expect(document.activeElement).not.toBe(nameInput);
    expect(screen.getByText("What should Curator call you?")).not.toBeNull();
  });

  it("changes the selected chat mode immediately and lets Next stay reachable without scrolling", async () => {
    render(<OnboardingModal open />);
    await flushRaf();

    fireEvent.change(screen.getByLabelText("Preferred name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByText("Next"));
    await flushRaf();
    fireEvent.click(screen.getByText("I'm not on a team"));
    fireEvent.click(screen.getByText("Next"));
    await flushRaf();

    expect(screen.getByText("Choose your default chat mode")).not.toBeNull();
    fireEvent.click(screen.getByText("Rookie"));

    const rookieOption = document.getElementById("chat-mode-rookie");
    const veteranOption = document.getElementById("chat-mode-veteran");
    expect(rookieOption?.querySelector(".text-background")).not.toBeNull();
    expect(veteranOption?.querySelector(".text-background")).toBeNull();
    // Next/Get started is rendered regardless of how many option cards are
    // above it - no scrolling required to reach it.
    expect(screen.getByText("Next")).not.toBeNull();
  });
});
