import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let EVENT_TYPES = [
  'EXPENSE_PAYMENT_UPDATED',
  'TRANSFER_PROCESSED',
  'TRANSFER_FAILED',
  'REFERRAL_CREATED',
  'REFERRAL_ACTIVATED',
  'REFERRAL_APPLICATION_STATUS_CHANGED',
  'USER_UPDATED',
  'ACCOUNTING_RECORD_READY_FOR_EXPORT'
] as const;

export let brexEvents = SlateTrigger.create(spec, {
  name: 'Brex Events',
  key: 'brex_events',
  description: `Receives real-time webhook notifications from Brex for expense payments, transfers, user updates, referrals, and accounting records.`
})
  .input(
    z.object({
      eventType: z.string().describe('The Brex event type'),
      eventId: z.string().describe('Unique identifier for deduplication'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      rawPayload: z.any().describe('Raw event payload from Brex')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('The Brex event type'),
      resourceId: z.string().nullable().describe('ID of the affected resource'),
      expenseId: z.string().nullable().optional().describe('Expense ID (for expense events)'),
      paymentStatus: z
        .string()
        .nullable()
        .optional()
        .describe('Payment status (for expense events)'),
      paymentType: z
        .string()
        .nullable()
        .optional()
        .describe('Payment type (for expense events)'),
      amount: z
        .object({
          amount: z.number().describe('Amount in cents'),
          currency: z.string().nullable().describe('Currency code')
        })
        .nullable()
        .optional()
        .describe('Transaction amount'),
      merchantDescription: z
        .string()
        .nullable()
        .optional()
        .describe('Merchant description (for expense events)'),
      transferId: z
        .string()
        .nullable()
        .optional()
        .describe('Transfer ID (for transfer events)'),
      transferStatus: z.string().nullable().optional().describe('Transfer status'),
      userId: z.string().nullable().optional().describe('User ID (for user events)'),
      userStatus: z
        .string()
        .nullable()
        .optional()
        .describe('Updated user status (for user events)'),
      referralId: z
        .string()
        .nullable()
        .optional()
        .describe('Referral ID (for referral events)'),
      applicationStatus: z
        .string()
        .nullable()
        .optional()
        .describe('Application status (for referral events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // Brex only allows one webhook per customer/client_id
      // Check for existing webhooks first
      let existing = await client.listWebhooks();
      let existingWebhook = existing.items?.[0];

      let webhook: any;
      if (existingWebhook) {
        webhook = await client.updateWebhook(existingWebhook.id, {
          url: ctx.input.webhookBaseUrl,
          event_types: [...EVENT_TYPES]
        });
      } else {
        webhook = await client.createWebhook({
          url: ctx.input.webhookBaseUrl,
          event_types: [...EVENT_TYPES]
        });
      }

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };

      if (details?.webhookId) {
        await client.deleteWebhook(details.webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event_type ?? body.type ?? 'UNKNOWN';
      let webhookId = ctx.request.headers.get('webhook-id') ?? crypto.randomUUID();

      let resourceId: string | undefined;
      if (eventType.startsWith('EXPENSE_')) {
        resourceId = body.expense_id ?? body.id;
      } else if (eventType.startsWith('TRANSFER_')) {
        resourceId = body.transfer_id ?? body.id;
      } else if (eventType.startsWith('USER_')) {
        resourceId = body.user_id ?? body.id;
      } else if (eventType.startsWith('REFERRAL_')) {
        resourceId = body.referral_id ?? body.id;
      } else if (eventType.startsWith('ACCOUNTING_')) {
        resourceId = body.accounting_record_id ?? body.id;
      }

      return {
        inputs: [
          {
            eventType,
            eventId: webhookId,
            resourceId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, rawPayload } = ctx.input;
      let payload = rawPayload as any;
      let type = eventType.toLowerCase().replace(/_/g, '.');

      let output: any = {
        eventType,
        resourceId: ctx.input.resourceId ?? null
      };

      if (eventType === 'EXPENSE_PAYMENT_UPDATED') {
        output.expenseId = payload.expense_id ?? null;
        output.paymentStatus = payload.payment_status ?? null;
        output.paymentType = payload.payment_type ?? null;
        output.amount = payload.amount
          ? { amount: payload.amount.amount, currency: payload.amount.currency }
          : null;
        output.merchantDescription =
          payload.merchant_description ?? payload.merchant?.raw_descriptor ?? null;
      } else if (eventType === 'TRANSFER_PROCESSED' || eventType === 'TRANSFER_FAILED') {
        output.transferId = payload.transfer_id ?? null;
        output.transferStatus = eventType === 'TRANSFER_PROCESSED' ? 'PROCESSED' : 'FAILED';
        output.amount = payload.amount
          ? { amount: payload.amount.amount, currency: payload.amount.currency }
          : null;
      } else if (eventType === 'USER_UPDATED') {
        output.userId = payload.user_id ?? null;
        output.userStatus = payload.status ?? payload.updated_status ?? null;
      } else if (eventType.startsWith('REFERRAL_')) {
        output.referralId = payload.referral_id ?? null;
        output.applicationStatus = payload.application_status ?? payload.status ?? null;
      }

      return {
        type,
        id: ctx.input.eventId,
        output
      };
    }
  })
  .build();
