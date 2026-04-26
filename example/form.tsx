import { defineFields } from "zod2form"
import { Text, Textarea, Checkbox, Select, Radio } from "./components"

/**
 * One place to define all field types.
 * `f` is both a schema builder (f.string(), f.object(), etc.)
 * and a field registry (pass it as `fields` to <ZodForm />).
 *
 * .field() autocompletes to: "text" | "textarea" | "checkbox" | "select" | "radio"
 */
export const f = defineFields({
  text: Text,
  textarea: Textarea,
  checkbox: Checkbox,
  select: Select,
  radio: Radio,
})
