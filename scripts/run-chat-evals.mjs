#!/usr/bin/env node
import fs from "node:fs/promises";

const baseUrl = process.env.EVAL_BASE_URL ?? "http://localhost:3001";
const evalPath = process.argv[2] ?? "evals/chat-evals.json";
const cases = JSON.parse(await fs.readFile(evalPath, "utf8"));

function parseSse(buffer) {
  return buffer
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith("data: "))
    .map((chunk) => chunk.slice(6).trim());
}

async function runCase(testCase) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: testCase.prompt }],
      searchMode: testCase.mode,
      chatMode: "veteran",
      seasonYear: 2026,
    }),
  });

  if (!response.ok) {
    return { id: testCase.id, ok: false, error: `HTTP ${response.status}` };
  }

  const text = await response.text();
  let answer = "";
  let citations = [];

  for (const event of parseSse(text)) {
    if (event === "[DONE]") continue;
    const payload = JSON.parse(event);
    if (payload.type === "token") answer += payload.token ?? "";
    if (payload.type === "citations") citations = payload.citations ?? [];
  }

  const missingTerms = (testCase.expect?.mustMention ?? [])
    .filter((term) => !answer.toLowerCase().includes(term.toLowerCase()));
  const citationFailure = Boolean(testCase.expect?.needsCitation) && citations.length === 0;

  return {
    id: testCase.id,
    ok: missingTerms.length === 0 && !citationFailure,
    missingTerms,
    citationCount: citations.length,
    answerChars: answer.length,
  };
}

const results = [];
for (const testCase of cases) {
  process.stdout.write(`Running ${testCase.id}... `);
  const result = await runCase(testCase);
  results.push(result);
  console.log(result.ok ? "ok" : "failed");
}

const failures = results.filter((result) => !result.ok);
console.log(JSON.stringify({ baseUrl, passed: results.length - failures.length, failed: failures.length, results }, null, 2));
process.exitCode = failures.length > 0 ? 1 : 0;
