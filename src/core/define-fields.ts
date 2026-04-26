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

  return new Proxy(z, {
    get(target, prop: string | symbol): unknown {
      if (prop === "resolve") return registry.resolve;
      if (prop === "_map") return registry._map;

      const original = (target as Record<string | symbol, unknown>)[prop];
      if (typeof original === "function") {
        return (...args: unknown[]): unknown => {
          const result = (original as Function).apply(target, args);
          if (isZodSchema(result)) return wrapSchema(result as object);
          return result;
        };
      }
      return original;
    },
  }) as unknown as FormBuilder<keyof R & string> & FieldRegistry<R>;
}

/** @deprecated Use `defineFields` instead. */
export const createRegistry: typeof defineFields = defineFields;
