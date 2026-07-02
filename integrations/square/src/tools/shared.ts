import { z } from 'zod';
import type {
  SquareCustomer,
  SquareInvoice,
  SquareLocation,
  SquareOrder,
  SquareRefund
} from '../lib/types';

export let moneyOutputSchema = z
  .object({
    amount: z.number().optional(),
    currency: z.string().optional()
  })
  .optional();

export let customerOutputSchema = z.object({
  customerId: z.string().optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  companyName: z.string().optional(),
  emailAddress: z.string().optional(),
  phoneNumber: z.string().optional(),
  note: z.string().optional(),
  referenceId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().optional()
});

export let invoiceSummaryOutputSchema = z.object({
  invoiceId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  version: z.number().optional(),
  orderId: z.string().optional(),
  locationId: z.string().optional(),
  deliveryMethod: z.string().optional(),
  scheduledAt: z.string().optional(),
  publicUrl: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let locationOutputSchema = z.object({
  locationId: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  businessName: z.string().optional(),
  phoneNumber: z.string().optional(),
  websiteUrl: z.string().optional(),
  businessEmail: z.string().optional(),
  description: z.string().optional(),
  address: z.record(z.string(), z.any()).optional(),
  capabilities: z.array(z.string()).optional(),
  merchantId: z.string().optional(),
  createdAt: z.string().optional()
});

export let orderSummaryOutputSchema = z.object({
  orderId: z.string().optional(),
  locationId: z.string().optional(),
  customerId: z.string().optional(),
  referenceId: z.string().optional(),
  state: z.string().optional(),
  totalMoney: moneyOutputSchema,
  totalTaxMoney: moneyOutputSchema,
  totalDiscountMoney: moneyOutputSchema,
  totalTipMoney: moneyOutputSchema,
  lineItemCount: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  closedAt: z.string().optional(),
  version: z.number().optional()
});

export let refundOutputSchema = z.object({
  refundId: z.string().optional(),
  status: z.string().optional(),
  amountMoney: moneyOutputSchema,
  paymentId: z.string().optional(),
  orderId: z.string().optional(),
  reason: z.string().optional(),
  locationId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let mapCustomer = (customer: SquareCustomer) => ({
  customerId: customer.id,
  givenName: customer.given_name,
  familyName: customer.family_name,
  companyName: customer.company_name,
  emailAddress: customer.email_address,
  phoneNumber: customer.phone_number,
  note: customer.note,
  referenceId: customer.reference_id,
  createdAt: customer.created_at,
  updatedAt: customer.updated_at,
  version: customer.version
});

export let mapInvoiceSummary = (invoice: SquareInvoice) => ({
  invoiceId: invoice.id,
  invoiceNumber: invoice.invoice_number,
  title: invoice.title,
  description: invoice.description,
  status: invoice.status,
  version: invoice.version,
  orderId: invoice.order_id,
  locationId: invoice.location_id,
  deliveryMethod: invoice.delivery_method,
  scheduledAt: invoice.scheduled_at,
  publicUrl: invoice.public_url,
  createdAt: invoice.created_at,
  updatedAt: invoice.updated_at
});

export let mapLocation = (location: SquareLocation) => ({
  locationId: location.id,
  name: location.name,
  status: location.status,
  type: location.type,
  country: location.country,
  currency: location.currency,
  timezone: location.timezone,
  businessName: location.business_name,
  phoneNumber: location.phone_number,
  websiteUrl: location.website_url,
  businessEmail: location.business_email,
  description: location.description,
  address: location.address,
  capabilities: location.capabilities,
  merchantId: location.merchant_id,
  createdAt: location.created_at
});

export let mapOrderSummary = (order: SquareOrder) => ({
  orderId: order.id,
  locationId: order.location_id,
  customerId: order.customer_id,
  referenceId: order.reference_id,
  state: order.state,
  totalMoney: order.total_money,
  totalTaxMoney: order.total_tax_money,
  totalDiscountMoney: order.total_discount_money,
  totalTipMoney: order.total_tip_money,
  lineItemCount: order.line_items?.length,
  createdAt: order.created_at,
  updatedAt: order.updated_at,
  closedAt: order.closed_at,
  version: order.version
});

export let mapRefund = (refund: SquareRefund) => ({
  refundId: refund.id,
  status: refund.status,
  amountMoney: refund.amount_money,
  paymentId: refund.payment_id,
  orderId: refund.order_id,
  reason: refund.reason,
  locationId: refund.location_id,
  createdAt: refund.created_at,
  updatedAt: refund.updated_at
});
