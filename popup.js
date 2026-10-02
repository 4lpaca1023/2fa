import { fillOtpCode } from "./src/autofill-dom.js";
import { parseAccountsFromUri } from "./src/import.js";
import { createAccountListView, loadAccounts, saveAccounts, selectAccount } from "./src/repository.js";
import { generateTotp, secondsRemaining } from "./src/totp.js";

const accountSelect = document.querySelector("#accountSelect");
const refreshButton = document.querySelector("#refreshButton");
const codeText = document.querySelector("#codeText");
const metaText = document.querySelector("#metaText");
const copyButton = document.querySelector("#copyButton");
const fillButton = document.querySelector("#fillButton");
const importText = document.querySelector("#importText");
const importButton = document.querySelector("#importButton");
const statusText = document.querySelector("#statusText");

let accounts = [];
let currentCode = "";
let timerId = null;

init();

async function init() {
  accounts = await loadAccounts();
  renderAccounts();
  await renderCode();
  startTimer();

  accountSelect.addEventListener("change", renderCode);
  refreshButton.addEventListener("click", renderCode);
  importButton.addEventListener("click", importAccounts);
  copyButton.addEventListener("click", copyCode);
  fillButton.addEventListener("click", fillCurrentTab);
}

function renderAccounts() {
  accountSelect.replaceChildren();
  for (const account of createAccountListView(accounts)) {
    const option = document.createElement("option");
    option.value = account.id;
    option.textContent = [account.issuer, account.label].filter(Boolean).join(" - ");
    accountSelect.append(option);
  }
  accountSelect.disabled = accounts.length === 0;
}

async function renderCode() {
  if (accounts.length === 0) {
    currentCode = "";
    codeText.textContent = "------";
    metaText.textContent = "No account imported";
    return;
  }

  try {
    const account = selectAccount(accounts, accountSelect.value || "1");
    currentCode = await generateTotp(account.secret, account);
    codeText.textContent = currentCode;
    metaText.textContent = `${secondsRemaining(Date.now() / 1000, account.period)}s remaining`;
    setStatus("");
  } catch (error) {
    currentCode = "";
    codeText.textContent = "------";
    setStatus(error.message);
  }
}

async function importAccounts() {
  try {
    const imported = parseAccountsFromUri(importText.value);
    await saveAccounts(imported);
    accounts = imported;
    importText.value = "";
    renderAccounts();
    accountSelect.value = "1";
    await renderCode();
    setStatus(`Imported ${accounts.length} account${accounts.length === 1 ? "" : "s"}`);
  } catch (error) {
    setStatus(error.message);
  }
}

async function copyCode() {
  if (!currentCode) return;
  await navigator.clipboard.writeText(currentCode);
  setStatus("Copied");
}

async function fillCurrentTab() {
  if (!currentCode) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("No active tab");
    return;
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (code) => {
      const inputs = Array.from(document.querySelectorAll("input, textarea"));
      const usable = (field) => !field.disabled && !field.readOnly && field.offsetParent !== null;
      const exact = inputs.find((field) => usable(field) && field.autocomplete === "one-time-code");
      const likely = inputs.find((field) => {
        const text = [field.id, field.name, field.placeholder, field.ariaLabel, field.type].join(" ");
        return usable(field) && /otp|totp|2fa|mfa|auth|verify|verification|code|token/i.test(text);
      });
      const field = exact ?? likely;
      if (!field) return false;
      field.focus();
      field.value = code;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    args: [currentCode],
  });

  setStatus(result ? "Filled" : "No OTP input found");
}

function startTimer() {
  if (timerId) clearInterval(timerId);
  timerId = setInterval(renderCode, 1000);
}

function setStatus(message) {
  statusText.textContent = message;
}
