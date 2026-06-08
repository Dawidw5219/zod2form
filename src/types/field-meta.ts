import type { ZodObject, ZodTypeAny, z } from "zod";
import type { HTMLAutocomplete } from "./html-autocomplete";

export type { FieldMeta } from "../core/meta";

/**
 * WrappedSchema — a Zod schema with form-builder chain methods.
 *
 * Uses a pragmatic index-signature approach to avoid "excessively deep"
 * TypeScript instantiation with Zod 4's complex type hierarchy.
 * All Zod methods (min, max, email, optional, etc.) are covered by the
 * index signature and return another WrappedSchema with typed `.field()`.
 */
export interface WrappedSchema<T extends ZodTypeAny = ZodTypeAny, F extends string = string> {
  // ── Form chain methods (typed) ──────────────────────────────────────
  field(type: F): WrappedSchema<T, F>;
  label(text: string): WrappedSchema<T, F>;
  placeholder(text: string): WrappedSchema<T, F>;
  hint(text: string): WrappedSchema<T, F>;
  props(p: Record<string, unknown>): WrappedSchema<T, F>;
  required(value?: boolean): WrappedSchema<T, F>;
  autoComplete(token: HTMLAutocomplete): WrappedSchema<T, F>;
  toZod(): T;

  // ── Common Zod methods (typed to preserve inner T through chains) ───
  optional(): WrappedSchema<z.ZodOptional<T>, F>;
  nullable(): WrappedSchema<z.ZodNullable<T>, F>;
  default(def: unknown): WrappedSchema<z.ZodDefault<T>, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch(def: unknown): WrappedSchema<any, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  array(): WrappedSchema<any, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refine(check: (arg: any) => unknown, message?: string | { message?: string }): WrappedSchema<T, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  superRefine(refinement: (arg: any, ctx: any) => void): WrappedSchema<T, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  min(...args: any[]): WrappedSchema<T, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  max(...args: any[]): WrappedSchema<T, F>;
  email(...args: unknown[]): WrappedSchema<T, F>;
  url(...args: unknown[]): WrappedSchema<T, F>;
  uuid(...args: unknown[]): WrappedSchema<T, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  regex(...args: any[]): WrappedSchema<T, F>;
  trim(): WrappedSchema<T, F>;
  toLowerCase(): WrappedSchema<T, F>;
  toUpperCase(): WrappedSchema<T, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  length(...args: any[]): WrappedSchema<T, F>;

  // ── Object schema ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shape: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  safeParse(data: unknown): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  safeParseAsync(data: unknown): Promise<any>;
  parse(data: unknown): unknown;
  parseAsync(data: unknown): Promise<unknown>;

  // ── Catch-all for any other Zod method ──────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: any;
}

// Unwrap T from `WrappedSchema<T>`; pass through bare ZodTypeAny.
type UnwrapZ<S> = S extends WrappedSchema<infer Z, string> ? Z : S extends ZodTypeAny ? S : never;

/**
 * Form-builder factory. Explicit declarations per factory keep the inner Zod
 * type intact (so `z.infer<typeof schema.toZod()>` actually resolves), instead
 * of relying on a generic mapped type — Zod 4's overloaded `z.string` /
 * `z.number` factories defeat `infer Ret`, collapsing everything to `any`.
 *
 * Add a new factory here when you start using it (`f.date`, `f.union`, etc.).
 * The catch-all index signature preserves runtime callability for anything not
 * yet declared, at the cost of `any` typing for those.
 */
export interface FormBuilder<F extends string = string> {
  string(): WrappedSchema<z.ZodString, F>;
  number(): WrappedSchema<z.ZodNumber, F>;
  boolean(): WrappedSchema<z.ZodBoolean, F>;
  date(): WrappedSchema<z.ZodDate, F>;
  literal<T extends string | number | boolean>(value: T): WrappedSchema<z.ZodLiteral<T>, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enum<T extends readonly [string, ...string[]]>(values: T): WrappedSchema<any, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  union<T extends readonly WrappedSchema<any, F>[]>(schemas: T): WrappedSchema<any, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  object<S extends Record<string, any>>(shape: S): WrappedSchema<
    ZodObject<{ [K in keyof S]: UnwrapZ<S[K]> }>,
    F
  >;
  array<S>(schema: S): WrappedSchema<z.ZodArray<UnwrapZ<S>>, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optional<S extends WrappedSchema<any, F>>(schema: S): WrappedSchema<
    z.ZodOptional<UnwrapZ<S>>,
    F
  >;
  // Catch-all for less common factories (e.g. f.unknown, f.any, f.tuple).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [factory: string]: any;
}

export type Infer<T extends ZodTypeAny> = import("zod").z.infer<T>;
