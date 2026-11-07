import { describe, it, expect } from "vitest";
import { z as z3 } from "zod/v3";
import { z as z4 } from "zod/v4";
import { isZodSchema, getTypeName, getInnerType, getDefaultValue } from "../src/adapters";
import { v3 } from "../src/adapters/v3";
import { v4 } from "../src/adapters/v4";

describe("version detection", () => {
  it("v3 adapter detects only Zod 3 schemas", () => {
    expect(v3.isZodSchema(z3.string())).toBe(true);
    expect(v3.isZodSchema(z4.string())).toBe(false);
  });

  it("v4 adapter detects only Zod 4 schemas", () => {
    expect(v4.isZodSchema(z4.string())).toBe(true);
    expect(v4.isZodSchema(z3.string())).toBe(false);
  });

  it("unified isZodSchema detects both, rejects non-schemas", () => {
    expect(isZodSchema(z3.string())).toBe(true);
    expect(isZodSchema(z4.string())).toBe(true);
    expect(isZodSchema("nope")).toBe(false);
    expect(isZodSchema(null)).toBe(false);
  });
});

describe("getTypeName — canonical names from both versions", () => {
  const cases: [string, () => unknown, () => unknown, string][] = [
    ["string", () => z3.string(), () => z4.string(), "ZodString"],
    ["number", () => z3.number(), () => z4.number(), "ZodNumber"],
    ["boolean", () => z3.boolean(), () => z4.boolean(), "ZodBoolean"],
    ["object", () => z3.object({}), () => z4.object({}), "ZodObject"],
    ["optional", () => z3.string().optional(), () => z4.string().optional(), "ZodOptional"],
    ["nullable", () => z3.string().nullable(), () => z4.string().nullable(), "ZodNullable"],
    ["default", () => z3.string().default("x"), () => z4.string().default("x"), "ZodDefault"],
  ];

  for (const [label, makeV3, makeV4, expected] of cases) {
    it(`${label} → ${expected} (both versions)`, () => {
      expect(getTypeName(makeV3())).toBe(expected);
      expect(getTypeName(makeV4())).toBe(expected);
    });
  }
});

describe("getInnerType", () => {
  it("unwraps optional and default in both versions", () => {
    for (const [v3s, v4s] of [
      [z3.string().optional(), z4.string().optional()],
      [z3.string().default("x"), z4.string().default("x")],
    ] as const) {
      expect(getTypeName(getInnerType(v3s))).toBe("ZodString");
      expect(getTypeName(getInnerType(v4s))).toBe("ZodString");
    }
  });

  it("returns null for non-wrapper types", () => {
    expect(getInnerType(z3.string())).toBeNull();
    expect(getInnerType(z4.string())).toBeNull();
  });
});

describe("getDefaultValue", () => {
  it("extracts defaults from both versions", () => {
    expect(getDefaultValue(z3.string().default("hi"))).toEqual({ found: true, value: "hi" });
    expect(getDefaultValue(z4.string().default("hi"))).toEqual({ found: true, value: "hi" });
    expect(getDefaultValue(z3.number().default(42))).toEqual({ found: true, value: 42 });
    expect(getDefaultValue(z4.number().default(42))).toEqual({ found: true, value: 42 });
  });

  it("returns found:false for non-default schemas", () => {
    expect(getDefaultValue(z3.string())).toEqual({ found: false });
    expect(getDefaultValue(z4.string())).toEqual({ found: false });
  });
});
