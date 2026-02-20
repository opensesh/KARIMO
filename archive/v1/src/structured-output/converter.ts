/**
 * KARIMO Schema Converter
 *
 * Converts Zod schemas to JSON Schema format for use with CLI tools
 * that require JSON Schema validation (like Claude Code's --json-schema flag).
 */

import type { ZodSchema, ZodTypeDef } from 'zod'

/**
 * JSON Schema type definition.
 */
export interface JsonSchema {
  $schema?: string
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  items?: JsonSchema | JsonSchema[]
  required?: string[]
  enum?: unknown[]
  const?: unknown
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  allOf?: JsonSchema[]
  not?: JsonSchema
  if?: JsonSchema
  then?: JsonSchema
  else?: JsonSchema
  additionalProperties?: boolean | JsonSchema
  minLength?: number
  maxLength?: number
  pattern?: string
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  minProperties?: number
  maxProperties?: number
  format?: string
  default?: unknown
  description?: string
  title?: string
  examples?: unknown[]
  $ref?: string
  $defs?: Record<string, JsonSchema>
}

/**
 * Options for JSON Schema conversion.
 */
export interface ConversionOptions {
  /** Include $schema property */
  includeSchema?: boolean
  /** Schema dialect to use */
  schemaDialect?: string
  /** Whether to include descriptions from Zod */
  includeDescriptions?: boolean
  /** Name for the root schema */
  name?: string
}

/**
 * Default conversion options.
 */
const DEFAULT_OPTIONS: Required<ConversionOptions> = {
  includeSchema: true,
  schemaDialect: 'https://json-schema.org/draft/2020-12/schema',
  includeDescriptions: true,
  name: '',
}

/**
 * Internal type for Zod definition access.
 * Zod's internal types are not exported, so we use a flexible record type.
 */
type ZodDef = Record<string, unknown>

/**
 * Get a property from a Zod definition safely.
 */
function getDefProp<T>(def: ZodDef, key: string): T | undefined {
  return def[key] as T | undefined
}

/**
 * Convert a Zod schema to JSON Schema format.
 *
 * This is a simplified converter that handles common Zod types.
 * For production use, consider using the 'zod-to-json-schema' package.
 *
 * @param zodSchema - The Zod schema to convert
 * @param options - Conversion options
 * @returns JSON Schema object
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { zodToJsonSchema } from '@/structured-output'
 *
 * const UserSchema = z.object({
 *   name: z.string(),
 *   age: z.number().int().positive(),
 * })
 *
 * const jsonSchema = zodToJsonSchema(UserSchema)
 * // Use with CLI: claude --json-schema '...'
 * ```
 */
export function zodToJsonSchema(
  zodSchema: ZodSchema<unknown, ZodTypeDef, unknown>,
  options?: ConversionOptions
): JsonSchema {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const schema = convertZodType(zodSchema)

  if (opts.includeSchema) {
    schema.$schema = opts.schemaDialect
  }

  return schema
}

/**
 * Convert a single Zod type to JSON Schema.
 */
function convertZodType(zodType: ZodSchema<unknown, ZodTypeDef, unknown>): JsonSchema {
  const typeDef = zodType._def as ZodDef

  // Get the type name from Zod's internal structure
  const typeName = getDefProp<string>(typeDef, 'typeName')

  switch (typeName) {
    case 'ZodString':
      return convertString(typeDef)

    case 'ZodNumber':
      return convertNumber(typeDef)

    case 'ZodBoolean':
      return { type: 'boolean' }

    case 'ZodNull':
      return { type: 'null' }

    case 'ZodUndefined':
      return { not: {} }

    case 'ZodArray':
      return convertArray(typeDef)

    case 'ZodObject':
      return convertObject(typeDef)

    case 'ZodUnion':
    case 'ZodDiscriminatedUnion':
      return convertUnion(typeDef)

    case 'ZodEnum':
      return convertEnum(typeDef)

    case 'ZodNativeEnum':
      return convertNativeEnum(typeDef)

    case 'ZodLiteral': {
      const value = getDefProp<unknown>(typeDef, 'value')
      return { const: value }
    }

    case 'ZodOptional':
    case 'ZodNullable':
      return convertOptional(typeDef)

    case 'ZodDefault':
      return convertDefault(typeDef)

    case 'ZodRecord':
      return convertRecord(typeDef)

    case 'ZodTuple':
      return convertTuple(typeDef)

    case 'ZodAny':
    case 'ZodUnknown':
      return {}

    case 'ZodEffects': {
      // For effects (transforms, refinements), use the inner type
      const innerSchema = getDefProp<ZodSchema>(typeDef, 'schema')
      if (innerSchema) {
        return convertZodType(innerSchema)
      }
      return {}
    }

    default:
      // Fallback for unknown types
      return {}
  }
}

/**
 * Convert ZodString to JSON Schema.
 */
function convertString(typeDef: ZodDef): JsonSchema {
  const schema: JsonSchema = { type: 'string' }

  const checks = getDefProp<Array<{ kind: string; value?: unknown }>>(typeDef, 'checks') ?? []

  for (const check of checks) {
    switch (check.kind) {
      case 'min':
        schema.minLength = check.value as number
        break
      case 'max':
        schema.maxLength = check.value as number
        break
      case 'length':
        schema.minLength = check.value as number
        schema.maxLength = check.value as number
        break
      case 'email':
        schema.format = 'email'
        break
      case 'url':
        schema.format = 'uri'
        break
      case 'uuid':
        schema.format = 'uuid'
        break
      case 'datetime':
        schema.format = 'date-time'
        break
      case 'regex':
        schema.pattern = (check.value as RegExp).source
        break
    }
  }

  return schema
}

/**
 * Convert ZodNumber to JSON Schema.
 */
function convertNumber(typeDef: ZodDef): JsonSchema {
  const schema: JsonSchema = { type: 'number' }

  const checks = getDefProp<Array<{ kind: string; value?: unknown }>>(typeDef, 'checks') ?? []

  for (const check of checks) {
    switch (check.kind) {
      case 'int':
        schema.type = 'integer'
        break
      case 'min':
        schema.minimum = check.value as number
        break
      case 'max':
        schema.maximum = check.value as number
        break
      case 'multipleOf':
        schema.multipleOf = check.value as number
        break
    }
  }

  return schema
}

/**
 * Convert ZodArray to JSON Schema.
 */
function convertArray(typeDef: ZodDef): JsonSchema {
  const innerType = getDefProp<ZodSchema>(typeDef, 'type')
  const schema: JsonSchema = {
    type: 'array',
  }

  if (innerType) {
    schema.items = convertZodType(innerType)
  }

  const minLength = getDefProp<number | null>(typeDef, 'minLength')
  if (minLength !== null && minLength !== undefined) {
    schema.minItems = minLength
  }

  const maxLength = getDefProp<number | null>(typeDef, 'maxLength')
  if (maxLength !== null && maxLength !== undefined) {
    schema.maxItems = maxLength
  }

  return schema
}

/**
 * Convert ZodObject to JSON Schema.
 */
function convertObject(typeDef: ZodDef): JsonSchema {
  const shape = getDefProp<(() => Record<string, ZodSchema>) | Record<string, ZodSchema>>(
    typeDef,
    'shape'
  )
  const shapeObj = typeof shape === 'function' ? shape() : (shape ?? {})

  const properties: Record<string, JsonSchema> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries(shapeObj)) {
    properties[key] = convertZodType(value)

    // Check if the field is required (not optional)
    const valueDef = value._def as ZodDef
    const valueTypeName = getDefProp<string>(valueDef, 'typeName')
    if (valueTypeName !== 'ZodOptional' && valueTypeName !== 'ZodDefault') {
      required.push(key)
    }
  }

  const schema: JsonSchema = {
    type: 'object',
    properties,
  }

  if (required.length > 0) {
    schema.required = required
  }

  // Handle additionalProperties
  const unknownKeys = getDefProp<string>(typeDef, 'unknownKeys')
  if (unknownKeys === 'strict') {
    schema.additionalProperties = false
  }

  return schema
}

/**
 * Convert ZodUnion to JSON Schema.
 */
function convertUnion(typeDef: ZodDef): JsonSchema {
  const options = getDefProp<ZodSchema[]>(typeDef, 'options') ?? []
  return {
    anyOf: options.map(convertZodType),
  }
}

/**
 * Convert ZodEnum to JSON Schema.
 */
function convertEnum(typeDef: ZodDef): JsonSchema {
  const values = getDefProp<string[]>(typeDef, 'values') ?? []
  return {
    type: 'string',
    enum: values,
  }
}

/**
 * Convert ZodNativeEnum to JSON Schema.
 */
function convertNativeEnum(typeDef: ZodDef): JsonSchema {
  const enumValues = getDefProp<Record<string, unknown>>(typeDef, 'values') ?? {}
  const values = Object.values(enumValues)
  return {
    enum: values,
  }
}

/**
 * Convert ZodOptional/ZodNullable to JSON Schema.
 */
function convertOptional(typeDef: ZodDef): JsonSchema {
  const innerType = getDefProp<ZodSchema>(typeDef, 'innerType')
  if (!innerType) {
    return {}
  }

  const innerSchema = convertZodType(innerType)
  const currentTypeName = getDefProp<string>(typeDef, 'typeName')

  // For nullable, add null to the type
  if (currentTypeName === 'ZodNullable') {
    if (innerSchema.type && typeof innerSchema.type === 'string') {
      innerSchema.type = [innerSchema.type, 'null']
    } else {
      return {
        anyOf: [innerSchema, { type: 'null' }],
      }
    }
  }

  return innerSchema
}

/**
 * Convert ZodDefault to JSON Schema.
 */
function convertDefault(typeDef: ZodDef): JsonSchema {
  const innerType = getDefProp<ZodSchema>(typeDef, 'innerType')
  if (!innerType) {
    return {}
  }

  const innerSchema = convertZodType(innerType)
  const defaultValue = getDefProp<unknown>(typeDef, 'defaultValue')
  if (defaultValue !== undefined) {
    innerSchema.default = defaultValue
  }
  return innerSchema
}

/**
 * Convert ZodRecord to JSON Schema.
 */
function convertRecord(typeDef: ZodDef): JsonSchema {
  const valueType = getDefProp<ZodSchema>(typeDef, 'valueType')
  const schema: JsonSchema = {
    type: 'object',
  }

  if (valueType) {
    schema.additionalProperties = convertZodType(valueType)
  }

  return schema
}

/**
 * Convert ZodTuple to JSON Schema.
 */
function convertTuple(typeDef: ZodDef): JsonSchema {
  const tupleItems = getDefProp<ZodSchema[]>(typeDef, 'items') ?? []
  const convertedItems = tupleItems.map(convertZodType)

  return {
    type: 'array',
    items: convertedItems,
    minItems: convertedItems.length,
    maxItems: convertedItems.length,
  }
}

/**
 * Stringify JSON Schema for CLI usage.
 *
 * @param schema - JSON Schema object
 * @returns JSON string suitable for CLI flags
 */
export function stringifyJsonSchema(schema: JsonSchema): string {
  return JSON.stringify(schema)
}

/**
 * Create a CLI-ready JSON schema string from a Zod schema.
 *
 * @param zodSchema - The Zod schema
 * @param name - Optional name for the schema
 * @returns JSON string ready for --json-schema flag
 */
export function createCliJsonSchema(
  zodSchema: ZodSchema<unknown, ZodTypeDef, unknown>,
  name?: string
): string {
  const opts: ConversionOptions = { includeSchema: false }
  if (name !== undefined) {
    opts.name = name
  }
  const jsonSchema = zodToJsonSchema(zodSchema, opts)
  return stringifyJsonSchema(jsonSchema)
}
