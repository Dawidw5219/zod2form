import type { ComponentType } from "react";

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
};

export type Fields<T extends FieldRegistry<any>> = T extends FieldRegistry<infer R> ? keyof R & string : never;

export type FieldRegistry<R extends Record<string, ComponentType<any>>> = {
  resolve(fieldType: string): ComponentType<any> | undefined;
  _map: R;
};

export function defineFields<R extends Record<string, ComponentType<any>>>(
  map: R
): FieldRegistry<R> {
  return {
    resolve(fieldType: string): ComponentType<any> | undefined {
      return (map as Record<string, ComponentType<any>>)[fieldType];
    },
    _map: map,
  };
}

export const createRegistry: typeof defineFields = defineFields;
export type Registry<R extends Record<string, ComponentType<any>>> = FieldRegistry<R>;
export type StandardFieldProps = FieldProps;
