/**
 * Unified adapter — auto-detects Zod version per schema and delegates.
 */

export type { ZodAdapter } from "./types";
import { v3 } from "./v3";
import { v4 } from "./v4";

function detect(schema: unknown) {
  return v4.isZodSchema(schema) ? v4 : v3;
}

export function isZodSchema(value: unknown): boolean {
  return v4.isZodSchema(value) || v3.isZodSchema(value);
}

export function getTypeName(schema: unknown): string {
  return detect(schema).getTypeName(schema);
}

export function getInnerType(schema: unknown): unknown | null {
  return detect(schema).getInnerType(schema);
}

export function getDefaultValue(schema: unknown): { found: true; value: unknown } | { found: false } {
  return detect(schema).getDefaultValue(schema);
}
