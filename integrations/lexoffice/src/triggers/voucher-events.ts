import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let VOUCHER_EVENT_TYPES = [
  'voucher.created',
  'voucher.changed',
  'voucher.deleted',
  'voucher.status.changed'
] as const;

export let voucherEvents = SlateTrigger.create(spec, {
  name: 'Voucher Events',
  key: 'voucher_events',
  description:
    'Triggers when bookkeeping vouchers are created, changed, deleted, or when their status changes in Lexoffice.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Lexoffice event type (e.g. voucher.created)'),
      resourceId: z.string().describe('The voucher resource ID'),
      organizationId: z.string().describe('The organization ID'),
      eventDate: z.string().describe('ISO timestamp of the event')
    })
  )
  .output(
    z.object({
      voucherId: z.string().describe('The voucher ID'),
      eventType: z.string().describe('The event type that occurred'),
      voucherNumber: z.string().optional().describe('The voucher number'),
      voucherType: z.string().optional().describe('The voucher type'),
      voucherStatus: z.string().optional().describe('The current voucher status')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subscriptions: { subscriptionId: string; eventType: string }[] = [];

      for (let eventType of VOUCHER_EVENT_TYPES) {
        let sub = await client.createEventSubscription(eventType, ctx.input.webhookBaseUrl);
        subscriptions.push({ subscriptionId: sub.subscriptionId, eventType });
      }

      return {
        registrationDetails: { subscriptions }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subs = ctx.input.registrationDetails?.subscriptions ?? [];

      for (let sub of subs) {
        try {
          await client.deleteEventSubscription(sub.subscriptionId);
        } catch (_e) {
          /* ignore cleanup errors */
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.eventType,
            resourceId: body.resourceId,
            organizationId: body.organizationId,
            eventDate: body.eventDate
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let isDeleted = ctx.input.eventType === 'voucher.deleted';

      let voucherNumber: string | undefined;
      let voucherType: string | undefined;
      let voucherStatus: string | undefined;

      if (!isDeleted) {
        try {
          let voucher = await client.getVoucher(ctx.input.resourceId);
          voucherNumber = voucher.voucherNumber;
          voucherType = voucher.voucherType ?? voucher.type;
          voucherStatus = voucher.voucherStatus ?? voucher.status;
        } catch (_e) {
          /* resource may not be accessible */
        }
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.resourceId}-${ctx.input.eventDate}`,
        output: {
          voucherId: ctx.input.resourceId,
          eventType: ctx.input.eventType,
          voucherNumber,
          voucherType,
          voucherStatus
        }
      };
    }
  })
  .build();
