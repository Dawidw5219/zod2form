import type { ComponentType } from "react";
import type { FieldRegistry } from "../types/define-fields";

export function defineFields<R extends Record<string, ComponentType<any>>>(
  map: R,
): FieldRegistry<R> {
  return {
    resolve(fieldType: string): ComponentType<any> | undefined {
      return (map as Record<string, ComponentType<any>>)[fieldType];
    },
    _map: map,
  };
}

export const createRegistry: typeof defineFields = defineFields;
