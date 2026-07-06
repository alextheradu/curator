import { describe, expect, it } from "vitest";

import { normalizeEventKey, normalizeMatchKey, normalizeTeamKey } from "../scripts/tba-normalize.mjs";

describe("normalizeTeamKey", () => {
  it("accepts bare team numbers", () => {
    expect(normalizeTeamKey("254")).toBe("frc254");
  });

  it("accepts frc-prefixed keys in any case", () => {
    expect(normalizeTeamKey("FRC1114")).toBe("frc1114");
    expect(normalizeTeamKey(" frc33 ")).toBe("frc33");
  });

  it("extracts the number from mixed input", () => {
    expect(normalizeTeamKey("team 118")).toBe("frc118");
  });

  it("rejects input without a number", () => {
    expect(() => normalizeTeamKey("cheesy poofs")).toThrow(/Invalid team identifier/);
  });
});

describe("normalizeEventKey", () => {
  it("accepts standard event keys", () => {
    expect(normalizeEventKey("2026njski")).toBe("2026njski");
    expect(normalizeEventKey(" 2024CMPTX ")).toBe("2024cmptx");
  });

  it("rejects keys without a year prefix", () => {
    expect(() => normalizeEventKey("njski")).toThrow(/Invalid event key/);
  });

  it("rejects keys with path characters", () => {
    expect(() => normalizeEventKey("2026njski/../teams")).toThrow(/Invalid event key/);
  });
});

describe("normalizeMatchKey", () => {
  it("accepts qualification match keys (no set number)", () => {
    expect(normalizeMatchKey("2026njski_qm1")).toBe("2026njski_qm1");
    expect(normalizeMatchKey("2026njski_QM42")).toBe("2026njski_qm42");
  });

  it("accepts playoff match keys (level + set + match)", () => {
    expect(normalizeMatchKey("2024cmptx_sf1m1")).toBe("2024cmptx_sf1m1");
    expect(normalizeMatchKey("2024cmptx_f1m2")).toBe("2024cmptx_f1m2");
    expect(normalizeMatchKey("2023week0_qf2m3")).toBe("2023week0_qf2m3");
    expect(normalizeMatchKey("2015nyny_ef1m1")).toBe("2015nyny_ef1m1");
  });

  it("rejects malformed keys", () => {
    expect(() => normalizeMatchKey("2026njski_qm")).toThrow(/Invalid match key/);
    expect(() => normalizeMatchKey("2026njski_zz1m1")).toThrow(/Invalid match key/);
    expect(() => normalizeMatchKey("evil_qm1")).toThrow(/Invalid match key/);
    expect(() => normalizeMatchKey("2026njski_qm1m")).toThrow(/Invalid match key/);
    expect(() => normalizeMatchKey("2026njski_sf1")).toThrow(/Invalid match key/);
  });
});
