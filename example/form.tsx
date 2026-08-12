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
