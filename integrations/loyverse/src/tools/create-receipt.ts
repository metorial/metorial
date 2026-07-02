import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createReceipt = SlateTool.create(spec, {
  name: 'Create Receipt',
  key: 'create_receipt',
  description: `Create a new sales receipt (transaction). The receipt includes line items, payment information, and optionally a customer. Use this to record sales programmatically.`,
  constraints: ['Receipts created via API can only have one payment type.']
})
  .input(
    z.object({
      storeId: z.string().describe('Store ID where the sale occurred'),
      employeeId: z.string().optional().describe('Employee ID who processed the sale'),
      customerId: z.string().optional().describe('Customer ID to assign to the receipt'),
      source: z.string().optional().describe('Source of the receipt (e.g., API)'),
      receiptDate: z.string().optional().describe('Receipt date in ISO 8601 format'),
      lineItems: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID of the item sold'),
            quantity: z.number().describe('Quantity sold'),
            price: z.number().optional().describe('Override unit price'),
            lineNote: z.string().optional().describe('Note for the line item')
          })
        )
        .min(1)
        .describe('Items sold in this receipt'),
      payment: z
        .object({
          paymentTypeId: z.string().describe('Payment type ID'),
          moneyAmount: z.number().describe('Amount paid')
        })
        .describe('Payment for the receipt (only one allowed)'),
      note: z.string().optional().describe('Receipt-level note')
    })
  )
  .output(
    z.object({
      receiptNumber: z.string().describe('Generated receipt number'),
      receiptType: z.string().optional(),
      totalMoney: z.number().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: any = {
      store_id: ctx.input.storeId,
      line_items: ctx.input.lineItems.map(li => ({
        variant_id: li.variantId,
        quantity: li.quantity,
        price: li.price,
        line_note: li.lineNote
      })),
      payments: [
        {
          payment_type_id: ctx.input.payment.paymentTypeId,
          money_amount: ctx.input.payment.moneyAmount
        }
      ]
    };

    if (ctx.input.employeeId) body.employee_id = ctx.input.employeeId;
    if (ctx.input.customerId) body.customer_id = ctx.input.customerId;
    if (ctx.input.source) body.source = ctx.input.source;
    if (ctx.input.receiptDate) body.receipt_date = ctx.input.receiptDate;
    if (ctx.input.note) body.note = ctx.input.note;

    let result = await client.createReceipt(body);

    return {
      output: {
        receiptNumber: result.receipt_number,
        receiptType: result.receipt_type,
        totalMoney: result.total_money,
        createdAt: result.created_at
      },
      message: `Created receipt **${result.receipt_number}** for **${result.total_money}**.`
    };
  })
  .build();
