import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import test from "node:test";

import { parseAccountsFromUri } from "../src/import.js";
import { generateTotp } from "../src/totp.js";

test("extension parser and TOTP generator work with repository image.png", async (t) => {
  if (!existsSync("image.png")) t.skip("image.png is not present");
  const zbar = spawnSync("zbarimg", ["--quiet", "--raw", "image.png"], {
    encoding: "utf8",
  });
  if (zbar.status !== 0) t.skip("zbarimg is required");

  const uri = zbar.stdout.split(/\r?\n/).find((line) => line.startsWith("otpauth-"));
  assert.ok(uri?.startsWith("otpauth-migration://"));

  const accounts = parseAccountsFromUri(uri);
  assert.equal(accounts.length, 8);
  assert.equal(
    accounts.some((account) =>
      `${account.issuer} ${account.label}`.includes("臺灣科技大學Moodle教學平台"),
    ),
    true,
  );

  const codes = await Promise.all(accounts.map((account) => generateTotp(account.secret, account)));
  assert.equal(codes.length, 8);
  for (const code of codes) {
    assert.match(code, /^\d{6}$/);
  }
});
