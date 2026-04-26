/**
 * Zod 4 adapter.
 *
 * Zod 4 schemas store internals in `_zod`:
 *   - `_zod.version.major`: 4
 *   - `_zod.def.type`: lowercase string like "string", "optional", "default"
 *   - `_zod.def.innerType`: wrapped schema for optional/nullable/default/catch
 *   - `_zod.def.defaultValue`: the default value directly (not a function)
 *
 * Key difference: `.refine()` in v4 does NOT wrap in ZodEffects —
 * it adds inline checks, keeping the same schema type.
 */

import type { ZodAdapter } from "./types";

/** Maps Zod 4 lowercase type names → canonical Zod 3 "ZodXxx" names. */
const V4_TO_CANONICAL: Record<string, string> = {
  string: "ZodString",
  number: "ZodNumber",
  boolean: "ZodBoolean",
  date: "ZodDate",
  object: "ZodObject",
  array: "ZodArray",
  enum: "ZodEnum",
  optional: "ZodOptional",
  nullable: "ZodNullable",
  default: "ZodDefault",
  catch: "ZodCatch",
  branded: "ZodBranded",
  readonly: "ZodReadonly",
  literal: "ZodLiteral",
  union: "ZodUnion",
  tuple: "ZodTuple",
  record: "ZodRecord",
  map: "ZodMap",
  set: "ZodSet",
  bigint: "ZodBigInt",
  symbol: "ZodSymbol",
  undefined: "ZodUndefined",
  null: "ZodNull",
  void: "ZodVoid",
  any: "ZodAny",
  unknown: "ZodUnknown",
  never: "ZodNever",
  lazy: "ZodLazy",
  promise: "ZodPromise",
  nan: "ZodNaN",
  pipeline: "ZodPipeline",
  intersection: "ZodIntersection",
  discriminatedUnion: "ZodDiscriminatedUnion",
  nativeEnum: "ZodNativeEnum",
  transform: "ZodEffects",
};

interface V4Schema {
  _zod?: {
    version?: { major: number };
    def?: {
      type?: string;
      innerType?: unknown;
      defaultValue?: unknown;
    };
  };
}

export const v4: ZodAdapter = {
  isZodSchema(value: unknown): boolean {
    if (value === null || value === undefined || typeof value !== "object") return false;
    return (value as V4Schema)?._zod?.version?.major === 4;
  },

  getTypeName(schema: unknown): string {
    const v4Type = (schema as V4Schema)?._zod?.def?.type ?? "";
    return V4_TO_CANONICAL[v4Type] ?? v4Type;
  },

  getInnerType(schema: unknown): unknown | null {
    return (schema as V4Schema)?._zod?.def?.innerType ?? null;
  },

  getDefaultValue(schema: unknown): { found: true; value: unknown } | { found: false } {
    const zod = (schema as V4Schema)?._zod;
    if (zod?.def?.type !== "default") return { found: false };
    return { found: true, value: zod.def.defaultValue };
  },
};
