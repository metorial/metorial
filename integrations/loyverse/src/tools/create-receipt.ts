import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapReceipt, receiptSchema } from '../lib/receipts';
import { spec } from '../spec';

export let createReceipt = SlateTool.create(spec, {
  name: 'Create Receipt',
  key: 'create_receipt',
  description: `Create a new sales receipt (transaction) in a store. The receipt includes line items (by variant ID), one payment, and optionally a customer, order reference, taxes, discounts, and modifiers. Totals are calculated by Loyverse. Use this to record sales made in another system.`,
  instructions: [
    'Find variant IDs with List Variants (filter by SKU) or List Items, store IDs with List Stores, and payment type IDs with List Payment Types.',
    'Taxes and discounts referenced on a receipt must already exist; use their IDs from List Taxes and List Discounts.'
  ],
  constraints: ['Receipts created via API can only have one payment.']
})
  .input(
    z.object({
      storeId: z.string().describe('Store ID where the sale occurred'),
      employeeId: z.string().optional().describe('Employee ID who processed the sale'),
      customerId: z.string().optional().describe('Customer ID to assign to the receipt'),
      order: z
        .string()
        .optional()
        .describe('Order name or number associated with the sale (max 20 characters)'),
      source: z
        .string()
        .optional()
        .describe('Source of the receipt; defaults to the name of the connected app'),
      receiptDate: z
        .string()
        .optional()
        .describe(
          'Receipt date in ISO 8601 UTC format; set it to record a sale that happened in the past'
        ),
      lineItems: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID of the item sold'),
            quantity: z.number().describe('Quantity sold'),
            price: z
              .number()
              .optional()
              .describe(
                'Unit price (including INCLUDED taxes, excluding discounts, modifiers, and ADDED taxes); defaults to the variant price'
              ),
            cost: z
              .number()
              .optional()
              .describe('Unit cost at the time of sale; defaults to the variant cost'),
            lineNote: z.string().optional().describe('Note for the line item'),
            lineTaxIds: z
              .array(z.string())
              .optional()
              .describe('IDs of existing taxes applied to this line item'),
            lineDiscountIds: z
              .array(z.string())
              .optional()
              .describe(
                'IDs of discounts from totalDiscounts with scope LINE_ITEM that apply to this line item'
              ),
            lineModifiers: z
              .array(
                z.object({
                  modifierOptionId: z.string().describe('Existing modifier option ID'),
                  price: z.number().optional().describe('Modifier option price')
                })
              )
              .optional()
              .describe('Modifier options applied to this line item')
          })
        )
        .min(1)
        .describe('Items sold in this receipt'),
      totalDiscounts: z
        .array(
          z.object({
            discountId: z.string().describe('ID of an existing discount'),
            scope: z
              .enum(['RECEIPT', 'LINE_ITEM'])
              .describe(
                'RECEIPT applies the discount to every line; LINE_ITEM applies it only to lines that list it in lineDiscountIds'
              ),
            percentage: z
              .number()
              .optional()
              .describe('Percentage for VARIABLE_PERCENT discounts (e.g., 10.5)'),
            moneyAmount: z
              .number()
              .optional()
              .describe('Money amount for VARIABLE_AMOUNT and DISCOUNT_BY_POINTS discounts')
          })
        )
        .optional()
        .describe('Discounts applied to the receipt'),
      payment: z
        .object({
          paymentTypeId: z.string().describe('Payment type ID'),
          moneyAmount: z
            .number()
            .optional()
            .describe(
              'Amount paid; Loyverse calculates the payment amount from the receipt total'
            ),
          paidAt: z.string().optional().describe('Payment time in ISO 8601 UTC format')
        })
        .describe('Payment for the receipt (only one allowed)'),
      note: z.string().optional().describe('Receipt-level note')
    })
  )
  .output(receiptSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payment: Record<string, unknown> = {
      payment_type_id: ctx.input.payment.paymentTypeId
    };
    if (ctx.input.payment.moneyAmount !== undefined)
      payment.money_amount = ctx.input.payment.moneyAmount;
    if (ctx.input.payment.paidAt) payment.paid_at = ctx.input.payment.paidAt;

    let body: any = {
      store_id: ctx.input.storeId,
      line_items: ctx.input.lineItems.map(li => {
        let line: any = {
          variant_id: li.variantId,
          quantity: li.quantity
        };
        if (li.price !== undefined) line.price = li.price;
        if (li.cost !== undefined) line.cost = li.cost;
        if (li.lineNote !== undefined) line.line_note = li.lineNote;
        if (li.lineTaxIds) line.line_taxes = li.lineTaxIds.map(id => ({ id }));
        if (li.lineDiscountIds) line.line_discounts = li.lineDiscountIds.map(id => ({ id }));
        if (li.lineModifiers) {
          line.line_modifiers = li.lineModifiers.map(m => {
            let modifier: any = { modifier_option_id: m.modifierOptionId };
            if (m.price !== undefined) modifier.price = m.price;
            return modifier;
          });
        }
        return line;
      }),
      payments: [payment]
    };

    if (ctx.input.employeeId) body.employee_id = ctx.input.employeeId;
    if (ctx.input.customerId) body.customer_id = ctx.input.customerId;
    if (ctx.input.order) body.order = ctx.input.order;
    if (ctx.input.source) body.source = ctx.input.source;
    if (ctx.input.receiptDate) body.receipt_date = ctx.input.receiptDate;
    if (ctx.input.note) body.note = ctx.input.note;
    if (ctx.input.totalDiscounts) {
      body.total_discounts = ctx.input.totalDiscounts.map(d => {
        let discount: any = { id: d.discountId, scope: d.scope };
        if (d.percentage !== undefined) discount.percentage = d.percentage;
        if (d.moneyAmount !== undefined) discount.money_amount = d.moneyAmount;
        return discount;
      });
    }

    let result = await client.createReceipt(body);

    return {
      output: mapReceipt(result),
      message: `Created receipt **${result.receipt_number}**${result.total_money !== undefined ? ` for **${result.total_money}**` : ''}.`
    };
  })
  .build();
