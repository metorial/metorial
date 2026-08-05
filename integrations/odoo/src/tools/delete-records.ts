import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const MAX_RECORD_IDS = 100;

let normalizeModel = (model: string) => {
  let normalized = model.trim();
  if (normalized === '') {
    throw createApiServiceError('Odoo model is required.', {
      reason: 'odoo_delete_records_model_required'
    });
  }

  return normalized;
};

let normalizeRecordIds = (recordIds: number[]) => {
  if (recordIds.length === 0) {
    throw createApiServiceError('Provide at least one Odoo record ID to delete.', {
      reason: 'odoo_delete_records_ids_required'
    });
  }

  if (recordIds.length > MAX_RECORD_IDS) {
    throw createApiServiceError(
      `Delete at most ${MAX_RECORD_IDS} Odoo records per request. Split larger deletions into batches.`,
      { reason: 'odoo_delete_records_batch_too_large' }
    );
  }

  if (!recordIds.every(id => Number.isInteger(id) && id > 0)) {
    throw createApiServiceError('Every Odoo record ID must be a positive integer.', {
      reason: 'odoo_delete_records_id_invalid'
    });
  }

  if (new Set(recordIds).size !== recordIds.length) {
    throw createApiServiceError('Odoo record IDs must be unique within a delete request.', {
      reason: 'odoo_delete_records_ids_duplicate'
    });
  }

  return recordIds;
};

export let deleteRecords = SlateTool.create(spec, {
  name: 'Delete Records',
  key: 'delete_records',
  description: `Permanently delete up to ${MAX_RECORD_IDS} records by ID from any Odoo model. This operation cannot be undone.`,
  instructions: [
    'Confirm the exact model and record IDs before calling this tool. Deleted records cannot be recovered by this tool.',
    'Use context when deletion depends on language, company access, or another Odoo environment setting.'
  ],
  constraints: [
    'Odoo access controls apply. The request fails when the connected user lacks permission to delete the records.',
    'Odoo database constraints or dependent records can prevent deletion.',
    'Deletion is permanent and cannot be undone.'
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
        .describe('The Odoo model to delete from (e.g., "res.partner", "crm.lead")'),
      recordIds: z
        .array(z.number().int().positive())
        .min(1)
        .max(MAX_RECORD_IDS)
        .refine(ids => new Set(ids).size === ids.length, 'Record IDs must be unique')
        .describe(
          `Unique positive record IDs to permanently delete (maximum ${MAX_RECORD_IDS})`
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
      success: z.boolean().describe('Whether the deletion was successful'),
      deletedCount: z.number().int().nonnegative().describe('Number of records deleted'),
      deletedRecordIds: z
        .array(z.number().int().positive())
        .describe('Record IDs confirmed deleted by the successful Odoo response'),
      requestedRecordIds: z
        .array(z.number().int().positive())
        .describe('Record IDs that Odoo was asked to delete')
    })
  )
  .handleInvocation(async ctx => {
    let model = normalizeModel(ctx.input.model);
    let recordIds = normalizeRecordIds(ctx.input.recordIds);
    let methodArguments =
      ctx.input.context === undefined ? undefined : { context: ctx.input.context };

    let result: unknown;
    try {
      let client = createClient(ctx);
      result = await client.callRecordMethod({
        model,
        method: 'unlink',
        ids: recordIds,
        arguments: methodArguments,
        legacyKeywordArguments: methodArguments
      });
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `deleting ${model} records`,
        reason: 'odoo_delete_records_failed'
      });
    }

    if (typeof result !== 'boolean') {
      throw createApiServiceError('Odoo returned an invalid deletion result.', {
        reason: 'odoo_delete_records_response_invalid'
      });
    }

    let deletedRecordIds = result ? recordIds : [];

    return {
      output: {
        success: result,
        deletedCount: deletedRecordIds.length,
        deletedRecordIds,
        requestedRecordIds: recordIds
      },
      message: result
        ? `Permanently deleted **${deletedRecordIds.length}** record(s) from \`${model}\`.`
        : `Odoo did not delete the **${recordIds.length}** requested record(s) from \`${model}\`.`
    };
  })
  .build();
