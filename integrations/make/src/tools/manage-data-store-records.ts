import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid, paging } from '../lib/schemas';
import { spec } from '../spec';

export let manageDataStoreRecords = SlateTool.create(spec, {
  name: 'Manage Data Store Records',
  key: 'manage_data_store_records',
  description: `List, get, create, update, or delete records within a Make data store. Get performs an exact-key scan capped at 1000 records and refuses incomplete absence. Update replaces the entire record. Delete acknowledges the exact native key receipt.`,
  instructions: [
    'For "list", only dataStoreId is required.',
    'For "get", "update", or "delete", provide dataStoreId and recordKey.',
    'For "create" or "update", provide the record data as key-value pairs.'
  ]
})
  .input(
    z.object({
      dataStoreId: z.number().describe('ID of the data store'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform on records'),
      recordKey: z
        .string()
        .optional()
        .describe('Record key (required for get, update, delete)'),
      recordData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Record data as key-value pairs (for create/update)'),
      limit: z.number().optional().describe('Maximum number of records to return (for list)'),
      offset: z.number().optional().describe('Number to skip for pagination (for list)')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of records (for list action)'),
      record: z.record(z.string(), z.any()).optional().describe('Single record data'),
      recordKey: z.string().optional().describe('Key of the affected record'),
      deleted: z.boolean().optional().describe('Whether the record was deleted'),
      page: paging.optional(),
      total: z.number().optional().describe('Total number of records (for list)')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const { action, dataStoreId } = ctx.input;
    if (action === 'list') {
      const result = await client.listDataStoreRecords(dataStoreId, ctx.input);
      return {
        output: { records: result.records, total: result.count, page: result.pg },
        message: `Returned ${result.records.length} native records in this page.`
      };
    }
    if (action === 'delete') {
      await client.deleteDataStoreRecord(dataStoreId, ctx.input.recordKey!);
      return {
        output: { recordKey: ctx.input.recordKey, deleted: true },
        message:
          'Make acknowledged deletion of the exact record key; previous scenario effects and history remain.'
      };
    }
    if (action !== 'get' && ctx.input.recordData === undefined)
      throw invalid(
        'recordData is required for create or update. Update replaces the entire record.'
      );
    const result =
      action === 'get'
        ? await client.getDataStoreRecord(dataStoreId, ctx.input.recordKey!)
        : action === 'create'
          ? await client.createDataStoreRecord(
              dataStoreId,
              ctx.input.recordData!,
              ctx.input.recordKey
            )
          : await client.updateDataStoreRecord(
              dataStoreId,
              ctx.input.recordKey!,
              ctx.input.recordData!
            );
    return {
      output: { record: result, recordKey: result.key },
      message: `Confirmed the exact native ${action} record receipt.`
    };
  })
  .build();
