const OTP_PATTERN = /otp|totp|2fa|mfa|auth|verify|verification|code|token/i;

export function fillOtpCode(documentRef, code) {
  const input = findOtpInput(documentRef);
  if (!input) return false;

  input.focus();
  input.value = code;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

export function findOtpInput(documentRef) {
  const fields = Array.from(documentRef.querySelectorAll("input, textarea"));
  return fields.find(isOneTimeCodeField) ?? fields.find(isLikelyOtpField) ?? null;
}

function isOneTimeCodeField(field) {
  return isUsable(field) && field.autocomplete === "one-time-code";
}

function isLikelyOtpField(field) {
  if (!isUsable(field)) return false;
  const text = [field.id, field.name, field.placeholder, field.ariaLabel, field.type].join(" ");
  return OTP_PATTERN.test(text);
}

function isUsable(field) {
  return !field.disabled && !field.readOnly && field.offsetParent !== null;
}
