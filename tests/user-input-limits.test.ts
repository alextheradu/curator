import { describe, expect, test } from "vitest";
import { sanitizePlainTextInput, validateSupportRequestInput } from "@/lib/user-input-limits";

describe("sanitizePlainTextInput", () => {
  test("strips script tags and their markup", () => {
    expect(sanitizePlainTextInput("<script>alert(1)</script>")).toBe("alert(1)");
  });

  test("strips event-handler markup", () => {
    expect(sanitizePlainTextInput('<img src=x onerror="alert(1)">')).toBe("");
  });

  test("strips tags that are only reassembled after an inner match is removed", () => {
    // A single pass would leave "<script>" behind here.
    expect(sanitizePlainTextInput("<scr<script>ipt>alert(1)")).toBe("alert(1)");
  });

  test("strips html comments, including unterminated ones", () => {
    expect(sanitizePlainTextInput("a<!-- hidden -->b")).toBe("ab");
    expect(sanitizePlainTextInput("a<!-- never closed")).toBe("a");
  });

  test("strips control characters but keeps newlines and tabs", () => {
    expect(sanitizePlainTextInput("a\u0000b\u001b[31mc")).toBe("ab[31mc");
    expect(sanitizePlainTextInput("line1\nline2\tend")).toBe("line1\nline2\tend");
  });

  test("leaves ordinary prose and comparisons alone", () => {
    expect(sanitizePlainTextInput("motor draws < 40 A and > 12 V")).toBe("motor draws < 40 A and > 12 V");
    expect(sanitizePlainTextInput("use the 2026 manual, section 5.2")).toBe("use the 2026 manual, section 5.2");
  });

  test("known limitation: tag-shaped prose is treated as a tag", () => {
    // "<b and b>" parses as a <b> element with attributes, so it is removed.
    // A browser (and DOMPurify) would read it the same way. Support text that
    // needs this should use code formatting; the admin panel additionally
    // renders these fields as plain text, so this is not the only defence.
    expect(sanitizePlainTextInput("if a<b and b>c then stop")).toBe("if ac then stop");
  });
});

describe("validateSupportRequestInput", () => {
  test("sanitizes all four stored fields", () => {
    const result = validateSupportRequestInput({
      name: "<b>Robo</b> Tester",
      email: "<i>team@example.com</i>",
      subject: "<script>alert(1)</script>Bumper question",
      message: "<img src=x onerror=alert(1)>Our bumpers keep failing inspection, please advise.",
      pagePath: "/support<script>",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.name).toBe("Robo Tester");
    expect(result.value.email).toBe("team@example.com");
    // Markup is removed; inert text content between the tags is kept.
    expect(result.value.subject).toBe("alert(1)Bumper question");
    expect(result.value.message).toBe("Our bumpers keep failing inspection, please advise.");
    expect(result.value.pagePath).toBe("/support");

    for (const field of Object.values(result.value)) {
      expect(field).not.toMatch(/<[a-zA-Z/]/);
    }
  });

  test("length limits apply to the sanitized value, not the raw input", () => {
    // Raw subject is over the 120 char limit only because of markup.
    const padded = `<span class="${"x".repeat(200)}">Short subject</span>`;
    const result = validateSupportRequestInput({
      subject: padded,
      message: "A genuine question about bumper mounting hardware for this season.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.subject).toBe("Short subject");
  });

  test("a message that is only markup is rejected as too short", () => {
    const result = validateSupportRequestInput({
      subject: "Help",
      message: "<script>alert(1)</script><img src=x onerror=alert(1)>",
    });

    expect(result.ok).toBe(false);
  });
});
