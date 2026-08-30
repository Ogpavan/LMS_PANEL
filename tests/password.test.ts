import { describe, expect, it } from "vitest";

import { hashPassword, isPasswordHash, verifyPassword } from "@/server/password";

describe("password hashing", () => {
  it("uses a salted scrypt hash and verifies without exposing the password", () => {
    const hash = hashPassword("Strong-Password-42!");

    expect(isPasswordHash(hash)).toBe(true);
    expect(hash).not.toContain("Strong-Password-42!");
    expect(verifyPassword("Strong-Password-42!", hash)).toBe(true);
    expect(verifyPassword("Wrong-Password-42!", hash)).toBe(false);
  });
});
