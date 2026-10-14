import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let recordSchema = z.object({
  id: z.number().int().positive(),
  display_name: z.union([z.string(), z.literal(false), z.null()]),
  active: z.boolean()
});

let verifyRecords = (value: unknown, recordIds: number[]) => {
  let parsed = z.array(recordSchema).safeParse(value);
  if (
    !parsed.success ||
    parsed.data.length !== recordIds.length ||
    new Set(parsed.data.map(record => record.id)).size !== recordIds.length ||
    parsed.data.some(record => !recordIds.includes(record.id))
  ) {
    throw createApiServiceError(
      'Odoo did not return every requested record with a valid archive state. Verify the IDs and access rights before retrying.',
      {
        reason: 'odoo_archive_records_response_invalid'
      }
    );
  }
  return parsed.data;
};

export let archiveRecords = SlateTool.create(spec, {
  name: 'Archive or Restore Records',
  key: 'archive_records',
  description:
    'Archive or restore up to 100 records on an Odoo model with an active boolean field. Archiving hides records from normal searches while retaining their data. The tool reads every target before the action and verifies the resulting active state.',
  instructions: [
    'Use list_model_fields to confirm that the model exposes an active boolean field. Models with a custom archive field are not supported by this tool.',
    'Archive and restore actions can invoke installed module automation. Use exact record IDs.',
    'Already archived or already active records are left in the requested state. Verification runs in a separate request and may be affected by concurrent changes.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['archive', 'unarchive'])
        .describe('Archive records or restore archived records'),
      model: z
        .string()
        .trim()
        .min(1)
        .max(128)
        .describe('Technical model name. Call list_models to discover accessible models.'),
      recordIds: z
        .array(z.number().int().positive())
        .min(1)
        .max(100)
        .refine(ids => new Set(ids).size === ids.length, 'Record IDs must be unique')
        .describe('Up to 100 unique record IDs. Call search_records to discover targets.'),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optional Odoo context, such as {"allowed_company_ids":[1]}. Archived records are included automatically.'
        )
    })
  )
  .output(
    z.object({
      model: z.string(),
      action: z.enum(['archive', 'unarchive']),
      records: z
        .array(
          z.object({
            recordId: z.number().int().positive(),
            displayName: z.string(),
            active: z.boolean()
          })
        )
        .describe('Every requested record with its verified current archive state'),
      changedRecordIds: z
        .array(z.number().int().positive())
        .describe(
          'Records that needed a state change and were verified in the requested state'
        ),
      alreadyInRequestedStateIds: z.array(z.number().int().positive())
    })
  )
  .handleInvocation(async ctx => {
    let { model, action, recordIds } = ctx.input;
    let context = { ...(ctx.input.context ?? {}), active_test: false };
    let active = action === 'unarchive';
    try {
      let client = createClient(ctx);
      let fieldArguments = { allfields: ['active'], attributes: ['type'], context };
      let metadata = await client.callModelMethod({
        model,
        method: 'fields_get',
        arguments: fieldArguments,
        legacyKeywordArguments: fieldArguments
      });
      let fieldResult = z
        .object({ active: z.object({ type: z.literal('boolean') }) })
        .safeParse(metadata);
      if (!fieldResult.success) {
        throw createApiServiceError(
          `Model ${model} does not expose an accessible active boolean field. Use list_model_fields to inspect its archive support.`,
          {
            reason: 'odoo_archive_records_unsupported_model'
          }
        );
      }
      let readArguments = { fields: ['display_name', 'active'], load: null, context };
      let read = () =>
        client.callRecordMethod({
          model,
          method: 'read',
          ids: recordIds,
          arguments: readArguments,
          legacyKeywordArguments: readArguments
        });
      let before = verifyRecords(await read(), recordIds);
      let changedRecordIds = before
        .filter(record => record.active !== active)
        .map(record => record.id);
      let alreadyInRequestedStateIds = before
        .filter(record => record.active === active)
        .map(record => record.id);
      if (changedRecordIds.length > 0) {
        await client.callRecordMethod({
          model,
          method: active ? 'action_unarchive' : 'action_archive',
          ids: changedRecordIds,
          arguments: { context },
          legacyKeywordArguments: { context }
        });
      }
      let after = verifyRecords(await read(), recordIds);
      if (after.some(record => record.active !== active)) {
        throw createApiServiceError(
          `Odoo did not verify the requested archive state for every ${model} record. Refresh the records before retrying.`,
          {
            reason: 'odoo_archive_records_state_unconfirmed'
          }
        );
      }
      return {
        output: {
          model,
          action,
          records: after.map(record => ({
            recordId: record.id,
            displayName: record.display_name || `${model},${record.id}`,
            active: record.active
          })),
          changedRecordIds,
          alreadyInRequestedStateIds
        },
        message: `Verified **${recordIds.length}** record(s) in \`${model}\` as ${active ? 'active' : 'archived'}. Changed **${changedRecordIds.length}** record(s).`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `${action === 'archive' ? 'archiving' : 'restoring'} ${model} records`,
        reason: 'odoo_archive_records_failed'
      });
    }
  })
  .build();
