/**
 * Zod 3 adapter.
 *
 * Zod 3 schemas store internals in `_def`:
 *   - `_def.typeName`: string like "ZodString", "ZodOptional", "ZodDefault"
 *   - `_def.innerType`: wrapped schema (ZodOptional, ZodNullable, ZodBranded, ZodReadonly)
 *   - `_def.schema`: inner schema for ZodEffects (refine/superRefine/transform)
 *   - `_def.defaultValue`: function returning the default (ZodDefault)
 */

import type { ZodAdapter } from "./types";

export const v3: ZodAdapter = {
  isZodSchema(value: unknown): boolean {
    if (value === null || value === undefined || typeof value !== "object") return false;
    const def = (value as Record<string, unknown>)["_def"];
    return def != null && typeof def === "object" && typeof (def as Record<string, unknown>)["typeName"] === "string";
  },

  getTypeName(schema: unknown): string {
    const def = (schema as { _def?: { typeName?: string } })?._def;
    return def?.typeName ?? "";
  },

  getInnerType(schema: unknown): unknown | null {
    const def = (schema as { _def?: { innerType?: unknown; schema?: unknown } })?._def;
    return def?.innerType ?? def?.schema ?? null;
  },

  getDefaultValue(schema: unknown): { found: true; value: unknown } | { found: false } {
    const def = (schema as { _def?: { typeName?: string; defaultValue?: (() => unknown) | unknown } })?._def;
    if (def?.typeName !== "ZodDefault") return { found: false };
    const raw = def.defaultValue;
    return { found: true, value: typeof raw === "function" ? raw() : raw };
  },
};
