export { f } from "./core/zod-proxy";
export { getMeta } from "./core/meta";
export { defineFields, createRegistry } from "./core/define-fields";
export { ZodForm, useZodFormContext } from "./components/zod-form";

export type { HTMLAutocomplete } from "./types/html-autocomplete";
export type { FieldMeta, FormBuilder, WrappedSchema, Infer } from "./types/field-meta";
export type { FieldRegistry, FieldProps, Fields, Registry, StandardFieldProps } from "./types/define-fields";
export type { ZodFormProps, FieldsMetaMap, ErrorMapFn } from "./types/zod-form";
export type { ZodAdapter } from "./adapters";

export {
  useFormContext,
  useWatch,
  useFormState,
  useFieldArray,
  useController,
  FormProvider,
} from "react-hook-form";
