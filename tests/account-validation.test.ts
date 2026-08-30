import { describe, expect, it } from "vitest";

import {
  normalizeEmail,
  passwordValidationError,
  validateEmail,
  validateName
} from "@/server/account-validation";

describe("account validation", () => {
  it("normalizes email addresses", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("rejects malformed emails and names", () => {
    expect(validateEmail("not-an-email")).toBe(false);
    expect(validateEmail("student@example.com")).toBe(true);
    expect(validateName("A")).toBe(false);
    expect(validateName("Student User")).toBe(true);
  });

  it("requires a strong password", () => {
    expect(passwordValidationError("weak-password")).not.toBeNull();
    expect(passwordValidationError("Strong-Password-42!")).toBeNull();
  });
});
