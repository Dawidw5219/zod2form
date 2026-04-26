import { defineFields } from "zod2form"
import { Text, Textarea, Checkbox, Select, Radio } from "./components"

export const f = defineFields({
  text: Text,
  textarea: Textarea,
  checkbox: Checkbox,
  select: Select,
  radio: Radio,
})
