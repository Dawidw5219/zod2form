import type { ZodTypeAny, ZodDefault, ZodCatch, ZodEffects, ZodError, RefinementCtx, input, output, ZodObject } from "zod/v3";
import type { HTMLAutocomplete } from "./html-autocomplete";

export interface FieldMeta {
  fieldType?: string;
  fieldProps?: Record<string, unknown>;
  label?: string;
  placeholder?: string;
  hint?: string;
  isRequired?: boolean;
}

export type FormChain<T extends ZodTypeAny> = {
  field(type: string): WrappedSchema<T>;
  label(text: string): WrappedSchema<T>;
  placeholder(text: string): WrappedSchema<T>;
  hint(text: string): WrappedSchema<T>;
  props(p: Record<string, unknown>): WrappedSchema<T>;
  /**
   * Force the `isRequired` UI flag (drives the `*` indicator). Use when you
   * want the asterisk shown even though the schema would otherwise look
   * non-required (e.g. has a `.default(...)` so zod considers it satisfied).
   */
  required(value?: boolean): WrappedSchema<T>;
  /**
   * Sets the browser autofill hint on the rendered `<input>`. Accepts
   * WHATWG tokens with IDE completion; also accepts arbitrary strings
   * for scoped tokens (`"section-billing tel"`).
   *
   * Shortcut for `.props({ autoComplete: token })` — renderers read
   * `props.autoComplete` and forward it to the native input.
   */
  autoComplete(token: HTMLAutocomplete): WrappedSchema<T>;
  toZod(): T;
};

type WrapMethodReturn<F> =
  F extends (...args: infer A) => infer R
    ? R extends ZodTypeAny
      ? (...args: A) => WrappedSchema<R>
      : F
    : F;

type OverloadRestored<T extends ZodTypeAny> = {
  default(def: input<T>): WrappedSchema<ZodDefault<T>>;
  default(def: () => input<T>): WrappedSchema<ZodDefault<T>>;
  catch(def: output<T>): WrappedSchema<ZodCatch<T>>;
  catch(def: (ctx: { error: ZodError; input: input<T> }) => output<T>): WrappedSchema<ZodCatch<T>>;
  refine(check: (arg: output<T>) => unknown, message?: string | { message?: string }): WrappedSchema<ZodEffects<T>>;
  refine<RefinedOutput extends output<T>>(check: (arg: output<T>) => arg is RefinedOutput, message?: string | { message?: string }): WrappedSchema<ZodEffects<T, RefinedOutput>>;
  superRefine(refinement: (arg: output<T>, ctx: RefinementCtx) => void): WrappedSchema<ZodEffects<T>>;
  superRefine<RefinedOutput extends output<T>>(refinement: (arg: output<T>, ctx: RefinementCtx) => arg is RefinedOutput): WrappedSchema<ZodEffects<T, RefinedOutput>>;
};

export type WrappedSchema<T extends ZodTypeAny> =
  Omit<{ [K in keyof T]: WrapMethodReturn<T[K]> }, "default" | "catch" | "refine" | "superRefine"> &
  OverloadRestored<T> &
  FormChain<T>;

type WrapZFactory<Z> = {
  [K in keyof Z]: Z[K] extends (...args: infer A) => infer R
    ? R extends ZodTypeAny
      ? (...args: A) => WrappedSchema<R>
      : Z[K]
    : Z[K];
};

type WrappedRawShape = { [k: string]: ZodTypeAny | WrappedSchema<ZodTypeAny> };
export type FormBuilder = Omit<WrapZFactory<typeof import("zod").z>, "object"> & {
  object<T extends WrappedRawShape>(shape: T): WrappedSchema<ZodObject<{ [K in keyof T]: T[K] extends WrappedSchema<infer U> ? U : T[K] extends ZodTypeAny ? T[K] : never }>>;
};

export type Infer<T extends ZodTypeAny> = import("zod").z.infer<T>;
