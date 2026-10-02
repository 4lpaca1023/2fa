import { encodeBase32 } from "./base32.js";

const ALGORITHMS = new Map([
  [0, "SHA1"],
  [1, "SHA1"],
  [2, "SHA256"],
  [3, "SHA512"],
]);

const DIGITS = new Map([
  [0, 6],
  [1, 6],
  [2, 8],
]);

const TYPE_TOTP = 2;

export function parseMigrationUri(uri) {
  const parsed = new URL(uri);
  if (parsed.protocol !== "otpauth-migration:" || parsed.hostname !== "offline") {
    throw new Error("URI must start with otpauth-migration://offline");
  }
  const data = parsed.searchParams.get("data");
  if (!data) throw new Error("migration URI is missing data");

  const payload = decodeBase64Url(data);
  const fields = parseMessage(payload);
  const accounts = (fields.get(1) ?? [])
    .map((value) => parseOtpParameters(value))
    .filter((account) => account !== null);

  if (accounts.length === 0) {
    throw new Error("migration payload did not contain supported TOTP accounts");
  }
  return accounts;
}

function parseOtpParameters(message) {
  const fields = parseMessage(message);
  const secret = firstBytes(fields, 1);
  if (!secret) return null;
  const otpType = firstInt(fields, 6, TYPE_TOTP);
  if (otpType !== TYPE_TOTP) return null;

  const algorithm = ALGORITHMS.get(firstInt(fields, 4, 1));
  const digits = DIGITS.get(firstInt(fields, 5, 1));
  if (!algorithm || !digits) return null;

  return {
    secret: encodeBase32(secret),
    label: firstText(fields, 2),
    issuer: firstText(fields, 3),
    digits,
    period: 30,
    algorithm,
  };
}

function parseMessage(data) {
  const fields = new Map();
  let offset = 0;
  while (offset < data.length) {
    const tag = readVarint(data, offset);
    offset = tag.offset;
    const fieldNumber = tag.value >> 3;
    const wireType = tag.value & 0x07;
    let value;

    if (wireType === 0) {
      const result = readVarint(data, offset);
      value = result.value;
      offset = result.offset;
    } else if (wireType === 2) {
      const size = readVarint(data, offset);
      offset = size.offset;
      requireSize(data, offset, size.value);
      value = data.slice(offset, offset + size.value);
      offset += size.value;
    } else {
      throw new Error(`unsupported protobuf wire type ${wireType}`);
    }

    if (!fields.has(fieldNumber)) fields.set(fieldNumber, []);
    fields.get(fieldNumber).push(value);
  }
  return fields;
}

function readVarint(data, offset) {
  let shift = 0;
  let value = 0;
  let current = offset;
  while (current < data.length) {
    const byte = data[current];
    current += 1;
    value += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) return { value, offset: current };
    shift += 7;
    if (shift > 63) throw new Error("protobuf varint is too long");
  }
  throw new Error("truncated protobuf varint");
}

function requireSize(data, offset, size) {
  if (offset + size > data.length) throw new Error("truncated protobuf field");
}

function firstInt(fields, number, fallback) {
  const value = fields.get(number)?.[0];
  if (value === undefined) return fallback;
  if (typeof value !== "number") throw new Error(`field ${number} must be varint`);
  return value;
}

function firstBytes(fields, number) {
  const value = fields.get(number)?.[0];
  if (value === undefined) return null;
  if (!(value instanceof Uint8Array)) throw new Error(`field ${number} must be bytes`);
  return value;
}

function firstText(fields, number) {
  const value = firstBytes(fields, number);
  return value ? new TextDecoder().decode(value) : "";
}

function decodeBase64Url(data) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  if (globalThis.Buffer) {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
