import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let campaignStatus = SlateTrigger.create(spec, {
  name: 'Campaign Status Changed',
  key: 'campaign_status_changed',
  description:
    'Triggers whenever a campaign status changes (printing, dispatched, or cancelled).'
})
  .input(
    z.object({
      webhookId: z.number().optional().describe('Webhook ID'),
      event: z.string().describe('Event type'),
      created: z.string().optional().describe('Event creation timestamp'),
      retries: z.string().optional().describe('Number of retry attempts'),
      campaigns: z
        .array(z.any())
        .optional()
        .describe('Array of campaign objects that triggered the event')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      status: z.string().describe('New campaign status (printing, dispatched, cancelled)'),
      name: z.string().optional().describe('Campaign name'),
      type: z.string().optional().describe('Campaign type'),
      templateId: z.string().optional().describe('Associated template ID'),
      sendDate: z.string().optional().describe('Scheduled send date'),
      dispatched: z.string().optional().describe('Dispatch timestamp'),
      cost: z.string().optional().describe('Campaign cost'),
      created: z.string().optional().describe('Campaign creation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.event === 'test_url') {
        return { inputs: [] };
      }

      let campaigns: any[] = data.campaigns || data.data || [];
      if (!Array.isArray(campaigns)) {
        campaigns = [campaigns];
      }

      return {
        inputs: campaigns.map((campaign: any) => ({
          webhookId: data.webhook_id,
          event: data.event || 'campaign_status',
          created: data.created,
          retries: data.retries,
          campaigns: [campaign]
        }))
      };
    },

    handleEvent: async ctx => {
      let campaign = ctx.input.campaigns?.[0];
      let status = campaign?.status || ctx.input.event;

      return {
        type: `campaign.${status}`,
        id: `campaign-${campaign?.id || 'unknown'}-${ctx.input.created || Date.now()}`,
        output: {
          campaignId: String(campaign?.id || ''),
          status: status,
          name: campaign?.name,
          type: campaign?.type,
          templateId: campaign?.template_id != null ? String(campaign.template_id) : undefined,
          sendDate: campaign?.send_date,
          dispatched: campaign?.dispatched,
          cost: campaign?.cost,
          created: campaign?.created
        }
      };
    }
  })
  .build();
