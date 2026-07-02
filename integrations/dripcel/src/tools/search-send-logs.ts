import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchSendLogs = SlateTool.create(spec, {
  name: 'Search Send Logs',
  key: 'search_send_logs',
  description: `View metadata about past sends including campaign, template, trigger type, delivery start time, and destination count. Can search by campaign and delivery date range, or fetch a specific send log by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sendLogId: z.string().optional().describe('Fetch a specific send log by its ID'),
      campaignIds: z.array(z.string()).optional().describe('Filter by campaign IDs'),
      deliveryAfter: z
        .string()
        .optional()
        .describe('Filter sends that started on or after this date (ISO 8601)'),
      deliveryBefore: z
        .string()
        .optional()
        .describe('Filter sends that started on or before this date (ISO 8601)'),
      groupDestinations: z
        .enum(['count', 'list'])
        .optional()
        .describe('Format destinations as a count or list of cell numbers'),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of send logs to return')
    })
  )
  .output(
    z.object({
      sendLogs: z.array(z.any()).describe('Array of send log records'),
      total: z
        .number()
        .optional()
        .describe('Total number of matching records (for search results)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.sendLogId) {
      let result = await client.getSendLog(ctx.input.sendLogId, ctx.input.groupDestinations);
      return {
        output: { sendLogs: [result.data], total: 1 },
        message: `Retrieved send log \`${ctx.input.sendLogId}\`.`
      };
    }

    let find: Record<string, any> = {};
    if (ctx.input.campaignIds) find.campaignId = ctx.input.campaignIds;
    if (ctx.input.deliveryAfter || ctx.input.deliveryBefore) {
      find.startDeliveryAt = {};
      if (ctx.input.deliveryAfter) find.startDeliveryAt.$gte = ctx.input.deliveryAfter;
      if (ctx.input.deliveryBefore) find.startDeliveryAt.$lte = ctx.input.deliveryBefore;
    }

    let options: Record<string, number> = {};
    if (ctx.input.skip !== undefined) options.skip = ctx.input.skip;
    if (ctx.input.limit !== undefined) options.limit = ctx.input.limit;

    let result = await client.searchSendLogs({
      find: Object.keys(find).length > 0 ? find : undefined,
      options: Object.keys(options).length > 0 ? options : undefined
    });

    let sendLogs = result.data?.send_logs ?? [];
    let total = result.data?.total ?? sendLogs.length;
    return {
      output: { sendLogs, total },
      message: `Found **${total}** send log(s).`
    };
  })
  .build();
