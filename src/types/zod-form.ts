import type { ComponentType, ReactNode } from "react";
import type { FieldValues, UseFormProps } from "react-hook-form";
import type { ZodErrorMap } from "zod/v3";
import type { FieldMeta } from "./field-meta";
import type { FieldProps, FieldRegistry } from "./define-fields";

/** Map `fieldName → meta` that `ZodForm` puts in context for child consumers. */
export type FieldsMetaMap = Record<string, FieldMeta>;

export type ZodFormProps = {
  schema: {
    shape: Record<string, unknown>;
    toZod: () => { _def: { typeName: string } };
  };
  fields: FieldRegistry<Record<string, ComponentType<FieldProps & Record<string, unknown>>>>;
  onSubmit: (data: FieldValues) => void;
  id?: string;
  className?: string;
  children?: ReactNode;
  /** Override the default English error messages (e.g. for i18n). */
  errorMap?: ZodErrorMap;
} & Omit<UseFormProps<FieldValues>, "resolver">;
