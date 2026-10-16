import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contentOutputSchema, mapContent, paginationSchema, rawSchema } from '../lib/maps';
import { spec } from '../spec';

let historyFields = {
  eventDateFrom: z
    .string()
    .optional()
    .describe('Inclusive event time, in account local time or RFC3339 format'),
  eventDateTo: z
    .string()
    .optional()
    .describe('Exclusive event time, in account local time or RFC3339 format'),
  limit: z.number().optional().describe('Maximum events per page, 1-1000; defaults to 100'),
  cursor: z
    .string()
    .optional()
    .describe(
      'Opaque pagination.nextCursor from the preceding page; keep all filters unchanged'
    ),
  order: z.enum(['asc', 'desc']).optional().describe('Event time order; defaults to desc')
};
let historyOutput = z.object({
  events: z
    .array(rawSchema)
    .describe('Original provider event records, subject to account privacy settings'),
  pagination: paginationSchema,
  raw: rawSchema
});

export let getSubscriberHistory = SlateTool.create(spec, {
  name: 'Get Subscriber History',
  key: 'get_subscriber_history',
  description:
    'Retrieves one page of subscriber subscription, delivery, and engagement history. Use get_lists to discover a list and get_subscribers to discover the subscriber.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      listId: z.string().describe('List ID from get_lists'),
      memberId: z.string().describe('Subscriber ID or email address from get_subscribers'),
      campaignId: z
        .string()
        .optional()
        .describe('Restrict history to this campaign from get_campaigns'),
      ...historyFields
    })
  )
  .output(historyOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let output = await client.getHistory('member', ctx.input.memberId, {
      list_id: ctx.input.listId,
      campaign_id: ctx.input.campaignId,
      event_date_from: ctx.input.eventDateFrom,
      event_date_to: ctx.input.eventDateTo,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      order_by: 'event_date',
      order: ctx.input.order
    });
    return {
      output,
      message: `Retrieved ${output.events.length} subscriber history event(s) on this page.`
    };
  })
  .build();

export let getCampaignHistory = SlateTool.create(spec, {
  name: 'Get Campaign History',
  key: 'get_campaign_history',
  description:
    'Retrieves one page of campaign delivery and engagement events. Account privacy settings can hide events or anonymize subscriber identities.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID from get_campaigns'),
      ...historyFields
    })
  )
  .output(historyOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let output = await client.getHistory('campaign', ctx.input.campaignId, {
      event_date_from: ctx.input.eventDateFrom,
      event_date_to: ctx.input.eventDateTo,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      order_by: 'event_date',
      order: ctx.input.order
    });
    return {
      output,
      message: `Retrieved ${output.events.length} campaign history event(s) on this page.`
    };
  })
  .build();

export let getCampaignContent = SlateTool.create(spec, {
  name: 'Get Campaign Content',
  key: 'get_campaign_content',
  description:
    'Retrieves HTML and plaintext content for an imported campaign. Campaigns created with the drag-and-drop editor do not support this endpoint.',
  tags: { readOnly: true }
})
  .input(z.object({ campaignId: z.string().describe('Campaign ID from get_campaigns') }))
  .output(contentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCampaignContent(ctx.input.campaignId);
    return {
      output: mapContent(result.campaign),
      message: `Retrieved content for campaign ${ctx.input.campaignId}.`
    };
  })
  .build();
