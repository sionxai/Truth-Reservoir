import { describe, expect, it } from "vitest";
import { sha256hex, sha256Prefixed } from "../lib/hash.ts";

describe("hash helpers", () => {
  it("sha256hex matches known SHA-256 vectors", async () => {
    await expect(sha256hex("abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    await expect(sha256hex("")).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("sha256Prefixed prefixes the hex digest", async () => {
    await expect(sha256Prefixed("abc")).resolves.toBe(
      "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});
