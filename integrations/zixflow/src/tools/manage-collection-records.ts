import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { operationOutput, providerId, providerRecords, requireInput } from '../lib/response';
import { spec } from '../spec';

export let manageCollectionRecords = SlateTool.create(spec, {
  name: 'Manage Collection Records',
  key: 'manage_collection_records',
  description: `Create, read, update, or delete records in a Zixflow CRM collection. Collections are customizable data containers (like People, Companies, Deals, or custom tables). Record fields are dynamic and depend on the collection's configured attributes.

Use the **List Collections** tool first to discover available collections and their IDs.`,
  instructions: [
    'For "create": provide collectionId and recordData with key-value pairs matching the collection attribute API key names.',
    'For "get": provide collectionId and recordId to fetch a single record.',
    'For "list": provide collectionId with limit/offset for pagination. Optionally use filter and sort arrays.',
    'For "update": provide collectionId, recordId, and recordData with fields to update.',
    'For "delete": provide collectionId and recordId.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete'])
        .describe('Operation to perform'),
      collectionId: z.string().describe('Collection ID. Discover IDs with list_collections.'),
      recordId: z.string().optional().describe('Record ID (required for get, update, delete)'),
      recordData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Record field data as key-value pairs (for create/update)'),
      limit: z
        .number()
        .optional()
        .describe('Number of records to return (for list, default: 10)'),
      offset: z.number().optional().describe('Pagination offset (for list, default: 0)'),
      filter: z
        .array(z.any())
        .optional()
        .describe('Filter criteria combined with AND (for list)'),
      filterObject: z
        .record(z.string(), z.any())
        .optional()
        .describe('Documented filter object for list; use this or filter, not both'),
      sort: z.array(z.any()).optional().describe('Sort criteria array (for list)')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete response returned by Zixflow'),
      success: z.boolean().describe('Whether the operation was successful'),
      responseMessage: z.string().describe('Response message from the API'),
      recordId: z.string().optional().describe('ID of the created/affected record'),
      record: z
        .record(z.string(), z.any())
        .optional()
        .describe('Record data (for get/create)'),
      records: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of records (for list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });
    let { action, collectionId } = ctx.input;
    requireInput(collectionId, 'collectionId');
    if (['get', 'update', 'delete'].includes(action))
      requireInput(ctx.input.recordId, 'recordId');
    if (ctx.input.filter !== undefined && ctx.input.filterObject !== undefined) {
      throw createApiServiceError('Provide filter or filterObject, not both.', {
        reason: 'zixflow_invalid_input'
      });
    }
    if (['create', 'update'].includes(action) && ctx.input.recordData === undefined) {
      throw createApiServiceError('recordData is required for create and update.', {
        reason: 'zixflow_invalid_input'
      });
    }
    let result: any;
    if (action === 'create')
      result = await client.createRecord(collectionId, ctx.input.recordData!);
    else if (action === 'get')
      result = await client.getRecord(collectionId, ctx.input.recordId!);
    else if (action === 'list')
      result = await client.getRecords(collectionId, {
        limit: ctx.input.limit ?? 10,
        offset: ctx.input.offset ?? 0,
        filter: ctx.input.filter,
        filterObject: ctx.input.filterObject,
        sort: ctx.input.sort
      });
    else if (action === 'update')
      result = await client.updateRecord(
        collectionId,
        ctx.input.recordId!,
        ctx.input.recordData!
      );
    else result = await client.deleteRecord(collectionId, ctx.input.recordId!);

    return {
      output: {
        ...operationOutput(result),
        recordId: providerId(result),
        record:
          ['create', 'get'].includes(action) && isApiErrorRecord(result.data)
            ? result.data
            : undefined,
        records: action === 'list' ? providerRecords(result.data) : undefined
      },
      message: `Zixflow ${action} operation confirmed.`
    };
  })
  .build();
