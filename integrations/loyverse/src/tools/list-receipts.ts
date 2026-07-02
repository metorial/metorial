import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  lineItemId: z.string().optional().describe('Line item ID'),
  itemId: z.string().nullable().optional().describe('Item ID'),
  variantId: z.string().nullable().optional().describe('Variant ID'),
  itemName: z.string().nullable().optional().describe('Item name'),
  variantName: z.string().nullable().optional().describe('Variant name'),
  sku: z.string().nullable().optional().describe('SKU'),
  quantity: z.number().optional().describe('Quantity sold'),
  price: z.number().optional().describe('Unit price'),
  grossTotalMoney: z.number().optional().describe('Gross total'),
  totalMoney: z.number().optional().describe('Total after discounts/taxes'),
  totalDiscount: z.number().optional().describe('Total discount amount'),
  totalTax: z.number().optional().describe('Total tax amount')
});

let paymentSchema = z.object({
  paymentTypeId: z.string().optional().describe('Payment type ID'),
  moneyAmount: z.number().optional().describe('Amount paid'),
  paymentName: z.string().nullable().optional().describe('Payment type name')
});

let receiptSchema = z.object({
  receiptNumber: z.string().describe('Receipt number (unique identifier)'),
  receiptType: z.string().optional().describe('Receipt type (SALE, REFUND)'),
  refundForReceiptNumber: z
    .string()
    .nullable()
    .optional()
    .describe('Original receipt number if this is a refund'),
  storeId: z.string().optional().describe('Store ID'),
  employeeId: z.string().nullable().optional().describe('Employee ID'),
  customerId: z.string().nullable().optional().describe('Customer ID'),
  totalMoney: z.number().optional().describe('Total amount'),
  totalTax: z.number().optional().describe('Total tax'),
  totalDiscount: z.number().optional().describe('Total discount'),
  pointsEarned: z.number().optional().describe('Loyalty points earned'),
  pointsDeducted: z.number().optional().describe('Loyalty points deducted'),
  lineItems: z.array(lineItemSchema).optional().describe('Line items'),
  payments: z.array(paymentSchema).optional().describe('Payment details'),
  note: z.string().nullable().optional().describe('Receipt note'),
  receiptDate: z.string().optional().describe('Date of the receipt'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listReceipts = SlateTool.create(spec, {
  name: 'List Receipts',
  key: 'list_receipts',
  description: `Retrieve sales receipts (transactions) from Loyverse. Supports date range filtering for syncing sales data to external systems. Returns line items, payments, discounts, and tax details.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of receipts to return (1-250, default 50)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Filter receipts created at or after this ISO 8601 timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Filter receipts created at or before this ISO 8601 timestamp'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Filter receipts updated at or after this ISO 8601 timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Filter receipts updated at or before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      receipts: z.array(receiptSchema).describe('List of receipts'),
      cursor: z.string().nullable().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listReceipts({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax
    });

    let receipts = (result.receipts ?? []).map((r: any) => ({
      receiptNumber: r.receipt_number,
      receiptType: r.receipt_type,
      refundForReceiptNumber: r.refund_for,
      storeId: r.store_id,
      employeeId: r.employee_id,
      customerId: r.customer_id,
      totalMoney: r.total_money,
      totalTax: r.total_tax,
      totalDiscount: r.total_discount,
      pointsEarned: r.points_earned,
      pointsDeducted: r.points_deducted,
      lineItems: (r.line_items ?? []).map((li: any) => ({
        lineItemId: li.id,
        itemId: li.item_id,
        variantId: li.variant_id,
        itemName: li.item_name,
        variantName: li.variant_name,
        sku: li.sku,
        quantity: li.quantity,
        price: li.price,
        grossTotalMoney: li.gross_total_money,
        totalMoney: li.total_money,
        totalDiscount: li.total_discount,
        totalTax: li.total_tax
      })),
      payments: (r.payments ?? []).map((p: any) => ({
        paymentTypeId: p.payment_type_id,
        moneyAmount: p.money_amount,
        paymentName: p.name
      })),
      note: r.note,
      receiptDate: r.receipt_date,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return {
      output: { receipts, cursor: result.cursor },
      message: `Retrieved **${receipts.length}** receipt(s).${result.cursor ? ' More available via cursor.' : ''}`
    };
  })
  .build();
