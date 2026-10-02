import assert from "node:assert/strict";
import test from "node:test";

import { fillOtpCode } from "../src/autofill-dom.js";

test("fills an input marked for one-time-code and dispatches form events", () => {
  const events = [];
  const input = createInput({
    autocomplete: "one-time-code",
    visible: true,
    onEvent: (name) => events.push(name),
  });
  const document = createDocument([input]);

  assert.equal(fillOtpCode(document, "123456"), true);
  assert.equal(input.value, "123456");
  assert.deepEqual(events, ["input", "change"]);
});

test("falls back to visible input whose name indicates a verification code", () => {
  const hidden = createInput({ id: "otp", visible: false });
  const target = createInput({ name: "verification_code", visible: true });
  const document = createDocument([hidden, target]);

  assert.equal(fillOtpCode(document, "654321"), true);
  assert.equal(hidden.value, "");
  assert.equal(target.value, "654321");
});

function createDocument(inputs) {
  return {
    querySelectorAll(selector) {
      if (selector !== "input, textarea") throw new Error(`unexpected selector ${selector}`);
      return inputs;
    },
  };
}

function createInput({ id = "", name = "", autocomplete = "", visible = true, onEvent = () => {} }) {
  return {
    id,
    name,
    autocomplete,
    placeholder: "",
    ariaLabel: "",
    type: "text",
    disabled: false,
    readOnly: false,
    value: "",
    offsetParent: visible ? {} : null,
    focus() {},
    dispatchEvent(event) {
      onEvent(event.type);
      return true;
    },
  };
}
