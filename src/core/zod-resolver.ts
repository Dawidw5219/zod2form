/**
 * Zod resolver for react-hook-form — works with Zod 3 and Zod 4.
 *
 * Why not @hookform/resolvers/zod directly?
 * v5 imports `zod/v4/core` and uses `instanceof z4.$ZodError` to catch
 * validation errors. When the app and the dependency import different
 * `zod` instances (peer-dep duplication, monorepo deduplication misses),
 * `instanceof` fails — errors leak past the resolver and validation
 * silently breaks. We use a structural check (`Array.isArray(.issues)`)
 * that works regardless of the module instance.
 *
 * Beyond that we mirror @hookform/resolvers/zod feature-for-feature:
 *   - nested error paths via react-hook-form's `set`
 *   - union errors traversal
 *   - field-array root errors
 *   - `criteriaMode: 'all'` via `appendErrors`
 *   - `validateFieldsNatively` via `setCustomValidity`
 *
 * Plus zod2form additions:
 *   - Built-in short English default messages (replaces Zod's verbose
 *     "Too small: expected string to have >=N characters")
 *   - Typed translation API: pass `dict` (override individual keys),
 *     `t` (i18next-style translator), or `errorMap` (full callback)
 */

import {
  appendErrors,
  type FieldError,
  type FieldErrors,
  type FieldValues,
  type Resolver,
  type ResolverOptions,
  type ResolverResult,
  set,
} from "react-hook-form";
import { v4 } from "../adapters/v4";

// ───────────────────── Issue / public types ─────────────────────

/**
 * Loose Zod issue shape — covers both Zod 3 and Zod 4. We don't import
 * from `zod` to avoid binding to one version (and to keep the structural
 * detection working across module instances).
 */
export interface ZodIssueLike {
  code: string;
  path: (string | number)[];
  message?: string;
  // common-ish fields we read in classifyIssue:
  expected?: string;
  received?: string;
  input?: unknown;
  origin?: string;        // Zod 4 too_small/too_big: 'string' | 'number' | 'array' | 'date' | ...
  type?: string;          // Zod 3 equivalent
  minimum?: number | bigint;
  maximum?: number | bigint;
  inclusive?: boolean;
  exact?: boolean;
  format?: string;        // Zod 4 invalid_format: 'email' | 'url' | 'uuid' | 'regex' | ...
  validation?: string;    // Zod 3 invalid_string equivalent
  multipleOf?: number;
  // Zod 3 unionErrors traversal
  unionErrors?: { errors: ZodIssueLike[] }[];
}

/**
 * Stable keys for the built-in default messages. Userland dictionaries and
 * `t()` translators key on these strings — adding a new key is a breaking
 * change, removing one too.
 */
export type ErrorKey =
  | "required"
  | "invalidType"
  | "string.min"
  | "string.max"
  | "string.exact"
  | "number.min"
  | "number.max"
  | "number.exact"
  | "array.min"
  | "array.max"
  | "array.exact"
  | "date.min"
  | "date.max"
  | "format.email"
  | "format.url"
  | "format.uuid"
  | "format.regex"
  | "format.other"
  | "multipleOf"
  | "unrecognizedKeys"
  | "invalidOption"
  | "invalidUnion"
  | "invalidValue";

/** Params passed alongside an ErrorKey for {{interpolation}}. */
export type ErrorParams = Record<string, string | number>;

/** Full errorMap callback — typed equivalent of Zod's errorMap. */
export type ErrorMapFn = (
  issue: ZodIssueLike,
) => string | { message: string } | undefined;

/** i18next-style translator. Zod2form calls `t("string.min", { minimum: 5 })`. */
export type TranslateFn = (key: ErrorKey, params: ErrorParams) => string;

/**
 * Keys that MUST be translated for a usable form experience. If you ship a
 * translation that only overrides `required` but leaves "At least 5 characters"
 * in English, your form looks broken — these are the bare minimum.
 */
export type TranslationFundamentals =
  | "required"
  | "invalidType"
  | "string.min"
  | "string.max"
  | "number.min"
  | "number.max"
  | "array.min"
  | "format.email"
  | "format.url";

/**
 * Full translation — every fundamental key REQUIRED at type level, the rest
 * optional. Use this when you're translating to a new language. TS will yell
 * if you forget e.g. `string.min`.
 */
export type Translation =
  & Record<TranslationFundamentals, string>
  & Partial<Record<Exclude<ErrorKey, TranslationFundamentals>, string>>;

/**
 * Loose dictionary — every key optional. Use for ad-hoc overrides of a few
 * keys without committing to a full translation.
 */
export type ErrorDict = Partial<Record<ErrorKey, string>>;

// ───────────────────── Built-in English dict ─────────────────────

/**
 * English defaults — short, no "Too small:" / "Invalid input:" prefixes.
 * Use `{{name}}` for params. Only this language ships in the package; for
 * other languages userland passes `dict` / `t` / `errorMap`.
 */
export const EN_DICT: Record<ErrorKey, string> = {
  required: "Required",
  invalidType: "Expected {{expected}}, got {{received}}",
  "string.min": "At least {{minimum}} characters",
  "string.max": "At most {{maximum}} characters",
  "string.exact": "Exactly {{minimum}} characters",
  "number.min": "Min {{minimum}}",
  "number.max": "Max {{maximum}}",
  "number.exact": "Must be {{minimum}}",
  "array.min": "At least {{minimum}} items",
  "array.max": "At most {{maximum}} items",
  "array.exact": "Exactly {{minimum}} items",
  "date.min": "Date must be after {{minimum}}",
  "date.max": "Date must be before {{maximum}}",
  "format.email": "Invalid email",
  "format.url": "Invalid URL",
  "format.uuid": "Invalid UUID",
  "format.regex": "Invalid format",
  "format.other": "Invalid {{format}}",
  multipleOf: "Must be a multiple of {{multipleOf}}",
  unrecognizedKeys: "Unknown field",
  invalidOption: "Invalid option",
  invalidUnion: "Invalid value",
  invalidValue: "Invalid value",
};

function interpolate(template: string, params: ErrorParams): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => {
    const v = params[name];
    return v !== undefined ? String(v) : `{{${name}}}`;
  });
}

// ───────────────────── classifyIssue (the 17 rules) ─────────────────────

/**
 * Map a Zod issue to a stable `{ key, params }`. Returns null for
 * `code: 'custom'` (user-supplied refine messages pass through 1:1) and
 * unknown codes (also pass through `issue.message`).
 */
function classifyIssue(
  issue: ZodIssueLike,
): { key: ErrorKey; params: ErrorParams } | null {
  // Zod 4 stores numeric-ish bounds as number; Zod 3 sometimes bigint. Coerce.
  const minimum = issue.minimum !== undefined ? Number(issue.minimum) : undefined;
  const maximum = issue.maximum !== undefined ? Number(issue.maximum) : undefined;

  switch (issue.code) {
    case "invalid_type": {
      const isMissing =
        issue.received === "undefined" || issue.input === undefined;
      if (isMissing) return { key: "required", params: {} };
      return {
        key: "invalidType",
        params: {
          expected: String(issue.expected ?? "value"),
          received: String(issue.received ?? typeof issue.input),
        },
      };
    }
    case "too_small":
    case "too_big": {
      const big = issue.code === "too_big";
      const kind = String(issue.origin ?? issue.type ?? "string") as
        | "string" | "number" | "array" | "date" | string;
      const bound = big ? maximum : minimum;
      if (issue.exact && bound !== undefined) {
        if (kind === "string") return { key: "string.exact", params: { minimum: bound } };
        if (kind === "number") return { key: "number.exact", params: { minimum: bound } };
        if (kind === "array") return { key: "array.exact", params: { minimum: bound } };
      }
      if (kind === "string")
        return {
          key: big ? "string.max" : "string.min",
          params: big ? { maximum: maximum ?? 0 } : { minimum: minimum ?? 0 },
        };
      if (kind === "number")
        return {
          key: big ? "number.max" : "number.min",
          params: big ? { maximum: maximum ?? 0 } : { minimum: minimum ?? 0 },
        };
      if (kind === "array")
        return {
          key: big ? "array.max" : "array.min",
          params: big ? { maximum: maximum ?? 0 } : { minimum: minimum ?? 0 },
        };
      if (kind === "date")
        return {
          key: big ? "date.max" : "date.min",
          params: big ? { maximum: maximum ?? 0 } : { minimum: minimum ?? 0 },
        };
      // Fallback: treat as string
      return {
        key: big ? "string.max" : "string.min",
        params: big ? { maximum: maximum ?? 0 } : { minimum: minimum ?? 0 },
      };
    }
    case "invalid_format":
    case "invalid_string": {
      // Zod 4 uses `format`, Zod 3 uses `validation`.
      const fmt = String(issue.format ?? issue.validation ?? "regex");
      if (fmt === "email") return { key: "format.email", params: {} };
      if (fmt === "url") return { key: "format.url", params: {} };
      if (fmt === "uuid") return { key: "format.uuid", params: {} };
      if (fmt === "regex") return { key: "format.regex", params: {} };
      return { key: "format.other", params: { format: fmt } };
    }
    case "not_multiple_of": {
      return {
        key: "multipleOf",
        params: { multipleOf: Number(issue.multipleOf ?? 0) },
      };
    }
    case "unrecognized_keys":
      return { key: "unrecognizedKeys", params: {} };
    case "invalid_value":
    case "invalid_enum_value":
      return { key: "invalidOption", params: {} };
    case "invalid_union":
      return { key: "invalidUnion", params: {} };
    case "custom":
      return null;
    default:
      return null;
  }
}

// ───────────────────── public defaultErrorMap ─────────────────────

/**
 * Default English errorMap built on classifyIssue + EN_DICT. Override
 * per-key with `dict`, fully via `t`, or replace via `errorMap`.
 */
export const defaultErrorMap: ErrorMapFn = (issue) => {
  const c = classifyIssue(issue);
  if (!c) return undefined; // pass through to issue.message
  return interpolate(EN_DICT[c.key], c.params);
};

/**
 * Build an errorMap that resolves keys through `t` (custom translator) or
 * `dict` (partial overrides on top of EN_DICT). Used internally; userland
 * usually just passes `dict` / `t` / `errorMap` to createZodResolver.
 */
export function buildErrorMap(opts: {
  dict?: ErrorDict;
  t?: TranslateFn;
}): ErrorMapFn {
  const { dict, t } = opts;
  return (issue) => {
    const c = classifyIssue(issue);
    if (!c) return undefined;
    if (t) return t(c.key, c.params);
    const tpl = dict?.[c.key] ?? EN_DICT[c.key];
    return interpolate(tpl, c.params);
  };
}

// ───────────────────── error → FieldErrors plumbing ─────────────────────

interface ZodErrorLike {
  issues?: ZodIssueLike[];
  errors?: ZodIssueLike[];
}

function isZodError(error: unknown): error is ZodErrorLike {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  return Array.isArray(e.issues) || Array.isArray(e.errors);
}

function getIssues(error: ZodErrorLike): ZodIssueLike[] {
  return (error.issues ?? error.errors ?? []) as ZodIssueLike[];
}

function stripBrackets(s: string): string {
  return s.replace(/\]|\[/g, "");
}
function isInFieldArray(names: string[], path: string): boolean {
  const stripped = stripBrackets(path);
  return names.some((name) =>
    new RegExp(`^${stripped}\\.\\d+`).test(stripBrackets(name)),
  );
}

function reportNative(
  errors: FieldErrors,
  options: ResolverOptions<FieldValues>,
): void {
  for (const name in options.fields) {
    const field = options.fields[name];
    const error = (errors as Record<string, FieldError | undefined>)[name];
    const msg = error?.message ?? "";
    const setOnRef = (ref: unknown) => {
      if (ref && typeof ref === "object" && "reportValidity" in (ref as object)) {
        const r = ref as HTMLInputElement;
        r.setCustomValidity(msg);
        r.reportValidity();
      }
    };
    if (field?.ref) setOnRef(field.ref);
    else if (field?.refs) field.refs.forEach(setOnRef);
  }
}

function toFieldErrors<T extends FieldValues>(
  issues: ZodIssueLike[],
  options: ResolverOptions<T>,
): FieldErrors<T> {
  const validateAll = options.criteriaMode === "all";
  const flat: Record<string, FieldError> = {};
  const queue = [...issues];

  while (queue.length) {
    const issue = queue.shift()!;
    const path = issue.path.join(".");

    if (!flat[path]) {
      if (issue.unionErrors && issue.unionErrors.length > 0) {
        const first = issue.unionErrors[0]?.errors?.[0];
        if (first) {
          flat[path] = { message: first.message ?? "", type: first.code };
        } else {
          flat[path] = { message: issue.message ?? "", type: issue.code };
        }
      } else {
        flat[path] = { message: issue.message ?? "", type: issue.code };
      }
    }

    if (issue.unionErrors) {
      for (const ue of issue.unionErrors) {
        for (const sub of ue.errors) queue.push(sub);
      }
    }

    if (validateAll) {
      const existingTypes = (flat[path] as FieldError & { types?: Record<string, unknown> }).types;
      const prev = existingTypes?.[issue.code];
      flat[path] = appendErrors(
        path,
        true,
        flat as Record<string, FieldError>,
        issue.code,
        prev !== undefined
          ? ([] as string[]).concat(prev as string[], issue.message ?? "")
          : issue.message ?? "",
      ) as FieldError;
    }
  }

  const nested: FieldErrors<T> = {} as FieldErrors<T>;
  const names = options.names ?? Object.keys(flat);
  for (const path in flat) {
    const fieldRef = options.fields?.[path]?.ref;
    const errWithRef: FieldError & { ref?: unknown } = {
      ...flat[path],
      ...(fieldRef ? { ref: fieldRef } : {}),
    };
    if (isInFieldArray(names, path)) {
      const existing = { ...((nested as Record<string, unknown>)[path] ?? {}) };
      set(existing, "root", errWithRef);
      set(nested as object, path, existing);
    } else {
      set(nested as object, path, errWithRef);
    }
  }

  if (options.shouldUseNativeValidation)
    reportNative(nested, options as ResolverOptions<FieldValues>);
  return nested;
}

// ───────────────────── public createZodResolver ─────────────────────

export type ZodResolverSchemaOptions = {
  /**
   * Full errorMap callback — wins over `dict` / `t`. Receives a typed
   * Zod issue, returns a string, `{ message }`, or undefined to fall
   * through to Zod's own message.
   */
  errorMap?: ErrorMapFn;
  /**
   * Partial override of built-in English keys (e.g. `{ required: "Wymagane" }`).
   * For full translations use `Translation` type — TS forces fundamentals
   * (required, invalidType, string.min, string.max, number.min/max, array.min,
   * format.email, format.url) to prevent half-broken non-English forms.
   */
  dict?: ErrorDict | Translation;
  /** i18n translator — `t("string.min", { minimum: 5 })` → string. */
  t?: TranslateFn;
  /** Async parse — explicit. We default to async; pass true to be explicit. */
  async?: boolean;
  /** Any extra parse params Zod accepts (path, etc.). */
  [key: string]: unknown;
};

export type ZodResolverOptions = {
  /** 'sync' uses .parse, 'async' uses .parseAsync. Default: 'async'. */
  mode?: "sync" | "async";
  /** If true, return raw form values instead of Zod's parsed output. */
  raw?: boolean;
};

/**
 * Create a react-hook-form Resolver from any Zod schema (v3 or v4).
 *
 * @example default English short messages
 *   createZodResolver(schema)
 *
 * @example partial PL override (only the keys you care about)
 *   createZodResolver(schema, {
 *     dict: { required: "Wymagane", "string.min": "Min {{minimum}} znaków" }
 *   })
 *
 * @example i18next integration
 *   createZodResolver(schema, {
 *     t: (key, params) => i18next.t(`zod.${key}`, params)
 *   })
 *
 * @example full custom errorMap (escape hatch)
 *   createZodResolver(schema, { errorMap: (issue) => "..." })
 */
export function createZodResolver<T extends FieldValues>(
  schema: unknown,
  schemaOptions?: ZodResolverSchemaOptions,
  resolverOptions: ZodResolverOptions = {},
): Resolver<T> {
  const isV4 = v4.isZodSchema(schema);

  // Pick effective errorMap — explicit `errorMap` wins, else build from t/dict,
  // else fall back to built-in English defaults.
  const effectiveMap: ErrorMapFn =
    schemaOptions?.errorMap ??
    (schemaOptions?.t || schemaOptions?.dict
      ? buildErrorMap({ dict: schemaOptions.dict, t: schemaOptions.t })
      : defaultErrorMap);

  // Build the parse-options object Zod expects, taking the v3/v4 errorMap
  // shape difference into account.
  const buildParseOpts = (): unknown => {
    const { errorMap: _e, dict: _d, t: _t, async: _a, ...rest } = schemaOptions ?? {};
    if (isV4) return { ...rest, error: effectiveMap };
    // Zod 3 expects an errorMap returning { message }; wrap our return value.
    const v3Wrap = (issue: unknown, ctx: { defaultError: string }) => {
      const out = effectiveMap(issue as ZodIssueLike);
      if (out === undefined) return { message: ctx.defaultError };
      return typeof out === "string" ? { message: out } : out;
    };
    return { ...rest, errorMap: v3Wrap };
  };

  return async (values, _ctx, options) => {
    const parseOpts = buildParseOpts();
    try {
      const s = schema as {
        parse: (v: unknown, p?: unknown) => unknown;
        parseAsync: (v: unknown, p?: unknown) => Promise<unknown>;
      };
      const data =
        resolverOptions.mode === "sync"
          ? s.parse(values, parseOpts)
          : await s.parseAsync(values, parseOpts);

      return {
        errors: {} as FieldErrors<T>,
        values: (resolverOptions.raw ? { ...values } : data) as T,
      } as ResolverResult<T>;
    } catch (error) {
      if (isZodError(error)) {
        return {
          values: {} as Record<string, never>,
          errors: toFieldErrors(getIssues(error), options),
        };
      }
      throw error;
    }
  };
}
