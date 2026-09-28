import { z } from 'zod';
import type { SquareMoney, SquarePayment, SquareRefund } from '../lib/types';

export let moneyInputSchema = z.object({
  amount: z.number().int().safe().describe('Integer amount in the currency’s smallest unit'),
  currency: z.string().length(3).describe('ISO 4217 currency code, such as USD')
});

export let moneyOutputSchema = z
  .object({ amount: z.number().optional(), currency: z.string().optional() })
  .optional();

export let paymentOutputSchema = z.object({
  paymentId: z.string().optional(),
  status: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  isOfflinePayment: z.boolean().optional(),
  buyerEmailAddress: z.string().optional(),
  versionToken: z.string().optional(),
  amountMoney: moneyOutputSchema,
  approvedMoney: moneyOutputSchema,
  tipMoney: moneyOutputSchema,
  totalMoney: moneyOutputSchema,
  appFeeMoney: moneyOutputSchema,
  appFeeAllocations: z.array(z.record(z.string(), z.any())).optional(),
  refundedMoney: moneyOutputSchema,
  refundIds: z.array(z.string()).optional(),
  sourceType: z.string().optional(),
  cardBrand: z.string().optional(),
  cardLastFour: z.string().optional(),
  cashDetails: z.record(z.string(), z.any()).optional(),
  externalDetails: z.record(z.string(), z.any()).optional(),
  locationId: z.string().optional(),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
  referenceId: z.string().optional(),
  note: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptUrl: z.string().optional(),
  delayAction: z.string().optional(),
  delayDuration: z.string().optional(),
  delayedUntil: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let mapPayment = (payment: SquarePayment) => ({
  paymentId: payment.id,
  status: payment.status,
  capabilities: payment.capabilities,
  isOfflinePayment: payment.is_offline_payment,
  buyerEmailAddress: payment.buyer_email_address,
  versionToken: payment.version_token,
  amountMoney: payment.amount_money,
  approvedMoney: payment.approved_money,
  tipMoney: payment.tip_money,
  totalMoney: payment.total_money,
  appFeeMoney: payment.app_fee_money,
  appFeeAllocations: payment.app_fee_allocations,
  refundedMoney: payment.refunded_money,
  refundIds: payment.refund_ids,
  sourceType: payment.source_type,
  cardBrand: payment.card_details?.card?.card_brand,
  cardLastFour: payment.card_details?.card?.last_4,
  cashDetails: payment.cash_details,
  externalDetails: payment.external_details,
  locationId: payment.location_id,
  orderId: payment.order_id,
  customerId: payment.customer_id,
  referenceId: payment.reference_id,
  note: payment.note,
  receiptNumber: payment.receipt_number,
  receiptUrl: payment.receipt_url,
  delayAction: payment.delay_action,
  delayDuration: payment.delay_duration,
  delayedUntil: payment.delayed_until,
  createdAt: payment.created_at,
  updatedAt: payment.updated_at
});

export let refundOutputSchema = z.object({
  refundId: z.string().optional(),
  status: z.string().optional(),
  amountMoney: moneyOutputSchema,
  appFeeMoney: moneyOutputSchema,
  appFeeAllocations: z.array(z.record(z.string(), z.any())).optional(),
  paymentId: z.string().optional(),
  orderId: z.string().optional(),
  reason: z.string().optional(),
  locationId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let mapRefund = (refund: SquareRefund) => ({
  refundId: refund.id,
  status: refund.status,
  amountMoney: refund.amount_money,
  appFeeMoney: refund.app_fee_money,
  appFeeAllocations: refund.app_fee_allocations,
  paymentId: refund.payment_id,
  orderId: refund.order_id,
  reason: refund.reason,
  locationId: refund.location_id,
  createdAt: refund.created_at,
  updatedAt: refund.updated_at
});

export let formatMoney = (money?: SquareMoney) => {
  if (money?.amount === undefined || !money.currency) return 'amount unavailable';
  try {
    let formatter = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: money.currency
    });
    let fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format(money.amount / 10 ** fractionDigits);
  } catch {
    return `${money.amount} ${money.currency} (minor units)`;
  }
};
