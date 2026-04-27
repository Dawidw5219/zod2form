import type { ComponentType, ReactNode } from "react";
import type { FieldValues, UseFormProps } from "react-hook-form";
import type { FieldMeta } from "../core/meta";
import type { FieldProps, FieldRegistry } from "./define-fields";
import type { ErrorDict, ErrorMapFn, TranslateFn, Translation } from "../core/zod-resolver";

/** Map `fieldName → meta` that `ZodForm` puts in context for child consumers. */
export type FieldsMetaMap = Record<string, FieldMeta>;

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
  /** Full errorMap callback — wins over `dict` / `t`. */
  errorMap?: ErrorMapFn;
  /** Per-key override of built-in English. Use `Translation` for full translations. */
  dict?: ErrorDict | Translation;
  /** i18next-style translator. Receives `ErrorKey` + params. */
  t?: TranslateFn;
} & Omit<UseFormProps<FieldValues>, "resolver">;
