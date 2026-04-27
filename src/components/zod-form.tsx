import { useMemo, useRef, createContext, useContext, memo } from "react";
import type { ComponentType, JSX } from "react";
import { useForm, useController, FormProvider, useFormContext as useRHFFormContext } from "react-hook-form";
import type { Control, FieldValues, Resolver, UseFormReturn } from "react-hook-form";
import { createZodResolver } from "../core/zod-resolver";
import { getMeta } from "../core/meta";
import { getTypeName, getInnerType, getDefaultValue } from "../adapters";
import type { FieldMeta } from "../core/meta";
import type { FieldProps } from "../types/define-fields";
import type { FieldsMetaMap, ZodFormProps } from "../types/zod-form";

function cleanValues(values: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      cleaned[key] = trimmed === "" ? undefined : trimmed;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

const FieldsMetaContext = createContext<FieldsMetaMap>({});

export function useZodFormContext<T extends FieldValues = FieldValues>(): UseFormReturn<T> & { fieldsMeta: FieldsMetaMap } {
  const form = useRHFFormContext<T>();
  const fieldsMeta = useContext(FieldsMetaContext);
  const ref = useRef(form);
  ref.current = form;
  return useMemo(() => {
    const proxy = new Proxy(ref as { current: UseFormReturn<T> }, {
      get(_target, prop) {
        if (prop === "fieldsMeta") return fieldsMeta;
        return (ref.current as Record<string | symbol, unknown>)[prop];
      },
    });
    return proxy as unknown as UseFormReturn<T> & { fieldsMeta: FieldsMetaMap };
  }, [fieldsMeta]);
}

type FieldDescriptor = {
  key: string;
  meta: FieldMeta;
  defaultValue: unknown;
};

const WRAPPER_TYPES = new Set(["ZodOptional", "ZodNullable", "ZodEffects", "ZodBranded", "ZodReadonly", "ZodCatch"]);

function unwrapInner(zodNode: unknown): unknown {
  const typeName = getTypeName(zodNode);
  if (WRAPPER_TYPES.has(typeName)) {
    return getInnerType(zodNode) ?? zodNode;
  }
  return null;
}

function extractDefault(zodNode: unknown): unknown {
  const result = getDefaultValue(zodNode);
  if (result.found) return result.value;
  const inner = unwrapInner(zodNode);
  if (inner) return extractDefault(inner);
  return undefined;
}

function isRequired(zodNode: unknown): boolean {
  const typeName = getTypeName(zodNode);
  if (typeName === "ZodOptional" || typeName === "ZodDefault") return false;
  const inner = unwrapInner(zodNode);
  if (inner) return isRequired(inner);
  return true;
}

function walkSchema(schema: { shape: Record<string, unknown>; toZod: () => unknown }): FieldDescriptor[] {
  const shape = schema.shape as Record<string, unknown>;
  return Object.entries(shape)
    .map(([key, fieldSchema]) => {
      const zodNode = (fieldSchema as { toZod?: () => unknown }).toZod?.() ?? fieldSchema;
      const storedMeta = getMeta(zodNode as object) ?? {};
      if (!storedMeta.fieldType) return null;
      const meta: FieldMeta = {
        ...storedMeta,
        isRequired: storedMeta.isRequired ?? isRequired(zodNode),
      };
      const defaultValue = extractDefault(zodNode);
      return { key, meta, defaultValue };
    })
    .filter((fd): fd is FieldDescriptor => fd !== null);
}

type FieldRendererProps = {
  name: string;
  control: Control<FieldValues>;
  component: ComponentType<FieldProps & Record<string, unknown>>;
  meta: FieldMeta;
};

const FieldRenderer = memo(function FieldRenderer({ name, control, component: Component, meta }: FieldRendererProps): JSX.Element {
  const { field, fieldState } = useController({ name, control });
  return (
    <div data-field-name={name}>
      <Component
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        name={field.name}
        error={fieldState.error?.message}
        isTouched={fieldState.isTouched}
        isDirty={fieldState.isDirty}
        label={meta.label}
        placeholder={meta.placeholder}
        hint={meta.hint}
        isRequired={meta.isRequired}
        {...(meta.fieldProps ?? {})}
      />
    </div>
  );
});


export function ZodForm({ schema, fields, onSubmit, id, className, children, errorMap, dict, t, ...rhfOptions }: ZodFormProps): JSX.Element {
  const allFields = useMemo(() => walkSchema(schema as Parameters<typeof walkSchema>[0]), [schema]);

  const schemaDefaults = useMemo(
    () => Object.fromEntries(
      allFields
        .filter((fd) => fd.defaultValue !== undefined)
        .map((fd) => [fd.key, fd.defaultValue])
    ),
    [allFields]
  );

  const fieldsMeta = useMemo(
    () => Object.fromEntries(allFields.map((fd) => [fd.key, fd.meta])),
    [allFields]
  );

  const resolver: Resolver<FieldValues> = async (values, context, options) => {
    const cleaned = cleanValues(values);
    const zr = createZodResolver(
      schema.toZod(),
      errorMap || dict || t ? { errorMap, dict, t } : undefined,
    );
    return zr(cleaned, context, options);
  };

  const form = useForm<FieldValues>({
    mode: "onTouched",
    ...rhfOptions,
    resolver,
    defaultValues: { ...schemaDefaults, ...rhfOptions.defaultValues },
  });

  const handleFormSubmit = form.handleSubmit(onSubmit, (errors) => {
    const firstErrorKey = allFields.find(({ key }) => key in errors)?.key;
    if (!firstErrorKey) return;

    const formEl = (id ? document.getElementById(id) : null) as HTMLFormElement | null;
    const root: ParentNode = formEl ?? document;
    const escapedKey = CSS.escape(firstErrorKey);
    const el =
      (root.querySelector(`[data-field-name="${escapedKey}"]`) as HTMLElement | null) ??
      (root.querySelector(`[name="${escapedKey}"]`) as HTMLElement | null);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  return (
    <FormProvider {...form}>
      <FieldsMetaContext.Provider value={fieldsMeta}>
        <form id={id} className={className} onSubmit={handleFormSubmit}>
          {allFields.map(({ key, meta }) => {
            const Component = fields.resolve(meta.fieldType ?? "");
            if (!Component) return null;
            return (
              <FieldRenderer
                key={key}
                name={key}
                control={form.control}
                component={Component as ComponentType<FieldProps & Record<string, unknown>>}
                meta={meta}
              />
            );
          })}
          {children}
        </form>
      </FieldsMetaContext.Provider>
    </FormProvider>
  );
}
