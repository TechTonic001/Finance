export const EMAIL_REGEX =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

export const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { id: "uppercase", label: "At least one uppercase letter (A–Z)", test: (value: string) => /[A-Z]/.test(value) },
  { id: "lowercase", label: "At least one lowercase letter (a–z)", test: (value: string) => /[a-z]/.test(value) },
  { id: "number", label: "At least one number (0–9)", test: (value: string) => /\d/.test(value) },
  { id: "special", label: "At least one special character (!@#$%^&*)", test: (value: string) => /[!@#$%^&*]/.test(value) },
] as const;

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_REGEX.test(value);
}

export function isValidPassword(value: string): boolean {
  return PASSWORD_REGEX.test(value);
}
