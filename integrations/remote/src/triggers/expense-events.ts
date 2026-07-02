import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let EXPENSE_EVENTS = [
  'expense.created',
  'expense.submitted',
  'expense.approved',
  'expense.declined',
  'expense.reimbursed',
  'expense.updated',
  'expense.deleted'
];

export let expenseEvents = SlateTrigger.create(spec, {
  name: 'Expense Events',
  key: 'expense_events',
  description:
    'Triggered when expense events occur, including creation, submission, approval, decline, reimbursement, updates, and deletion.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of expense event'),
      eventId: z.string().describe('Unique event identifier'),
      employmentId: z.string().describe('Employment ID related to the expense'),
      expenseId: z.string().optional().describe('Expense record ID'),
      eventPayload: z.record(z.string(), z.any()).describe('Full event payload from Remote')
    })
  )
  .output(
    z.object({
      employmentId: z.string().describe('Employment ID related to the expense'),
      expenseId: z.string().optional().describe('Expense record ID'),
      eventPayload: z.record(z.string(), z.any()).describe('Full event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.auth.environment ?? 'production'
      });

      let result = await client.createWebhookCallback(
        ctx.input.webhookBaseUrl,
        EXPENSE_EVENTS
      );
      let callback = result?.data ?? result?.webhook_callback ?? result;

      return {
        registrationDetails: {
          callbackId: callback?.id ?? callback?.webhook_callback_id,
          signingKey: callback?.signing_key
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.auth.environment ?? 'production'
      });

      await client.deleteWebhookCallback(ctx.input.registrationDetails.callbackId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let employmentId: string = data?.employment_id ?? '';
      let expenseId: string | undefined = data?.expense_id ?? data?.resource_id ?? undefined;
      let eventType: string = data?.event_type ?? '';
      let eventId: string =
        data?.event_id ??
        data?.id ??
        `${eventType}-${expenseId ?? employmentId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            employmentId,
            expenseId,
            eventPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          employmentId: ctx.input.employmentId,
          expenseId: ctx.input.expenseId,
          eventPayload: ctx.input.eventPayload
        }
      };
    }
  });
