import { createApiServiceError, SlateTool } from 'slates';
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
  paymentId: z
    .number()
    .optional()
    .describe('Legacy numeric ID, when returned by the provider'),
  paymentReference: z
    .string()
    .optional()
    .describe('Payment identifier for retrieval or cancellation, such as pa_eXampl3'),
  affiliateId: z.string().optional().describe('Affiliate ID'),
  amount: z.number().optional().describe('Payment amount'),
  currency: z.string().optional().describe('Currency code'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

let mapPayment = (payment: any) => ({
  paymentId: typeof payment.id === 'number' ? payment.id : undefined,
  paymentReference: typeof payment.id === 'string' ? payment.id : undefined,
  affiliateId: payment.affiliate_id ?? payment.affiliate?.id,
  amount: payment.amount ?? undefined,
  currency: payment.currency ?? undefined,
  createdAt: payment.created_at ?? undefined
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
      balances: Array.isArray(r.balances)
        ? r.balances
        : Object.entries(r.balances).map(([currency, amount]) => ({ currency, amount }))
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
  description: `Record an affiliate payment for an explicit amount and currency. This updates the affiliate's balance in Tapfiliate; send the funds separately through your payment provider.`,
  instructions: [
    'Provide amount and currency. Call list_balances to inspect the balance before recording a payment.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      affiliateId: z.string().describe('ID of the affiliate whose payment is being recorded'),
      amount: z
        .number()
        .optional()
        .describe('Amount already paid to the affiliate; required to record a payment'),
      currency: z
        .string()
        .optional()
        .describe('Three-letter currency code; required to record a payment')
    })
  )
  .output(paymentSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    if (ctx.input.amount === undefined || !ctx.input.currency) {
      throw createApiServiceError(
        'Provide amount and currency to record the payment. Call list_balances to inspect the affiliate balance.'
      );
    }
    let result = await client.createPayment(
      ctx.input.affiliateId,
      ctx.input.amount,
      ctx.input.currency
    );

    return {
      output: mapPayment(result),
      message: `Recorded payment \`${result.id}\` for affiliate \`${ctx.input.affiliateId}\`.`
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

    let payments = results.map(mapPayment);

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
      paymentId: z.number().optional().describe('Legacy numeric ID of the payment to cancel'),
      paymentReference: z
        .string()
        .optional()
        .describe(
          'Payment identifier returned by create_payment, list_payments, or get_payment. Provide this or paymentId.'
        )
    })
  )
  .output(
    z.object({
      canceled: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let paymentId = resolvePaymentId(ctx.input);
    await client.cancelPayment(paymentId);

    return {
      output: { canceled: true },
      message: `Canceled payment \`${paymentId}\`.`
    };
  })
  .build();

let resolvePaymentId = (input: { paymentId?: number; paymentReference?: string }) => {
  if (input.paymentId !== undefined && input.paymentReference !== undefined) {
    throw createApiServiceError('Provide either paymentId or paymentReference, not both.');
  }
  if (input.paymentReference !== undefined) {
    if (!input.paymentReference.trim())
      throw createApiServiceError('paymentReference must not be empty.');
    return input.paymentReference;
  }
  if (input.paymentId !== undefined) return input.paymentId;
  throw createApiServiceError(
    'Provide paymentReference from list_payments, or a legacy numeric paymentId.'
  );
};

export let getPayment = SlateTool.create(spec, {
  name: 'Get Payment',
  key: 'get_payment',
  description:
    'Retrieve a recorded affiliate payment, including its amount, currency, affiliate, and timestamp.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      paymentReference: z
        .string()
        .describe('Payment identifier from create_payment or list_payments')
    })
  )
  .output(paymentSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.getPayment(resolvePaymentId(ctx.input));
    return { output: mapPayment(result), message: `Retrieved payment \`${result.id}\`.` };
  })
  .build();
