import { createApiServiceError, SlateTool } from 'slates';
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
        .enum(['email', 'link', 'inapp', 'intercom', 'embed'])
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
        .describe(
          'Filter surveys sent before this date (ISO 8601 or UNIX seconds; includes the final day in the account timezone)'
        ),
      attributes: z
        .array(
          z.object({
            name: z.string().describe('Customer property name'),
            operator: z.string().describe('Filter operator'),
            value: z
              .union([z.string(), z.number(), z.boolean()])
              .optional()
              .describe('Filter value')
          })
        )
        .optional()
        .describe('Filter by customer properties'),
      match: z.enum(['all', 'any']).optional().describe('Match all or any attribute filters')
    })
  )
  .output(
    z
      .object({
        surveys: z.array(z.any()).optional().describe('List of sent survey records'),
        page: z.number().optional().describe('Current page number'),
        pages: z.number().optional().describe('Total pages'),
        total: z.number().optional().describe('Total matching outbox entries')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.page !== undefined &&
      (!Number.isInteger(ctx.input.page) || ctx.input.page < 1)
    ) {
      throw createApiServiceError('Page must be a positive whole number.');
    }
    if (
      ctx.input.limit !== undefined &&
      (!Number.isInteger(ctx.input.limit) || ctx.input.limit < 1 || ctx.input.limit > 1000)
    ) {
      throw createApiServiceError('Limit must be a whole number between 1 and 1,000.');
    }
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
      endDate: ctx.input.endDate,
      attributes: ctx.input.attributes,
      match: ctx.input.match
    });

    let total = data.total ?? data.surveys?.length ?? 0;
    return {
      output: data,
      message: `Retrieved **${total}** outbox entries (page ${data.page ?? 1} of ${data.pages ?? 1}).`
    };
  })
  .build();
