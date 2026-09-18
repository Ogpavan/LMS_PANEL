import { describe, expect, it } from "vitest";

function normalizeAssignmentStatus(status?: string): "DRAFT" | "PUBLISHED" {
  return status?.toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
}

function computeNextStatus(currentStatus: string, targetStatus?: string): "DRAFT" | "PUBLISHED" {
  if (targetStatus) {
    return normalizeAssignmentStatus(targetStatus);
  }
  return currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
}

describe("Assignments status normalization & toggle rules", () => {
  it("defaults invalid or empty status to DRAFT", () => {
    expect(normalizeAssignmentStatus(undefined)).toBe("DRAFT");
    expect(normalizeAssignmentStatus("")).toBe("DRAFT");
    expect(normalizeAssignmentStatus("random")).toBe("DRAFT");
    expect(normalizeAssignmentStatus("draft")).toBe("DRAFT");
    expect(normalizeAssignmentStatus("PUBLISHED")).toBe("PUBLISHED");
    expect(normalizeAssignmentStatus("published")).toBe("PUBLISHED");
  });

  it("toggles status correctly when no target status is provided", () => {
    expect(computeNextStatus("DRAFT")).toBe("PUBLISHED");
    expect(computeNextStatus("PUBLISHED")).toBe("DRAFT");
  });

  it("sets specific status when target status is provided", () => {
    expect(computeNextStatus("DRAFT", "PUBLISHED")).toBe("PUBLISHED");
    expect(computeNextStatus("PUBLISHED", "DRAFT")).toBe("DRAFT");
  });
});
