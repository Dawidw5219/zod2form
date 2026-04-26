import { f } from "../fields"

export const title = "Bug Report"
export const schema = f.object({
  title:      f.string().min(5, "Be more specific").max(120).trim().field("text").label("Title").placeholder("Crash when clicking Save"),
  severity:   f.string().field("radio").label("Severity").props({ options: [
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ]}),
  pageUrl:    f.string().url("Must be a valid URL").field("text").label("Page URL where bug occurs").placeholder("https://app.example.com/dashboard"),
  component:  f.string().field("select").label("Component").props({ options: [
    { value: "auth", label: "Authentication" },
    { value: "dashboard", label: "Dashboard" },
    { value: "api", label: "API" },
    { value: "billing", label: "Billing" },
    { value: "notifications", label: "Notifications" },
  ]}),
  steps:      f.string().min(20, "Describe in detail").field("textarea").label("Steps to reproduce").placeholder("1. Go to...\n2. Click on...\n3. See error").props({ rows: 4 }),
  expected:   f.string().min(5).field("textarea").label("Expected behavior").placeholder("What should happen").props({ rows: 2 }),
  actual:     f.string().min(5).field("textarea").label("Actual behavior").placeholder("What actually happens").props({ rows: 2 }),
  email:      f.string().email().trim().optional().field("text").label("Your email (optional)").placeholder("dev@example.com"),

  reportedAt: f.date().default(() => new Date()),  // not in form
})
