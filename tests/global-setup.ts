import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default async function setup() {
  try {
    await execFileAsync("npm", ["run", "build"], {
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
          "npm run build failed before Vitest assertions.",
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
