import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let linkRecords = SlateTool.create(spec, {
  name: 'Link Records',
  key: 'link_records',
  description: `Manage linked records between tables. List, link, or unlink records through a LinkToAnotherRecord field.
- **list**: List all records linked to a given record through a link field.
- **link**: Create links between a record and one or more target records.
- **unlink**: Remove links between a record and one or more target records.`,
  instructions: [
    'The linkFieldId is the column ID of the LinkToAnotherRecord field.',
    'Use the Get Table tool to find the link field ID.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'link', 'unlink']).describe('Action to perform'),
      tableId: z.string().describe('The table ID containing the link field'),
      linkFieldId: z
        .string()
        .describe('The column ID of the LinkToAnotherRecord field (prefixed with c)'),
      recordId: z.string().describe('The row ID of the source record'),
      targetRecordIds: z
        .array(z.number())
        .optional()
        .describe('Row IDs of records to link or unlink (required for link/unlink)'),
      limit: z.number().optional().describe('Max linked records to return (for list)'),
      offset: z.number().optional().describe('Offset for pagination (for list)')
    })
  )
  .output(
    z.object({
      linkedRecords: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of linked records (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { action, tableId, linkFieldId, recordId, targetRecordIds, limit, offset } = ctx.input;

    if (action === 'list') {
      let result = await client.listLinkedRecords(tableId, linkFieldId, recordId, {
        limit,
        offset
      });
      let linkedRecords = result?.list ?? result ?? [];
      return {
        output: {
          linkedRecords: Array.isArray(linkedRecords) ? linkedRecords : [],
          success: true
        },
        message: `Found **${Array.isArray(linkedRecords) ? linkedRecords.length : 0}** linked record(s).`
      };
    }

    if (action === 'link') {
      if (!targetRecordIds?.length) throw new Error('targetRecordIds is required for linking');
      let ids = targetRecordIds.map(id => ({ Id: id }));
      await client.linkRecords(tableId, linkFieldId, recordId, ids);
      return {
        output: { success: true },
        message: `Linked **${targetRecordIds.length}** record(s) to record \`${recordId}\`.`
      };
    }

    if (action === 'unlink') {
      if (!targetRecordIds?.length)
        throw new Error('targetRecordIds is required for unlinking');
      let ids = targetRecordIds.map(id => ({ Id: id }));
      await client.unlinkRecords(tableId, linkFieldId, recordId, ids);
      return {
        output: { success: true },
        message: `Unlinked **${targetRecordIds.length}** record(s) from record \`${recordId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
