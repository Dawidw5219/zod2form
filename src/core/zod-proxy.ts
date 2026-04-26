/**
 * The global `f` proxy — wraps the `z` namespace from "zod" so every
 * schema-returning call (z.string(), z.number(), etc.) goes through
 * wrapSchema, enabling the `.field()` / `.label()` / … chain.
 *
 * @deprecated Use `defineFields()` instead — it returns a typed builder
 * where `.field()` autocompletes registered field types.
 *
 * ```ts
 * // Before (untyped):
 * import { f } from "zod2form";
 *
 * // After (typed):
 * import { defineFields } from "zod2form";
 * export const f = defineFields({ text: TextInput, select: SelectInput });
 * ```
 */

import * as z from "zod";
import { isZodSchema } from "../adapters";
import { wrapSchema } from "./wrap-schema";
import type { FormBuilder } from "../types/field-meta";

export { getMeta } from "./meta";

export const f = new Proxy(z, {
  get(target, prop: string | symbol): unknown {
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
}) as unknown as FormBuilder;
