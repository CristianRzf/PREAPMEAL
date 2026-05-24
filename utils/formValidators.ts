export const FORM_LIMITS = {
  email: 254,
  password: 64,
  displayName: 50,
  username: 20,
  age: 3,
  weight: 5,
  height: 3,
  shoppingItemName: 60,
  shoppingQuantity: 6,
  shoppingPrice: 9,
  resetEmail: 254,
};

export function limitText(value: string, maxLength: number) {
  return value.slice(0, maxLength);
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function sanitizeDecimal(value: string, maxLength: number) {
  const normalized = value.replace(/,/g, ".");
  let result = "";
  let hasDot = false;

  for (const char of normalized) {
    if (/\d/.test(char)) {
      result += char;
      continue;
    }

    if (char === "." && !hasDot) {
      result += ".";
      hasDot = true;
    }
  }

  return result.slice(0, maxLength);
}

export function sanitizeUsername(value: string) {
  return value
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, FORM_LIMITS.username);
}

export function isValidEmail(value: string) {
  const email = value.trim();
  if (!email || email.length > FORM_LIMITS.email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase().slice(0, FORM_LIMITS.email);
}
