import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFeedback = SlateTool.create(spec, {
  name: 'Get Feedback',
  key: 'get_feedback',
  description: `Retrieve survey responses and feedback from Retently. Look up a single response by ID, or list responses with filtering by customer, campaign, date range, and custom attributes.
Each response includes score, text feedback, sentiment, topics, tags, and additional question answers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      feedbackId: z
        .string()
        .optional()
        .describe('Retrieve a specific feedback response by its ID'),
      email: z.string().optional().describe('Filter by customer email'),
      customerId: z.string().optional().describe('Filter by Retently customer ID'),
      campaignId: z.string().optional().describe('Filter by campaign ID'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 20, max: 1000)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, prefix with - for descending (default: -createdDate)'),
      startDate: z
        .string()
        .optional()
        .describe('Filter responses after this date (ISO 8601 or UNIX timestamp)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter responses before this date (ISO 8601 or UNIX timestamp)'),
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
        .describe('Filter by custom customer properties'),
      match: z
        .enum(['all', 'any'])
        .optional()
        .describe('Match all or any attribute filters (default: all)')
    })
  )
  .output(
    z.object({
      responses: z.array(z.any()).optional().describe('List of feedback responses'),
      page: z.number().optional().describe('Current page number'),
      pages: z.number().optional().describe('Total pages'),
      total: z.number().optional().describe('Total matching responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.feedbackId) {
      let data = await client.getFeedbackById(ctx.input.feedbackId);
      return {
        output: data,
        message: `Retrieved feedback response **${ctx.input.feedbackId}**.`
      };
    }

    let data = await client.getFeedback({
      email: ctx.input.email,
      customerId: ctx.input.customerId,
      campaignId: ctx.input.campaignId,
      page: ctx.input.page,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      attributes: ctx.input.attributes,
      match: ctx.input.match
    });

    let total = data.total ?? data.responses?.length ?? 0;
    return {
      output: data,
      message: `Retrieved **${total}** feedback response(s) (page ${data.page ?? 1} of ${data.pages ?? 1}).`
    };
  })
  .build();
