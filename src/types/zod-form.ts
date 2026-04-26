import type { ComponentType, ReactNode } from "react";
import type { FieldValues, UseFormProps } from "react-hook-form";
import type { FieldMeta } from "../core/meta";
import type { FieldProps, FieldRegistry } from "./define-fields";

/** Map `fieldName → meta` that `ZodForm` puts in context for child consumers. */
export type FieldsMetaMap = Record<string, FieldMeta>;

/**
 * Minimal error-map type compatible with both Zod 3 and Zod 4.
 * Zod 3 exports `ZodErrorMap`, Zod 4 uses `core.$ZodErrorMap`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ErrorMapFn = (...args: any[]) => any;

export type ZodFormProps = {
  schema: {
    shape: Record<string, unknown>;
    toZod: () => unknown;
  };
  fields: FieldRegistry<Record<string, ComponentType<FieldProps & Record<string, unknown>>>>;
  onSubmit: (data: FieldValues) => void;
  id?: string;
  className?: string;
  children?: ReactNode;
  /** Override the default English error messages (e.g. for i18n). */
  errorMap?: ErrorMapFn;
} & Omit<UseFormProps<FieldValues>, "resolver">;
