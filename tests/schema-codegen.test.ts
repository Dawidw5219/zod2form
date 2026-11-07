import { describe, expect, it } from "vitest"
import { z as z3 } from "zod/v3"
import { z as z4 } from "zod/v4"
import * as ts from "typescript"
import { f } from "../src"
import { generateSchemaSource } from "../example/schema-codegen"
import { schemas as exampleSchemas } from "../example/schemas"

describe("example schema codegen", () => {
  it("emits executable Zod 4 code with native checks and complete options", () => {
    const schema = f.object({
      subject: f.string()
        .min(2)
        .email("Use an email")
        .field("select")
        .label('Subject "quoted"')
        .props({
          options: [
            { value: "general", label: "General inquiry" },
            { value: "support", label: "Support" },
          ],
        }),
      accepted: f.boolean().refine((value) => value === true, "Required").field("checkbox").default(false),
      normalized: f.string().trim().toLowerCase().field("text"),
      role: f.enum(["admin", "editor"]).field("select"),
    })

    const result = generateSchemaSource(schema, { importPath: "../fields" })

    expect(result.warnings).toEqual([])
    expect(result.code).toContain('import { f } from "../fields"')
    expect(result.code).toContain('.min(2)')
    expect(result.code).toContain('.email("Use an email")')
    expect(result.code).toContain('.trim().toLowerCase()')
    expect(result.code).toContain('.default(false)')
    expect(result.code).toContain('{ "value": "general", "label": "General inquiry" }')
    expect(result.code).toContain('{ "value": "support", "label": "Support" }')
    expect(result.code).toContain('f.enum(["admin", "editor"])')
    expect(result.code).toMatch(/\.refine\([^\n]*Required/)
    expect(result.code).toContain('label("Subject \\\"quoted\\\"")')
  })

  it("emits native Zod 3 checks and enum values", () => {
    const schema = z3.object({
      name: z3.string().min(2).max(40).trim().email(),
      role: z3.enum(["admin", "editor"]),
    })

    const result = generateSchemaSource(schema)

    expect(result.warnings).toEqual([])
    expect(result.code).toContain('.min(2)')
    expect(result.code).toContain('.max(40)')
    expect(result.code).toContain('.trim()')
    expect(result.code).toContain('.email()')
    expect(result.code).toContain('f.enum(["admin", "editor"])')
  })

  it("does not silently pretend that an opaque Zod 3 refine was preserved", () => {
    const schema = z3.object({ accepted: z3.boolean().refine((value) => value === true, "Required") })
    const result = generateSchemaSource(schema)

    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain("Zod 3 refine/superRefine")
    expect(result.code).toContain("codegen warnings")
    expect(result.code).toContain("f.boolean()")
  })

  it("produces syntactically valid TypeScript", () => {
    const schema = z4.object({
      title: z4.string().regex(/^a+$/).optional(),
      count: z4.number().int().gte(1).default(1),
    })
    const { code } = generateSchemaSource(schema)
    const output = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } })

    expect(output.diagnostics ?? []).toHaveLength(0)
  })

  it("keeps every current example schema executable", () => {
    for (const example of exampleSchemas) {
      const result = generateSchemaSource(example.schema)
      const output = ts.transpileModule(result.code, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
      })

      expect(result.warnings, example.title).toEqual([])
      expect(output.diagnostics ?? [], example.title).toHaveLength(0)
      expect(result.code, example.title).not.toContain("f.enum([...])")
      expect(result.code, example.title).toContain('.field("')
      expect(result.code, example.title).toContain('.label("')
    }
  })
})
