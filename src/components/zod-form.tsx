import { useMemo, useRef, createContext, useContext, memo } from "react";
import type { ComponentType, JSX, ReactNode } from "react";
import { useForm, useController, FormProvider, useFormContext as useRHFFormContext } from "react-hook-form";
import type { Control, FieldValues, Resolver, UseFormProps, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodErrorMap } from "zod";
import { getMeta } from "../core/zod-proxy";
import type { FieldMeta } from "../core/field-meta";
import type { FieldRegistry, FieldProps } from "../core/define-fields";

const friendlyErrorMap: ZodErrorMap = (issue, ctx) => {
  if (issue.code === "invalid_type" && issue.received === "undefined") {
    return { message: "Required" };
  }
  const msg = ctx.defaultError;
  return { message: msg.replace(/^String /i, "Field ").replace(/^Number /i, "Value ") };
};

function cleanEmptyStrings(values: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    cleaned[key] = value === "" ? undefined : value;
  }
  return cleaned;
}

export type FieldsMetaMap = Record<string, FieldMeta>;

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
  const node = zodNode as { _def?: { typeName?: string; innerType?: unknown; schema?: unknown } };
  const typeName = node._def?.typeName ?? "";
  if (WRAPPER_TYPES.has(typeName)) {
    return node._def!.innerType ?? node._def!.schema ?? zodNode;
  }
  return null;
}

function extractDefault(zodNode: unknown): unknown {
  const node = zodNode as { _def?: { typeName?: string; innerType?: unknown; defaultValue?: () => unknown } };
  const typeName = node._def?.typeName ?? "";
  if (typeName === "ZodDefault") {
    return node._def!.defaultValue!();
  }
  const inner = unwrapInner(zodNode);
  if (inner) return extractDefault(inner);
  return undefined;
}

function isRequired(zodNode: unknown): boolean {
  const node = zodNode as { _def?: { typeName?: string } };
  const typeName = node._def?.typeName ?? "";
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
      const meta: FieldMeta = { ...storedMeta, isRequired: isRequired(zodNode) };
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
      isRequired={meta.isRequired}
      {...(meta.fieldProps ?? {})}
    />
  );
});

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
} & Omit<UseFormProps<FieldValues>, "resolver">;

export function ZodForm({ schema, fields, onSubmit, id, className, children, ...rhfOptions }: ZodFormProps): JSX.Element {
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

  const resolver: Resolver<FieldValues> = (values, context, options) => {
    const cleaned = cleanEmptyStrings(values);
    // zodResolver's type signature is fragile across zod3/zod4. We know
    // the runtime behavior is correct; silence the strict typechecker
    // with a couple of `as any` casts scoped to this call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zr = (zodResolver as any)(
      schema.toZod(),
      { errorMap: friendlyErrorMap }
    ) as Resolver<FieldValues>;
    return zr(cleaned, context, options);
  };

  const form = useForm<FieldValues>({
    mode: "onTouched",
    ...rhfOptions,
    resolver,
    defaultValues: { ...schemaDefaults, ...rhfOptions.defaultValues },
  });

  return (
    <FormProvider {...form}>
      <FieldsMetaContext.Provider value={fieldsMeta}>
        <form id={id} className={className} onSubmit={form.handleSubmit(onSubmit)}>
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
