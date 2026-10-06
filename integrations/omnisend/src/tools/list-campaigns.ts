import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.string().describe('Campaign ID'),
  name: z.string().optional().describe('Campaign name'),
  channel: z.string().optional().describe('Channel type (email, sms, push)'),
  type: z.string().optional().describe('Campaign type (standard or abTest)'),
  status: z.string().optional().describe('Campaign status (e.g., draft, sent)'),
  subjectLine: z.string().optional().describe('Email subject line'),
  startDate: z
    .string()
    .optional()
    .describe('Campaign start timestamp: legacy startDate or current startedAt'),
  endDate: z.string().optional().describe('End date'),
  sendStartDate: z.string().optional().describe('Actual send start date'),
  sendEndDate: z.string().optional().describe('Actual send end date'),
  scheduledAt: z
    .string()
    .optional()
    .describe(
      'Current API scheduled sending timestamp; separate from actual start timestamps'
    ),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp'),
  tzoEnabled: z.boolean().optional().describe('Time zone optimization enabled')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List marketing campaigns from Omnisend. Returns campaign details including name, channel (email/SMS/push), status, and scheduling info. Optionally filter by update date.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter campaigns updated after this date (ISO 8601)'),
      limit: z
        .number()
        .optional()
        .describe('Page size, 1-250; requires API version 2026-03-15'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque next-page cursor; requires API version 2026-03-15 and unchanged filters'
        )
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignSchema).describe('List of campaigns'),
      nextCursor: z.string().optional().describe('Provider-issued next-page cursor'),
      previousCursor: z.string().optional().describe('Provider-issued previous-page cursor'),
      hasMore: z.boolean().optional().describe('Whether the provider reports another page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    let output = await client.listCampaigns({
      updatedAtFrom: ctx.input.updatedAfter,
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });
    return { output, message: 'Retrieved campaigns.' };
  })
  .build();
