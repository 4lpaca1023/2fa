import assert from "node:assert/strict";
import test from "node:test";

import { parseAccountsFromUri } from "../src/import.js";

test("parses a Google Authenticator otpauth URI with a Traditional Chinese label", () => {
  const uri = [
    "otpauth://totp/",
    encodeURIComponent("臺灣科技大學Moodle教學平台:student@example.edu.tw"),
    "?secret=JBSWY3DPEHPK3PXP",
    "&issuer=",
    encodeURIComponent("臺灣科技大學Moodle教學平台"),
    "&digits=6&period=30",
  ].join("");

  assert.deepEqual(parseAccountsFromUri(uri), [
    {
      secret: "JBSWY3DPEHPK3PXP",
      label: "臺灣科技大學Moodle教學平台:student@example.edu.tw",
      issuer: "臺灣科技大學Moodle教學平台",
      digits: 6,
      period: 30,
      algorithm: "SHA1",
    },
  ]);
});

test("parses Google Authenticator migration payload", () => {
  const uri = buildMigrationUri({
    secret: Uint8Array.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad]),
    label: "Example:alice@example.com",
    issuer: "Example",
  });

  assert.deepEqual(parseAccountsFromUri(uri), [
    {
      secret: "JBSWY3DPEHPK2",
      label: "Example:alice@example.com",
      issuer: "Example",
      digits: 6,
      period: 30,
      algorithm: "SHA1",
    },
  ]);
});

function buildMigrationUri({ secret, label, issuer }) {
  const otpParameters = concatBytes([
    fieldBytes(1, secret),
    fieldString(2, label),
    fieldString(3, issuer),
    fieldVarint(4, 1),
    fieldVarint(5, 1),
    fieldVarint(6, 2),
  ]);
  const payload = concatBytes([fieldBytes(1, otpParameters), fieldVarint(2, 1)]);
  const data = Buffer.from(payload).toString("base64url");
  return `otpauth-migration://offline?data=${encodeURIComponent(data)}`;
}

function fieldVarint(number, value) {
  return concatBytes([varint(number << 3), varint(value)]);
}

function fieldBytes(number, value) {
  return concatBytes([varint((number << 3) | 2), varint(value.length), value]);
}

function fieldString(number, value) {
  return fieldBytes(number, new TextEncoder().encode(value));
}

function varint(value) {
  const bytes = [];
  let current = value;
  while (current > 0x7f) {
    bytes.push((current & 0x7f) | 0x80);
    current >>= 7;
  }
  bytes.push(current);
  return Uint8Array.from(bytes);
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
