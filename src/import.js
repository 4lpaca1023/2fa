import { parseMigrationUri } from "./migration.js";

export function parseAccountsFromUri(uri) {
  const trimmed = uri.trim();
  if (trimmed.startsWith("otpauth-migration://")) {
    return parseMigrationUri(trimmed);
  }
  return [parseOtpAuthUri(trimmed)];
}

function parseOtpAuthUri(uri) {
  const parsed = new URL(uri);
  if (parsed.protocol !== "otpauth:" || parsed.hostname.toLowerCase() !== "totp") {
    throw new Error("only otpauth://totp URIs are supported");
  }

  const secret = parsed.searchParams.get("secret");
  if (!secret) throw new Error("otpauth URI is missing secret");
  const digits = parseInteger(parsed.searchParams.get("digits"), 6, "digits");
  const period = parseInteger(parsed.searchParams.get("period"), 30, "period");
  const algorithm = (parsed.searchParams.get("algorithm") ?? "SHA1").toUpperCase();
  if (!["SHA1", "SHA256", "SHA512"].includes(algorithm)) {
    throw new Error("algorithm must be SHA1, SHA256, or SHA512");
  }

  return {
    secret,
    label: decodeURIComponent(parsed.pathname.replace(/^\/+/, "")),
    issuer: parsed.searchParams.get("issuer") ?? "",
    digits,
    period,
    algorithm,
  };
}

function parseInteger(value, fallback, name) {
  if (value === null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer`);
  return parsed;
}
