import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let receiptEvents = SlateTrigger.create(spec, {
  name: 'Receipt Events',
  key: 'receipt_events',
  description:
    'Triggers when a receipt (sale) is created or updated. Useful for syncing sales data to external accounting or analytics systems.'
})
  .input(
    z.object({
      receiptNumber: z.string().describe('Receipt number'),
      webhookType: z.string().describe('Webhook event type'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      receiptNumber: z.string().describe('Receipt number'),
      receiptType: z.string().optional().describe('SALE or REFUND'),
      refundForReceiptNumber: z
        .string()
        .nullable()
        .optional()
        .describe('Original receipt if refund'),
      storeId: z.string().optional().describe('Store ID'),
      employeeId: z.string().nullable().optional().describe('Employee ID'),
      customerId: z.string().nullable().optional().describe('Customer ID'),
      totalMoney: z.number().optional().describe('Total amount'),
      totalTax: z.number().optional().describe('Total tax'),
      totalDiscount: z.number().optional().describe('Total discount'),
      lineItems: z
        .array(
          z.object({
            itemId: z.string().nullable().optional(),
            variantId: z.string().nullable().optional(),
            itemName: z.string().nullable().optional(),
            quantity: z.number().optional(),
            price: z.number().optional(),
            totalMoney: z.number().optional()
          })
        )
        .optional()
        .describe('Line items'),
      payments: z
        .array(
          z.object({
            paymentTypeId: z.string().optional(),
            moneyAmount: z.number().optional()
          })
        )
        .optional()
        .describe('Payments'),
      receiptDate: z.string().optional().describe('Receipt date'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        types: ['receipts.update']
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

      // Loyverse sends receipt_number in the payload
      let receiptNumber = body.receipt_number ?? body.id ?? '';
      let webhookType = body.type ?? 'receipts.update';

      return {
        inputs: [
          {
            receiptNumber,
            webhookType,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let r = await client.getReceipt(ctx.input.receiptNumber);

      return {
        type: 'receipt.updated',
        id: ctx.input.receiptNumber,
        output: {
          receiptNumber: r.receipt_number,
          receiptType: r.receipt_type,
          refundForReceiptNumber: r.refund_for,
          storeId: r.store_id,
          employeeId: r.employee_id,
          customerId: r.customer_id,
          totalMoney: r.total_money,
          totalTax: r.total_tax,
          totalDiscount: r.total_discount,
          lineItems: (r.line_items ?? []).map((li: any) => ({
            itemId: li.item_id,
            variantId: li.variant_id,
            itemName: li.item_name,
            quantity: li.quantity,
            price: li.price,
            totalMoney: li.total_money
          })),
          payments: (r.payments ?? []).map((p: any) => ({
            paymentTypeId: p.payment_type_id,
            moneyAmount: p.money_amount
          })),
          receiptDate: r.receipt_date,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }
      };
    }
  })
  .build();
