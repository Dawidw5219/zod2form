/**
 * Tests for the custom Zod resolver.
 *
 * Verifies that validation errors are properly caught and converted to
 * react-hook-form FieldErrors — without relying on instanceof checks
 * that break across Zod module boundaries.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createZodResolver } from "../src/core/zod-resolver";

// Minimal options required by react-hook-form Resolver
const rhfOptions = { shouldUseNativeValidation: false, criteriaMode: "firstError" as const, fields: {}, names: [] };

describe("createZodResolver", () => {
  describe("valid data", () => {
    it("returns parsed values with no errors", async () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const resolver = createZodResolver(schema);

      const result = await resolver({ name: "Jan", age: 25 }, undefined, rhfOptions);

      expect(result.errors).toEqual({});
      expect(result.values).toEqual({ name: "Jan", age: 25 });
    });

    it("strips unknown keys", async () => {
      const schema = z.object({ name: z.string() });
      const resolver = createZodResolver(schema);

      const result = await resolver({ name: "Jan", extra: "nope" } as any, undefined, rhfOptions);

      expect(result.errors).toEqual({});
      expect(result.values).toEqual({ name: "Jan" });
    });
  });

  describe("invalid data", () => {
    it("returns field errors for missing required fields", async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });
      const resolver = createZodResolver(schema);

      const result = await resolver({}, undefined, rhfOptions);

      expect(result.values).toEqual({});
      expect(result.errors).toHaveProperty("name");
      expect(result.errors).toHaveProperty("email");
      expect((result.errors as any).name.message).toBeTruthy();
      expect((result.errors as any).email.message).toBeTruthy();
    });

    it("returns error for invalid email", async () => {
      const schema = z.object({ email: z.string().email() });
      const resolver = createZodResolver(schema);

      const result = await resolver({ email: "not-an-email" }, undefined, rhfOptions);

      expect(result.errors).toHaveProperty("email");
    });

    it("returns error for too-short string", async () => {
      const schema = z.object({ name: z.string().min(3) });
      const resolver = createZodResolver(schema);

      const result = await resolver({ name: "ab" }, undefined, rhfOptions);

      expect(result.errors).toHaveProperty("name");
    });

    it("returns error for failing refine()", async () => {
      const schema = z.object({
        accepted: z.boolean().refine((v) => v === true, { message: "Must accept" }),
      });
      const resolver = createZodResolver(schema);

      const result = await resolver({ accepted: false }, undefined, rhfOptions);

      expect(result.errors).toHaveProperty("accepted");
      expect((result.errors as any).accepted.message).toBe("Must accept");
    });
  });

  describe("error structure", () => {
    it("each error has message and type", async () => {
      const schema = z.object({ name: z.string() });
      const resolver = createZodResolver(schema);

      const result = await resolver({}, undefined, rhfOptions);

      const nameError = (result.errors as any).name;
      expect(nameError).toBeDefined();
      expect(typeof nameError.message).toBe("string");
      expect(typeof nameError.type).toBe("string");
    });

    it("only reports first error per field", async () => {
      const schema = z.object({
        password: z.string().min(8).regex(/[A-Z]/),
      });
      const resolver = createZodResolver(schema);

      const result = await resolver({ password: "ab" }, undefined, rhfOptions);

      // Should have exactly one error for password, not two
      expect(result.errors).toHaveProperty("password");
    });
  });

  describe("no instanceof dependency", () => {
    it("catches errors structurally (issues array)", async () => {
      const schema = z.object({ x: z.number() });
      const resolver = createZodResolver(schema);

      // Pass a string where number expected — triggers ZodError
      const result = await resolver({ x: "not a number" } as any, undefined, rhfOptions);

      // Should NOT throw — error should be caught and returned
      expect(result.errors).toHaveProperty("x");
      expect(result.values).toEqual({});
    });

    it("re-throws non-Zod errors", async () => {
      // Create a schema-like object that throws a regular Error
      const fakeSchema = {
        _zod: { version: { major: 4 }, def: { type: "object" } },
        parseAsync: () => { throw new Error("boom"); },
      };
      const resolver = createZodResolver(fakeSchema);

      await expect(resolver({}, undefined, rhfOptions)).rejects.toThrow("boom");
    });
  });

  describe("complex schemas", () => {
    it("handles optional fields", async () => {
      const schema = z.object({
        name: z.string().min(1),
        bio: z.string().optional(),
      });
      const resolver = createZodResolver(schema);

      const result = await resolver({ name: "Jan" }, undefined, rhfOptions);

      expect(result.errors).toEqual({});
      expect(result.values).toEqual({ name: "Jan" });
    });

    it("handles default values", async () => {
      const schema = z.object({
        name: z.string(),
        country: z.string().default("PL"),
      });
      const resolver = createZodResolver(schema);

      const result = await resolver({ name: "Jan" }, undefined, rhfOptions);

      expect(result.errors).toEqual({});
      expect(result.values).toEqual({ name: "Jan", country: "PL" });
    });

    it("handles enum validation", async () => {
      const schema = z.object({
        role: z.enum(["admin", "user"]),
      });
      const resolver = createZodResolver(schema);

      const valid = await resolver({ role: "admin" }, undefined, rhfOptions);
      expect(valid.errors).toEqual({});

      const invalid = await resolver({ role: "superadmin" } as any, undefined, rhfOptions);
      expect(invalid.errors).toHaveProperty("role");
    });
  });

  describe("nested paths (toNestErrors port)", () => {
    it("nests dotted error paths into structured FieldErrors", async () => {
      const schema = z.object({
        address: z.object({
          city: z.string().min(1),
          zip: z.string().regex(/^\d{2}-\d{3}$/),
        }),
      });
      const resolver = createZodResolver(schema);

      const result = await resolver(
        { address: { city: "", zip: "abc" } } as any,
        undefined,
        rhfOptions,
      );

      // RHF components do `errors.address?.city?.message` — must be nested,
      // not flat `errors["address.city"]`.
      expect((result.errors as any).address?.city?.message).toBeTruthy();
      expect((result.errors as any).address?.zip?.message).toBeTruthy();
    });

    it("handles arrays of objects", async () => {
      const schema = z.object({
        items: z.array(z.object({ name: z.string().min(1) })),
      });
      const resolver = createZodResolver(schema);

      const result = await resolver(
        { items: [{ name: "" }, { name: "ok" }] } as any,
        undefined,
        rhfOptions,
      );

      expect((result.errors as any).items?.[0]?.name?.message).toBeTruthy();
      expect((result.errors as any).items?.[1]).toBeUndefined();
    });
  });

  describe("criteriaMode: 'all'", () => {
    it("collects all errors per field when criteriaMode is 'all'", async () => {
      const schema = z.object({
        password: z.string().min(8).regex(/[A-Z]/, "needs uppercase"),
      });
      const resolver = createZodResolver(schema);

      const result = await resolver(
        { password: "ab" },
        undefined,
        { ...rhfOptions, criteriaMode: "all" } as any,
      );

      const passwordError = (result.errors as any).password;
      expect(passwordError).toBeDefined();
      // With criteriaMode 'all', `types` collects every issue's message.
      expect(passwordError.types).toBeDefined();
    });
  });

  describe("backward compat", () => {
    it("forwards errorMap (Zod 4 callback) to schema parse", async () => {
      // Zod 4 callback: receives issue, returns string | { message } | undefined
      const customMap = (_issue: unknown) => "[CUSTOM] this field broke";
      const schema = z.object({ name: z.string() });
      const resolver = createZodResolver(schema, { errorMap: customMap });

      const result = await resolver({}, undefined, rhfOptions);

      expect((result.errors as any).name?.message).toBe("[CUSTOM] this field broke");
    });
  });

  describe("scalar coercion (form boundary)", () => {
    it("coerces a number into a string field (the classic adapter mismatch)", async () => {
      const schema = z.object({
        age: z.string().regex(/^\d+$/, "digits only"),
      });
      const resolver = createZodResolver(schema);

      // A number-emitting control feeding a string schema used to fail with
      // "Expected string, got number" before any rule ran.
      const result = await resolver({ age: 22 } as any, undefined, rhfOptions);

      expect(result.errors).toEqual({});
      expect(result.values).toEqual({ age: "22" });
    });

    it("coerces a numeric string into a number field", async () => {
      const schema = z.object({ age: z.number() });
      const resolver = createZodResolver(schema);

      const result = await resolver({ age: "52" } as any, undefined, rhfOptions);

      expect(result.errors).toEqual({});
      expect(result.values).toEqual({ age: 52 });
    });

    it("coerces through optional/default wrappers", async () => {
      const schema = z.object({
        height: z.number().optional(),
        weight: z.number().default(0),
        label: z.string().optional(),
      });
      const resolver = createZodResolver(schema);

      const result = await resolver(
        { height: "165", weight: "62", label: 7 } as any,
        undefined,
        rhfOptions,
      );

      expect(result.errors).toEqual({});
      expect(result.values).toEqual({ height: 165, weight: 62, label: "7" });
    });

    it("leaves a non-numeric string alone so the real error surfaces", async () => {
      const schema = z.object({ age: z.number() });
      const resolver = createZodResolver(schema);

      const result = await resolver({ age: "abc" } as any, undefined, rhfOptions);

      expect(result.errors).toHaveProperty("age");
    });

    it("does not touch already well-typed values", async () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const resolver = createZodResolver(schema);

      const result = await resolver({ name: "Jan", age: 25 }, undefined, rhfOptions);

      expect(result.errors).toEqual({});
      expect(result.values).toEqual({ name: "Jan", age: 25 });
    });

    it("still enforces string rules after coercion", async () => {
      const schema = z.object({ age: z.string().regex(/^\d+$/, "digits only") });
      const resolver = createZodResolver(schema);

      // 12.5 -> "12.5" -> fails the digits-only regex (real, useful error).
      const result = await resolver({ age: 12.5 } as any, undefined, rhfOptions);

      expect(result.errors).toHaveProperty("age");
    });

    it("treats an empty string on an optional number field as 'nothing entered'", async () => {
      const schema = z.object({ price: z.number().optional() });
      const resolver = createZodResolver(schema);

      const result = await resolver({ price: "" } as any, undefined, rhfOptions);

      expect(result.errors).toEqual({});
      expect((result.values as any).price).toBeUndefined();
    });

    it("reports 'Required' (not a type error) for an empty string on a required number field", async () => {
      const schema = z.object({ price: z.number() });
      const resolver = createZodResolver(schema);

      const result = await resolver({ price: "  " } as any, undefined, rhfOptions);

      expect((result.errors as any).price.message).toBe("Required");
    });

    it("re-shapes a PHP-style empty array into {} for an object field", async () => {
      const schema = z.object({
        title: z.object({ en: z.string().optional(), pl: z.string().optional() }).optional(),
      });
      const resolver = createZodResolver(schema);

      // json_encode of an empty PHP associative array yields [] — carries no
      // data, so it must not fail an optional object field.
      const result = await resolver({ title: [] } as any, undefined, rhfOptions);

      expect(result.errors).toEqual({});
      expect((result.values as any).title).toEqual({});
    });

    it("leaves a NON-empty array on an object field alone so the real error surfaces", async () => {
      const schema = z.object({
        title: z.object({ en: z.string() }).optional(),
      });
      const resolver = createZodResolver(schema);

      const result = await resolver({ title: ["x"] } as any, undefined, rhfOptions);

      expect((result.errors as any).title.message).toBe("Expected object, got array");
    });
  });

  describe("invalid_type received naming", () => {
    it("names an array 'array', not 'object'", async () => {
      const schema = z.object({ meta: z.object({ en: z.string() }) });
      const resolver = createZodResolver(schema);

      const result = await resolver({ meta: [1] } as any, undefined, rhfOptions);

      expect((result.errors as any).meta.message).toBe("Expected object, got array");
    });

    it("names null 'null', not 'object'", async () => {
      const schema = z.object({ name: z.string() });
      const resolver = createZodResolver(schema);

      const result = await resolver({ name: null } as any, undefined, rhfOptions);

      expect((result.errors as any).name.message).toBe("Expected string, got null");
    });

    it("names NaN 'NaN', not 'number'", async () => {
      const schema = z.object({ age: z.number() });
      const resolver = createZodResolver(schema);

      const result = await resolver({ age: Number.NaN } as any, undefined, rhfOptions);

      expect((result.errors as any).age.message).toBe("Expected number, got NaN");
    });
  });
});
