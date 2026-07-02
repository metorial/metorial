import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReceipt = SlateTool.create(spec, {
  name: 'Get Receipt',
  key: 'get_receipt',
  description: `Retrieve a single sales receipt by its receipt number, including full line items, payment details, taxes, and discounts.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      receiptNumber: z.string().describe('The receipt number to retrieve')
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
        .describe('Original receipt number if refund'),
      storeId: z.string().optional(),
      employeeId: z.string().nullable().optional(),
      customerId: z.string().nullable().optional(),
      totalMoney: z.number().optional(),
      totalTax: z.number().optional(),
      totalDiscount: z.number().optional(),
      pointsEarned: z.number().optional(),
      pointsDeducted: z.number().optional(),
      lineItems: z
        .array(
          z.object({
            lineItemId: z.string().optional(),
            itemId: z.string().nullable().optional(),
            variantId: z.string().nullable().optional(),
            itemName: z.string().nullable().optional(),
            quantity: z.number().optional(),
            price: z.number().optional(),
            totalMoney: z.number().optional()
          })
        )
        .optional(),
      payments: z
        .array(
          z.object({
            paymentTypeId: z.string().optional(),
            moneyAmount: z.number().optional(),
            paymentName: z.string().nullable().optional()
          })
        )
        .optional(),
      note: z.string().nullable().optional(),
      receiptDate: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let r = await client.getReceipt(ctx.input.receiptNumber);

    return {
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
        pointsEarned: r.points_earned,
        pointsDeducted: r.points_deducted,
        lineItems: (r.line_items ?? []).map((li: any) => ({
          lineItemId: li.id,
          itemId: li.item_id,
          variantId: li.variant_id,
          itemName: li.item_name,
          quantity: li.quantity,
          price: li.price,
          totalMoney: li.total_money
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
      },
      message: `Retrieved receipt **${r.receipt_number}** (${r.receipt_type ?? 'SALE'}) for **${r.total_money}**.`
    };
  })
  .build();
