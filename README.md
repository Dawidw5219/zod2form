# zod2form

**Zod schema in. Form out. Nothing in between.**

Your Zod schema is your React Form. No boilerplate.

<a href="https://dawidw5219.github.io/zod2form/" target="_blank" rel="noopener">Live demo</a> · <a href="https://github.com/Dawidw5219/zod2form" target="_blank" rel="noopener">Source on GitHub</a>

---

## Installation

```
npm install zod2form zod
```

Peer dependencies: `react >= 18`, `zod >= 3 < 4`.

## Usage

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

`f` is a transparent proxy over Zod's `z`. Every Zod method works — `.string()`, `.email()`, `.min()`, `.optional()`, `.refine()`, `.url()`, `.date()`, `.regex()`. You add form metadata with chains: `.field("type")`, `.label("text")`, `.placeholder("text")`, `.props({ ... })`. Fields without `.field()` are not rendered.

`ZodForm` renders your components, wires up react-hook-form with `zodResolver`, handles validation. Empty required fields show "Required" automatically. Default mode is `onTouched`.

Field components receive `FieldProps`:

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

## Example

See it running with real components, validation, and multiple form shapes:

<a href="https://dawidw5219.github.io/zod2form/" target="_blank" rel="noopener">→ Open the live demo</a>

## Advanced

### Custom props

```ts
f.string().field("textarea").props({ rows: 5, maxLength: 500 })
```

Multiple `.props()` calls merge.

### react-hook-form access

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

All react-hook-form hooks re-exported: `useFormContext`, `useWatch`, `useFormState`, `useFieldArray`, `useController`, `FormProvider`. `useZodFormContext()` adds `fieldsMeta` with schema metadata.

### react-hook-form options

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

## Cheatsheet

| Export | What it does |
|---|---|
| `f` | Zod proxy with `.field()`, `.label()`, `.placeholder()`, `.props()` |
| `defineFields()` | Map field type names to React components |
| `ZodForm` | Renders the form from your schema |
| `useZodFormContext()` | `useFormContext()` + schema metadata |
| `FieldProps` | Props type for your field components |

## License

MIT
