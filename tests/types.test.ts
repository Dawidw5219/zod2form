/**
 * Type-level tests — verified at compile time by vitest's typecheck.
 * If these tests compile, the type system is correct.
 */

import { describe, it, expectTypeOf } from "vitest";
import { f, defineFields, getMeta } from "../src/index";
import type { Infer, WrappedSchema, FormBuilder, FieldMeta } from "../src/index";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Infer<T> matches z.infer<T>
// ---------------------------------------------------------------------------

describe("Infer<T> equals z.infer<T>", () => {
  it("flat object schema", () => {
    const fSchema = f.object({ name: f.string(), age: f.number().optional() });
    const zSchema = z.object({ name: z.string(), age: z.number().optional() });
    type FResult = Infer<typeof fSchema>;
    type ZResult = z.infer<typeof zSchema>;
    expectTypeOf<FResult>().toEqualTypeOf<ZResult>();
  });

  it("Infer strips label/placeholder/fieldType", () => {
    expectTypeOf<Infer<typeof f.string>>().toEqualTypeOf<z.infer<typeof z.string>>();
  });
});

// ---------------------------------------------------------------------------
// FormBuilder chain methods stay typed
// ---------------------------------------------------------------------------

describe("FormBuilder chain methods are typed", () => {
  it("f.string() has .label method", () => {
    expectTypeOf(f.string().label).toBeFunction();
  });

  it("chaining preserves methods: .label().min() still has .label", () => {
    expectTypeOf(f.string().label("x").min(2).label).toBeFunction();
  });

  it("chaining preserves methods: .field().email() still has .field", () => {
    expectTypeOf(f.string().field("text").email().field).toBeFunction();
  });
});

// ---------------------------------------------------------------------------
// defineFields narrows .field() to registered keys
// ---------------------------------------------------------------------------

describe("defineFields narrows .field() type parameter", () => {
  const MockInput = (_p: any) => null;

  it("field() only accepts registered keys", () => {
    const typed = defineFields({ text: MockInput, select: MockInput, textarea: MockInput });
    type FieldParam = Parameters<ReturnType<typeof typed.string>["field"]>[0];
    expectTypeOf<FieldParam>().toEqualTypeOf<"text" | "select" | "textarea">();
  });

  it("global f accepts any string", () => {
    type FieldParam = Parameters<ReturnType<typeof f.string>["field"]>[0];
    expectTypeOf<FieldParam>().toEqualTypeOf<string>();
  });

  it("narrowing survives chaining: .min().label().field() still narrowed", () => {
    const typed = defineFields({ text: MockInput });
    type FieldParam = Parameters<ReturnType<typeof typed.string>["min"]> extends [infer _N, ...any[]]
      ? Parameters<ReturnType<ReturnType<typeof typed.string>["label"]>["field"]>[0]
      : never;
    expectTypeOf<FieldParam>().toEqualTypeOf<"text">();
  });
});

// ---------------------------------------------------------------------------
// getMeta returns FieldMeta | undefined
// ---------------------------------------------------------------------------

describe("getMeta return type", () => {
  it("returns FieldMeta | undefined", () => {
    const result = getMeta(f.string().toZod());
    expectTypeOf(result).toEqualTypeOf<FieldMeta | undefined>();
  });
});

// ---------------------------------------------------------------------------
// FormBuilder generic defaults
// ---------------------------------------------------------------------------

describe("FormBuilder generic defaults", () => {
  it("FormBuilder<string> is the untyped form (global f)", () => {
    expectTypeOf<typeof f>().toMatchTypeOf<FormBuilder<string>>();
  });

  it("FormBuilder without generic defaults to string", () => {
    expectTypeOf<FormBuilder>().toEqualTypeOf<FormBuilder<string>>();
  });
});
