# zod2form

Your Zod schema is your React Form. No boilerplate.

Built on top of `react-hook-form` with `@hookform/resolvers/zod`.

[Live demo](https://dawidw5219.github.io/zod2form/)

## Installation

```
npm install zod2form zod
```

Peer dependencies: `react >= 18`, `zod >= 3 < 4`.

## Usage

This is what a form looks like in zod2form — one schema, one render call:

```tsx
import { f, defineFields, ZodForm } from "zod2form"
import { TextInput, Checkbox } from "./components"

const schema = f.object({
  name:  f.string().min(2).field("text").label("Name").placeholder("Jan"),
  email: f.string().email().field("text").label("Email"),
  gdpr:  f.boolean().field("checkbox").label("I accept the privacy policy").default(false),
})

const fields = defineFields({ text: TextInput, checkbox: Checkbox })

<ZodForm schema={schema} fields={fields} onSubmit={(data) => alert(JSON.stringify(data, null, 2))} />
```

`f` is a transparent proxy over Zod's `z`. Every Zod method works — `.string()`, `.email()`, `.min()`, `.optional()`, `.refine()`, `.url()`, `.date()`, `.regex()`. You add form metadata with chains: `.field("type")`, `.label("text")`, `.placeholder("text")`, `.props({ ... })`. Fields without `.field()` are not rendered.

`ZodForm` renders your components, wires up react-hook-form with `zodResolver`, handles validation. Empty required fields show "Required" automatically. Default mode is `onTouched`.

### Field components

The components referenced above are ordinary React components — zod2form does not ship any. You write them once, the way you like them, and reuse them across every form. They receive a standard `FieldProps` payload (value, onChange, error, label, etc.) so they stay decoupled from any specific schema:

```tsx
import type { FieldProps } from "zod2form"

export function TextInput({ label, error, isRequired, value, onChange, onBlur, name, placeholder }: FieldProps) {
  return (
    <label>
      {label}{isRequired && " *"}
      <input name={name} value={String(value ?? "")} onChange={onChange} onBlur={onBlur} placeholder={placeholder} />
      {error && <span>{error}</span>}
    </label>
  )
}

export function Checkbox({ label, error, value, onChange, onBlur }: FieldProps) {
  return (
    <label>
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} onBlur={onBlur} />
      {label}
      {error && <span>{error}</span>}
    </label>
  )
}
```

Define your components once per project, register them with `defineFields()`, and every form in your app references them by string key (`"text"`, `"checkbox"`, etc.) from the schema.

## Example

See it running with real components, validation, and multiple form shapes:

[→ Open the live demo](https://dawidw5219.github.io/zod2form/)

## Advanced

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
