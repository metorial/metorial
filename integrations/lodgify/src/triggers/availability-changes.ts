import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let availabilityChanges = SlateTrigger.create(spec, {
  name: 'Availability Changes',
  key: 'availability_changes',
  description:
    'Triggers when the availability calendar changes for a property, such as dates being blocked or opened.'
})
  .input(
    z.object({
      action: z.string().describe('The webhook action type'),
      propertyId: z.number().describe('The affected property ID'),
      roomTypeIds: z.array(z.number()).describe('Affected room type IDs'),
      startDate: z.string().optional().describe('Start date of the availability change'),
      endDate: z.string().optional().describe('End date of the availability change'),
      source: z.string().optional().describe('Source of the availability change')
    })
  )
  .output(
    z.object({
      propertyId: z.number().describe('ID of the affected property'),
      roomTypeIds: z.array(z.number()).describe('IDs of affected room types'),
      startDate: z
        .string()
        .optional()
        .describe('Start date of the changed availability period'),
      endDate: z.string().optional().describe('End date of the changed availability period'),
      source: z.string().optional().describe('What triggered the availability change')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.subscribeWebhook(
        'availability_change',
        ctx.input.webhookBaseUrl
      );

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
            action: (data.action as string) ?? 'availability_change',
            propertyId: Number(data.property_id ?? 0),
            roomTypeIds: (data.room_type_ids as number[]) ?? [],
            startDate: data.start as string | undefined,
            endDate: data.end as string | undefined,
            source: data.source as string | undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'availability.changed',
        id: `availability-${ctx.input.propertyId}-${ctx.input.startDate ?? ''}-${Date.now()}`,
        output: {
          propertyId: ctx.input.propertyId,
          roomTypeIds: ctx.input.roomTypeIds,
          startDate: ctx.input.startDate,
          endDate: ctx.input.endDate,
          source: ctx.input.source
        }
      };
    }
  })
  .build();
