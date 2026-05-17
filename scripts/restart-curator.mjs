#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const PROCESS_NAME = process.env.PM2_PROCESS_NAME || "curator";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.stdio ?? "inherit",
    encoding: "utf8",
  });

  if (!options.allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function getCuratorPort() {
  const result = run("pm2", ["jlist"], { stdio: "pipe", allowFailure: true });
  if (result.status !== 0 || !result.stdout) return undefined;

  try {
    const processes = JSON.parse(result.stdout);
    const process = processes.find((entry) => entry.name === PROCESS_NAME);
    const args = process?.pm2_env?.args;

    if (Array.isArray(args)) {
      const portFlagIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
      if (portFlagIndex >= 0 && args[portFlagIndex + 1]) {
        return String(args[portFlagIndex + 1]);
      }
    }

    return process?.pm2_env?.PORT ? String(process.pm2_env.PORT) : undefined;
  } catch {
    return undefined;
  }
}

const port = getCuratorPort();

run("pm2", ["stop", PROCESS_NAME], { allowFailure: true });

if (port && /^\d+$/.test(port)) {
  run("fuser", ["-k", `${port}/tcp`], { allowFailure: true });
}

run("pm2", ["restart", PROCESS_NAME, "--update-env"]);
