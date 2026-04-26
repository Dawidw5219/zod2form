# zod2form

Your Zod schema is your React Form. No boilerplate.

Built on top of `react-hook-form` with `@hookform/resolvers/zod`.

[Live demo](https://dawidw5219.github.io/zod2form/)

## Installation

```
npm install zod2form zod
```

Peer dependencies: `react >= 18`, `zod >= 3` (supports both Zod 3 and Zod 4).

## Usage

Define your field components once, then build forms from schemas:

```tsx
// lib/form.ts — one file, one config
import { defineFields, ZodForm } from "zod2form"
import { TextInput, Checkbox } from "./components"

export const f = defineFields({ text: TextInput, checkbox: Checkbox })
```

```tsx
// schemas/contact.ts — .field() autocompletes to "text" | "checkbox"
import { f } from "./lib/form"

export const schema = f.object({
  name:  f.string().min(2).field("text").label("Name").placeholder("Jan"),
  email: f.string().email().field("text").label("Email"),
  gdpr:  f.boolean().field("checkbox").label("I accept the privacy policy").default(false),
})
```

```tsx
// components/contact-form.tsx
import { ZodForm } from "zod2form"
import { f } from "./lib/form"
import { schema } from "./schemas/contact"

<ZodForm schema={schema} fields={f} onSubmit={(data) => alert(JSON.stringify(data, null, 2))} />
```

`defineFields()` returns a **typed form builder + field registry** in one object. Use it as `f.string()`, `f.object()`, etc. to build schemas — `.field()` autocompletes only your registered field types. Pass the same object as `fields` to `<ZodForm />`.

Every Zod method works — `.string()`, `.email()`, `.min()`, `.optional()`, `.refine()`, `.url()`, `.date()`, `.regex()`. You add form metadata with chains: `.field("type")`, `.label("text")`, `.placeholder("text")`, `.hint("text")`, `.props({ ... })`, `.autoComplete("email")`. Fields without `.field()` are not rendered.

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
  fields={f}
  onSubmit={handleSubmit}
  mode="onChange"
  defaultValues={{ name: "Jan" }}
  shouldFocusError={false}
/>
```

## Cheatsheet

| Export | What it does |
|---|---|
| `defineFields()` | Define field components → get typed form builder + registry |
| `ZodForm` | Renders the form from your schema |
| `useZodFormContext()` | `useFormContext()` + schema metadata |
| `FieldProps` | Props type for your field components |
| `f` | *(deprecated)* Untyped global proxy — use `defineFields()` instead |

## License

MIT
