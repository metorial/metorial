import { SlateTool } from 'slates';
import { z } from 'zod';
import { TapfiliateClient } from '../lib/client';
import { spec } from '../spec';

let balanceSchema = z.object({
  affiliateId: z.string().describe('Affiliate ID'),
  balances: z
    .array(
      z.object({
        currency: z.string().optional().describe('Currency code'),
        amount: z.number().optional().describe('Balance amount')
      })
    )
    .optional()
    .describe('Balance amounts per currency')
});

let paymentSchema = z.object({
  paymentId: z.number().describe('Unique numeric ID of the payment'),
  affiliateId: z.string().optional().describe('Affiliate ID'),
  amount: z.number().optional().describe('Payment amount'),
  currency: z.string().optional().describe('Currency code'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let listBalances = SlateTool.create(spec, {
  name: 'List Affiliate Balances',
  key: 'list_balances',
  description: `View affiliate balances across all affiliates or for a specific affiliate. Balances reflect approved commissions that are pending payment. Supports multi-currency.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      affiliateId: z.string().optional().describe('Filter by specific affiliate ID')
    })
  )
  .output(
    z.object({
      balances: z.array(balanceSchema).describe('Affiliate balances')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let results = await client.listBalances(ctx.input);

    let balances = results.map((r: any) => ({
      affiliateId: r.affiliate_id || r.affiliate?.id,
      balances: r.balances
    }));

    return {
      output: { balances },
      message: `Retrieved balances for **${balances.length}** affiliate(s).`
    };
  })
  .build();

export let createPayment = SlateTool.create(spec, {
  name: 'Create Payment',
  key: 'create_payment',
  description: `Create a payment to settle an affiliate's balance. This marks approved commissions as paid.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      affiliateId: z.string().describe('ID of the affiliate to pay')
    })
  )
  .output(paymentSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.createPayment(ctx.input.affiliateId);

    return {
      output: {
        paymentId: result.id,
        affiliateId: result.affiliate_id || result.affiliate?.id,
        amount: result.amount,
        currency: result.currency,
        createdAt: result.created_at
      },
      message: `Created payment **#${result.id}** for affiliate \`${ctx.input.affiliateId}\`.`
    };
  })
  .build();

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `List payment history with optional filters by affiliate and date range. Results are paginated (25 per page).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      affiliateId: z.string().optional().describe('Filter by affiliate ID'),
      dateFrom: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      payments: z.array(paymentSchema).describe('List of payments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let results = await client.listPayments(ctx.input);

    let payments = results.map((r: any) => ({
      paymentId: r.id,
      affiliateId: r.affiliate_id || r.affiliate?.id,
      amount: r.amount,
      currency: r.currency,
      createdAt: r.created_at
    }));

    return {
      output: { payments },
      message: `Found **${payments.length}** payment(s).`
    };
  })
  .build();

export let cancelPayment = SlateTool.create(spec, {
  name: 'Cancel Payment',
  key: 'cancel_payment',
  description: `Cancel a payment, reversing the settled commissions back to the affiliate's balance.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      paymentId: z.number().describe('Numeric ID of the payment to cancel')
    })
  )
  .output(
    z.object({
      canceled: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    await client.cancelPayment(ctx.input.paymentId);

    return {
      output: { canceled: true },
      message: `Canceled payment **#${ctx.input.paymentId}**.`
    };
  })
  .build();
