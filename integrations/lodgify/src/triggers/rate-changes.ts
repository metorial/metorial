import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let rateChanges = SlateTrigger.create(spec, {
  name: 'Rate Changes',
  key: 'rate_changes',
  description:
    'Triggers when rates/pricing changes for a property, including nightly rates, seasonal rates, and discount changes.'
})
  .input(
    z.object({
      action: z.string().describe('The webhook action type'),
      propertyId: z.number().describe('The affected property ID'),
      roomTypeIds: z.array(z.number()).describe('Affected room type IDs')
    })
  )
  .output(
    z.object({
      propertyId: z.number().describe('ID of the affected property'),
      roomTypeIds: z.array(z.number()).describe('IDs of affected room types')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.subscribeWebhook('rate_change', ctx.input.webhookBaseUrl);

      return {
        registrationDetails: {
          webhookId: String(result.id ?? result.webhook_id ?? result),
          secret: result.secret ?? result.signing_secret ?? ''
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };

      try {
        await client.unsubscribeWebhook(details.webhookId);
      } catch (_e) {
        // Best-effort unregistration
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      return {
        inputs: [
          {
            action: (data.action as string) ?? 'rate_change',
            propertyId: Number(data.property_id ?? 0),
            roomTypeIds: (data.room_type_ids as number[]) ?? []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'rate.changed',
        id: `rate-${ctx.input.propertyId}-${Date.now()}`,
        output: {
          propertyId: ctx.input.propertyId,
          roomTypeIds: ctx.input.roomTypeIds
        }
      };
    }
  })
  .build();
