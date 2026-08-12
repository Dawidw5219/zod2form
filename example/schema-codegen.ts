import { getDefaultValue, getInnerType, getTypeName } from "../src/adapters"
import { getMeta as getPackageMeta } from "zod2form"
import { getMeta as getSourceMeta } from "../src/core/meta"

type SchemaNode = Record<string, any>
type SchemaShape = Record<string, SchemaNode>

export type SchemaCodegenOptions = {
  importPath?: string
}

export type GeneratedSchemaSource = {
  code: string
  warnings: string[]
}

type CodegenContext = {
  warnings: string[]
  warned: Set<string>
}

const getDef = (node: unknown): SchemaNode => {
  const schema = node as SchemaNode | null | undefined
  return schema?._def ?? schema?._zod?.def ?? {}
}

const getShape = (node: unknown): SchemaShape => {
  const def = getDef(node)
  // Prefer the public shape accessor. `defineFields()` keeps field metadata on
  // its wrapped shape entries; reaching through `_zod.def.shape` can unwrap
  // those proxies before `getMeta()` sees them.
  const shape = (node as SchemaNode | undefined)?.shape ?? def.shape
  return typeof shape === "function" ? shape() : shape ?? {}
}

const warn = (context: CodegenContext, message: string): void => {
  if (context.warned.has(message)) return
  context.warned.add(message)
  context.warnings.push(message)
}

const quote = (value: string): string => JSON.stringify(value)

const serializeValue = (value: unknown, context: CodegenContext, path: string): string => {
  if (value === undefined) return "undefined"
  if (value === null) return "null"
  if (typeof value === "string") return quote(value)
  if (typeof value === "boolean") return String(value)
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "Number.NaN"
    if (value === Infinity) return "Infinity"
    if (value === -Infinity) return "-Infinity"
    return String(value)
  }
  if (typeof value === "bigint") return `${value}n`
  if (value instanceof Date) return `new Date(${quote(value.toISOString())})`
  if (value instanceof RegExp) {
    return `new RegExp(${quote(value.source)}, ${quote(value.flags)})`
  }
  if (Array.isArray(value)) {
    return `[${value.map((item, index) => serializeValue(item, context, `${path}[${index}]`)).join(", ")}]`
  }
  if (typeof value === "function") {
    const source = value.toString().trim()
    if (!source.includes("[native code]")) return source
    warn(context, `${path}: nie można odtworzyć natywnej funkcji w wygenerowanym kodzie.`)
    return "undefined"
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${quote(key)}: ${serializeValue(item, context, `${path}.${key}`)}`)
    return `{ ${entries.join(", ")} }`
  }
  warn(context, `${path}: nieobsługiwany typ wartości ${typeof value}.`)
  return "undefined"
}

const serializeFunction = (
  fn: unknown,
  context: CodegenContext,
  path: string,
): string | undefined => {
  if (typeof fn !== "function") {
    warn(context, `${path}: brak funkcji możliwej do zapisania w kodzie.`)
    return undefined
  }
  const source = fn.toString().trim()
  if (source.includes("[native code]")) {
    warn(context, `${path}: funkcja runtime nie może być bezpiecznie odtworzona.`)
    return undefined
  }
  return source
}

const errorMessage = (check: SchemaNode, issue: SchemaNode): string | undefined => {
  const error = check?._zod?.def?.error ?? check?.def?.error
  if (typeof error !== "function") return typeof error === "string" ? error : undefined
  try {
    const result = error(issue)
    if (typeof result === "string") return result
    if (result && typeof result === "object" && typeof result.message === "string") return result.message
  } catch {
    return undefined
  }
  return undefined
}

const withMessage = (expression: string, message: string | undefined): string =>
  message === undefined ? expression : `${expression}, ${quote(message)}`

const serializeDefault = (node: SchemaNode, value: unknown, context: CodegenContext): string => {
  if (value instanceof Date) return "() => new Date()"
  return serializeValue(value, context, "default")
}

const emitV3Checks = (checks: SchemaNode[], context: CodegenContext): string[] => {
  const output: string[] = []
  for (const check of checks) {
    const message = typeof check.message === "string" ? check.message : undefined
    const suffix = message === undefined ? "" : `, ${quote(message)}`
    switch (check.kind) {
      case "min": output.push(`.min(${serializeValue(check.value, context, "min")}${suffix})`); break
      case "max": output.push(`.max(${serializeValue(check.value, context, "max")}${suffix})`); break
      case "length": output.push(`.length(${serializeValue(check.value, context, "length")}${suffix})`); break
      case "email": output.push(`.email(${message === undefined ? "" : quote(message)})`); break
      case "url": output.push(`.url(${message === undefined ? "" : quote(message)})`); break
      case "uuid": output.push(`.uuid(${message === undefined ? "" : quote(message)})`); break
      case "regex": output.push(`.regex(${serializeValue(check.regex, context, "regex")}${suffix})`); break
      case "trim": output.push(".trim()"); break
      case "toLowerCase": output.push(".toLowerCase()"); break
      case "toUpperCase": output.push(".toUpperCase()"); break
      case "includes": output.push(`.includes(${quote(check.value)}${suffix})`); break
      case "startsWith": output.push(`.startsWith(${quote(check.value)}${suffix})`); break
      case "endsWith": output.push(`.endsWith(${quote(check.value)}${suffix})`); break
      case "datetime": output.push(`.datetime(${message === undefined ? "" : quote(message)})`); break
      case "date": output.push(`.date(${message === undefined ? "" : quote(message)})`); break
      case "time": output.push(`.time(${message === undefined ? "" : quote(message)})`); break
      case "multipleOf": output.push(`.multipleOf(${serializeValue(check.value, context, "multipleOf")}${suffix})`); break
      case "int": output.push(`.int(${message === undefined ? "" : quote(message)})`); break
      case "finite": output.push(`.finite()`); break
      default:
        warn(context, `Zod 3: pominięto nieobsługiwany check ${String(check.kind)}.`)
    }
  }
  return output
}

const emitV4Checks = (checks: SchemaNode[], context: CodegenContext): string[] => {
  const output: string[] = []
  for (const check of checks) {
    const def = check?._zod?.def ?? check?.def ?? check
    const checkName = def.check
    const messageFor = (issue: SchemaNode): string | undefined => errorMessage(check, issue)
    switch (checkName) {
      case "min_length":
        output.push(withMessage(`.min(${def.minimum}`, messageFor({ code: "too_small", input: "", origin: "string", minimum: def.minimum })))
        output[output.length - 1] += ")"
        break
      case "max_length":
        output.push(withMessage(`.max(${def.maximum}`, messageFor({ code: "too_big", input: "", origin: "string", maximum: def.maximum })))
        output[output.length - 1] += ")"
        break
      case "length_equals":
        output.push(withMessage(`.length(${def.length}`, messageFor({ code: "too_small", input: "", origin: "string", minimum: def.length, maximum: def.length })))
        output[output.length - 1] += ")"
        break
      case "multiple_of":
        output.push(withMessage(`.multipleOf(${def.value}`, messageFor({ code: "not_multiple_of", input: 0, multipleOf: def.value })))
        output[output.length - 1] += ")"
        break
      case "greater_than": {
        const method = def.inclusive ? "gte" : "gt"
        output.push(withMessage(`.${method}(${def.value}`, messageFor({ code: "too_small", input: 0, origin: "number", minimum: def.value })))
        output[output.length - 1] += ")"
        break
      }
      case "less_than": {
        const method = def.inclusive ? "lte" : "lt"
        output.push(withMessage(`.${method}(${def.value}`, messageFor({ code: "too_big", input: 0, origin: "number", maximum: def.value })))
        output[output.length - 1] += ")"
        break
      }
      case "number_format":
        if (def.format === "safeint") output.push(".int()")
        else warn(context, `Zod 4: pominięto format liczby ${String(def.format)}.`)
        break
      case "string_format": {
        const format = def.format
        const message = messageFor({ code: "invalid_format", format })
        if (format === "regex") output.push(`.regex(${serializeValue(def.pattern, context, "regex")}${message === undefined ? "" : `, ${quote(message)}`})`)
        else if (format === "includes") output.push(`.includes(${quote(def.includes)}${message === undefined ? "" : `, ${quote(message)}`})`)
        else if (format === "starts_with") output.push(`.startsWith(${quote(def.prefix)}${message === undefined ? "" : `, ${quote(message)}`})`)
        else if (format === "ends_with") output.push(`.endsWith(${quote(def.suffix)}${message === undefined ? "" : `, ${quote(message)}`})`)
        else if (["email", "url", "uuid", "datetime", "date", "time"].includes(format)) output.push(`.${format}(${message === undefined ? "" : quote(message)})`)
        else warn(context, `Zod 4: pominięto format stringa ${String(format)}.`)
        break
      }
      case "overwrite": {
        const source = String(def.tx ?? "")
        if (source.includes("trim")) output.push(".trim()")
        else if (source.includes("toLowerCase")) output.push(".toLowerCase()")
        else if (source.includes("toUpperCase")) output.push(".toUpperCase()")
        else warn(context, "Zod 4: nie można rozpoznać funkcji overwrite.")
        break
      }
      case "custom": {
        const fn = serializeFunction(def.fn, context, "Zod 4 refine")
        if (!fn) break
        const message = errorMessage(check, { code: "custom", input: false })
        output.push(def.fn.length >= 2 ? `.superRefine(${fn})` : `.refine(${fn}${message === undefined ? "" : `, ${quote(message)}`})`)
        break
      }
      default:
        warn(context, `Zod 4: pominięto nieobsługiwany check ${String(checkName)}.`)
    }
  }
  return output
}

const emitChecks = (node: SchemaNode, context: CodegenContext): string => {
  const def = getDef(node)
  const checks = def.checks ?? []
  if (!Array.isArray(checks) || checks.length === 0) return ""
  const isV4 = Boolean(node?._zod?.version?.major === 4 || node?._zod?.def)
  return (isV4 ? emitV4Checks(checks, context) : emitV3Checks(checks, context)).join("")
}

const emitNode = (node: SchemaNode, context: CodegenContext, path: string): string => {
  const typeName = getTypeName(node)
  const def = getDef(node)
  const inner = getInnerType(node) as SchemaNode | null

  if (typeName === "ZodOptional") return `${emitNode(inner ?? {}, context, path)}.optional()`
  if (typeName === "ZodNullable") return `${emitNode(inner ?? {}, context, path)}.nullable()`
  if (typeName === "ZodDefault") {
    const defaultValue = getDefaultValue(node)
    return `${emitNode(inner ?? {}, context, path)}.default(${serializeDefault(node, defaultValue.found ? defaultValue.value : undefined, context)})`
  }
  if (typeName === "ZodCatch") {
    const value = def.catchValue ?? def.defaultValue
    return `${emitNode(inner ?? {}, context, path)}.catch(${serializeValue(typeof value === "function" ? value() : value, context, `${path}.catch`)})`
  }
  if (typeName === "ZodEffects") {
    const effect = def.effect
    const base = emitNode(inner ?? {}, context, path)
    const fn = serializeFunction(effect?.transform ?? effect?.refinement, context, `${path}.${effect?.type ?? "effect"}`)
    if (!fn) return base
    if (effect?.type === "transform") return `${base}.transform(${fn})`
    if (effect?.type === "refinement") {
      warn(context, `${path}: Zod 3 refine/superRefine nie ujawnia oryginalnego callbacka; kod wymaga ręcznego uzupełnienia.`)
      return base
    }
    warn(context, `${path}: pominięto nieobsługiwany efekt Zod 3 ${String(effect?.type)}.`)
    return base
  }
  if (typeName === "ZodPipeline") {
    const left = def.in ?? def.schema
    const right = def.out
    if (left && right) return `f.pipe(${emitNode(left, context, `${path}.in`)}, ${emitNode(right, context, `${path}.out`)})`
  }
  if (typeName === "ZodPipe") {
    if (def.in && def.out) return `f.pipe(${emitNode(def.in, context, `${path}.in`)}, ${emitNode(def.out, context, `${path}.out`)})`
  }

  let expression: string
  switch (typeName) {
    case "ZodString": expression = "f.string()"; break
    case "ZodNumber": expression = "f.number()"; break
    case "ZodBoolean": expression = "f.boolean()"; break
    case "ZodDate": expression = "f.date()"; break
    case "ZodAny": expression = "f.any()"; break
    case "ZodUnknown": expression = "f.unknown()"; break
    case "ZodNever": expression = "f.never()"; break
    case "ZodNull": expression = "f.null()"; break
    case "ZodUndefined": expression = "f.undefined()"; break
    case "ZodVoid": expression = "f.void()"; break
    case "ZodBigInt": expression = "f.bigint()"; break
    case "ZodSymbol": expression = "f.symbol()"; break
    case "ZodNaN": expression = "f.nan()"; break
    case "ZodLiteral": {
      const values = def.values ?? (def.value === undefined ? [] : [def.value])
      expression = `f.literal(${serializeValue(values[0], context, `${path}.literal`)})`
      break
    }
    case "ZodEnum": {
      const values = Array.isArray(def.values) ? def.values : Object.values(def.entries ?? {})
      expression = `f.enum(${serializeValue(values, context, `${path}.enum`)})`
      break
    }
    case "ZodObject": {
      const fields = Object.entries(getShape(node)).map(([key, value]) => `\n  ${quote(key)}: ${emitField(value, context, `${path}.${key}`)},`).join("")
      expression = `f.object({${fields}\n})`
      break
    }
    case "ZodArray": {
      const element = def.type ?? def.element
      if (!element) warn(context, `${path}: tablica bez schematu elementu.`)
      expression = `f.array(${element ? emitNode(element, context, `${path}[]`) : "f.unknown()"})`
      break
    }
    case "ZodTuple": {
      const items = (def.items ?? []).map((item: SchemaNode, index: number) => emitNode(item, context, `${path}[${index}]`)).join(", ")
      expression = `f.tuple([${items}])`
      break
    }
    case "ZodUnion": {
      const options = (def.options ?? []).map((item: SchemaNode, index: number) => emitNode(item, context, `${path}|${index}`)).join(", ")
      expression = `f.union([${options}])`
      break
    }
    case "ZodIntersection":
      expression = `f.intersection(${emitNode(def.left, context, `${path}.left`)}, ${emitNode(def.right, context, `${path}.right`)})`
      break
    case "ZodRecord":
      expression = `f.record(${def.keyType ? `${emitNode(def.keyType, context, `${path}.key`)}, ` : ""}${emitNode(def.valueType, context, `${path}.value`)})`
      break
    case "ZodSet": expression = `f.set(${emitNode(def.valueType, context, `${path}.value`)})`; break
    case "ZodMap": expression = `f.map(${emitNode(def.keyType, context, `${path}.key`)}, ${emitNode(def.valueType, context, `${path}.value`)})`; break
    case "ZodBranded": expression = `${emitNode(inner ?? {}, context, path)}.brand()`; break
    case "ZodReadonly": expression = `${emitNode(inner ?? {}, context, path)}.readonly()`; break
    default:
      warn(context, `${path}: nieobsługiwany typ ${typeName || "unknown"}; użyto f.unknown().`)
      expression = "f.unknown()"
  }

  return `${expression}${emitChecks(node, context)}`
}

const emitField = (node: SchemaNode, context: CodegenContext, path: string): string => {
  const source = node?.toZod?.() ?? node
  // The demo can be run from source or from the built package. During local
  // development those can be separate module instances, each with its own
  // WeakMap, so accept metadata from either instance.
  const meta = getPackageMeta(source as object) ?? getSourceMeta(source as object)
  const parts = [emitNode(source, context, path)]
  if (meta?.fieldType) parts.push(`.field(${quote(meta.fieldType)})`)
  if (meta?.label) parts.push(`.label(${quote(meta.label)})`)
  if (meta?.placeholder) parts.push(`.placeholder(${quote(meta.placeholder)})`)
  if (meta?.hint) parts.push(`.hint(${quote(meta.hint)})`)
  if (meta?.fieldProps) parts.push(`.props(${serializeValue(meta.fieldProps, context, `${path}.props`)})`)
  if (meta?.isRequired !== undefined) parts.push(`.required(${String(meta.isRequired)})`)
  if (!meta?.fieldType) parts.push(" /* not in form */")
  return parts.join("")
}

export function generateSchemaSource(
  schema: SchemaNode,
  options: SchemaCodegenOptions = {},
): GeneratedSchemaSource {
  const context: CodegenContext = { warnings: [], warned: new Set() }
  const importPath = options.importPath ?? "../fields"
  const expression = emitNode(schema, context, "schema")
  const warningLines = context.warnings.length > 0
    ? [`// zod2form codegen warnings:`, ...context.warnings.map((message) => `// - ${message}`), ``]
    : []
  const code = [
    `import { f } from ${quote(importPath)}`,
    "",
    ...warningLines,
    `export const schema = ${expression}`,
  ].join("\n")
  return { code, warnings: context.warnings }
}

export const stringifySchema = (
  schema: SchemaNode,
  options: SchemaCodegenOptions = {},
): string => generateSchemaSource(schema, options).code
