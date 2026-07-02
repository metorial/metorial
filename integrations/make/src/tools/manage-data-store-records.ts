import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let manageDataStoreRecords = SlateTool.create(spec, {
  name: 'Manage Data Store Records',
  key: 'manage_data_store_records',
  description: `List, get, create, update, or delete records within a Make data store. Use this to interact with individual records stored in a data store.`,
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
      total: z.number().optional().describe('Total number of records (for list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let { dataStoreId, action } = ctx.input;

    if (action === 'list') {
      let result = await client.listDataStoreRecords(dataStoreId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let records = result.records ?? result ?? [];
      return {
        output: {
          records: Array.isArray(records) ? records : [],
          total: result.pg?.total
        },
        message: `Found **${Array.isArray(records) ? records.length : 0}** record(s) in data store ${dataStoreId}.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.recordKey) throw new Error('recordKey is required for get action');
      let result = await client.getDataStoreRecord(dataStoreId, ctx.input.recordKey);
      return {
        output: {
          record: result,
          recordKey: ctx.input.recordKey
        },
        message: `Retrieved record with key **${ctx.input.recordKey}** from data store ${dataStoreId}.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.recordData) throw new Error('recordData is required for create action');
      let result = await client.createDataStoreRecord(dataStoreId, ctx.input.recordData);
      return {
        output: {
          record: result,
          recordKey: result.key ?? result.id
        },
        message: `Created record in data store ${dataStoreId}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.recordKey) throw new Error('recordKey is required for update action');
      if (!ctx.input.recordData) throw new Error('recordData is required for update action');
      let result = await client.updateDataStoreRecord(
        dataStoreId,
        ctx.input.recordKey,
        ctx.input.recordData
      );
      return {
        output: {
          record: result,
          recordKey: ctx.input.recordKey
        },
        message: `Updated record **${ctx.input.recordKey}** in data store ${dataStoreId}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.recordKey) throw new Error('recordKey is required for delete action');
      await client.deleteDataStoreRecord(dataStoreId, ctx.input.recordKey);
      return {
        output: {
          recordKey: ctx.input.recordKey,
          deleted: true
        },
        message: `Deleted record **${ctx.input.recordKey}** from data store ${dataStoreId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
