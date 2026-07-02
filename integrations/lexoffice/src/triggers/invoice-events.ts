import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let INVOICE_EVENT_TYPES = [
  'invoice.created',
  'invoice.changed',
  'invoice.deleted',
  'invoice.status.changed'
] as const;

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description:
    'Triggers when invoices are created, changed, deleted, or when their status changes in Lexoffice.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Lexoffice event type (e.g. invoice.created)'),
      resourceId: z.string().describe('The invoice resource ID'),
      organizationId: z.string().describe('The organization ID'),
      eventDate: z.string().describe('ISO timestamp of the event')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('The invoice ID'),
      eventType: z.string().describe('The event type that occurred'),
      voucherNumber: z.string().optional().describe('The voucher/invoice number'),
      voucherStatus: z.string().optional().describe('The current voucher status'),
      totalAmount: z.number().optional().describe('Total gross amount of the invoice')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subscriptions: { subscriptionId: string; eventType: string }[] = [];

      for (let eventType of INVOICE_EVENT_TYPES) {
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
      let isDeleted = ctx.input.eventType === 'invoice.deleted';

      let voucherNumber: string | undefined;
      let voucherStatus: string | undefined;
      let totalAmount: number | undefined;

      if (!isDeleted) {
        try {
          let invoice = await client.getInvoice(ctx.input.resourceId);
          voucherNumber = invoice.voucherNumber;
          voucherStatus = invoice.voucherStatus;
          totalAmount = invoice.totalGrossAmount ?? invoice.totalPrice?.totalGrossAmount;
        } catch (_e) {
          /* resource may not be accessible */
        }
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.resourceId}-${ctx.input.eventDate}`,
        output: {
          invoiceId: ctx.input.resourceId,
          eventType: ctx.input.eventType,
          voucherNumber,
          voucherStatus,
          totalAmount
        }
      };
    }
  })
  .build();
