import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { f } from "../src/index";
import { defineFields } from "../src/core/define-fields";
import { ZodForm, useZodFormContext } from "../src/components/zod-form";

// Minimal mock field component that captures props for inspection
const capturedProps: Record<string, unknown>[] = [];
function MockInput(props: Record<string, unknown>) {
  capturedProps.push(props);
  return <input data-testid={`field-${props.name}`} value={String(props.value ?? "")} onChange={() => {}} />;
}

const schema = f.object({
  email: f.string().email().field("text"),
  age: f.number().field("text"),
});

const fields = defineFields({ text: MockInput });

// RENDER-01: <ZodForm /> accepts schema, fields, onSubmit
describe("RENDER-01: ZodForm renders without error", () => {
  it("renders without throwing", () => {
    const onSubmit = vi.fn();
    expect(() => render(<ZodForm schema={schema} fields={fields} onSubmit={onSubmit} />)).not.toThrow();
  });
});

// RENDER-02: ZodForm walks shape — one field per schema key with .field()
describe("RENDER-02: ZodForm renders one field per schema key with .field()", () => {
  it("renders two fields for a two-key schema", () => {
    const onSubmit = vi.fn();
    const { container } = render(<ZodForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    const inputs = container.querySelectorAll("input");
    expect(inputs).toHaveLength(2);
  });

  it("skips fields without .field()", () => {
    const mixedSchema = f.object({
      name: f.string().field("text"),
      createdAt: f.date(), // no .field() — should be skipped
    });
    const onSubmit = vi.fn();
    const { container } = render(<ZodForm schema={mixedSchema} fields={fields} onSubmit={onSubmit} />);
    const inputs = container.querySelectorAll("input");
    expect(inputs).toHaveLength(1);
  });
});

// RENDER-03: Each field receives name matching schema key
describe("RENDER-03: field receives name matching schema key", () => {
  it("field for 'email' key receives name='email'", () => {
    const onSubmit = vi.fn();
    render(<ZodForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    expect(screen.getByTestId("field-email")).toBeDefined();
  });
});

// RENDER-04: Standard props passed
describe("RENDER-04: standard props passed to field component", () => {
  it("MockInput receives value, onChange, error, name, isTouched, isDirty, isRequired", () => {
    capturedProps.length = 0;
    const onSubmit = vi.fn();
    render(<ZodForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    const firstFieldProps = capturedProps[0];
    expect("value" in firstFieldProps).toBe(true);
    expect("onChange" in firstFieldProps).toBe(true);
    expect("name" in firstFieldProps).toBe(true);
    expect("isTouched" in firstFieldProps).toBe(true);
    expect("isDirty" in firstFieldProps).toBe(true);
    expect("isRequired" in firstFieldProps).toBe(true);
  });
});

// RENDER-05: Custom props from .props() passed through
describe("RENDER-05: custom props from .props() spread onto field component", () => {
  it("custom prop 'rows' from .props() appears in component props", () => {
    const schemaWithProps = f.object({
      name: f.string().field("text").props({ rows: 4 }),
    });
    capturedProps.length = 0;
    const onSubmit = vi.fn();
    render(<ZodForm schema={schemaWithProps} fields={fields} onSubmit={onSubmit} />);
    expect(capturedProps[0]?.rows).toBe(4);
  });
});

// RENDER-06: label and placeholder passed as props
describe("RENDER-06: label and placeholder passed to field component", () => {
  it("label and placeholder from schema appear in component props", () => {
    const schemaWithMeta = f.object({
      name: f.string().field("text").label("Imię").placeholder("Jan"),
    });
    capturedProps.length = 0;
    const onSubmit = vi.fn();
    render(<ZodForm schema={schemaWithMeta} fields={fields} onSubmit={onSubmit} />);
    expect(capturedProps[0]?.label).toBe("Imię");
    expect(capturedProps[0]?.placeholder).toBe("Jan");
  });
});

// RENDER-08: onSubmit receives typed data
describe("RENDER-08: onSubmit receives field data on valid submission", () => {
  it("onSubmit is called after form submit", async () => {
    const onSubmit = vi.fn();
    const simpleSchema = f.object({
      username: f.string().default("alice").field("text"),
    });
    render(<ZodForm schema={simpleSchema} fields={fields} onSubmit={onSubmit} />);
    const input = screen.getByTestId("field-username");
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });
});

// RENDER-09: .default() pre-populates field
describe("RENDER-09: .default() pre-populates field value", () => {
  it("field with .default('hello') receives value='hello' on first render", () => {
    const schemaWithDefault = f.object({
      greeting: f.string().default("hello").field("text"),
    });
    capturedProps.length = 0;
    const onSubmit = vi.fn();
    render(<ZodForm schema={schemaWithDefault} fields={fields} onSubmit={onSubmit} />);
    expect(capturedProps[0]?.value).toBe("hello");
  });
});

// RENDER-10: walkSchema memoized
describe("RENDER-10: schema walking is memoized", () => {
  it("rendering twice with same schema ref does not break", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<ZodForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    rerender(<ZodForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    const inputs = document.querySelectorAll("input");
    expect(inputs.length).toBeGreaterThan(0);
  });
});

// RENDER-11: RHF options passed through
describe("RENDER-11: RHF options forwarded to useForm", () => {
  it("mode option is accepted without error", () => {
    const onSubmit = vi.fn();
    expect(() =>
      render(<ZodForm schema={schema} fields={fields} onSubmit={onSubmit} mode="onChange" />)
    ).not.toThrow();
  });

  it("defaultValues from prop merge with schema defaults", () => {
    const schemaWithDefault = f.object({
      name: f.string().default("from-schema").field("text"),
      email: f.string().field("text"),
    });
    capturedProps.length = 0;
    const onSubmit = vi.fn();
    render(
      <ZodForm
        schema={schemaWithDefault}
        fields={fields}
        onSubmit={onSubmit}
        defaultValues={{ email: "from-prop" }}
      />
    );
    const nameProps = capturedProps.find((p) => p.name === "name");
    const emailProps = capturedProps.find((p) => p.name === "email");
    expect(nameProps?.value).toBe("from-schema");
    expect(emailProps?.value).toBe("from-prop");
  });
});

// RENDER-12: FormProvider makes useZodFormContext available in children
describe("RENDER-12: useZodFormContext available in children", () => {
  it("child component can access fieldsMeta via useZodFormContext", () => {
    const schemaWithLabel = f.object({
      name: f.string().field("text").label("Imię"),
    });
    let metaFromContext: Record<string, unknown> | undefined;

    function Inspector() {
      const { fieldsMeta } = useZodFormContext();
      metaFromContext = fieldsMeta;
      return null;
    }

    render(
      <ZodForm schema={schemaWithLabel} fields={fields} onSubmit={vi.fn()}>
        <Inspector />
      </ZodForm>
    );

    expect(metaFromContext).toBeDefined();
    expect((metaFromContext as any)?.name?.label).toBe("Imię");
  });
});
