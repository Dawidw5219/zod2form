# zod2form

Your Zod schema is your React Form. No boilerplate.

Built on top of `react-hook-form` with `@hookform/resolvers/zod`.

[Live demo](https://dawidw5219.github.io/zod2form/)

## Installation

```
npm install zod2form zod
```

Works with Zod 3 and Zod 4. Requires React >= 18.

## Usage

### 1. Write your field components

zod2form does not ship any UI — you write your own components once and reuse them across every form. Each component receives a standard `FieldProps` payload:

```tsx
// components.tsx
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

### 2. Register them

```tsx
// fields.ts
import { defineFields } from "zod2form"
import { TextInput, Checkbox } from "./components"

export const f = defineFields({ text: TextInput, checkbox: Checkbox })
```

`defineFields()` returns a typed form builder. Use `f.string()`, `f.object()`, etc. to build schemas — `.field()` autocompletes only your registered field types. Pass the same `f` as `fields` to `<ZodForm />`.

### 3. Define a schema

```tsx
// schemas/contact.ts
import { f } from "../fields"

export const schema = f.object({
  name:  f.string().min(2).field("text").label("Full name").placeholder("Jan Kowalski"),
  email: f.string().email().field("text").label("Email").placeholder("jan@example.com"),
  gdpr:  f.boolean().refine(v => v === true, "Required").field("checkbox").label("I accept the privacy policy").default(false),
})
```

### 4. Render the form

```tsx
// contact-form.tsx
import { ZodForm } from "zod2form"
import { f } from "./fields"
import { schema } from "./schemas/contact"

export function ContactForm() {
  return (
    <ZodForm
      schema={schema}
      fields={f}
      onSubmit={(data) => console.log(data)}
    >
      <button type="submit">Send</button>
    </ZodForm>
  )
}
```

Every Zod method works — `.min()`, `.email()`, `.optional()`, `.refine()`, `.regex()`, `.url()`, `.date()`. You add form metadata with chains: `.field("type")`, `.label("text")`, `.placeholder("text")`, `.hint("text")`, `.props({ ... })`, `.autoComplete("email")`. Fields without `.field()` are not rendered.

`ZodForm` renders your components, wires up react-hook-form with `zodResolver`, handles validation. Empty required fields show "Required" automatically. Default mode is `onTouched`.

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
| `defineFields()` | Register field components, get a typed form builder |
| `ZodForm` | Render a form from schema + field registry |
| `useZodFormContext()` | `useFormContext()` + schema metadata |
| `FieldProps` | Props type for field components |

## License

MIT
