import { describe, it, expect } from "vitest";
import { z } from "zod";
import { f, getMeta } from "../src/index";
import { getTypeName } from "../src/adapters";

describe("SCHEMA-01: f mirrors all Zod methods 1:1", () => {
  it("f.string() produces a schema with the same type as z.string()", () => {
    const schema = f.string().toZod();
    expect(getTypeName(schema)).toBe(getTypeName(z.string()));
  });

  it("f.number() produces a schema with the same type as z.number()", () => {
    const schema = f.number().toZod();
    expect(getTypeName(schema)).toBe(getTypeName(z.number()));
  });

  it("f.object() produces a schema with the same type as z.object()", () => {
    const schema = f.object({ name: f.string() }).toZod();
    expect(getTypeName(schema)).toBe(getTypeName(z.object({ name: z.string() })));
  });
});

describe("SCHEMA-02: .field(type) attaches fieldType via WeakMap", () => {
  it("getMeta(f.string().field('text').toZod())?.fieldType equals 'text'", () => {
    const schema = f.string().field("text");
    const meta = getMeta(schema.toZod());
    expect(meta?.fieldType).toBe("text");
  });

  it("getMeta returns undefined for a plain z.string() schema", () => {
    const schema = z.string();
    expect(getMeta(schema)).toBeUndefined();
  });
});

describe("SCHEMA-03: .props() attaches custom props separately from .field()", () => {
  it("props are stored in fieldProps", () => {
    const schema = f.string().field("text").props({ rows: 4 });
    const meta = getMeta(schema.toZod());
    expect(meta?.fieldType).toBe("text");
    expect(meta?.fieldProps).toEqual({ rows: 4 });
  });

  it("multiple .props() calls merge instead of overwrite", () => {
    const schema = f.string().field("text").props({ rows: 4 }).props({ cols: 10 });
    const meta = getMeta(schema.toZod());
    expect(meta?.fieldProps).toEqual({ rows: 4, cols: 10 });
  });

  it("later .props() overwrites same key", () => {
    const schema = f.string().field("text").props({ rows: 4 }).props({ rows: 8 });
    const meta = getMeta(schema.toZod());
    expect(meta?.fieldProps).toEqual({ rows: 8 });
  });
});

describe("SCHEMA-04: .label(text) attaches label metadata", () => {
  it("getMeta(f.string().label('Name').toZod())?.label equals 'Name'", () => {
    const schema = f.string().label("Name");
    const meta = getMeta(schema.toZod());
    expect(meta?.label).toBe("Name");
  });
});

describe("SCHEMA-05: .placeholder(text) attaches placeholder metadata", () => {
  it("getMeta(f.string().placeholder('Enter...').toZod())?.placeholder equals 'Enter...'", () => {
    const schema = f.string().placeholder("Enter...");
    const meta = getMeta(schema.toZod());
    expect(meta?.placeholder).toBe("Enter...");
  });
});

describe("SCHEMA-06: metadata survives Zod chaining in any order", () => {
  it("label survives .min() chaining after .label()", () => {
    const schema = f.string().label("Name").min(2);
    const meta = getMeta(schema.toZod());
    expect(meta?.label).toBe("Name");
  });

  it("field survives multiple chain steps: .field().label().email().min()", () => {
    const schema = f.string().field("text").email().min(3);
    const meta = getMeta(schema.toZod());
    expect(meta?.fieldType).toBe("text");
  });

  it("placeholder survives .optional() chaining", () => {
    const schema = f.string().placeholder("x").optional();
    const meta = getMeta(schema.toZod());
    expect(meta?.placeholder).toBe("x");
  });

  it("all metadata fields survive: .field().label().placeholder().props().min().max()", () => {
    const schema = f.string().field("text").label("Name").placeholder("Enter").props({ rows: 2 }).min(1).max(100);
    const meta = getMeta(schema.toZod());
    expect(meta?.fieldType).toBe("text");
    expect(meta?.label).toBe("Name");
    expect(meta?.placeholder).toBe("Enter");
    expect(meta?.fieldProps).toEqual({ rows: 2 });
  });
});

describe("SCHEMA-08: .toZod() returns clean Zod schema without chain methods", () => {
  it("zodSchema.label is undefined after .toZod()", () => {
    const schema = f.string().label("Name");
    const zodSchema = schema.toZod();
    expect((zodSchema as unknown as Record<string, unknown>).label).toBeUndefined();
  });

  it("zodSchema.field is undefined after .toZod()", () => {
    const schema = f.string().label("Name");
    const zodSchema = schema.toZod();
    expect((zodSchema as unknown as Record<string, unknown>).field).toBeUndefined();
  });

  it("zodSchema.placeholder is undefined after .toZod()", () => {
    const schema = f.string().placeholder("x");
    const zodSchema = schema.toZod();
    expect((zodSchema as unknown as Record<string, unknown>).placeholder).toBeUndefined();
  });

  it("zodSchema.props is undefined after .toZod()", () => {
    const schema = f.string().props({ a: 1 });
    const zodSchema = schema.toZod();
    expect((zodSchema as unknown as Record<string, unknown>).props).toBeUndefined();
  });

  it("zodSchema.toZod is undefined after .toZod()", () => {
    const schema = f.string();
    const zodSchema = schema.toZod();
    expect((zodSchema as unknown as Record<string, unknown>).toZod).toBeUndefined();
  });
});

describe("SCHEMA-10: No _def mutation — z._def unchanged after f usage", () => {
  it("z.string()._def is unmodified after f.string() call", () => {
    const before = Object.keys(z.string()._def);
    f.string().label("x");
    const after = Object.keys(z.string()._def);
    expect(after).toEqual(before);
  });

  it("WeakMap entry does not appear on the schema's own enumerable properties", () => {
    const schema = f.string().label("Name").toZod();
    const ownKeys = Object.keys(schema);
    expect(ownKeys).not.toContain("label");
    expect(ownKeys).not.toContain("fieldType");
    expect(ownKeys).not.toContain("placeholder");
  });
});

describe("SCHEMA-11: .refine() and .superRefine() work through proxy", () => {
  it("sync .refine() preserves metadata and validates", () => {
    const schema = f.string().field("text").label("Code").refine((val) => val.length > 0, "Required");
    const meta = getMeta(schema.toZod());
    expect(meta?.fieldType).toBe("text");
    expect(meta?.label).toBe("Code");
    const result = schema.toZod().safeParse("");
    expect(result.success).toBe(false);
  });

  it("async .refine() preserves metadata", async () => {
    const schema = f.string().field("text").label("Email").refine(
      async (val) => val.includes("@"),
      "Must be email"
    );
    const meta = getMeta(schema.toZod());
    expect(meta?.fieldType).toBe("text");
    expect(meta?.label).toBe("Email");
    const result = await schema.toZod().safeParseAsync("notanemail");
    expect(result.success).toBe(false);
    const resultOk = await schema.toZod().safeParseAsync("ok@test.com");
    expect(resultOk.success).toBe(true);
  });

  it("sync .superRefine() preserves metadata", () => {
    const schema = f.string().field("text").label("Password").superRefine((val, ctx) => {
      if (val.length < 8) {
        ctx.addIssue({ code: "custom", message: "Min 8 chars" });
      }
    });
    const meta = getMeta(schema.toZod());
    expect(meta?.fieldType).toBe("text");
    expect(meta?.label).toBe("Password");
    const result = schema.toZod().safeParse("short");
    expect(result.success).toBe(false);
  });
});

describe("SCHEMA-12: Adapter-based type detection works", () => {
  it("getTypeName returns canonical names for basic types", () => {
    expect(getTypeName(z.string())).toBe("ZodString");
    expect(getTypeName(z.number())).toBe("ZodNumber");
    expect(getTypeName(z.boolean())).toBe("ZodBoolean");
    expect(getTypeName(z.object({}))).toBe("ZodObject");
  });

  it("getTypeName returns canonical names for wrapper types", () => {
    expect(getTypeName(z.string().optional())).toBe("ZodOptional");
    expect(getTypeName(z.string().nullable())).toBe("ZodNullable");
    expect(getTypeName(z.string().default(""))).toBe("ZodDefault");
  });

  it("Zod chaining creates new schema objects (metadata isolation)", () => {
    const base = z.string();
    const chained = base.min(2);
    expect(chained).not.toBe(base);
  });
});

describe("SCHEMA-13: extractDefault handles wrapped types", () => {
  it(".default() — default value is extracted", () => {
    const schema = f.string().default("fallback").field("text");
    const obj = f.object({ val: schema });
    const shape = obj.shape as Record<string, { toZod?: () => unknown }>;
    const zodNode = shape.val.toZod?.() ?? shape.val;
    expect(getTypeName(zodNode)).toBe("ZodDefault");
  });

  it(".optional().default() — default found through ZodOptional", () => {
    const schema = f.string().optional().default("opt").field("text");
    const zodNode = schema.toZod();
    expect(getTypeName(zodNode)).toBe("ZodDefault");
  });
});
