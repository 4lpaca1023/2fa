import { decodeBase32 } from "./base32.js";

const HASH_NAMES = {
  SHA1: "SHA-1",
  SHA256: "SHA-256",
  SHA512: "SHA-512",
};

export async function generateTotp(
  secret,
  { timestamp = Date.now() / 1000, digits = 6, period = 30, algorithm = "SHA1" } = {},
) {
  if (period <= 0) throw new Error("period must be positive");
  const counter = Math.floor(timestamp / period);
  return generateHotp(secret, counter, { digits, algorithm });
}

export async function generateHotp(secret, counter, { digits = 6, algorithm = "SHA1" } = {}) {
  if (counter < 0) throw new Error("counter must be non-negative");
  if (digits < 6 || digits > 10) throw new Error("digits must be between 6 and 10");

  const keyBytes = typeof secret === "string" ? decodeBase32(secret) : secret;
  const hash = HASH_NAMES[algorithm.toUpperCase()];
  if (!hash) throw new Error("algorithm must be SHA1, SHA256, or SHA512");

  const cryptoApi = globalThis.crypto?.subtle;
  if (!cryptoApi) throw new Error("Web Crypto is required");

  const key = await cryptoApi.importKey("raw", keyBytes, { name: "HMAC", hash }, false, ["sign"]);
  const counterBytes = new ArrayBuffer(8);
  new DataView(counterBytes).setBigUint64(0, BigInt(counter), false);
  const digest = new Uint8Array(await cryptoApi.sign("HMAC", key, counterBytes));
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    (((digest[offset] & 0x7f) << 24) |
      (digest[offset + 1] << 16) |
      (digest[offset + 2] << 8) |
      digest[offset + 3]) >>>
    0;
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function secondsRemaining(timestamp = Date.now() / 1000, period = 30) {
  if (period <= 0) throw new Error("period must be positive");
  const seconds = Math.floor(timestamp);
  const remaining = period - (seconds % period);
  return remaining === 0 ? period : remaining;
}
