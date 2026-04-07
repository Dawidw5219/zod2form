# zod2form

Your Zod schema is your form. No boilerplate.

```
npm install zod2form zod
```

[Live demo](https://github.com/Dawidw5219/zod2form/)

## The problem

You already have Zod schemas. You already use react-hook-form. But connecting them means writing the same `Controller`, `useForm`, `zodResolver` boilerplate for every single form.

**All that boilerplate becomes this:**

```tsx
import { f, defineFields, ZodForm } from "zod2form"

const schema = f.object({
  name:    f.string().min(2).field("text").label("Name").placeholder("Jan"),
  email:   f.string().email().field("text").label("Email"),
  message: f.string().optional().field("textarea").label("Message"),
  gdpr:    f.boolean().field("checkbox").label("I accept the privacy policy").default(false),
})

const fields = defineFields({ text: TextInput, textarea: TextArea, checkbox: Checkbox })

<ZodForm schema={schema} fields={fields} onSubmit={(data) => console.log(data)} />
```

## How it works

`f` is a transparent proxy over Zod's `z`. Every Zod method works — `.string()`, `.email()`, `.min()`, `.optional()`, `.refine()`, `.url()`, `.date()`, `.trim()`, `.regex()`. All of them.

You add form metadata with chains: `.field("type")`, `.label("text")`, `.placeholder("text")`, `.props({ ... })`.

Fields without `.field()` are not rendered — use this for fields that exist in the schema but don't belong in the form (timestamps, internal flags, computed values).

`ZodForm` renders your components, wires up react-hook-form with `zodResolver`, handles validation, manages state. Empty required fields show "Required" automatically.

Default validation mode is `onTouched` — validates on blur, clears errors immediately on change.

## Field components

Every field component receives `FieldProps`:

```tsx
import type { FieldProps } from "zod2form"

function TextInput({ label, error, isRequired, value, onChange, onBlur, name, placeholder }: FieldProps) {
  return (
    <label>
      {label}{isRequired && " *"}
      <input name={name} value={String(value ?? "")} onChange={onChange} onBlur={onBlur} placeholder={placeholder} />
      {error && <span>{error}</span>}
    </label>
  )
}
```

Register once per project:

```tsx
const fields = defineFields({
  text: TextInput,
  textarea: TextArea,
  checkbox: Checkbox,
  select: Select,
  radio: Radio,
})
```

## Custom props

```ts
f.string().field("textarea").props({ rows: 5, maxLength: 500 })
```

Multiple `.props()` calls merge.

## react-hook-form access

`ZodForm` wraps your form in `FormProvider`. Use hooks from `zod2form`:

```tsx
import { useZodFormContext, useWatch } from "zod2form"

function SubmitButton() {
  const { formState } = useZodFormContext()
  return <button disabled={formState.isSubmitting}>Send</button>
}

function LivePreview() {
  const data = useWatch()
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

All react-hook-form hooks re-exported: `useFormContext`, `useWatch`, `useFormState`, `useFieldArray`, `useController`, `FormProvider`.

`useZodFormContext()` adds `fieldsMeta` with schema metadata (labels, placeholders, field types).

## react-hook-form options

All `useForm()` options forwarded:

```tsx
<ZodForm
  schema={schema}
  fields={fields}
  onSubmit={handleSubmit}
  mode="onChange"
  defaultValues={{ name: "Jan" }}
  shouldFocusError={false}
/>
```

## Multi-step forms

Each step is its own `ZodForm` with its own schema:

```tsx
const steps = [step1Schema, step2Schema, step3Schema]

<ZodForm key={step} schema={steps[step]} fields={fields} defaultValues={data} onSubmit={handleStep} />
```

## Type-safe field names

Optional autocomplete on `.field()`:

```ts
import type { Fields } from "zod2form"

const schema = f.object<Fields<typeof fields>>({
  name: f.string().field("text"),   // autocomplete: "text" | "textarea" | "checkbox"
})
```

## Type inference

```ts
import type { Infer } from "zod2form"

type ContactForm = Infer<typeof schema>
```

## API

| Export | What it does |
|---|---|
| `f` | Zod proxy with `.field()`, `.label()`, `.placeholder()`, `.props()` |
| `defineFields()` | Map field type names to React components |
| `ZodForm` | Renders form from schema |
| `useZodFormContext()` | RHF `useFormContext()` + `fieldsMeta` |
| `Infer<T>` | `z.infer<T>` for wrapped schemas |
| `FieldProps` | Props type for field components |
| `Fields<T>` | Field type keys for autocomplete |
| `useFormContext` | Re-export from react-hook-form |
| `useWatch` | Re-export from react-hook-form |
| `useFormState` | Re-export from react-hook-form |
| `useFieldArray` | Re-export from react-hook-form |
| `useController` | Re-export from react-hook-form |
| `FormProvider` | Re-export from react-hook-form |

## License

MIT
