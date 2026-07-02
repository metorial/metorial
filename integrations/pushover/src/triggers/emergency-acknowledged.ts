import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let emergencyAcknowledged = SlateTrigger.create(spec, {
  name: 'Emergency Notification Acknowledged',
  key: 'emergency_acknowledged',
  description:
    'Triggers when a user acknowledges an emergency-priority notification. Set the callback URL when sending an emergency notification to the webhook URL provided by this trigger.'
})
  .input(
    z.object({
      receiptId: z.string().describe('Receipt ID of the acknowledged emergency notification'),
      acknowledgedAt: z
        .number()
        .describe('Unix timestamp when the notification was acknowledged'),
      acknowledgedByUserKey: z.string().describe('User key of the person who acknowledged'),
      acknowledgedByDevice: z
        .string()
        .describe('Device name from which the notification was acknowledged')
    })
  )
  .output(
    z.object({
      receiptId: z.string().describe('Receipt ID of the acknowledged emergency notification'),
      acknowledgedAt: z
        .number()
        .describe('Unix timestamp when the notification was acknowledged'),
      acknowledgedByUserKey: z.string().describe('User key of the person who acknowledged'),
      acknowledgedByDevice: z
        .string()
        .describe('Device name from which the notification was acknowledged')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') || '';
      let params: Record<string, string> = {};

      if (contentType.includes('application/x-www-form-urlencoded')) {
        let text = await ctx.request.text();
        let searchParams = new URLSearchParams(text);
        for (let [key, value] of searchParams.entries()) {
          params[key] = value;
        }
      } else {
        // Try parsing as JSON as fallback
        try {
          params = (await ctx.request.json()) as Record<string, string>;
        } catch {
          let text = await ctx.request.text();
          let searchParams = new URLSearchParams(text);
          for (let [key, value] of searchParams.entries()) {
            params[key] = value;
          }
        }
      }

      let receiptId = params.receipt || '';
      let acknowledgedAt = Number.parseInt(params.acknowledged_at || '0', 10);
      let acknowledgedByUserKey = params.acknowledged_by || '';
      let acknowledgedByDevice = params.acknowledged_by_device || '';

      return {
        inputs: [
          {
            receiptId,
            acknowledgedAt,
            acknowledgedByUserKey,
            acknowledgedByDevice
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'emergency_notification.acknowledged',
        id: `${ctx.input.receiptId}-${ctx.input.acknowledgedAt}`,
        output: {
          receiptId: ctx.input.receiptId,
          acknowledgedAt: ctx.input.acknowledgedAt,
          acknowledgedByUserKey: ctx.input.acknowledgedByUserKey,
          acknowledgedByDevice: ctx.input.acknowledgedByDevice
        }
      };
    }
  })
  .build();
