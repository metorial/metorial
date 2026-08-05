import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const MODEL_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const FIELD_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ATTRIBUTE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_MODEL_LENGTH = 128;
const MAX_ATTRIBUTE_NAME_LENGTH = 64;
const MAX_REQUESTED_ATTRIBUTES = 32;
const MAX_METADATA_DEPTH = 16;
const CORE_ATTRIBUTES = [
  'string',
  'type',
  'required',
  'readonly',
  'help',
  'relation',
  'selection'
] as const;
const CORE_ATTRIBUTE_SET = new Set<string>(CORE_ATTRIBUTES);

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

let selectionOptionSchema = z.tuple([
  z.union([z.string(), z.number()]).describe('Stored selection value'),
  z.string().describe('Human-readable selection label')
]);

let fieldInfoSchema = z.object({
  fieldName: z.string().describe('Technical field name used in Odoo record operations'),
  type: z
    .string()
    .describe(
      'Odoo field type, such as char, integer, float, boolean, date, datetime, many2one, one2many, many2many, selection, text, html, or binary'
    ),
  label: z.string().optional().describe('Human-readable field label'),
  required: z.boolean().optional().describe('Whether Odoo marks the field as required'),
  readonly: z.boolean().optional().describe('Whether Odoo marks the field as read-only'),
  help: z.string().optional().describe('Provider-supplied help text for the field'),
  relation: z
    .string()
    .optional()
    .describe('Technical related-model name for a relational field'),
  selectionOptions: z
    .array(selectionOptionSchema)
    .optional()
    .describe('Available [stored value, human-readable label] pairs for a selection field'),
  additionalAttributes: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Additional provider field metadata explicitly requested by attribute name')
});

let invalidListModelFieldsData = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  let prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

function normalizeJsonValue(
  value: unknown,
  path: string,
  onInvalid: (message: string) => never,
  depth = 0
): JsonValue {
  if (depth > MAX_METADATA_DEPTH) {
    return onInvalid(`${path} is nested too deeply.`);
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return onInvalid(`${path} must contain a finite number.`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      normalizeJsonValue(item, `${path}[${index}]`, onInvalid, depth + 1)
    );
  }
  if (!isPlainRecord(value)) {
    return onInvalid(`${path} must contain only JSON-compatible values.`);
  }

  return normalizeJsonRecord(value, path, onInvalid, depth);
}

function normalizeJsonRecord(
  value: Record<string, unknown>,
  path: string,
  onInvalid: (message: string) => never,
  depth = 0
): Record<string, JsonValue> {
  let normalized: { [key: string]: JsonValue } = {};
  for (let key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') return onInvalid(`${path} must not contain symbol keys.`);
    let descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      return onInvalid(`${path}.${key} must be an enumerable JSON value.`);
    }
    Object.defineProperty(normalized, key, {
      configurable: true,
      enumerable: true,
      value: normalizeJsonValue(descriptor.value, `${path}.${key}`, onInvalid, depth + 1),
      writable: true
    });
  }
  return normalized;
}

let normalizeModel = (value: unknown) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalidListModelFieldsData(
      'Odoo model is required.',
      'odoo_list_model_fields_model_required'
    );
  }
  let model = value.trim();
  if (model.length > MAX_MODEL_LENGTH || !MODEL_NAME_PATTERN.test(model)) {
    throw invalidListModelFieldsData(
      'Odoo model must be a technical model name such as "res.partner".',
      'odoo_list_model_fields_model_invalid'
    );
  }
  return model;
};

let normalizeRequestedAttributes = (value: unknown): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_REQUESTED_ATTRIBUTES) {
    throw invalidListModelFieldsData(
      `Additional attributes must be an array containing no more than ${MAX_REQUESTED_ATTRIBUTES} names.`,
      'odoo_list_model_fields_attributes_invalid'
    );
  }

  let attributes = new Set<string>();
  for (let [index, item] of value.entries()) {
    if (typeof item !== 'string') {
      throw invalidListModelFieldsData(
        `Additional attribute ${index + 1} must be text.`,
        'odoo_list_model_fields_attribute_invalid'
      );
    }
    let attribute = item.trim();
    if (
      attribute.length === 0 ||
      attribute.length > MAX_ATTRIBUTE_NAME_LENGTH ||
      !ATTRIBUTE_NAME_PATTERN.test(attribute)
    ) {
      throw invalidListModelFieldsData(
        `Additional attribute ${index + 1} must be a technical attribute name.`,
        'odoo_list_model_fields_attribute_invalid'
      );
    }
    if (!CORE_ATTRIBUTE_SET.has(attribute)) attributes.add(attribute);
  }
  return [...attributes].sort();
};

let normalizeContext = (value: unknown): Record<string, JsonValue> | undefined => {
  if (value === undefined) return undefined;
  if (!isPlainRecord(value)) {
    throw invalidListModelFieldsData(
      'Odoo context must be a plain JSON object.',
      'odoo_list_model_fields_context_invalid'
    );
  }

  return normalizeJsonRecord(value, 'context', message => {
    throw invalidListModelFieldsData(message, 'odoo_list_model_fields_context_invalid');
  });
};

let normalizeOptionalText = (
  value: unknown,
  fieldName: string,
  attribute: 'string' | 'help'
): string | undefined => {
  if (value === undefined || value === null || value === false) return undefined;
  if (typeof value !== 'string') {
    throw invalidListModelFieldsData(
      `Odoo returned an invalid ${attribute} attribute for field "${fieldName}".`,
      'odoo_list_model_fields_response_invalid'
    );
  }
  return value;
};

let normalizeOptionalBoolean = (
  value: unknown,
  fieldName: string,
  attribute: 'required' | 'readonly'
): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') {
    throw invalidListModelFieldsData(
      `Odoo returned an invalid ${attribute} attribute for field "${fieldName}".`,
      'odoo_list_model_fields_response_invalid'
    );
  }
  return value;
};

let normalizeRelation = (value: unknown, fieldName: string): string | undefined => {
  if (value === undefined || value === null || value === false) return undefined;
  if (typeof value !== 'string') {
    throw invalidListModelFieldsData(
      `Odoo returned an invalid relation attribute for field "${fieldName}".`,
      'odoo_list_model_fields_response_invalid'
    );
  }
  let relation = value.trim();
  if (!MODEL_NAME_PATTERN.test(relation)) {
    throw invalidListModelFieldsData(
      `Odoo returned an invalid related-model name for field "${fieldName}".`,
      'odoo_list_model_fields_response_invalid'
    );
  }
  return relation;
};

let normalizeSelection = (
  value: unknown,
  fieldName: string
): [string | number, string][] | undefined => {
  if (value === undefined || value === null || value === false) return undefined;
  if (!Array.isArray(value)) {
    throw invalidListModelFieldsData(
      `Odoo returned invalid selection options for field "${fieldName}".`,
      'odoo_list_model_fields_response_invalid'
    );
  }

  return value.map((option, index) => {
    if (!Array.isArray(option) || option.length !== 2) {
      throw invalidListModelFieldsData(
        `Odoo returned an invalid selection option at position ${index + 1} for field "${fieldName}".`,
        'odoo_list_model_fields_response_invalid'
      );
    }
    let [storedValue, label] = option;
    if (
      (typeof storedValue !== 'string' && typeof storedValue !== 'number') ||
      (typeof storedValue === 'number' && !Number.isFinite(storedValue)) ||
      typeof label !== 'string'
    ) {
      throw invalidListModelFieldsData(
        `Odoo returned an invalid selection value or label at position ${index + 1} for field "${fieldName}".`,
        'odoo_list_model_fields_response_invalid'
      );
    }
    return [storedValue, label];
  });
};

let parseField = (
  fieldName: string,
  value: unknown,
  additionalAttributeNames: string[]
): z.infer<typeof fieldInfoSchema> => {
  if (!FIELD_NAME_PATTERN.test(fieldName) || !isPlainRecord(value)) {
    throw invalidListModelFieldsData(
      `Odoo returned invalid metadata for field "${fieldName}".`,
      'odoo_list_model_fields_response_invalid'
    );
  }

  if (typeof value.type !== 'string' || value.type.trim() === '') {
    throw invalidListModelFieldsData(
      `Odoo returned an invalid type attribute for field "${fieldName}".`,
      'odoo_list_model_fields_response_invalid'
    );
  }

  let field: z.infer<typeof fieldInfoSchema> = {
    fieldName,
    type: value.type.trim()
  };
  let label = normalizeOptionalText(value.string, fieldName, 'string');
  let required = normalizeOptionalBoolean(value.required, fieldName, 'required');
  let readonly = normalizeOptionalBoolean(value.readonly, fieldName, 'readonly');
  let help = normalizeOptionalText(value.help, fieldName, 'help');
  let relation = normalizeRelation(value.relation, fieldName);
  let selectionOptions = normalizeSelection(value.selection, fieldName);
  if (label !== undefined) field.label = label;
  if (required !== undefined) field.required = required;
  if (readonly !== undefined) field.readonly = readonly;
  if (help !== undefined) field.help = help;
  if (relation !== undefined) field.relation = relation;
  if (selectionOptions !== undefined) field.selectionOptions = selectionOptions;

  let additionalAttributes: Record<string, JsonValue> = {};
  for (let attribute of additionalAttributeNames) {
    if (!Object.hasOwn(value, attribute)) continue;
    Object.defineProperty(additionalAttributes, attribute, {
      configurable: true,
      enumerable: true,
      value: normalizeJsonValue(value[attribute], `${fieldName}.${attribute}`, message => {
        throw invalidListModelFieldsData(
          `Odoo returned invalid metadata: ${message}`,
          'odoo_list_model_fields_response_invalid'
        );
      }),
      writable: true
    });
  }
  if (Object.keys(additionalAttributes).length > 0) {
    field.additionalAttributes = additionalAttributes;
  }
  return field;
};

let parseFields = (value: unknown, additionalAttributeNames: string[]) => {
  if (!isPlainRecord(value)) {
    throw invalidListModelFieldsData(
      'Odoo returned an invalid field metadata mapping.',
      'odoo_list_model_fields_response_invalid'
    );
  }

  return Object.entries(value)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([fieldName, metadata]) => parseField(fieldName, metadata, additionalAttributeNames));
};

export let listModelFields = SlateTool.create(spec, {
  name: 'List Model Fields',
  key: 'list_model_fields',
  description:
    'Retrieve field definitions for any Odoo model. Returns technical field names, types, labels, access metadata, related-model names, and selection values for planning record reads and writes.',
  instructions: [
    'The standard string, type, required, readonly, help, relation, and selection attributes are always requested.',
    'Use attributes only for additional Odoo field-description properties; requested values are returned under additionalAttributes.',
    'Results are ordered by technical field name. Field visibility reflects the connected user and supplied context.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .trim()
        .min(1)
        .max(MAX_MODEL_LENGTH)
        .regex(MODEL_NAME_PATTERN)
        .describe('Technical Odoo model name, such as "res.partner" or "sale.order"'),
      attributes: z
        .array(
          z.string().trim().min(1).max(MAX_ATTRIBUTE_NAME_LENGTH).regex(ATTRIBUTE_NAME_PATTERN)
        )
        .max(MAX_REQUESTED_ATTRIBUTES)
        .optional()
        .describe(
          'Optional additional Odoo field-description attribute names. Standard metadata is always included.'
        ),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optional Odoo context values, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      model: z.string().describe('Technical Odoo model name that was inspected'),
      attributes: z
        .array(z.string())
        .describe('Field-description attributes requested from Odoo'),
      fields: z.array(fieldInfoSchema).describe('Field definitions ordered by technical name')
    })
  )
  .handleInvocation(async ctx => {
    let model = normalizeModel(ctx.input.model);
    let additionalAttributeNames = normalizeRequestedAttributes(ctx.input.attributes);
    let attributes = [...CORE_ATTRIBUTES, ...additionalAttributeNames];
    let context = normalizeContext(ctx.input.context);
    let keywordArguments: Record<string, unknown> = { attributes };
    if (context !== undefined) keywordArguments.context = context;

    try {
      let client = createClient(ctx);
      let rawFields = await client.callModelMethod({
        model,
        method: 'fields_get',
        arguments: keywordArguments,
        legacyArguments: [],
        legacyKeywordArguments: keywordArguments
      });
      let fields = parseFields(rawFields, additionalAttributeNames);

      return {
        output: { model, attributes, fields },
        message: `Found **${fields.length}** field definition(s) on Odoo model \`${model}\`.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `listing fields for ${model}`,
        reason: 'odoo_list_model_fields_failed'
      });
    }
  })
  .build();
