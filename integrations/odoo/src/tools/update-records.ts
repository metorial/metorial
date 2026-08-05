import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const MAX_RECORD_IDS = 100;
const MAX_JSON_DEPTH = 20;

type JsonRecord = Record<string, unknown>;

let jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema)
  ])
);

let isPlainRecord = (value: unknown): value is JsonRecord => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  let prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

let isJsonCompatible = (value: unknown, depth = 0, ancestors = new Set<object>()): boolean => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return true;
  }
  if (depth >= MAX_JSON_DEPTH || typeof value !== 'object') return false;
  if (ancestors.has(value)) return false;

  ancestors.add(value);
  let compatible = Array.isArray(value)
    ? value.every(item => isJsonCompatible(item, depth + 1, ancestors))
    : isPlainRecord(value) &&
      Object.values(value).every(item => isJsonCompatible(item, depth + 1, ancestors));
  ancestors.delete(value);
  return compatible;
};

let invalidUpdateInput = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let normalizeModel = (value: unknown) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalidUpdateInput('Odoo model is required.', 'odoo_update_records_model_required');
  }
  return value.trim();
};

let normalizeRecordIds = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidUpdateInput(
      'Provide at least one Odoo record ID to update.',
      'odoo_update_records_ids_required'
    );
  }
  if (value.length > MAX_RECORD_IDS) {
    throw invalidUpdateInput(
      `Update at most ${MAX_RECORD_IDS} Odoo records per request. Split larger updates into batches.`,
      'odoo_update_records_batch_too_large'
    );
  }
  if (!value.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
    throw invalidUpdateInput(
      'Every Odoo record ID must be a positive integer.',
      'odoo_update_records_id_invalid'
    );
  }
  if (new Set(value).size !== value.length) {
    throw invalidUpdateInput(
      'Odoo record IDs must be unique within an update request.',
      'odoo_update_records_ids_duplicate'
    );
  }
  return value as number[];
};

let normalizeJsonRecord = (
  value: unknown,
  options: { label: string; reason: string; requireEntries: boolean }
) => {
  if (!isPlainRecord(value)) {
    throw invalidUpdateInput(`${options.label} must be a plain JSON object.`, options.reason);
  }

  let entries = Object.entries(value);
  if (options.requireEntries && entries.length === 0) {
    throw invalidUpdateInput(
      'Provide at least one Odoo field value to update.',
      'odoo_update_records_values_required'
    );
  }

  let normalizedKeys = new Set<string>();
  let normalizedEntries: [string, unknown][] = [];
  for (let [key, fieldValue] of entries) {
    let normalizedKey = key.trim();
    if (normalizedKey === '') {
      throw invalidUpdateInput(`${options.label} keys must not be empty.`, options.reason);
    }
    if (normalizedKeys.has(normalizedKey)) {
      throw invalidUpdateInput(
        `${options.label} keys must be unique after trimming.`,
        options.reason
      );
    }
    if (!isJsonCompatible(fieldValue)) {
      throw invalidUpdateInput(
        `${options.label} must contain only finite, JSON-compatible values with at most ${MAX_JSON_DEPTH} levels of nesting.`,
        options.reason
      );
    }
    normalizedKeys.add(normalizedKey);
    normalizedEntries.push([normalizedKey, fieldValue]);
  }

  return Object.fromEntries(normalizedEntries);
};

export let updateRecords = SlateTool.create(spec, {
  name: 'Update Records',
  key: 'update_records',
  description: `Update the same fields on up to ${MAX_RECORD_IDS} existing records in any Odoo model. Only the provided fields are changed, and the result identifies records Odoo confirmed as updated.`,
  instructions: [
    'Use `list_model_fields` first when the model fields, types, or write permissions are unknown.',
    'Many-to-one fields accept a positive record ID, or false to clear the relationship.',
    'One-to-many and many-to-many fields accept Odoo command triples: [0,0,values] creates, [1,id,values] updates, [2,id,0] deletes, [3,id,0] unlinks, [4,id,0] links, [5,0,0] clears, and [6,0,[ids]] replaces all links.',
    'Relational delete, unlink, clear, and replace commands can remove data or relationships. Verify the target IDs before using them.',
    'The provided values are applied to every record ID. Use separate calls when records need different values.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .trim()
        .min(1)
        .describe('Technical Odoo model name to update (e.g., "res.partner", "sale.order")'),
      recordIds: z
        .array(z.number().int().positive())
        .min(1)
        .max(MAX_RECORD_IDS)
        .refine(ids => new Set(ids).size === ids.length, 'Record IDs must be unique')
        .describe(`Unique positive record IDs to update (maximum ${MAX_RECORD_IDS})`),
      values: z
        .record(z.string().min(1), jsonValueSchema)
        .refine(values => Object.keys(values).length > 0, 'Provide at least one field value')
        .describe(
          'Non-empty JSON object of fields to update. Use an ID or false for many-to-one fields and Odoo command triples for one-to-many or many-to-many fields.'
        ),
      context: z
        .record(z.string().min(1), jsonValueSchema)
        .optional()
        .describe(
          'Optional Odoo context, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether Odoo confirmed the update'),
      updatedCount: z
        .number()
        .int()
        .nonnegative()
        .describe('Number of records Odoo confirmed as updated; zero when it returns false'),
      updatedRecordIds: z
        .array(z.number().int().positive())
        .describe('Record IDs Odoo confirmed as updated; empty when it returns false')
    })
  )
  .handleInvocation(async ctx => {
    let model = normalizeModel(ctx.input.model);
    let recordIds = normalizeRecordIds(ctx.input.recordIds);
    let values = normalizeJsonRecord(ctx.input.values, {
      label: 'Odoo update values',
      reason: 'odoo_update_records_values_invalid',
      requireEntries: true
    });
    let context =
      ctx.input.context === undefined
        ? undefined
        : normalizeJsonRecord(ctx.input.context, {
            label: 'Odoo context',
            reason: 'odoo_update_records_context_invalid',
            requireEntries: false
          });

    let success: boolean;
    try {
      let client = createClient(ctx);
      let result = await client.callRecordMethod({
        model,
        method: 'write',
        ids: recordIds,
        arguments: { vals: values, ...(context === undefined ? {} : { context }) },
        legacyArguments: [values],
        legacyKeywordArguments: context === undefined ? undefined : { context }
      });
      if (typeof result !== 'boolean') {
        throw createApiServiceError('Odoo returned an invalid result for the record update.', {
          reason: 'odoo_update_records_response_invalid'
        });
      }
      success = result;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `updating ${model} records`,
        reason: 'odoo_update_records_failed'
      });
    }

    let updatedRecordIds = success ? recordIds : [];
    return {
      output: {
        success,
        updatedCount: updatedRecordIds.length,
        updatedRecordIds
      },
      message: success
        ? `Updated **${updatedRecordIds.length}** record(s) in \`${model}\`.`
        : `Odoo did not confirm updates for **${recordIds.length}** requested record(s) in \`${model}\`.`
    };
  })
  .build();
