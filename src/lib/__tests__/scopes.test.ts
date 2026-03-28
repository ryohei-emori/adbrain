import { describe, it, expect } from "vitest";
import { getScopeLabels, getScopeDisplayName } from "../scopes";

describe("getScopeLabels", () => {
  it("returns Google Ads scopes", () => {
    const labels = getScopeLabels("google-ads");
    expect(labels.length).toBeGreaterThan(0);
    expect(labels[0]!.display).toBe("Campaign Management");
  });

  it("returns Meta Ads scopes", () => {
    const labels = getScopeLabels("meta-ads");
    expect(labels.length).toBe(2);
    expect(labels.map((s) => s.display)).toContain("Ad Management");
    expect(labels.map((s) => s.display)).toContain("Performance Data");
  });

  it("returns empty array for unknown provider", () => {
    expect(getScopeLabels("unknown")).toEqual([]);
  });
});

describe("getScopeDisplayName", () => {
  it("maps technical scope to display name", () => {
    expect(
      getScopeDisplayName("google-ads", "https://www.googleapis.com/auth/adwords")
    ).toBe("Campaign Management");
  });

  it("returns technical string for unknown scope", () => {
    expect(getScopeDisplayName("google-ads", "unknown_scope")).toBe("unknown_scope");
  });

  it("returns technical string for unknown provider", () => {
    expect(getScopeDisplayName("unknown", "some_scope")).toBe("some_scope");
  });
});
