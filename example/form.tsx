import { defineFields, ZodForm } from "zod2form"
import { Text, Textarea, Checkbox, Select, Radio } from "./components"
import { schema } from "./schemas/contact"

export const fields = defineFields({
  text: Text,
  textarea: Textarea,
  checkbox: Checkbox,
  select: Select,
  radio: Radio,
})

export function ContactPage() {
  return (
    <ZodForm schema={schema} fields={fields} onSubmit={() => alert("Form submitted successfully!")}>
      <button type="submit">Send</button>
    </ZodForm>
  )
}
