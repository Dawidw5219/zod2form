/**
 * Backward compatibility tests.
 *
 * These tests verify that the pre-2.0 public API still works:
 *   - `import { f } from "zod2form"` (global untyped builder)
 *   - `defineFields()` returns an object with `resolve()` and `_map`
 *   - `createRegistry` is an alias for `defineFields`
 *   - `<ZodForm fields={registry} />` accepts the old registry shape
 *   - `getMeta`, `useZodFormContext`, re-exported RHF hooks
 */

import { describe, it, expect, vi, expectTypeOf } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  f,
  defineFields,
  createRegistry,
  getMeta,
  ZodForm,
  useZodFormContext,
  useFormContext,
  useWatch,
  useFormState,
  useFieldArray,
  useController,
  FormProvider,
} from "../src/index";
import type {
  FieldMeta,
  FormBuilder,
  WrappedSchema,
  FormChain,
  Infer,
  FieldRegistry,
  FieldProps,
  Fields,
  ZodFormProps,
  FieldsMetaMap,
  ErrorMapFn,
  ZodAdapter,
} from "../src/index";

function MockInput(props: Record<string, unknown>) {
  return <input data-testid={`field-${props.name}`} value={String(props.value ?? "")} onChange={() => {}} />;
}

// ---------------------------------------------------------------------------
// Exported API surface
// ---------------------------------------------------------------------------

describe("backward compat: all public exports exist", () => {
  it("runtime exports", () => {
    expect(f).toBeDefined();
    expect(defineFields).toBeTypeOf("function");
    expect(createRegistry).toBeTypeOf("function");
    expect(getMeta).toBeTypeOf("function");
    expect(ZodForm).toBeTypeOf("function");
    expect(useZodFormContext).toBeTypeOf("function");
  });

  it("re-exported react-hook-form hooks", () => {
    expect(useFormContext).toBeTypeOf("function");
    expect(useWatch).toBeTypeOf("function");
    expect(useFormState).toBeTypeOf("function");
    expect(useFieldArray).toBeTypeOf("function");
    expect(useController).toBeTypeOf("function");
    expect(FormProvider).toBeTypeOf("function");
  });

  it("createRegistry is an alias for defineFields", () => {
    expect(createRegistry).toBe(defineFields);
  });
});

// ---------------------------------------------------------------------------
// Global f (deprecated but functional)
// ---------------------------------------------------------------------------

describe("backward compat: global f works", () => {
  it("f.string().field() accepts any string", () => {
    const schema = f.string().field("anything-goes");
    expect(getMeta(schema.toZod())?.fieldType).toBe("anything-goes");
  });

  it("f.object() with metadata chain", () => {
    const schema = f.object({
      name: f.string().field("text").label("Name").placeholder("Enter name"),
    });
    const shape = schema.shape as Record<string, { toZod?: () => unknown }>;
    const meta = getMeta((shape.name.toZod?.() ?? shape.name) as object);
    expect(meta?.fieldType).toBe("text");
    expect(meta?.label).toBe("Name");
    expect(meta?.placeholder).toBe("Enter name");
  });
});

// ---------------------------------------------------------------------------
// defineFields returns a working registry
// ---------------------------------------------------------------------------

describe("backward compat: defineFields returns registry", () => {
  it("has resolve() and _map", () => {
    const fields = defineFields({ text: MockInput });
    expect(fields.resolve("text")).toBe(MockInput);
    expect(fields.resolve("unknown")).toBeUndefined();
    expect(fields._map.text).toBe(MockInput);
  });

  it("works as ZodForm fields prop (old-style)", () => {
    const fields = defineFields({ text: MockInput });
    const schema = f.object({ name: f.string().field("text") });
    expect(() =>
      render(<ZodForm schema={schema} fields={fields} onSubmit={vi.fn()} />)
    ).not.toThrow();
    expect(screen.getByTestId("field-name")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// New API: defineFields as typed builder
// ---------------------------------------------------------------------------

describe("new API: defineFields returns typed builder + registry", () => {
  it("builder methods work (string, number, object)", () => {
    const f = defineFields({ text: MockInput });
    const schema = f.object({
      name: f.string().field("text").label("Name").default("Alice"),
      age: f.number().field("text"),
    });
    expect(getMeta(schema.shape.name.toZod())?.label).toBe("Name");
  });

  it("resolve() still works on the builder object", () => {
    const f = defineFields({ text: MockInput });
    expect(f.resolve("text")).toBe(MockInput);
  });

  it("works as ZodForm fields prop", () => {
    const f = defineFields({ text: MockInput });
    const schema = f.object({ name: f.string().field("text") });
    expect(() =>
      render(<ZodForm schema={schema} fields={f} onSubmit={vi.fn()} />)
    ).not.toThrow();
  });

  it(".field() type is narrowed to registered keys (type-level)", () => {
    const f = defineFields({ text: MockInput, select: MockInput });

    // This should compile — "text" and "select" are valid keys
    const s1 = f.string().field("text");
    const s2 = f.string().field("select");
    expect(getMeta(s1.toZod())?.fieldType).toBe("text");
    expect(getMeta(s2.toZod())?.fieldType).toBe("select");

    // Type check: field() accepts only "text" | "select"
    type FieldParam = Parameters<ReturnType<typeof f.string>["field"]>[0];
    expectTypeOf<FieldParam>().toEqualTypeOf<"text" | "select">();
  });
});

// ---------------------------------------------------------------------------
// Type exports exist (compile-time check)
// ---------------------------------------------------------------------------

describe("backward compat: type exports compile", () => {
  it("all documented types are importable", () => {
    // These are compile-time checks — if this file compiles, types exist
    const _meta: FieldMeta = {};
    const _map: FieldsMetaMap = {};
    expectTypeOf<FormBuilder>().toBeObject();
    expectTypeOf<FieldProps>().toBeObject();
    expectTypeOf<ZodFormProps>().toBeObject();
    expectTypeOf<ErrorMapFn>().toBeFunction();
    // ZodAdapter, WrappedSchema, FormChain, Infer, Fields, FieldRegistry
    // are generic types — their existence is proven by import not failing
    expect(true).toBe(true);
  });
});
