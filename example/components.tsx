import type { FieldProps } from "zod2form"

// Always-rendered error slot — keeps a fixed line-height of vertical space
// reserved below every field so the form layout doesn't jump when an error
// appears or disappears. Empty state shows a non-breaking space.
const ErrorSlot = ({ error }: { error?: string }) => (
  <span className="error" aria-live="polite" data-empty={!error || undefined}>
    {error || " "}
  </span>
)

export const Text = ({ label, error, isRequired, value, onChange, onBlur, name, placeholder }: FieldProps) => (
  <label>
    {label}{isRequired && " *"}
    <input name={name} value={String(value ?? "")} onChange={onChange} onBlur={onBlur} placeholder={placeholder} aria-invalid={!!error || undefined} />
    <ErrorSlot error={error} />
  </label>
)

export const Textarea = ({ label, error, value, onChange, onBlur, name, placeholder, rows }: FieldProps & { rows?: number }) => (
  <label>
    {label}
    <textarea name={name} value={String(value ?? "")} onChange={onChange} onBlur={onBlur} placeholder={placeholder} rows={rows ?? 4} aria-invalid={!!error || undefined} />
    <ErrorSlot error={error} />
  </label>
)

export const Checkbox = ({ label, error, value, onChange, onBlur }: FieldProps) => (
  <div className="check-field">
    <label className="check">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} onBlur={onBlur} aria-invalid={!!error || undefined} />
      {label}
    </label>
    <ErrorSlot error={error} />
  </div>
)

export const Select = ({ label, error, value, onChange, onBlur, name, isRequired, options = [] }: FieldProps & { options?: { value: string; label: string }[] }) => (
  <label>
    {label}{isRequired && " *"}
    <select name={name} value={String(value ?? "")} onChange={e => onChange(e.target.value)} onBlur={onBlur} aria-invalid={!!error || undefined}>
      <option value="">Select...</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <ErrorSlot error={error} />
  </label>
)

export const Radio = ({ label, error, value, onChange, onBlur, options = [] }: FieldProps & { options?: { value: string; label: string }[] }) => (
  <fieldset>
    <legend>{label}</legend>
    <div className="radio-group">
      {options.map(o => (
        <label key={o.value} className="radio">
          <input type="radio" checked={value === o.value} onChange={() => onChange(o.value)} onBlur={onBlur} />
          {o.label}
        </label>
      ))}
    </div>
    <ErrorSlot error={error} />
  </fieldset>
)
