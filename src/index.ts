export { f } from "./core/zod-proxy";
export { getMeta } from "./core/zod-proxy";
export type { FieldMeta, FormBuilder, WrappedSchema, FormChain, Infer } from "./core/field-meta";

export { defineFields, createRegistry } from "./core/define-fields";
export type { FieldRegistry, FieldProps, Fields, Registry, StandardFieldProps } from "./core/define-fields";

export { ZodForm, useZodFormContext } from "./components/zod-form";
export type { ZodFormProps, FieldsMetaMap } from "./components/zod-form";

export {
  useFormContext,
  useWatch,
  useFormState,
  useFieldArray,
  useController,
  FormProvider,
} from "react-hook-form";
