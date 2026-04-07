import { z } from "zod";
import type { ZodTypeAny } from "zod";
import type { FieldMeta, WrappedSchema, FormBuilder } from "./field-meta";

const metaMap = new WeakMap<object, FieldMeta>();

export function getMeta(schema: object): FieldMeta | undefined {
  return metaMap.get(schema);
}

function mergeMeta(schema: object, partial: Partial<FieldMeta>): void {
  metaMap.set(schema, { ...(metaMap.get(schema) ?? {}), ...partial });
}

function copyMeta(from: object, to: object): void {
  const meta = metaMap.get(from);
  if (meta !== undefined) {
    metaMap.set(to, { ...meta });
  }
}

function isZodSchema(value: unknown): boolean {
  if (value === null || value === undefined || typeof value !== "object") return false;
  const def = (value as Record<string, unknown>)["_def"];
  return def != null && typeof def === "object" && typeof (def as Record<string, unknown>)["typeName"] === "string";
}

function wrapSchema<T extends ZodTypeAny>(zodSchema: T): WrappedSchema<T> {
  return new Proxy(zodSchema, {
    get(target, prop: string | symbol): unknown {
      if (prop === "field") {
        return (type: string): WrappedSchema<T> => {
          mergeMeta(target, { fieldType: type });
          return wrapSchema(target);
        };
      }
      if (prop === "props") {
        return (p: Record<string, unknown>): WrappedSchema<T> => {
          const existing = metaMap.get(target)?.fieldProps ?? {};
          mergeMeta(target, { fieldProps: { ...existing, ...p } });
          return wrapSchema(target);
        };
      }
      if (prop === "label") {
        return (text: string): WrappedSchema<T> => {
          mergeMeta(target, { label: text });
          return wrapSchema(target);
        };
      }
      if (prop === "placeholder") {
        return (text: string): WrappedSchema<T> => {
          mergeMeta(target, { placeholder: text });
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
            return wrapSchema(result as ZodTypeAny);
          }
          return result;
        };
      }
      return original;
    },
  }) as unknown as WrappedSchema<T>;
}

export const f = new Proxy(z, {
  get(target, prop: string | symbol): unknown {
    const original = (target as Record<string | symbol, unknown>)[prop];
    if (typeof original === "function") {
      return (...args: unknown[]): unknown => {
        const result = (original as Function).apply(target, args);
        if (isZodSchema(result)) return wrapSchema(result as ZodTypeAny);
        return result;
      };
    }
    return original;
  },
}) as unknown as FormBuilder;
