import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let invoiceAdjustmentEvents = SlateTrigger.create(spec, {
  name: 'Invoice Adjustment Events',
  key: 'invoice_adjustment_events',
  description:
    'Triggered when invoice adjustment events occur: created, reviewed (approved/denied), or pending for approval.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type identifier'),
      eventId: z.string().describe('Unique identifier for this event'),
      payload: z.any().describe('Full event payload from Deel')
    })
  )
  .output(
    z.object({
      adjustmentId: z.string().describe('ID of the invoice adjustment'),
      contractId: z.string().optional().describe('ID of the associated contract'),
      adjustmentType: z
        .string()
        .optional()
        .describe('Type of adjustment (bonus, expense, etc.)'),
      amount: z.number().optional().describe('Adjustment amount'),
      status: z.string().optional().describe('Adjustment review status'),
      rawEvent: z.any().describe('Full raw event data from Deel')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        name: 'Slates Invoice Adjustment Events',
        description: 'Auto-registered webhook for invoice adjustment events',
        url: ctx.input.webhookBaseUrl,
        events: [
          'invoice_adjustment.created',
          'invoice_adjustment.reviewed',
          'invoice_adjustment.pending'
        ]
      });

      let webhookData = result?.data ?? result;

      return {
        registrationDetails: {
          webhookId: webhookData?.id ?? webhookData?.webhook_id,
          secret: webhookData?.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let meta = data?.data?.meta ?? data?.meta ?? {};
      let trackingId = meta.tracking_id ?? data?.id ?? `invoice_adjustment-${Date.now()}`;
      let eventType = meta.event_type ?? data?.event_type ?? 'invoice_adjustment.unknown';

      return {
        inputs: [
          {
            eventType,
            eventId: trackingId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.payload?.data?.resource ?? ctx.input.payload?.resource ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          adjustmentId: resource?.id?.toString() ?? '',
          contractId: resource?.contract_id?.toString(),
          adjustmentType: resource?.type,
          amount: resource?.amount != null ? Number(resource.amount) : undefined,
          status: resource?.status,
          rawEvent: ctx.input.payload
        }
      };
    }
  })
  .build();
