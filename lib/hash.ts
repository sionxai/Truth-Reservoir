const textEncoder = new TextEncoder();

export function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return [...view].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Digest(input: string | Uint8Array): Promise<ArrayBuffer> {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : input;
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const subtle = globalThis.crypto?.subtle;

  if (!subtle) {
    throw new Error("Web Crypto API crypto.subtle is required for SHA-256 hashing");
  }

  return subtle.digest("SHA-256", buffer);
}

export async function sha256hex(input: string | Uint8Array): Promise<string> {
  return bytesToHex(await sha256Digest(input));
}

export async function sha256Prefixed(input: string | Uint8Array): Promise<`sha256:${string}`> {
  return `sha256:${await sha256hex(input)}`;
}
