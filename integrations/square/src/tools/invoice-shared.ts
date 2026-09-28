import { z } from 'zod';
import type { SquareInvoice } from '../lib/types';
import { moneyOutputSchema } from './payment-shared';

export let invoiceOutputSchema = z.object({
  invoiceId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  version: z.number().optional(),
  orderId: z.string().optional(),
  locationId: z.string().optional(),
  primaryRecipient: z.record(z.string(), z.any()).optional(),
  paymentRequests: z.array(z.record(z.string(), z.any())).optional(),
  nextPaymentAmountMoney: moneyOutputSchema,
  acceptedPaymentMethods: z.record(z.string(), z.any()).optional(),
  customFields: z.array(z.record(z.string(), z.any())).optional(),
  deliveryMethod: z.string().optional(),
  scheduledAt: z.string().optional(),
  publicUrl: z.string().optional(),
  saleOrServiceDate: z.string().optional(),
  storePaymentMethodEnabled: z.boolean().optional(),
  timezone: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let mapInvoice = (invoice: SquareInvoice) => ({
  invoiceId: invoice.id,
  invoiceNumber: invoice.invoice_number,
  title: invoice.title,
  description: invoice.description,
  status: invoice.status,
  version: invoice.version,
  orderId: invoice.order_id,
  locationId: invoice.location_id,
  primaryRecipient: invoice.primary_recipient,
  paymentRequests: invoice.payment_requests,
  nextPaymentAmountMoney: invoice.next_payment_amount_money,
  acceptedPaymentMethods: invoice.accepted_payment_methods,
  customFields: invoice.custom_fields,
  deliveryMethod: invoice.delivery_method,
  scheduledAt: invoice.scheduled_at,
  publicUrl: invoice.public_url,
  saleOrServiceDate: invoice.sale_or_service_date,
  storePaymentMethodEnabled: invoice.store_payment_method_enabled,
  timezone: invoice.timezone,
  createdAt: invoice.created_at,
  updatedAt: invoice.updated_at
});

export let acceptedPaymentMethodsSchema = z.object({
  card: z.boolean().optional(),
  squareGiftCard: z.boolean().optional(),
  bankAccount: z.boolean().optional(),
  buyNowPayLater: z.boolean().optional(),
  cashAppPay: z.boolean().optional()
});

export let mapAcceptedPaymentMethods = (
  methods: z.infer<typeof acceptedPaymentMethodsSchema>
) => ({
  card: methods.card,
  square_gift_card: methods.squareGiftCard,
  bank_account: methods.bankAccount,
  buy_now_pay_later: methods.buyNowPayLater,
  cash_app_pay: methods.cashAppPay
});
