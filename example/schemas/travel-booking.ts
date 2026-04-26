import { f } from "../form"

export const title = "Travel Booking"
export const schema = f.object({
  firstName:    f.string().min(1).trim().field("text").label("First name (as in passport)").placeholder("Jan"),
  lastName:     f.string().min(1).trim().field("text").label("Last name (as in passport)").placeholder("Kowalski"),
  email:        f.string().email().trim().toLowerCase().field("text").label("Email").placeholder("jan@example.com"),
  phone:        f.string().regex(/^\+?[\d\s\-()]{9,}$/, "Invalid phone").field("text").label("Phone").placeholder("+48 600 000 000"),
  passport:     f.string().regex(/^[A-Z]{2}\d{7}$/, "Format: AB1234567").toUpperCase().field("text").label("Passport number").placeholder("AB1234567"),
  departure:    f.string().date("Use YYYY-MM-DD").field("text").label("Departure").placeholder("2025-06-15"),
  returnDate:   f.string().date("Use YYYY-MM-DD").field("text").label("Return").placeholder("2025-06-22"),
  destination:  f.string().field("select").label("Destination").props({ options: [
    { value: "paris", label: "Paris" },
    { value: "rome", label: "Rome" },
    { value: "barcelona", label: "Barcelona" },
    { value: "tokyo", label: "Tokyo" },
    { value: "nyc", label: "New York" },
  ]}),
  class:        f.string().field("radio").label("Class").props({ options: [
    { value: "economy", label: "Economy" },
    { value: "business", label: "Business" },
    { value: "first", label: "First" },
  ]}).default("economy"),
  hotel:        f.boolean().field("checkbox").label("Include hotel").default(true),
  insurance:    f.boolean().field("checkbox").label("Travel insurance").default(true),
  terms:        f.boolean().refine(v => v === true, "Required").field("checkbox").label("I accept terms and cancellation policy").default(false),

  bookedAt: f.date().default(() => new Date()),  // not in form
})
