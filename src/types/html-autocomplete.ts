/**
 * WHATWG HTML autofill tokens that browsers recognise.
 *
 * Exhaustive list pulled from the HTML Living Standard, section
 * "Autofill — Autofill detail tokens" (snapshot: 2026-04):
 *   https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill
 *
 * Anything outside this set is treated as `"on"` by the UA. The trailing
 * `(string & {})` branch keeps the type open-ended so you can still pass
 * a custom token (e.g. a scoped `"section-billing tel"` or a section
 * grouping `"shipping tel"`) without a cast, while `.autoComplete("...")`
 * still offers IDE completion for the canonical values.
 *
 * Modifiers (`section-*`, `shipping`, `billing`, `home`, `work`, `mobile`,
 * `fax`, `pager`) only make sense in a space-separated multi-token value
 * and so they're intentionally NOT listed as standalone options — use the
 * `(string & {})` escape hatch when you need them.
 */
export type HTMLAutocomplete =
  // ── Control ─────────────────────────────────────────────────────────
  | "off"
  | "on"

  // ── Name ────────────────────────────────────────────────────────────
  | "name"
  | "honorific-prefix"
  | "given-name"
  | "additional-name"
  | "family-name"
  | "honorific-suffix"
  | "nickname"

  // ── Contact ─────────────────────────────────────────────────────────
  | "email"
  | "username"
  | "tel"
  | "tel-country-code"
  | "tel-national"
  | "tel-area-code"
  | "tel-local"
  | "tel-local-prefix"
  | "tel-local-suffix"
  | "tel-extension"
  | "impp"
  | "url"
  | "photo"

  // ── Credentials ─────────────────────────────────────────────────────
  | "new-password"
  | "current-password"
  | "one-time-code"
  | "webauthn"

  // ── Organisation / job ──────────────────────────────────────────────
  | "organization-title"
  | "organization"

  // ── Address ─────────────────────────────────────────────────────────
  | "street-address"
  | "address-line1"
  | "address-line2"
  | "address-line3"
  | "address-level4"
  | "address-level3"
  | "address-level2"
  | "address-level1"
  | "country"
  | "country-name"
  | "postal-code"

  // ── Payment card ────────────────────────────────────────────────────
  | "cc-name"
  | "cc-given-name"
  | "cc-additional-name"
  | "cc-family-name"
  | "cc-number"
  | "cc-exp"
  | "cc-exp-month"
  | "cc-exp-year"
  | "cc-csc"
  | "cc-type"
  | "transaction-currency"
  | "transaction-amount"

  // ── Locale ──────────────────────────────────────────────────────────
  | "language"

  // ── Birthday ────────────────────────────────────────────────────────
  | "bday"
  | "bday-day"
  | "bday-month"
  | "bday-year"

  // ── Biographical ────────────────────────────────────────────────────
  | "sex"

  // ── Escape hatch ────────────────────────────────────────────────────
  // biome-ignore lint/complexity/noBannedTypes: (string & {}) is the standard "keep-completions-while-accepting-any-string" trick
  | (string & {});
