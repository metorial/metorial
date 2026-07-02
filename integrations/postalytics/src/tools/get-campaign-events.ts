import { SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let getCampaignEvents = SlateTool.create(spec, {
  name: 'Get Campaign Events',
  key: 'get_campaign_events',
  description: `Retrieve delivery and response tracking events for a campaign. Returns mail lifecycle events (created, addressed, printed, mailed, in transit, delivered, etc.) and online response events (pURL opened, pURL completed) for all contacts or a specific contact in a campaign.`,
  instructions: [
    'Provide a campaignId to get events for that campaign.',
    'Optionally provide a contactDataId to filter events for a specific contact.',
    'Use pageNumber and pageSize for pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID to retrieve events for'),
      contactDataId: z
        .string()
        .optional()
        .describe('Specific contact data ID to filter events'),
      pageNumber: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of events per page')
    })
  )
  .output(
    z.object({
      events: z
        .record(z.string(), z.unknown())
        .describe('Campaign event data including delivery and response tracking details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let events = await client.getCampaignEvents(ctx.input.campaignId, {
      dataId: ctx.input.contactDataId,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    return {
      output: { events },
      message: `Retrieved events for campaign **${ctx.input.campaignId}**${ctx.input.contactDataId ? ` (contact: ${ctx.input.contactDataId})` : ''}.`
    };
  })
  .build();
