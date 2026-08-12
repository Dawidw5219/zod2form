import { useRef, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { createPortal } from "react-dom"
import { ZodForm, useWatch, useZodFormContext } from "zod2form"
import { f } from "./fields"
import { schemas } from "./schemas"
import { generateSchemaSource } from "./schema-codegen"

import componentsSource from "./components.tsx?raw"
import formSource from "./form.tsx?raw"

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

type Tab = "schema" | "form" | "components"

function App() {
  const [idx, setIdx] = useState(0)
  const [tab, setTab] = useState<Tab>("schema")
  const current = schemas[idx]
  const liveRef = useRef<HTMLDivElement>(null)
  const mobileLiveRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const schemaSource = generateSchemaSource(current.schema as any, { importPath: "../fields" }).code

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

        {tab === "form" && (
          <div className="code-section"><CodeBlock code={formSource} /></div>
        )}


        {tab === "components" && (
          <div className="code-section"><CodeBlock code={componentsSource} /></div>
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
