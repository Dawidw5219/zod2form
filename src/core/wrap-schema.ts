/**
 * Schema proxy wrapper — intercepts Zod method calls and attaches
 * form metadata via WeakMap. Zero direct Zod imports.
 */

import { getMeta, mergeMeta, copyMeta } from "./meta";
import { isZodSchema } from "../adapters";

export function wrapSchema<T extends object>(zodSchema: T): T {
  return new Proxy(zodSchema, {
    get(target, prop: string | symbol): unknown {
      if (prop === "field") {
        return (type: string) => {
          mergeMeta(target, { fieldType: type });
          return wrapSchema(target);
        };
      }
      if (prop === "props") {
        return (p: Record<string, unknown>) => {
          const existing = getMeta(target)?.fieldProps ?? {};
          mergeMeta(target, { fieldProps: { ...existing, ...p } });
          return wrapSchema(target);
        };
      }
      if (prop === "label") {
        return (text: string) => {
          mergeMeta(target, { label: text });
          return wrapSchema(target);
        };
      }
      if (prop === "placeholder") {
        return (text: string) => {
          mergeMeta(target, { placeholder: text });
          return wrapSchema(target);
        };
      }
      if (prop === "hint") {
        return (text: string) => {
          mergeMeta(target, { hint: text });
          return wrapSchema(target);
        };
      }
      if (prop === "required") {
        return (value: boolean = true) => {
          mergeMeta(target, { isRequired: value });
          return wrapSchema(target);
        };
      }
      if (prop === "autoComplete") {
        return (token: string) => {
          const existing = getMeta(target)?.fieldProps ?? {};
          mergeMeta(target, { fieldProps: { ...existing, autoComplete: token } });
          return wrapSchema(target);
        };
      }
      if (prop === "toZod") {
        return (): T => target;
      }

      const original = (target as Record<string | symbol, unknown>)[prop];
      if (typeof original === "function") {
        return (...args: unknown[]): unknown => {
          const result = (original as Function).apply(target, args);
          if (isZodSchema(result)) {
            copyMeta(target, result as object);
            return wrapSchema(result as object);
          }
          return result;
        };
      }
      return original;
    },
  }) as T;
}
