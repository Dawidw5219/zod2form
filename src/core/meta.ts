/**
 * Metadata storage — zero Zod dependency.
 *
 * FieldMeta is the internal representation of form-relevant info
 * attached to schema nodes via a WeakMap (no mutation of schemas).
 */

export interface FieldMeta {
  fieldType?: string;
  fieldProps?: Record<string, unknown>;
  label?: string;
  placeholder?: string;
  hint?: string;
  isRequired?: boolean;
}

const metaMap = new WeakMap<object, FieldMeta>();

export function getMeta(schema: object): FieldMeta | undefined {
  return metaMap.get(schema);
}

export function mergeMeta(schema: object, partial: Partial<FieldMeta>): void {
  metaMap.set(schema, { ...(metaMap.get(schema) ?? {}), ...partial });
}

export function copyMeta(from: object, to: object): void {
  const meta = metaMap.get(from);
  if (meta !== undefined) {
    metaMap.set(to, { ...meta });
  }
}
