import { f } from "../fields"

export const title = "Job Application"
export const schema = f.object({
  firstName:  f.string().min(1).trim().field("text").label("First name").placeholder("Anna"),
  lastName:   f.string().min(1).trim().field("text").label("Last name").placeholder("Nowak"),
  email:      f.string().email().trim().toLowerCase().field("text").label("Email").placeholder("anna@example.com"),
  portfolio:  f.string().url().optional().field("text").label("Portfolio URL").placeholder("https://github.com/anna"),
  position:   f.string().field("select").label("Position").props({ options: [
    { value: "frontend", label: "Frontend Developer" },
    { value: "backend", label: "Backend Developer" },
    { value: "fullstack", label: "Fullstack Developer" },
    { value: "design", label: "UI/UX Designer" },
    { value: "pm", label: "Product Manager" },
  ]}),
  experience: f.string().field("radio").label("Experience").props({ options: [
    { value: "junior", label: "0–2 years" },
    { value: "mid", label: "3–5 years" },
    { value: "senior", label: "6+ years" },
  ]}),
  startDate:  f.string().date().field("text").label("Available from").placeholder("2025-09-01"),
  coverLetter: f.string().max(2000).optional().field("textarea").label("Cover letter").placeholder("Tell us about yourself...").props({ rows: 4 }),
  remote:     f.boolean().field("checkbox").label("I'm open to remote work").default(true),

  appliedAt: f.date().default(() => new Date()),  // not in form
})
