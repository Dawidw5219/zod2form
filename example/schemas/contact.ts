import { f } from "../fields"

export const title = "Contact"
export const schema = f.object({
  name:     f.string().min(2).trim().field("text").label("Full name").placeholder("Jan Kowalski"),
  email:    f.string().email("Invalid email").trim().toLowerCase().field("text").label("Email").placeholder("jan@example.com"),
  website:  f.string().url("Must be a valid URL").optional().field("text").label("Website").placeholder("https://example.com"),
  subject:  f.string().field("select").label("Subject").props({ options: [
    { value: "general", label: "General inquiry" },
    { value: "support", label: "Technical support" },
    { value: "billing", label: "Billing" },
    { value: "partnership", label: "Partnership" },
  ]}),
  message:  f.string().min(10, "At least 10 characters").max(500, "Max 500 characters").field("textarea").label("Message").placeholder("How can we help?").props({ rows: 4 }),
  gdpr:     f.boolean().refine(v => v === true, "You must accept").field("checkbox").label("I accept the privacy policy").default(false),

  createdAt: f.date().default(() => new Date()),  // not in form
})
