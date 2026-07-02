import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let campaignEvents = SlateTrigger.create(spec, {
  name: 'Campaign Events',
  key: 'campaign_events',
  description: 'Triggers when a contact is subscribed to or unsubscribed from a drip campaign.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      timestamp: z.string().optional().describe('Event timestamp'),
      contactId: z.string().optional().describe('Contact ID'),
      contactEmail: z.string().optional().describe('Contact email'),
      campaignId: z.string().optional().describe('Campaign ID'),
      campaignName: z.string().optional().describe('Campaign name'),
      raw: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Contact ID'),
      contactEmail: z.string().optional().describe('Contact email'),
      campaignId: z.string().optional().describe('Campaign ID'),
      campaignName: z.string().optional().describe('Campaign name'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let topic = data.topic || '';
      let contact = data.contact || data.data?.contact || {};
      let campaign = data.campaign || data.data?.campaign || {};

      return {
        inputs: [
          {
            topic,
            timestamp: data.timestamp ? String(data.timestamp) : undefined,
            contactId: contact.id ? String(contact.id) : undefined,
            contactEmail: contact.email,
            campaignId: campaign.id ? String(campaign.id) : undefined,
            campaignName: campaign.name,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let topicMap: Record<string, string> = {
        'contact.subscribed_campaign': 'campaign.contact_subscribed',
        'contact.unsubscribed_campaign': 'campaign.contact_unsubscribed'
      };

      let type = topicMap[ctx.input.topic] || ctx.input.topic;
      let id = `${ctx.input.topic}-${ctx.input.contactId || ''}-${ctx.input.campaignId || ''}-${ctx.input.timestamp || Date.now()}`;

      return {
        type,
        id,
        output: {
          contactId: ctx.input.contactId,
          contactEmail: ctx.input.contactEmail,
          campaignId: ctx.input.campaignId,
          campaignName: ctx.input.campaignName,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
