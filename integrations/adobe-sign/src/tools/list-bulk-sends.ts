import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBulkSends = SlateTool.create(spec, {
  name: 'List Bulk Sends',
  key: 'list_bulk_sends',
  description: `List Send in Bulk (MegaSign) parent agreements in the Adobe Acrobat Sign account with pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of bulk sends per page')
    })
  )
  .output(
    z.object({
      bulkSends: z
        .array(
          z.object({
            bulkSendId: z.string().describe('ID of the Send in Bulk parent agreement'),
            name: z.string().optional().describe('Name of the Send in Bulk operation'),
            status: z.string().optional().describe('Current status'),
            displayDate: z.string().optional().describe('Display date')
          })
        )
        .describe('List of Send in Bulk parent agreements'),
      cursor: z.string().optional().describe('Cursor for next page, if more results exist'),
      totalHits: z.number().optional().describe('Total number of matching results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.listMegaSigns({
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize
    });

    let bulkSends = (result.megaSignList || []).map((bulkSend: any) => ({
      bulkSendId: bulkSend.id,
      name: bulkSend.name,
      status: bulkSend.status,
      displayDate: bulkSend.displayDate
    }));

    return {
      output: {
        bulkSends,
        cursor: result.page?.nextCursor,
        totalHits: result.page?.totalHits
      },
      message: `Found **${bulkSends.length}** Send in Bulk item(s).`
    };
  });
