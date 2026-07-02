import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let shiftEvents = SlateTrigger.create(spec, {
  name: 'Shift Events',
  key: 'shift_events',
  description:
    'Triggers when a shift is created (closed and synced to the Back Office). Useful for tracking employee work periods.'
})
  .input(
    z.object({
      shiftId: z.string().describe('Shift ID'),
      webhookType: z.string().describe('Webhook event type'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      shiftId: z.string().describe('Shift ID'),
      storeId: z.string().optional().describe('Store ID'),
      employeeId: z.string().nullable().optional().describe('Employee ID'),
      openedAt: z.string().optional().describe('Shift opened time'),
      closedAt: z.string().nullable().optional().describe('Shift closed time'),
      cashPaymentsAmount: z.number().optional().describe('Total cash payments'),
      expectedCashAmount: z.number().optional().describe('Expected cash'),
      grossSales: z.number().optional().describe('Gross sales'),
      refunds: z.number().optional().describe('Total refunds'),
      netSales: z.number().optional().describe('Net sales'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        types: ['shifts.create']
      });

      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let shiftId = body.shift_id ?? body.id ?? '';
      let webhookType = body.type ?? 'shifts.create';

      return {
        inputs: [
          {
            shiftId,
            webhookType,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let s = await client.getShift(ctx.input.shiftId);

      return {
        type: 'shift.created',
        id: ctx.input.shiftId,
        output: {
          shiftId: s.id,
          storeId: s.store_id,
          employeeId: s.employee_id,
          openedAt: s.opened_at,
          closedAt: s.closed_at,
          cashPaymentsAmount: s.cash_payments_amount,
          expectedCashAmount: s.expected_cash_amount,
          grossSales: s.gross_sales,
          refunds: s.refunds,
          netSales: s.net_sales,
          createdAt: s.created_at,
          updatedAt: s.updated_at
        }
      };
    }
  })
  .build();
