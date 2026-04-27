import { defineFields, ZodForm } from "zod2form"
import { schema } from "./schema"
import { Text, Textarea, Checkbox, Select, Radio } from "./components"

export const f = defineFields({
  text: Text,
  textarea: Textarea,
  checkbox: Checkbox,
  select: Select,
  radio: Radio,
})

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
