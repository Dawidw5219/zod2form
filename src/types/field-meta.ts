import type { ZodObject, ZodTypeAny } from "zod";
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

  // ── Common Zod methods (explicit for better IDE experience) ─────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optional(): WrappedSchema<any, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nullable(): WrappedSchema<any, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default(def: unknown): WrappedSchema<any, F>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch(def: unknown): WrappedSchema<any, F>;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WrapReturn<F extends string> = (...args: any[]) => WrappedSchema<any, F>;

type WrapZFactory<Z, F extends string = string> = {
  [K in keyof Z]: Z[K] extends (...args: never[]) => ZodTypeAny
    ? WrapReturn<F>
    : Z[K];
};

export type FormBuilder<F extends string = string> = WrapZFactory<typeof import("zod").z, F> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  object(shape: Record<string, any>): WrappedSchema<ZodObject<any>, F>;
};

export type Infer<T extends ZodTypeAny> = import("zod").z.infer<T>;
