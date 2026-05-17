#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn } = require("node:child_process");

const rawArgs = process.argv.slice(2);
const forwardedArgs = [];

let explicitPort;
let positionalPort;

for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];

  if (arg === "--port" || arg === "-p") {
    explicitPort = rawArgs[index + 1];
    index += 1;
    continue;
  }

  if (arg.startsWith("--port=")) {
    explicitPort = arg.slice("--port=".length);
    continue;
  }

  if (arg.startsWith("-p=")) {
    explicitPort = arg.slice("-p=".length);
    continue;
  }

  if (arg === "--hostname" || arg === "-H" || arg === "--keepAliveTimeout" || arg === "--inspect") {
    forwardedArgs.push(arg);

    const value = rawArgs[index + 1];
    if (value !== undefined) {
      forwardedArgs.push(value);
      index += 1;
    }

    continue;
  }

  if (arg === "--experimental-next-config-strip-types" || arg === "--experimental-cpu-prof") {
    forwardedArgs.push(arg);
    continue;
  }

  // PM2 + npm can leak numeric config values like `3145` as a positional arg.
  // Next 16 treats the first positional arg as a project directory, so ignore it.
  if (/^\d+$/.test(arg)) {
    positionalPort = positionalPort || arg;
    continue;
  }
}

const configPort =
  process.env.npm_config_port && process.env.npm_config_port !== "true"
    ? process.env.npm_config_port
    : undefined;
const port = explicitPort || configPort || positionalPort || process.env.PORT || "3000";
const nextBin = require.resolve("next/dist/bin/next");
const shouldSubmitIndexNow = process.env.INDEXNOW_SUBMIT_ON_START === "true";
const indexNowDelayMs = Number.parseInt(process.env.INDEXNOW_SUBMIT_DELAY_MS ?? "5000", 10);
let indexNowTimeout;

function runIndexNowSubmission() {
  if (!shouldSubmitIndexNow) return;

  const scriptPath = require.resolve("../scripts/indexnow-submit.mjs");

  const task = spawn(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  task.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[indexnow] submission exited with code ${code}`);
    }
  });
}

const child = spawn(
  process.execPath,
  [nextBin, "start", "--port", String(port), ...forwardedArgs],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: "inherit",
  },
);

let forwardedSignal = false;

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    forwardedSignal = true;
    child.kill(signal);
  });
}

child.on("spawn", () => {
  if (!shouldSubmitIndexNow) return;

  indexNowTimeout = setTimeout(runIndexNowSubmission, Number.isFinite(indexNowDelayMs) ? indexNowDelayMs : 5000);
});

child.on("exit", (code, signal) => {
  if (indexNowTimeout) {
    clearTimeout(indexNowTimeout);
  }

  if (signal) {
    process.exit(0);
    return;
  }

  process.exit(forwardedSignal ? 0 : code ?? 0);
});
