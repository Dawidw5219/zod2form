import type { FieldProps } from "zod2form"

export const Text = ({ label, error, isRequired, value, onChange, onBlur, name, placeholder }: FieldProps) => (
  <label>
    {label}{isRequired && " *"}
    <input name={name} value={String(value ?? "")} onChange={onChange} onBlur={onBlur} placeholder={placeholder} />
    {error && <span className="error">{error}</span>}
  </label>
)

export const Textarea = ({ label, error, value, onChange, onBlur, name, placeholder, rows }: FieldProps & { rows?: number }) => (
  <label>
    {label}
    <textarea name={name} value={String(value ?? "")} onChange={onChange} onBlur={onBlur} placeholder={placeholder} rows={rows ?? 4} />
    {error && <span className="error">{error}</span>}
  </label>
)

export const Checkbox = ({ label, error, value, onChange, onBlur }: FieldProps) => (
  <div>
    <label className="check">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} onBlur={onBlur} />
      {label}
    </label>
    {error && <span className="error">{error}</span>}
  </div>
)

export const Select = ({ label, error, value, onChange, onBlur, name, isRequired, options = [] }: FieldProps & { options?: { value: string; label: string }[] }) => (
  <label>
    {label}{isRequired && " *"}
    <select name={name} value={String(value ?? "")} onChange={e => onChange(e.target.value)} onBlur={onBlur}>
      <option value="">Select...</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <span className="error">{error}</span>}
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
    {error && <span className="error">{error}</span>}
  </fieldset>
)
