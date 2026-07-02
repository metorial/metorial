import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let managePayouts = SlateTool.create(spec, {
  name: 'Manage Payouts',
  key: 'manage_payouts',
  description: `Create, retrieve, or list payouts. Payouts transfer funds from your Stripe balance to an external bank account or debit card. Amounts are in smallest currency unit.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list']).describe('Operation to perform'),
      payoutId: z.string().optional().describe('Payout ID (for get)'),
      amount: z.number().optional().describe('Amount in smallest currency unit (for create)'),
      currency: z.string().optional().describe('Currency code (for create)'),
      description: z.string().optional().describe('Payout description'),
      method: z.enum(['standard', 'instant']).optional().describe('Payout method'),
      destination: z.string().optional().describe('Bank account or card ID to send payout to'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      limit: z.number().optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination'),
      statusFilter: z
        .enum(['pending', 'paid', 'failed', 'canceled'])
        .optional()
        .describe('Filter by status (for list)')
    })
  )
  .output(
    z.object({
      payoutId: z.string().optional().describe('Payout ID'),
      amount: z.number().optional().describe('Payout amount'),
      currency: z.string().optional().describe('Currency code'),
      status: z.string().optional().describe('Payout status'),
      method: z.string().optional().describe('Payout method'),
      arrivalDate: z.number().optional().describe('Estimated arrival date'),
      created: z.number().optional().describe('Creation timestamp'),
      payouts: z
        .array(
          z.object({
            payoutId: z.string(),
            amount: z.number(),
            currency: z.string(),
            status: z.string(),
            arrivalDate: z.number(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of payouts'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (ctx.input.amount === undefined)
        throw stripeServiceError('amount is required for create action');
      if (!ctx.input.currency)
        throw stripeServiceError('currency is required for create action');

      let params: Record<string, any> = {
        amount: ctx.input.amount,
        currency: ctx.input.currency
      };
      if (ctx.input.description) params.description = ctx.input.description;
      if (ctx.input.method) params.method = ctx.input.method;
      if (ctx.input.destination) params.destination = ctx.input.destination;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let payout = await client.createPayout(params);
      return {
        output: {
          payoutId: payout.id,
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          method: payout.method,
          arrivalDate: payout.arrival_date,
          created: payout.created
        },
        message: `Created payout **${payout.id}**: ${payout.amount} ${payout.currency.toUpperCase()} — status: ${payout.status}`
      };
    }

    if (action === 'get') {
      if (!ctx.input.payoutId) throw stripeServiceError('payoutId is required for get action');
      let payout = await client.getPayout(ctx.input.payoutId);
      return {
        output: {
          payoutId: payout.id,
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          method: payout.method,
          arrivalDate: payout.arrival_date,
          created: payout.created
        },
        message: `Payout **${payout.id}**: ${payout.amount} ${payout.currency.toUpperCase()} — status: ${payout.status}`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.statusFilter) params.status = ctx.input.statusFilter;

    let result = await client.listPayouts(params);
    return {
      output: {
        payouts: result.data.map((p: any) => ({
          payoutId: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          arrivalDate: p.arrival_date,
          created: p.created
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** payout(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
