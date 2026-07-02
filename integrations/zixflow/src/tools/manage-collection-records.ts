import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
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
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete'])
        .describe('Operation to perform'),
      collectionId: z.string().describe('Collection ID'),
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
      filter: z.array(z.any()).optional().describe('Filter criteria array (for list)'),
      sort: z.array(z.any()).optional().describe('Sort criteria array (for list)')
    })
  )
  .output(
    z.object({
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
    let result: any;

    if (action === 'create') {
      result = await client.createRecord(collectionId, ctx.input.recordData ?? {});
      return {
        output: {
          success: result.status === true,
          responseMessage: result.message ?? 'Unknown response',
          recordId: result._id ?? result.data?._id,
          record: result.data
        },
        message: `Record created in collection ${collectionId} with ID ${result._id ?? result.data?._id ?? 'unknown'}.`
      };
    }

    if (action === 'get') {
      result = await client.getRecord(collectionId, ctx.input.recordId!);
      return {
        output: {
          success: result.status === true,
          responseMessage: result.message ?? 'Unknown response',
          recordId: ctx.input.recordId,
          record: result.data
        },
        message: `Fetched record ${ctx.input.recordId} from collection ${collectionId}.`
      };
    }

    if (action === 'list') {
      result = await client.getRecords(collectionId, {
        limit: ctx.input.limit ?? 10,
        offset: ctx.input.offset ?? 0,
        filter: ctx.input.filter,
        sort: ctx.input.sort
      });
      let records = Array.isArray(result.data) ? result.data : [];
      return {
        output: {
          success: result.status === true,
          responseMessage: result.message ?? 'Unknown response',
          records
        },
        message: `Fetched ${records.length} record(s) from collection ${collectionId}.`
      };
    }

    if (action === 'update') {
      result = await client.updateRecord(
        collectionId,
        ctx.input.recordId!,
        ctx.input.recordData ?? {}
      );
      return {
        output: {
          success: result.status === true,
          responseMessage: result.message ?? 'Unknown response',
          recordId: ctx.input.recordId
        },
        message: `Updated record ${ctx.input.recordId} in collection ${collectionId}.`
      };
    }

    // delete
    result = await client.deleteRecord(collectionId, ctx.input.recordId!);
    return {
      output: {
        success: result.status === true,
        responseMessage: result.message ?? 'Unknown response',
        recordId: ctx.input.recordId
      },
      message: `Deleted record ${ctx.input.recordId} from collection ${collectionId}.`
    };
  })
  .build();
