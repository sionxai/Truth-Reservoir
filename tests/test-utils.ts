import { readFile } from "node:fs/promises";
import type { Proposition } from "../lib/types.ts";

export function cloneProposition(proposition: Proposition): Proposition {
  return structuredClone(proposition);
}

export async function readJsonFile<T = unknown>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export function findPredecessorSeed(propositions: Proposition[]): Proposition {
  const proposition = propositions.find((item) =>
    item.canonicalProposition.includes("공공기관의 개인정보보호")
  );

  if (!proposition) {
    throw new Error("Expected predecessor-law seed proposition to exist");
  }

  return proposition;
}

export function findBallotShortageSeed(propositions: Proposition[]): Proposition {
  const proposition = propositions.find(
    (item) => item.propositionId === "stmt:cb0719e9aac6e4c86677d2e5"
  );

  if (!proposition) {
    throw new Error("Expected ballot-shortage seed proposition to exist");
  }

  return proposition;
}
