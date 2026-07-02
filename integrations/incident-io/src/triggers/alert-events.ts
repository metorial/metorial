import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let alertEvents = SlateTrigger.create(spec, {
  name: 'Alert Events',
  key: 'alert_events',
  description:
    'Triggered when new alerts are created. Covers both public and private alert events.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      webhookId: z.string().describe('Unique ID for this webhook delivery'),
      alertId: z.string().describe('ID of the alert'),
      isPrivate: z
        .boolean()
        .describe('Whether this alert is associated with a private incident'),
      alert: z.any().optional().describe('Full alert payload')
    })
  )
  .output(
    z.object({
      alertId: z.string(),
      title: z.string().optional(),
      status: z.string().optional(),
      description: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = (body.event_type as string) || '';

      let isAlertEvent = eventType.includes('alert.created');

      if (!isAlertEvent) {
        return { inputs: [] };
      }

      let isPrivate = eventType.startsWith('private_');
      let alertData = body.alert;
      let alertId = alertData?.id || '';

      return {
        inputs: [
          {
            eventType,
            webhookId: body.id || crypto.randomUUID(),
            alertId,
            isPrivate,
            alert: isPrivate ? undefined : alertData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let alertData = input.alert;

      if (input.isPrivate && !alertData) {
        try {
          let client = new Client({ token: ctx.auth.token });
          let result = await client.getAlert(input.alertId);
          alertData = result.alert;
        } catch {
          // API key may not have private incident access
        }
      }

      return {
        type: 'alert.created',
        id: input.webhookId,
        output: {
          alertId: input.alertId,
          title: alertData?.title || undefined,
          status: alertData?.status || undefined,
          description: alertData?.description || undefined,
          createdAt: alertData?.created_at || undefined
        }
      };
    }
  })
  .build();
