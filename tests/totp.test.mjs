import assert from "node:assert/strict";
import test from "node:test";

import { generateTotp } from "../src/totp.js";

test("TOTP matches RFC 6238 SHA-1 vectors", async () => {
  const secret = new TextEncoder().encode("12345678901234567890");

  assert.equal(await generateTotp(secret, { timestamp: 59, digits: 8 }), "94287082");
  assert.equal(await generateTotp(secret, { timestamp: 1111111109, digits: 8 }), "07081804");
  assert.equal(await generateTotp(secret, { timestamp: 1111111111, digits: 8 }), "14050471");
  assert.equal(await generateTotp(secret, { timestamp: 1234567890, digits: 8 }), "89005924");
  assert.equal(await generateTotp(secret, { timestamp: 2000000000, digits: 8 }), "69279037");
  assert.equal(await generateTotp(secret, { timestamp: 20000000000, digits: 8 }), "65353130");
});
