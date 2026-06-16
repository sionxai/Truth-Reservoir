#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsxCli = resolve(packageRoot, "node_modules", "tsx", "dist", "cli.mjs");
const serverEntry = resolve(packageRoot, "src", "server.ts");

const result = spawnSync(process.execPath, [tsxCli, serverEntry, ...process.argv.slice(2)], {
  env: process.env,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
