import { useRef, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { createPortal } from "react-dom"
import { getMeta, ZodForm, useWatch, useZodFormContext } from "zod2form"
import { getTypeName, getInnerType, getDefaultValue } from "../src/adapters"
import { f } from "./fields"
import { schemas } from "./schemas"

import componentsSource from "./components.tsx?raw"
import formSource from "./form.tsx?raw"
import fieldsSource from "./fields.tsx?raw"

// ─── Schema stringifier (generates code shown in Schema tab) ─────────────────

function stringifySchema(schema: { shape: Record<string, unknown> }): string {
  const shape = schema.shape as Record<string, any>
  const lines: string[] = [`import { f } from "./form"`, ``, `const schema = f.object({`]

  for (const [key, field] of Object.entries(shape)) {
    const zodNode = field.toZod?.() ?? field
    const meta = getMeta(zodNode as object)
    const parts: string[] = []

    parts.push(resolveBaseType(zodNode))
    parts.push(...resolveValidations(zodNode))
    if (meta?.fieldType) parts.push(`.field("${meta.fieldType}")`)
    if (meta?.label) parts.push(`.label("${meta.label}")`)
    if (meta?.placeholder) parts.push(`.placeholder("${meta.placeholder}")`)
    if (meta?.fieldProps) parts.push(`.props(${simplifyProps(meta.fieldProps)})`)
    const defaultVal = resolveDefault(zodNode)
    if (defaultVal !== undefined) parts.push(`.default(${defaultVal})`)

    const comment = !meta?.fieldType ? "  // not in form" : ""
    lines.push(`  ${key}: ${parts.join("")},${comment}`)
  }

  lines.push("})")
  return lines.join("\n")
}

function resolveBaseType(node: unknown): string {
  const typeName = getTypeName(node)
  if (!typeName) return "f.unknown()"
  if (typeName === "ZodEffects") return resolveBaseType(getInnerType(node))
  if (typeName === "ZodDefault") return resolveBaseType(getInnerType(node))
  if (typeName === "ZodOptional") return resolveBaseType(getInnerType(node)) + ".optional()"
  if (typeName === "ZodNullable") return resolveBaseType(getInnerType(node)) + ".nullable()"
  if (typeName === "ZodEnum") {
    const def = (node as any)?._def ?? (node as any)?._zod?.def
    const values = def?.values ?? def?.entries
    if (Array.isArray(values)) return `f.enum([${values.map((v: string) => `"${v}"`).join(", ")}])`
    return "f.enum([...])"
  }
  const map: Record<string, string> = {
    ZodString: "f.string()", ZodNumber: "f.number()", ZodBoolean: "f.boolean()",
    ZodDate: "f.date()",
  }
  return map[typeName] ?? `f.${typeName.replace("Zod", "").toLowerCase()}()`
}

function resolveValidations(node: unknown): string[] {
  const parts: string[] = []
  const typeName = getTypeName(node)
  if (!typeName) return parts
  if (typeName === "ZodEffects") {
    const inner = getInnerType(node)
    if (inner) parts.push(...resolveValidations(inner))
    parts.push(`.refine(...)`)
    return parts
  }
  if (typeName === "ZodDefault" || typeName === "ZodOptional" || typeName === "ZodNullable") {
    const inner = getInnerType(node)
    if (inner) return resolveValidations(inner)
    return parts
  }
  // Extract checks from both v3 (_def.checks) and v4 (_zod.def.checks)
  const def = (node as any)?._def ?? {}
  const zodDef = (node as any)?._zod?.def ?? {}
  const checks: any[] = def.checks ?? zodDef.checks ?? []
  for (const c of checks) {
    const msg = c.message ? `, "${c.message}"` : ""
    const msgOnly = c.message ? `"${c.message}"` : ""
    if (c.kind === "min") parts.push(`.min(${c.value}${msg})`)
    if (c.kind === "max") parts.push(`.max(${c.value}${msg})`)
    if (c.kind === "length") parts.push(`.length(${c.value}${msg})`)
    if (c.kind === "email") parts.push(`.email(${msgOnly})`)
    if (c.kind === "url") parts.push(`.url(${msgOnly})`)
    if (c.kind === "uuid") parts.push(`.uuid(${msgOnly})`)
    if (c.kind === "trim") parts.push(".trim()")
    if (c.kind === "toLowerCase") parts.push(".toLowerCase()")
    if (c.kind === "toUpperCase") parts.push(".toUpperCase()")
  }
  return parts
}

function resolveDefault(node: unknown): string | undefined {
  const result = getDefaultValue(node)
  if (!result.found) return undefined
  const val = result.value
  if (val instanceof Date) return "() => new Date()"
  if (typeof val === "string") return `"${val}"`
  if (typeof val === "boolean") return String(val)
  if (typeof val === "number") return String(val)
  return JSON.stringify(val)
}

function simplifyProps(props: Record<string, unknown>): string {
  if ("options" in props && Array.isArray(props.options)) {
    const opts = (props.options as { value: string; label: string }[]).map(o => `"${o.label}"`).join(", ")
    return `{ options: [${opts}] }`
  }
  return JSON.stringify(props)
}

// ─── Syntax highlighting ─────────────────────────────────────────────────────

declare const hljs: { highlight(code: string, opts: { language: string }): { value: string } }

function CodeBlock({ code }: { code: string }) {
  const html = hljs.highlight(code, { language: "typescript" }).value
  return <pre className="code hljs" dangerouslySetInnerHTML={{ __html: html }} />
}

// ─── Form children ───────────────────────────────────────────────────────────

function SubmitRow() {
  const { formState } = useZodFormContext()
  const count = Object.keys(formState.errors).length
  return (
    <div className="submit-row">
      <button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Sending..." : "Send"}
      </button>
      {count > 0 && <span className="error">{count} {count === 1 ? "error" : "errors"}</span>}
    </div>
  )
}

function LiveData({ targets }: { targets: (HTMLElement | null)[] }) {
  const { getValues } = useZodFormContext()
  useWatch()
  const values = getValues()
  const data: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(values)) {
    data[key] = val === undefined ? null : val
  }
  const json = <pre className="preview">{JSON.stringify(data, null, 2)}</pre>
  return <>{targets.map((t, i) => t ? createPortal(json, t) : null)}</>
}

// ─── App ─────────────────────────────────────────────────────────────────────

type Tab = "schema" | "components" | "form"

function App() {
  const [idx, setIdx] = useState(0)
  const [tab, setTab] = useState<Tab>("schema")
  const current = schemas[idx]
  const liveRef = useRef<HTMLDivElement>(null)
  const mobileLiveRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const schemaSource = stringifySchema(current.schema as any)

  return (
    <div className="page">
      <div className="code-panel">
        <div className="tabs">
          <button type="button" className={`tab ${tab === "schema" ? "tab-active" : ""}`} onClick={() => setTab("schema")}>Schema</button>
          <button type="button" className={`tab ${tab === "form" ? "tab-active" : ""}`} onClick={() => setTab("form")}>Form</button>
          <button type="button" className={`tab ${tab === "components" ? "tab-active" : ""}`} onClick={() => setTab("components")}>Components</button>
          {tab === "schema" && <span className="tab-dim">{idx + 1} / {schemas.length}</span>}
        </div>

        <div style={{ display: tab === "schema" ? "flex" : "none", flexDirection: "column", flex: "1 1 0", minHeight: 0 }}>
          <div className="code-section">
            <CodeBlock code={schemaSource} />
          </div>
          <div className="divider">
            <div className="divider-line" />
            <button type="button" className="next-btn" onClick={() => setIdx(i => i < schemas.length - 1 ? i + 1 : 0)}>Next form →</button>
            <div className="divider-line" />
          </div>
          <div className="output-section">
            <div className="code-label">output</div>
            <div ref={liveRef} />
          </div>
        </div>

        {tab === "components" && (
          <div className="code-section"><CodeBlock code={componentsSource} /></div>
        )}

        {tab === "form" && (
          <div className="code-section"><CodeBlock code={formSource} /></div>
        )}
        <div className="mobile-divider">
          <div className="mobile-divider-line" />
          <button type="button" className="next-btn" onClick={() => setIdx(i => i < schemas.length - 1 ? i + 1 : 0)}>
            Next form →
          </button>
          <div className="mobile-divider-line" />
        </div>
      </div>

      <div className="form-panel">
        <div className="form-card">
          <h1>{current.title}</h1>
          <ZodForm key={idx} schema={current.schema} fields={f} onSubmit={() => alert("Form submitted successfully!")}>
            <SubmitRow />
            {mounted && <LiveData targets={[liveRef.current, mobileLiveRef.current]} />}
          </ZodForm>
        </div>
        <p className="note">One schema. One <code>&lt;ZodForm /&gt;</code>. That's it.</p>
        <div className="mobile-output">
          <div className="code-label">output</div>
          <div ref={mobileLiveRef} />
        </div>
      </div>
    </div>
  )
}

// ─── Mount ───────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(<App />)
