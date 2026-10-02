const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function decodeBase32(secret) {
  const normalized = secret.toUpperCase().replace(/\s+/g, "").replace(/=+$/g, "");
  let bits = 0;
  let value = 0;
  const out = [];

  for (const char of normalized) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error("secret must be valid Base32");
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(out);
}

export function encodeBase32(bytes) {
  let bits = 0;
  let value = 0;
  let out = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    out += ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}
