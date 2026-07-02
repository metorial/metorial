import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let emailEvents = SlateTrigger.create(spec, {
  name: 'Email Events',
  key: 'email_events',
  description:
    'Receive webhook notifications for email events: bounces, clicks, opens, unsubscribes, and complaints. Webhooks must be configured in the BigMailer console API page.'
})
  .input(
    z.object({
      eventType: z
        .enum(['bounce', 'click', 'open', 'unsubscribe', 'complaint'])
        .describe('Type of email event'),
      brandId: z.string().describe('Brand ID associated with the event'),
      contactId: z.string().describe('Contact ID associated with the event'),
      campaignId: z.string().describe('Campaign ID that triggered the event'),
      email: z.string().describe('Contact email address'),
      eventDate: z.string().describe('Timestamp of the event (ISO 8601)'),
      bounceType: z
        .string()
        .optional()
        .describe('Bounce type: hard or soft (bounce events only)'),
      linkUrl: z.string().optional().describe('Clicked link URL (click events only)'),
      linkId: z.string().optional().describe('Link ID (click events only)'),
      unsubscribeAll: z
        .boolean()
        .optional()
        .describe('Whether unsubscribed from all (unsubscribe events only)'),
      unsubscribeIds: z
        .array(z.string())
        .optional()
        .describe('Message type IDs unsubscribed from (unsubscribe events only)')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Type of email event'),
      brandId: z.string().describe('Brand ID'),
      contactId: z.string().describe('Contact ID'),
      campaignId: z.string().describe('Campaign ID'),
      email: z.string().describe('Contact email address'),
      eventDate: z.string().describe('Event timestamp (ISO 8601)'),
      bounceType: z.string().optional().describe('hard or soft (bounce events only)'),
      linkUrl: z.string().optional().describe('Clicked URL (click events only)'),
      linkId: z.string().optional().describe('Link ID (click events only)'),
      unsubscribeAll: z
        .boolean()
        .optional()
        .describe('Whether unsubscribed from all (unsubscribe events only)'),
      unsubscribeIds: z
        .array(z.string())
        .optional()
        .describe('Message type IDs unsubscribed from (unsubscribe events only)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;
      let eventType = body.type as string;
      let brandId = body.brand_id as string;

      let eventData = body[eventType] as Record<string, unknown> | undefined;
      if (!eventData) {
        return { inputs: [] };
      }

      let date = eventData.date as number;
      let contactId = (eventData.contact_id as string) || '';
      let campaignId = (eventData.campaign_id as string) || '';
      let email = (eventData.email as string) || '';

      let input: {
        eventType: 'bounce' | 'click' | 'open' | 'unsubscribe' | 'complaint';
        brandId: string;
        contactId: string;
        campaignId: string;
        email: string;
        eventDate: string;
        bounceType?: string;
        linkUrl?: string;
        linkId?: string;
        unsubscribeAll?: boolean;
        unsubscribeIds?: string[];
      } = {
        eventType: eventType as 'bounce' | 'click' | 'open' | 'unsubscribe' | 'complaint',
        brandId,
        contactId,
        campaignId,
        email,
        eventDate: new Date(date * 1000).toISOString()
      };

      if (eventType === 'bounce') {
        input.bounceType = eventData.type as string;
      } else if (eventType === 'click') {
        input.linkUrl = eventData.url as string;
        input.linkId = eventData.link_id as string;
      } else if (eventType === 'unsubscribe') {
        input.unsubscribeAll = eventData.unsubscribe_all as boolean;
        input.unsubscribeIds = (eventData.unsubscribe_ids as string[]) || [];
      }

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let uniqueId = `${ctx.input.eventType}-${ctx.input.contactId}-${ctx.input.campaignId}-${ctx.input.eventDate}`;

      return {
        type: `email.${ctx.input.eventType}`,
        id: uniqueId,
        output: {
          eventType: ctx.input.eventType,
          brandId: ctx.input.brandId,
          contactId: ctx.input.contactId,
          campaignId: ctx.input.campaignId,
          email: ctx.input.email,
          eventDate: ctx.input.eventDate,
          bounceType: ctx.input.bounceType,
          linkUrl: ctx.input.linkUrl,
          linkId: ctx.input.linkId,
          unsubscribeAll: ctx.input.unsubscribeAll,
          unsubscribeIds: ctx.input.unsubscribeIds
        }
      };
    }
  })
  .build();
