import type { ComponentType } from "react";

/**
 * Props every field renderer receives. `value`, `onChange`, `onBlur`,
 * `name` come straight from react-hook-form's `Controller`; the `is*`
 * flags come from its field state. The metadata trio (`label`,
 * `placeholder`, `hint`, `isRequired`) is pulled from the schema's
 * chain (`.label()`, `.placeholder()`, …).
 */
export type FieldProps = {
  value: unknown;
  onChange: (...event: unknown[]) => void;
  onBlur: () => void;
  name: string;
  error?: string;
  isTouched: boolean;
  isDirty: boolean;
  isRequired?: boolean;
  label?: string;
  placeholder?: string;
  hint?: string;
};

export type Fields<T extends FieldRegistry<any>> =
  T extends FieldRegistry<infer R> ? keyof R & string : never;

export type FieldRegistry<R extends Record<string, ComponentType<any>>> = {
  resolve(fieldType: string): ComponentType<any> | undefined;
  _map: R;
};

/** Alias retained for backwards compatibility. */
export type Registry<R extends Record<string, ComponentType<any>>> = FieldRegistry<R>;

/** Alias retained for backwards compatibility. */
export type StandardFieldProps = FieldProps;
