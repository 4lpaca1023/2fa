import assert from "node:assert/strict";
import test from "node:test";

import { createAccountListView, selectAccount } from "../src/repository.js";

test("account list view does not expose secrets", () => {
  const accounts = [
    {
      secret: "JBSWY3DPEHPK3PXP",
      label: "臺灣科技大學Moodle教學平台:student@example.edu.tw",
      issuer: "臺灣科技大學Moodle教學平台",
      digits: 6,
      period: 30,
      algorithm: "SHA1",
    },
  ];

  assert.deepEqual(createAccountListView(accounts), [
    {
      id: "1",
      label: "臺灣科技大學Moodle教學平台:student@example.edu.tw",
      issuer: "臺灣科技大學Moodle教學平台",
    },
  ]);
  assert.equal(JSON.stringify(createAccountListView(accounts)).includes("JBSWY3DPEHPK3PXP"), false);
});

test("selects account by 1-based id", () => {
  const accounts = [{ label: "first" }, { label: "second" }];

  assert.equal(selectAccount(accounts, "2"), accounts[1]);
  assert.throws(() => selectAccount(accounts, "3"), /account not found/);
});
