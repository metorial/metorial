import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { spec } from '../spec';

export let manageListEntries = SlateTool.create(spec, {
  name: 'Manage List Entries',
  key: 'manage_list_entries',
  description: `Create, read, update, or delete entries in a Zixflow list. Lists group records from collections with additional list-specific attributes. Use the **List Lists** tool to discover available lists and their IDs.`,
  instructions: [
    'For "create": provide listId and recordId (the collection record to link). Optionally pass entryData for list-specific fields.',
    'For "get": provide listId and entryId.',
    'For "list": provide listId with limit/offset for pagination.',
    'For "update": provide listId, entryId, and entryData.',
    'For "delete": provide listId and entryId.'
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
      listId: z.string().describe('List ID'),
      entryId: z
        .string()
        .optional()
        .describe('List entry ID (required for get, update, delete)'),
      recordId: z
        .string()
        .optional()
        .describe('Collection record ID to link (required for create)'),
      entryData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Entry field data as key-value pairs (for create/update)'),
      limit: z
        .number()
        .optional()
        .describe('Number of entries to return (for list, default: 10)'),
      offset: z.number().optional().describe('Pagination offset (for list, default: 0)'),
      filter: z.array(z.any()).optional().describe('Filter criteria array (for list)'),
      sort: z.array(z.any()).optional().describe('Sort criteria array (for list)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      responseMessage: z.string().describe('Response message from the API'),
      entryId: z.string().optional().describe('ID of the created/affected entry'),
      entry: z.record(z.string(), z.any()).optional().describe('Entry data (for get/create)'),
      entries: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of entries (for list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });
    let { action, listId } = ctx.input;
    let result: any;

    if (action === 'create') {
      result = await client.createListEntry(listId, ctx.input.recordId!, ctx.input.entryData);
      return {
        output: {
          success: result.status === true,
          responseMessage: result.message ?? 'Unknown response',
          entryId: result.data?._id,
          entry: result.data
        },
        message: `Created list entry in list ${listId}.`
      };
    }

    if (action === 'get') {
      result = await client.getListEntry(listId, ctx.input.entryId!);
      return {
        output: {
          success: result.status === true,
          responseMessage: result.message ?? 'Unknown response',
          entryId: ctx.input.entryId,
          entry: result.data
        },
        message: `Fetched list entry ${ctx.input.entryId}.`
      };
    }

    if (action === 'list') {
      result = await client.getListEntries(listId, {
        limit: ctx.input.limit ?? 10,
        offset: ctx.input.offset ?? 0,
        filter: ctx.input.filter,
        sort: ctx.input.sort
      });
      let entries = Array.isArray(result.data) ? result.data : [];
      return {
        output: {
          success: result.status === true,
          responseMessage: result.message ?? 'Unknown response',
          entries
        },
        message: `Fetched ${entries.length} entry(ies) from list ${listId}.`
      };
    }

    if (action === 'update') {
      result = await client.updateListEntry(
        listId,
        ctx.input.entryId!,
        ctx.input.entryData ?? {}
      );
      return {
        output: {
          success: result.status === true,
          responseMessage: result.message ?? 'Unknown response',
          entryId: ctx.input.entryId
        },
        message: `Updated list entry ${ctx.input.entryId}.`
      };
    }

    // delete
    result = await client.deleteListEntry(listId, ctx.input.entryId!);
    return {
      output: {
        success: result.status === true,
        responseMessage: result.message ?? 'Unknown response',
        entryId: ctx.input.entryId
      },
      message: `Deleted list entry ${ctx.input.entryId}.`
    };
  })
  .build();
