import { ZodForm } from "zod2form"
import { f } from "./fields"

const schema = f.object({
  name:  f.string().min(2).field("text").label("Full name").placeholder("Jan Kowalski"),
  email: f.string().email().field("text").label("Email").placeholder("jan@example.com"),
  gdpr:  f.boolean().refine(v => v === true, "Required").field("checkbox").label("I accept the privacy policy").default(false),
})

export function ContactForm() {
  return (
    <ZodForm
      schema={schema}
      fields={f}
      onSubmit={(data) => alert(JSON.stringify(data, null, 2))}
    >
      <button type="submit">Send</button>
    </ZodForm>
  )
}
