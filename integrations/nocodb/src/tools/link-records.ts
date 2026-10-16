import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageInfoSchema, responseList, validatePagination } from '../lib/schemas';
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
      success: z.boolean().describe('Whether the operation succeeded'),
      pageInfo: pageInfoSchema.optional(),
      raw: z.any().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { action, tableId, linkFieldId, recordId, targetRecordIds, limit, offset } = ctx.input;

    if (action === 'list') {
      validatePagination(limit, offset);
      let result = await client.listLinkedRecords(tableId, linkFieldId, recordId, {
        limit,
        offset
      });
      let linkedRecords = responseList(result, 'linked records');
      return {
        output: {
          linkedRecords,
          success: true,
          pageInfo: result?.pageInfo,
          raw: result
        },
        message: `Found **${linkedRecords.length}** linked record(s).`
      };
    }

    if (action === 'link') {
      if (!targetRecordIds?.length)
        throw createApiServiceError('targetRecordIds is required for linking');
      let ids = targetRecordIds.map(id => ({ Id: id }));
      let result = await client.linkRecords(tableId, linkFieldId, recordId, ids);
      if (result === false)
        throw createApiServiceError('NocoDB did not confirm the link operation.');
      return {
        output: { success: true, raw: result },
        message: `Linked **${targetRecordIds.length}** record(s) to record \`${recordId}\`.`
      };
    }

    if (action === 'unlink') {
      if (!targetRecordIds?.length)
        throw createApiServiceError('targetRecordIds is required for unlinking');
      let ids = targetRecordIds.map(id => ({ Id: id }));
      let result = await client.unlinkRecords(tableId, linkFieldId, recordId, ids);
      if (result === false)
        throw createApiServiceError('NocoDB did not confirm the unlink operation.');
      return {
        output: { success: true, raw: result },
        message: `Unlinked **${targetRecordIds.length}** record(s) from record \`${recordId}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
