import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const buildSteps: Array<{ command: string; args: string[]; label: string }> = [
  {
    command: "node",
    args: ["node_modules/tsx/dist/cli.mjs", "scripts/schema-emit.ts"],
    label: "schema emit"
  },
  {
    command: "node",
    args: ["node_modules/tsx/dist/cli.mjs", "scripts/build-api.ts"],
    label: "API build"
  },
  {
    command: "node",
    args: ["node_modules/next/dist/bin/next", "build"],
    label: "Next build"
  }
];

export default async function setup() {
  for (const step of buildSteps) {
    try {
      await execFileAsync(step.command, step.args, {
        cwd: process.cwd(),
        env: process.env,
        maxBuffer: 20 * 1024 * 1024,
        timeout: 180000
      });
    } catch (error) {
      if (error && typeof error === "object") {
        const details = error as { stdout?: string; stderr?: string; message?: string };
        throw new Error(
          [
            `${step.label} failed before Vitest assertions.`,
            details.message,
            details.stdout,
            details.stderr
          ]
            .filter(Boolean)
            .join("\n")
        );
      }

      throw error;
    }
  }
}
