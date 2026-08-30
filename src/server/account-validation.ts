const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string) {
  return value.length <= 254 && emailPattern.test(value);
}

export function validateName(value: string) {
  const normalized = value.trim();
  return normalized.length >= 2 && normalized.length <= 100;
}

export function passwordValidationError(password: string) {
  if (password.length < 12) return "Password must contain at least 12 characters";
  if (password.length > 128) return "Password must contain no more than 128 characters";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a special character";
  return null;
}
