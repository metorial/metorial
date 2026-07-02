import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignEventTypes = ['campaign.sent', 'campaign.open', 'campaign.click'] as const;

export let campaignEvents = SlateTrigger.create(spec, {
  name: 'Campaign Events',
  key: 'campaign_events',
  description:
    'Triggers when campaign events occur, such as a campaign finishing sending, a subscriber opening a campaign, or clicking a link.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of campaign event'),
      webhookId: z.string().optional().describe('Webhook ID that fired the event'),
      campaign: z.any().optional().describe('Campaign data from the webhook payload'),
      subscriber: z.any().optional().describe('Subscriber data (for open/click events)'),
      clickedUrl: z.string().optional().describe('Clicked link URL (for click events)'),
      totalRecipients: z.number().optional().describe('Total recipients (for sent events)')
    })
  )
  .output(
    z.object({
      campaignId: z.string().optional().describe('Campaign ID'),
      campaignName: z.string().optional().describe('Campaign name'),
      subscriberId: z.string().optional().describe('Subscriber ID (for open/click events)'),
      subscriberEmail: z
        .string()
        .optional()
        .describe('Subscriber email (for open/click events)'),
      clickedUrl: z.string().optional().describe('Clicked URL (for click events)'),
      totalRecipients: z.number().optional().describe('Total recipients (for sent events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.createWebhook({
        name: 'Slates Campaign Events',
        url: ctx.input.webhookBaseUrl,
        events: [...campaignEventTypes],
        enabled: true,
        batchable: true // Required for campaign.open and campaign.click
      });

      return {
        registrationDetails: {
          webhookId: result.data.id,
          secret: result.data.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let events: any[] = Array.isArray(body) ? body : [body];

      let inputs = events.map((event: any) => {
        let eventType = event.type || 'campaign.sent';
        let campaign = event.campaign || event.data?.campaign;
        let subscriber = event.subscriber || event.data?.subscriber;

        return {
          eventType,
          webhookId: event.webhook_id,
          campaign,
          subscriber,
          clickedUrl: event.url || event.clicked_url || event.data?.url,
          totalRecipients: event.total_recipients || campaign?.total_recipients
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let campaign = ctx.input.campaign;
      let subscriber = ctx.input.subscriber;

      let campaignId = campaign?.id ? String(campaign.id) : undefined;
      let subscriberId = subscriber?.id ? String(subscriber.id) : undefined;
      let uniquePart = subscriberId || campaignId || 'unknown';

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${uniquePart}-${Date.now()}`,
        output: {
          campaignId,
          campaignName: campaign?.name,
          subscriberId,
          subscriberEmail: subscriber?.email,
          clickedUrl: ctx.input.clickedUrl,
          totalRecipients: ctx.input.totalRecipients
        }
      };
    }
  })
  .build();
