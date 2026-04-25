import { useMemo, useRef, createContext, useContext, memo } from "react";
import type { ComponentType, JSX } from "react";
import { useForm, useController, FormProvider, useFormContext as useRHFFormContext } from "react-hook-form";
import type { Control, FieldValues, Resolver, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodErrorMap } from "zod/v3";
import { getMeta } from "../core/zod-proxy";
import type { FieldMeta } from "../types/field-meta";
import type { FieldProps } from "../types/define-fields";
import type { FieldsMetaMap, ZodFormProps } from "../types/zod-form";

export const friendlyErrorMap: ZodErrorMap = (issue, ctx) => {
  if (issue.code === "invalid_type" && issue.received === "undefined") {
    return { message: "Required" };
  }
  const msg = ctx.defaultError;
  return { message: msg.replace(/^String /i, "Field ").replace(/^Number /i, "Value ") };
};

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
      // Honour an explicit `.required(...)` override on the schema; fall back
      // to schema-derived inference (e.g. ZodDefault / ZodOptional → false).
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
  // Wrap so we can find the field's DOM root for scroll-on-error even when
  // the component doesn't expose a native `[name=...]` element (e.g. select,
  // combobox, radio group — only buttons/divs underneath).
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


export function ZodForm({ schema, fields, onSubmit, id, className, children, errorMap, ...rhfOptions }: ZodFormProps): JSX.Element {
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
    const cleaned = cleanValues(values);
    // zodResolver's type signature is fragile across zod3/zod4. We know
    // the runtime behavior is correct; silence the strict typechecker
    // with a couple of `as any` casts scoped to this call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // If consumer passes an explicit errorMap, use it. Otherwise leave
    // schemaOptions undefined so Zod falls back to any globally-installed
    // map (z.setErrorMap(...)) or its own English defaults. This keeps
    // zod2form i18n-ready without bundling translation resources itself.
    const zr = (zodResolver as any)(
      schema.toZod(),
      errorMap ? { errorMap } : undefined
    ) as Resolver<FieldValues>;
    return zr(cleaned, context, options);
  };

  const form = useForm<FieldValues>({
    mode: "onTouched",
    ...rhfOptions,
    resolver,
    defaultValues: { ...schemaDefaults, ...rhfOptions.defaultValues },
  });

  /**
   * Submit handler that also scrolls the first invalid field into view.
   * react-hook-form's built-in `shouldFocusError` only calls focus() on the
   * offending element — which relies on default browser scroll-to-focused.
   * Inside an overflow-y-auto scroll container (e.g. a modal body with a
   * sticky header), focus() scrolls the container fine, but the field may
   * land under the sticky header. We scroll-into-view with block: "center"
   * so the field sits mid-container regardless of sticky chrome.
   */
  const handleFormSubmit = form.handleSubmit(onSubmit, (errors) => {
    // Walk the errors object in form-definition order so we always scroll to
    // the topmost (not the first key react-hook-form reports, which can be
    // alphabetical depending on resolver).
    const firstErrorKey = allFields.find(({ key }) => key in errors)?.key;
    if (!firstErrorKey) return;

    const formEl = (id ? document.getElementById(id) : null) as HTMLFormElement | null;
    const root: ParentNode = formEl ?? document;
    // Prefer the FieldRenderer wrapper (works for ALL field types including
    // selects/comboboxes/radio groups). Fall back to a native `[name=...]`
    // input for bespoke fields that bypass FieldRenderer.
    const escapedKey = CSS.escape(firstErrorKey);
    const el =
      (root.querySelector(`[data-field-name="${escapedKey}"]`) as HTMLElement | null) ??
      (root.querySelector(`[name="${escapedKey}"]`) as HTMLElement | null);
    if (el) {
      // `block: "start"` lands the field at the top of the scroll viewport,
      // so it's always fully visible regardless of sticky footers obscuring
      // the lower edge. `block: "center"` was problematic: browsers skip
      // the scroll when the element is even partially visible, which left
      // users seeing only the label with the field hidden under the footer.
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
