import { f } from "zod2form"

export const title = "Restaurant Reservation"
export const schema = f.object({
  name:     f.string().min(2).trim().field("text").label("Name").placeholder("Jan Kowalski"),
  email:    f.string().email().field("text").label("Email").placeholder("jan@example.com"),
  phone:    f.string().regex(/^\+?[\d\s\-()]{7,}$/, "Invalid phone number").field("text").label("Phone").placeholder("+48 600 000 000"),
  date:     f.string().date("Use YYYY-MM-DD").field("text").label("Date").placeholder("2025-08-20"),
  time:     f.string().time("Use HH:MM").field("text").label("Time").placeholder("19:00"),
  guests:   f.string().field("select").label("Guests").props({ options: [
    { value: "1", label: "1 person" },
    { value: "2", label: "2 people" },
    { value: "3-4", label: "3–4 people" },
    { value: "5-8", label: "5–8 people" },
    { value: "9+", label: "9+ (call us)" },
  ]}),
  seating:  f.string().field("radio").label("Seating").props({ options: [
    { value: "indoor", label: "Indoor" },
    { value: "outdoor", label: "Outdoor" },
    { value: "bar", label: "Bar" },
  ]}).default("indoor"),
  dietary:  f.string().optional().field("textarea").label("Dietary requirements").placeholder("Allergies, vegetarian, vegan...").props({ rows: 2 }),

  createdAt: f.date().default(() => new Date()),  // not in form
})
