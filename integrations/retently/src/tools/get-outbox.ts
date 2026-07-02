import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOutbox = SlateTool.create(spec, {
  name: 'Get Outbox',
  key: 'get_outbox',
  description: `Retrieve sent surveys from the outbox with delivery status and recipient details. Filter by campaign, channel, date range, send method, and customer attributes.
Each entry includes delivery status (sent, opened, responded, bounced, opted-out) and response details if available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by recipient email'),
      campaignId: z.string().optional().describe('Filter by campaign ID'),
      channel: z
        .enum(['email', 'link', 'inapp', 'intercom'])
        .optional()
        .describe('Filter by delivery channel'),
      sentBy: z
        .enum(['campaign', 'reminder', 'manual', 'test', 'imported'])
        .optional()
        .describe('Filter by how the survey was sent'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 20, max: 1000)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, prefix with - for descending (default: -surveyCreatedDate)'),
      startDate: z
        .string()
        .optional()
        .describe('Filter surveys sent after this date (ISO 8601 or UNIX timestamp)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter surveys sent before this date (ISO 8601 or UNIX timestamp)')
    })
  )
  .output(
    z.object({
      surveys: z.array(z.any()).optional().describe('List of sent survey records'),
      page: z.number().optional().describe('Current page number'),
      pages: z.number().optional().describe('Total pages'),
      total: z.number().optional().describe('Total matching outbox entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data = await client.getOutbox({
      email: ctx.input.email,
      campaignId: ctx.input.campaignId,
      channel: ctx.input.channel,
      sentBy: ctx.input.sentBy,
      page: ctx.input.page,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let total = data.total ?? data.surveys?.length ?? 0;
    return {
      output: data,
      message: `Retrieved **${total}** outbox entries (page ${data.page ?? 1} of ${data.pages ?? 1}).`
    };
  })
  .build();
