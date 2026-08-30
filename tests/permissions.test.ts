import { describe, expect, it } from "vitest";

import { hasInstructorPermission } from "@/server/permissions";

describe("instructor permission enforcement", () => {
  it("denies missing and null permission sets", () => {
    expect(hasInstructorPermission(null, "academy.courses.create")).toBe(false);
    expect(hasInstructorPermission([], "academy.courses.create")).toBe(false);
  });

  it("allows only an explicitly assigned permission", () => {
    expect(
      hasInstructorPermission(["academy.dashboard", "academy.courses.create"], "academy.courses.create")
    ).toBe(true);
    expect(hasInstructorPermission(["academy.dashboard"], "academy.courses.create")).toBe(false);
  });
});
