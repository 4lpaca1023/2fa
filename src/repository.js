const STORAGE_KEY = "totpAccounts";

export function createAccountListView(accounts) {
  return accounts.map((account, index) => ({
    id: String(index + 1),
    label: account.label,
    issuer: account.issuer,
  }));
}

export function selectAccount(accounts, id) {
  const index = Number.parseInt(id, 10) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= accounts.length) {
    throw new Error("account not found");
  }
  return accounts[index];
}

export async function loadAccounts(storage = chrome.storage.local) {
  const result = await storage.get(STORAGE_KEY);
  return Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
}

export async function saveAccounts(accounts, storage = chrome.storage.local) {
  await storage.set({ [STORAGE_KEY]: accounts });
}
