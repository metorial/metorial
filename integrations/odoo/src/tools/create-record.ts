import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let invalidCreateInput = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  let prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

let normalizeJsonValue = (value: unknown, path: string, ancestors: Set<object>): unknown => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw invalidCreateInput(
        `${path} must contain a finite JSON number.`,
        'odoo_create_record_value_invalid'
      );
    }
    return value;
  }

  if (value instanceof Date) {
    throw invalidCreateInput(
      `${path} must use an Odoo date string (YYYY-MM-DD) or UTC datetime string (YYYY-MM-DD HH:MM:SS), not a Date object.`,
      'odoo_create_record_value_invalid'
    );
  }

  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    throw invalidCreateInput(
      `${path} must use a base64-encoded string for an Odoo Binary field, not a buffer or typed array.`,
      'odoo_create_record_value_invalid'
    );
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      throw invalidCreateInput(
        `${path} must not contain a circular reference.`,
        'odoo_create_record_value_invalid'
      );
    }
    if (Object.keys(value).length !== value.length) {
      throw invalidCreateInput(
        `${path} must not contain sparse or custom-keyed arrays.`,
        'odoo_create_record_value_invalid'
      );
    }

    ancestors.add(value);
    let normalized = value.map((item, index) =>
      normalizeJsonValue(item, `${path}[${index}]`, ancestors)
    );
    ancestors.delete(value);
    return normalized;
  }

  if (!isPlainObject(value)) {
    throw invalidCreateInput(
      `${path} must contain only JSON-compatible values. Dates and datetimes must be formatted strings, and Binary fields must be base64-encoded strings.`,
      'odoo_create_record_value_invalid'
    );
  }

  if (ancestors.has(value)) {
    throw invalidCreateInput(
      `${path} must not contain a circular reference.`,
      'odoo_create_record_value_invalid'
    );
  }

  ancestors.add(value);
  let normalized = Object.create(null) as Record<string, unknown>;
  for (let key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      throw invalidCreateInput(
        `${path} must not contain symbol keys.`,
        'odoo_create_record_value_invalid'
      );
    }
    let descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw invalidCreateInput(
        `${path}.${key} must be an enumerable JSON value, not an accessor or hidden property.`,
        'odoo_create_record_value_invalid'
      );
    }

    Object.defineProperty(normalized, key, {
      configurable: true,
      enumerable: true,
      value: normalizeJsonValue(descriptor.value, `${path}.${key}`, ancestors),
      writable: true
    });
  }
  ancestors.delete(value);
  return normalized;
};

let normalizeJsonObject = (
  value: unknown,
  label: string,
  { allowEmpty }: { allowEmpty: boolean }
) => {
  if (!isPlainObject(value)) {
    throw invalidCreateInput(
      `${label} must be a plain JSON object.`,
      'odoo_create_record_object_invalid'
    );
  }
  if (!allowEmpty && Reflect.ownKeys(value).length === 0) {
    throw invalidCreateInput(
      'Provide at least one field value for the new Odoo record.',
      'odoo_create_record_values_required'
    );
  }

  return normalizeJsonValue(value, label, new Set()) as Record<string, unknown>;
};

let normalizeModel = (model: unknown) => {
  if (typeof model !== 'string' || model.trim() === '') {
    throw invalidCreateInput('Odoo model is required.', 'odoo_create_record_model_required');
  }
  return model.trim();
};

let jsonObjectSchema = (label: string, allowEmpty: boolean) =>
  z
    .unknown()
    .meta({ type: 'object', additionalProperties: {} })
    .superRefine((value, ctx) => {
      try {
        normalizeJsonObject(value, label, { allowEmpty });
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: `${label} must be a${allowEmpty ? '' : ' non-empty'} plain JSON object containing only JSON-compatible values.`
        });
      }
    });

let requireRecordId = (value: unknown) => {
  let recordId =
    typeof value === 'number'
      ? value
      : Array.isArray(value) && value.length === 1
        ? value[0]
        : undefined;

  if (typeof recordId !== 'number' || !Number.isInteger(recordId) || recordId <= 0) {
    throw createApiServiceError(
      'Odoo returned an invalid record ID after creating the record.',
      { reason: 'odoo_create_record_response_invalid' }
    );
  }

  return recordId;
};

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description:
    'Create one record in any Odoo model and return its positive record ID. Use List Model Fields first to confirm writable field names and types.',
  instructions: [
    'Many2one fields use a positive record ID, or false to clear an optional relationship.',
    'One2many and Many2many fields use Odoo three-item command tuples: [0, 0, values] to create, [1, id, values] to update, [2, id, 0] to delete, [3, id, 0] to unlink, [4, id, 0] to link, [5, 0, 0] to clear, or [6, 0, [ids]] to replace.',
    'Date fields use YYYY-MM-DD strings. Datetime fields use UTC YYYY-MM-DD HH:MM:SS strings.',
    'Binary fields accept base64-encoded strings. This tool returns only the created record ID and never returns binary content.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .trim()
        .min(1)
        .describe('Technical Odoo model name to create the record in, such as "res.partner"'),
      values: jsonObjectSchema('values', false).describe(
        'Non-empty field mapping for one record. Use positive IDs for Many2one fields; Odoo command tuples for One2many and Many2many fields; YYYY-MM-DD for Date; UTC YYYY-MM-DD HH:MM:SS for Datetime; and base64 strings for Binary fields.'
      ),
      context: jsonObjectSchema('context', true)
        .optional()
        .describe(
          'Optional Odoo context, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      recordId: z.number().int().positive().describe('Positive ID of the newly created record')
    })
  )
  .handleInvocation(async ctx => {
    let model = normalizeModel(ctx.input.model);
    let values = normalizeJsonObject(ctx.input.values, 'values', { allowEmpty: false });
    let context =
      ctx.input.context === undefined
        ? undefined
        : normalizeJsonObject(ctx.input.context, 'context', { allowEmpty: true });

    let result: unknown;
    try {
      let client = createClient(ctx);
      result = await client.callModelMethod({
        model,
        method: 'create',
        arguments: {
          vals_list: values,
          ...(context === undefined ? {} : { context })
        },
        legacyArguments: [values],
        legacyKeywordArguments: context === undefined ? undefined : { context }
      });
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `creating a ${model} record`,
        reason: 'odoo_create_record_failed'
      });
    }

    let recordId = requireRecordId(result);
    return {
      output: { recordId },
      message: `Created Odoo record **#${recordId}** in \`${model}\`.`
    };
  })
  .build();
