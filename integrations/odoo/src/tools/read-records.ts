import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const MAX_RECORD_IDS = 100;

type OdooReadRecord = Record<string, unknown> & { id: number };

let normalizeModel = (model: string) => {
  let normalized = model.trim();
  if (normalized === '') {
    throw createApiServiceError('Odoo model is required.', {
      reason: 'odoo_read_records_model_required'
    });
  }

  return normalized;
};

let normalizeRecordIds = (recordIds: number[]) => {
  if (recordIds.length === 0) {
    throw createApiServiceError('Provide at least one Odoo record ID to read.', {
      reason: 'odoo_read_records_ids_required'
    });
  }

  if (recordIds.length > MAX_RECORD_IDS) {
    throw createApiServiceError(
      `Read at most ${MAX_RECORD_IDS} Odoo records per request. Split larger reads into batches.`,
      { reason: 'odoo_read_records_batch_too_large' }
    );
  }

  if (!recordIds.every(id => Number.isInteger(id) && id > 0)) {
    throw createApiServiceError('Every Odoo record ID must be a positive integer.', {
      reason: 'odoo_read_records_id_invalid'
    });
  }

  if (new Set(recordIds).size !== recordIds.length) {
    throw createApiServiceError('Odoo record IDs must be unique within a read request.', {
      reason: 'odoo_read_records_ids_duplicate'
    });
  }

  return recordIds;
};

let normalizeFields = (fields: string[] | undefined) => {
  if (fields === undefined) {
    return undefined;
  }

  let normalized = fields.map(field => field.trim());
  if (normalized.some(field => field === '')) {
    throw createApiServiceError('Odoo field names must not be empty.', {
      reason: 'odoo_read_records_field_invalid'
    });
  }

  return [...new Set(normalized)];
};

let requireRecordIds = (
  records: Record<string, unknown>[],
  requestedIds: number[]
): OdooReadRecord[] => {
  let requested = new Set(requestedIds);
  let returned = new Set<number>();

  for (let record of records) {
    let id = record.id;
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0 || !requested.has(id)) {
      throw createApiServiceError(
        'Odoo returned record data without a valid requested record ID.',
        { reason: 'odoo_read_records_response_invalid' }
      );
    }
    if (returned.has(id)) {
      throw createApiServiceError('Odoo returned duplicate record IDs.', {
        reason: 'odoo_read_records_response_invalid'
      });
    }
    returned.add(id);
  }

  return records as OdooReadRecord[];
};

export let readRecords = SlateTool.create(spec, {
  name: 'Read Records',
  key: 'read_records',
  description: `Read up to ${MAX_RECORD_IDS} records by ID from any Odoo model. Returns the full record data or a selected set of fields. Use this when you already know the record IDs and need their current details.`,
  instructions: [
    'Request only the fields needed for the next step. Omitting fields can return large records.',
    'Do not read binary, image, or other base64-backed fields inline. Use `download_attachment` to retrieve file content as a downloadable file.'
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
        .describe('The Odoo model to read from (e.g., "res.partner", "sale.order")'),
      recordIds: z
        .array(z.number().int().positive())
        .min(1)
        .max(MAX_RECORD_IDS)
        .refine(ids => new Set(ids).size === ids.length, 'Record IDs must be unique')
        .describe(`Unique positive record IDs to read (maximum ${MAX_RECORD_IDS})`),
      fields: z
        .array(z.string().trim().min(1))
        .optional()
        .describe(
          'Specific non-empty field names to return. Duplicate names are ignored. Omit to return all readable fields; use download_attachment instead of requesting binary fields.'
        ),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optional Odoo context, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      records: z
        .array(
          z
            .object({
              id: z.number().int().positive().describe('Odoo record ID')
            })
            .catchall(z.unknown())
        )
        .describe('Array of record data for the requested IDs')
    })
  )
  .handleInvocation(async ctx => {
    let model = normalizeModel(ctx.input.model);
    let recordIds = normalizeRecordIds(ctx.input.recordIds);
    let fields = normalizeFields(ctx.input.fields);
    let arguments_: Record<string, unknown> = { load: null };
    if (fields !== undefined) arguments_.fields = fields;
    if (ctx.input.context !== undefined) arguments_.context = ctx.input.context;

    let records: OdooReadRecord[];
    try {
      let client = createClient(ctx);
      let result = await client.callRecordMethod({
        model,
        method: 'read',
        ids: recordIds,
        arguments: arguments_,
        legacyKeywordArguments: arguments_
      });
      if (
        !Array.isArray(result) ||
        !result.every(
          value => typeof value === 'object' && value !== null && !Array.isArray(value)
        )
      ) {
        throw createApiServiceError('Odoo returned invalid record data.', {
          reason: 'odoo_read_records_response_invalid'
        });
      }
      records = requireRecordIds(result as Record<string, unknown>[], recordIds);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `reading ${model} records`,
        reason: 'odoo_read_records_failed'
      });
    }

    return {
      output: { records },
      message: `Read **${records.length}** record(s) from \`${model}\`.`
    };
  })
  .build();
