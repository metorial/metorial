import { z } from 'zod';

let appliedDiscountSchema = z.object({
  discountId: z.string().nullable().optional().describe('Discount ID'),
  type: z.string().nullable().optional().describe('Discount type'),
  name: z.string().nullable().optional().describe('Discount name'),
  percentage: z.number().nullable().optional().describe('Discount percentage, if any'),
  moneyAmount: z.number().nullable().optional().describe('Discount money amount')
});

let appliedTaxSchema = z.object({
  taxId: z.string().nullable().optional().describe('Tax ID'),
  type: z.string().nullable().optional().describe('Tax type (INCLUDED or ADDED)'),
  name: z.string().nullable().optional().describe('Tax name'),
  rate: z.number().nullable().optional().describe('Tax rate percentage'),
  moneyAmount: z.number().nullable().optional().describe('Tax money amount')
});

export let receiptLineItemSchema = z.object({
  lineItemId: z
    .string()
    .optional()
    .describe('Line item ID (use this when refunding the line item)'),
  itemId: z.string().nullable().optional().describe('Item ID'),
  variantId: z.string().nullable().optional().describe('Variant ID'),
  itemName: z.string().nullable().optional().describe('Item name'),
  variantName: z.string().nullable().optional().describe('Variant name'),
  sku: z.string().nullable().optional().describe('SKU'),
  quantity: z.number().optional().describe('Quantity sold or refunded'),
  price: z.number().nullable().optional().describe('Unit price'),
  grossTotalMoney: z.number().nullable().optional().describe('Gross total'),
  totalMoney: z.number().nullable().optional().describe('Total after discounts/taxes'),
  cost: z.number().nullable().optional().describe('Unit cost at the time of sale'),
  costTotal: z.number().nullable().optional().describe('Total cost for the line'),
  lineNote: z.string().nullable().optional().describe('Line item note'),
  totalDiscount: z.number().nullable().optional().describe('Total discount amount'),
  totalTax: z.number().nullable().optional().describe('Total tax amount for the line'),
  lineTaxes: z.array(appliedTaxSchema).optional().describe('Taxes applied to the line'),
  lineDiscounts: z
    .array(appliedDiscountSchema)
    .optional()
    .describe('Discounts applied to the line'),
  lineModifiers: z
    .array(
      z.object({
        modifierId: z.string().nullable().optional().describe('Modifier ID'),
        modifierOptionId: z.string().nullable().optional().describe('Modifier option ID'),
        name: z.string().nullable().optional().describe('Modifier name'),
        option: z.string().nullable().optional().describe('Modifier option name'),
        price: z.number().nullable().optional().describe('Modifier option unit price'),
        moneyAmount: z.number().nullable().optional().describe('Modifier total amount')
      })
    )
    .optional()
    .describe('Modifiers applied to the line')
});

export let receiptPaymentSchema = z.object({
  paymentTypeId: z.string().optional().describe('Payment type ID'),
  moneyAmount: z.number().nullable().optional().describe('Amount paid'),
  paymentName: z.string().nullable().optional().describe('Payment type name'),
  paymentType: z.string().nullable().optional().describe('Payment type kind (e.g., CASH)'),
  paidAt: z.string().nullable().optional().describe('Payment timestamp')
});

export let receiptSchema = z.object({
  receiptNumber: z.string().describe('Receipt number (unique identifier)'),
  receiptType: z.string().optional().describe('Receipt type (SALE or REFUND)'),
  refundForReceiptNumber: z
    .string()
    .nullable()
    .optional()
    .describe('Original receipt number if this is a refund'),
  order: z.string().nullable().optional().describe('Order name or number'),
  source: z.string().nullable().optional().describe('Source of the receipt'),
  storeId: z.string().optional().describe('Store ID'),
  posDeviceId: z.string().nullable().optional().describe('POS device ID'),
  employeeId: z.string().nullable().optional().describe('Employee ID'),
  customerId: z.string().nullable().optional().describe('Customer ID'),
  diningOption: z.string().nullable().optional().describe('Dining option'),
  totalMoney: z.number().optional().describe('Total amount'),
  totalTax: z.number().optional().describe('Total tax'),
  totalDiscount: z.number().optional().describe('Total discount'),
  tip: z.number().nullable().optional().describe('Tip amount'),
  surcharge: z.number().nullable().optional().describe('Surcharge amount'),
  pointsEarned: z.number().optional().describe('Loyalty points earned'),
  pointsDeducted: z.number().optional().describe('Loyalty points deducted'),
  pointsBalance: z
    .number()
    .nullable()
    .optional()
    .describe('Customer points balance after the transaction'),
  totalDiscounts: z
    .array(appliedDiscountSchema)
    .optional()
    .describe('Discounts applied to the receipt'),
  totalTaxes: z.array(appliedTaxSchema).optional().describe('Taxes applied to the receipt'),
  lineItems: z.array(receiptLineItemSchema).optional().describe('Line items'),
  payments: z.array(receiptPaymentSchema).optional().describe('Payment details'),
  note: z.string().nullable().optional().describe('Receipt note'),
  receiptDate: z.string().optional().describe('Date of the receipt'),
  cancelledAt: z.string().nullable().optional().describe('Cancellation timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapAppliedDiscount = (d: any) => ({
  discountId: d.id,
  type: d.type,
  name: d.name,
  percentage: d.percentage ?? d.value,
  moneyAmount: d.money_amount
});

let mapAppliedTax = (t: any) => ({
  taxId: t.id,
  type: t.type,
  name: t.name,
  rate: t.rate,
  moneyAmount: t.money_amount
});

let sumMoney = (values: any[]) => {
  let amounts = values
    .map(value => value?.money_amount)
    .filter((value): value is number => typeof value === 'number');
  return amounts.length > 0
    ? Math.round(amounts.reduce((total, value) => total + value, 0) * 1000) / 1000
    : undefined;
};

export let mapReceipt = (r: any): z.infer<typeof receiptSchema> => ({
  receiptNumber: r.receipt_number,
  receiptType: r.receipt_type,
  refundForReceiptNumber: r.refund_for,
  order: r.order,
  source: r.source,
  storeId: r.store_id,
  posDeviceId: r.pos_device_id,
  employeeId: r.employee_id,
  customerId: r.customer_id,
  diningOption: r.dining_option,
  totalMoney: r.total_money,
  totalTax: r.total_tax,
  totalDiscount: r.total_discount,
  tip: r.tip,
  surcharge: r.surcharge,
  pointsEarned: r.points_earned,
  pointsDeducted: r.points_deducted,
  pointsBalance: r.points_balance,
  totalDiscounts: r.total_discounts?.map(mapAppliedDiscount),
  totalTaxes: r.total_taxes?.map(mapAppliedTax),
  lineItems: r.line_items?.map((li: any) => ({
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
    cost: li.cost,
    costTotal: li.cost_total,
    lineNote: li.line_note,
    totalDiscount: li.total_discount,
    totalTax: li.total_tax ?? sumMoney(li.line_taxes ?? []),
    lineTaxes: li.line_taxes?.map(mapAppliedTax),
    lineDiscounts: li.line_discounts?.map(mapAppliedDiscount),
    lineModifiers: li.line_modifiers?.map((m: any) => ({
      modifierId: m.id,
      modifierOptionId: m.modifier_option_id,
      name: m.name,
      option: m.option,
      price: m.price,
      moneyAmount: m.money_amount
    }))
  })),
  payments: r.payments?.map((p: any) => ({
    paymentTypeId: p.payment_type_id,
    moneyAmount: p.money_amount,
    paymentName: p.name,
    paymentType: p.type,
    paidAt: p.paid_at
  })),
  note: r.note,
  receiptDate: r.receipt_date,
  cancelledAt: r.cancelled_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});
