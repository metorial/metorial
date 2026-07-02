import { z } from 'zod';

export let payoutSchema = z.object({
  payoutId: z
    .string()
    .nullable()
    .optional()
    .describe('Payout ID. Upcoming payouts may be null.'),
  amount: z.string().optional().describe('Payout amount as returned by Gumroad'),
  currency: z.string().optional().describe('Payout currency'),
  status: z.string().optional().describe('Payout status'),
  createdAt: z.string().optional().describe('Payout creation timestamp'),
  processedAt: z.string().nullable().optional().describe('Payout processed timestamp'),
  paymentProcessor: z.string().optional().describe('Payment processor'),
  bankAccountVisual: z.string().nullable().optional().describe('Masked bank account details'),
  paypalEmail: z.string().nullable().optional().describe('PayPal payout email'),
  sales: z.array(z.string()).optional().describe('Sale IDs included in the payout'),
  refundedSales: z.array(z.string()).optional().describe('Refunded sale IDs in the payout'),
  disputedSales: z.array(z.string()).optional().describe('Disputed sale IDs in the payout'),
  transactions: z.array(z.any()).optional().describe('Payout transaction rows')
});

export let mapPayout = (payout: any) => ({
  payoutId: payout.id ?? null,
  amount: payout.amount || undefined,
  currency: payout.currency || undefined,
  status: payout.status || undefined,
  createdAt: payout.created_at || undefined,
  processedAt: payout.processed_at ?? null,
  paymentProcessor: payout.payment_processor || undefined,
  bankAccountVisual: payout.bank_account_visual ?? null,
  paypalEmail: payout.paypal_email ?? null,
  sales: payout.sales || undefined,
  refundedSales: payout.refunded_sales || undefined,
  disputedSales: payout.disputed_sales || undefined,
  transactions: payout.transactions || undefined
});
