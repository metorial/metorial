import { z } from 'zod';
import type { SquareOrder } from '../lib/types';
import { moneyOutputSchema } from './payment-shared';

export let orderSummaryOutputSchema = z.object({
  orderId: z.string().optional(),
  locationId: z.string().optional(),
  customerId: z.string().optional(),
  referenceId: z.string().optional(),
  state: z.string().optional(),
  version: z.number().optional(),
  totalMoney: moneyOutputSchema,
  totalTaxMoney: moneyOutputSchema,
  totalDiscountMoney: moneyOutputSchema,
  totalTipMoney: moneyOutputSchema,
  totalServiceChargeMoney: moneyOutputSchema,
  serviceCharges: z.array(z.record(z.string(), z.any())).optional(),
  lineItemCount: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  closedAt: z.string().optional()
});

export let mapOrderSummary = (order: SquareOrder) => ({
  orderId: order.id,
  locationId: order.location_id,
  customerId: order.customer_id,
  referenceId: order.reference_id,
  state: order.state,
  version: order.version,
  totalMoney: order.total_money,
  totalTaxMoney: order.total_tax_money,
  totalDiscountMoney: order.total_discount_money,
  totalTipMoney: order.total_tip_money,
  totalServiceChargeMoney: order.total_service_charge_money,
  serviceCharges: order.service_charges,
  lineItemCount: order.line_items?.length,
  createdAt: order.created_at,
  updatedAt: order.updated_at,
  closedAt: order.closed_at
});
