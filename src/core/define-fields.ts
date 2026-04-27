import type { ComponentType } from "react";
import * as z from "zod";
import type { FieldRegistry } from "../types/define-fields";
import type { FormBuilder } from "../types/field-meta";
import { isZodSchema } from "../adapters";
import { wrapSchema } from "./wrap-schema";

/**
 * Define field components and get a typed form builder.
 *
 * The returned object is both a **FormBuilder** (use `f.string()`, `f.object()`,
 * etc. to build schemas with typed `.field()` autocomplete) and a
 * **FieldRegistry** (pass it as `fields` prop to `<ZodForm />`).
 *
 * @example
 * ```ts
 * // lib/form.ts
 * export const f = defineFields({ text: TextInput, select: SelectInput });
 *
 * // schema.ts
 * import { f } from "./lib/form";
 * const schema = f.object({
 *   name: f.string().field("text"),     // ✅ autocomplete: "text" | "select"
 *   role: f.string().field("dropdown"), // ❌ TS error
 * });
 *
 * // form.tsx
 * <ZodForm schema={schema} fields={f} onSubmit={...} />
 * ```
 */
export function defineFields<R extends Record<string, ComponentType<any>>>(
  map: R,
): FormBuilder<keyof R & string> & FieldRegistry<R> {
  const registry: FieldRegistry<R> = {
    resolve(fieldType: string): ComponentType<any> | undefined {
      return (map as Record<string, ComponentType<any>>)[fieldType];
    },
    _map: map,
  };

  // We do NOT Proxy `z` directly: Zod 4 freezes some top-level methods
  // (non-configurable + non-writable). When wrapped via Proxy, the engine
  // throws "Proxy did not return its actual value" for those properties
  // (Proxy invariant). Instead we copy z's keys onto a plain object and
  // install wrappers there — no invariant to violate.
  const builder = Object.create(null) as Record<string | symbol, unknown>;
  builder.resolve = registry.resolve;
  builder._map = registry._map;

  const wrap = (fn: Function): Function => {
    return (...args: unknown[]): unknown => {
      const result = fn.apply(z, args);
      if (isZodSchema(result)) return wrapSchema(result as object);
      return result;
    };
  };

  // Walk own keys + prototype chain so we cover both data exports and
  // class-instance methods (Zod 4 uses both shapes across versions).
  const seen = new Set<string | symbol>();
  let proto: object | null = z as object;
  while (proto && proto !== Object.prototype) {
    for (const key of Reflect.ownKeys(proto)) {
      if (seen.has(key)) continue;
      if (key === "constructor" || key === "resolve" || key === "_map") continue;
      seen.add(key);
      const value = (z as Record<string | symbol, unknown>)[key];
      builder[key] = typeof value === "function" ? wrap(value as Function) : value;
    }
    proto = Object.getPrototypeOf(proto);
  }

  return builder as unknown as FormBuilder<keyof R & string> & FieldRegistry<R>;
}

/** @deprecated Use `defineFields` instead. */
export const createRegistry: typeof defineFields = defineFields;
