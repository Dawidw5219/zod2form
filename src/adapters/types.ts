/**
 * Adapter contract — each Zod version implements this interface.
 * All functions receive opaque `unknown` schemas and return
 * version-normalized results using canonical Zod 3 type names
 * (e.g. "ZodString", "ZodOptional").
 */

export interface ZodAdapter {
  /** Returns true if value looks like a schema from this Zod version. */
  isZodSchema(value: unknown): boolean;

  /** Canonical type name, e.g. "ZodString", "ZodOptional", "ZodDefault". */
  getTypeName(schema: unknown): string;

  /** Unwrap one layer: optional→inner, nullable→inner, effects→inner. */
  getInnerType(schema: unknown): unknown | null;

  /** Extract the default value if this is a ZodDefault node. */
  getDefaultValue(schema: unknown): { found: true; value: unknown } | { found: false };
}
