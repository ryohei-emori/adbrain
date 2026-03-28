import { describe, it, expect } from "vitest";
import { getRiskMeta, type RiskLevel } from "../risk";

describe("getRiskMeta", () => {
  it.each<[RiskLevel, string]>([
    ["LOW", "Low Risk"],
    ["MEDIUM", "Medium Risk"],
    ["HIGH", "High Risk"],
  ])('returns correct label for %s', (level, expectedLabel) => {
    expect(getRiskMeta(level).label).toBe(expectedLabel);
  });

  it("LOW risk has green color", () => {
    expect(getRiskMeta("LOW").textColor).toContain("green");
  });

  it("MEDIUM risk has amber color", () => {
    expect(getRiskMeta("MEDIUM").textColor).toContain("amber");
  });

  it("HIGH risk has red color", () => {
    expect(getRiskMeta("HIGH").textColor).toContain("red");
  });
});
