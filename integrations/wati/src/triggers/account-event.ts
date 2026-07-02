import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let accountEvent = SlateTrigger.create(spec, {
  name: 'Account Event',
  key: 'account_event',
  description:
    'Triggered when a WhatsApp Business Account or phone number event occurs, such as status reviews, deletions, content updates, or phone number quality changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type.'),
      eventId: z.string().describe('Unique event identifier.'),
      payload: z.any().describe('Raw event payload from Wati.')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Type of account event.'),
      accountId: z.string().optional().describe('WhatsApp Business Account identifier.'),
      phoneNumber: z.string().optional().describe('Affected phone number.'),
      status: z.string().optional().describe('New status or quality rating.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data?.eventType || '';
      let accountEvents = [
        'wabaStatusReviewUpdate',
        'wabaAccountDeleted',
        'wabaAccountContentUpdated',
        'phoneNumberQualityUpdate',
        'phoneNumberDeleted'
      ];

      if (!accountEvents.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: data.id || `${eventType}_${Date.now()}`,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        wabaStatusReviewUpdate: 'account.status_review',
        wabaAccountDeleted: 'account.deleted',
        wabaAccountContentUpdated: 'account.content_updated',
        phoneNumberQualityUpdate: 'phone_number.quality_update',
        phoneNumberDeleted: 'phone_number.deleted'
      };

      let type = eventTypeMap[ctx.input.eventType] || `account.${ctx.input.eventType}`;
      let payload = ctx.input.payload;

      return {
        type,
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          accountId: payload?.accountId || payload?.wabaId,
          phoneNumber: payload?.phoneNumber,
          status: payload?.status || payload?.quality
        }
      };
    }
  })
  .build();
