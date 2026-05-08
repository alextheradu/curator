import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InputBar } from "../components/chat/InputBar";

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
        deepSearchEnabled
        onFactCheckChange={() => undefined}
        onDeepSearchChange={() => undefined}
      />
    );

    expect(markup).toContain("Fact check");
    expect(markup).toContain("Deep search");
  });
});
