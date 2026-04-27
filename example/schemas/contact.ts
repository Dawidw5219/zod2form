import { f } from "../fields"

// Showcase of default messages — every validation here relies on the
// resolver's built-in defaults (zod2form rewrites only the "required"
// case; everything else falls through to Zod's native messages).
export const title = "Contact"
export const schema = f.object({
  // Required string — will show "Required" (zod2form default)
  name:     f.string().min(2).trim().field("text").label("Full name").placeholder("Jan Kowalski"),
  // .email() — Zod default: "Invalid email"
  email:    f.string().email().trim().toLowerCase().field("text").label("Email").placeholder("jan@example.com"),
  // .url() — Zod default: "Invalid URL"
  website:  f.string().url().optional().field("text").label("Website").placeholder("https://example.com"),
  // Required select
  subject:  f.string().field("select").label("Subject").props({ options: [
    { value: "general", label: "General inquiry" },
    { value: "support", label: "Technical support" },
    { value: "billing", label: "Billing" },
    { value: "partnership", label: "Partnership" },
  ]}),
  // .min() / .max() — Zod default: "Too small: expected string to have >=10 characters"
  message:  f.string().min(10).max(500).field("textarea").label("Message").placeholder("How can we help?").props({ rows: 4 }),
  // refine with a custom message — that one IS user-supplied, kept as-is
  gdpr:     f.boolean().refine(v => v === true, "You must accept").field("checkbox").label("I accept the privacy policy").default(false),

  createdAt: f.date().default(() => new Date()),  // not in form
})
