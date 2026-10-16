import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { storeIdSchema } from '../lib/schemas';
import { nullableTimestamp, requireFields } from '../lib/values';
import { spec } from '../spec';

let pullPaymentSchema = z.object({
  pullPaymentId: z.string().describe('Pull payment ID'),
  name: z.string().optional().describe('Pull payment name when supplied'),
  viewLink: z.string().optional().describe('Page where recipients can claim the pull payment'),
  raw: z.record(z.string(), z.unknown()).optional().describe('Complete pull payment data'),
  amount: z.string().describe('Total amount'),
  currency: z.string().describe('Currency code'),
  period: z.number().optional().nullable().describe('Period in seconds'),
  startsAt: z.string().optional().nullable().describe('Start date'),
  expiresAt: z.string().optional().nullable().describe('Expiration date'),
  archived: z.boolean().optional().describe('Whether the pull payment is archived')
});

export let managePullPayments = SlateTool.create(spec, {
  name: 'Manage Pull Payments',
  key: 'manage_pull_payments',
  description: `Create, list, or archive pull payments. Pull payments are long-lived payment offers from which recipients can pull (claim) funds at their convenience. The merchant specifies the total amount and can approve partial or full claims. Useful for recipient-initiated payments and refunds.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'archive']).describe('Action to perform'),
      storeId: storeIdSchema,
      pullPaymentId: z.string().optional().describe('Pull payment ID (for archive)'),
      name: z.string().optional().describe('Pull payment name (for create)'),
      amount: z.string().optional().describe('Total amount (for create)'),
      currency: z.string().optional().describe('Currency code (for create)'),
      paymentMethods: z
        .array(z.string())
        .optional()
        .describe('Legacy payment method setting; use payoutMethods on current servers'),
      period: z
        .number()
        .optional()
        .describe('Legacy period in seconds; current servers may ignore this setting'),
      payoutMethods: z
        .array(z.string())
        .optional()
        .describe(
          'Current payout method IDs, such as BTC-CHAIN or BTC-LN. Discover payment methods with get_store_payment_methods.'
        ),
      description: z.string().optional().describe('Pull payment description'),
      startsAt: z.string().optional().describe('Start date (ISO format)'),
      expiresAt: z.string().optional().describe('Expiration date (ISO format)'),
      autoApproveClaims: z
        .boolean()
        .optional()
        .describe('Automatically approve payout claims'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived pull payments (for list)')
    })
  )
  .output(
    z.object({
      pullPayment: pullPaymentSchema.optional().describe('Pull payment details'),
      pullPayments: z.array(pullPaymentSchema).optional().describe('List of pull payments'),
      archived: z.boolean().optional().describe('Whether the pull payment was archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let { action, storeId } = ctx.input;

    if (action === 'archive') requireFields(ctx.input, ['pullPaymentId'], action);
    if (action === 'create') requireFields(ctx.input, ['amount', 'currency'], action);

    let mapPP = (pp: Record<string, unknown>) => ({
      pullPaymentId: pp.id as string,
      name: typeof pp.name === 'string' ? pp.name : undefined,
      viewLink: pp.viewLink as string | undefined,
      raw: pp,
      amount: pp.amount as string,
      currency: pp.currency as string,
      period: pp.period as number | undefined,
      startsAt: nullableTimestamp(pp.startsAt),
      expiresAt: nullableTimestamp(pp.expiresAt),
      archived: pp.archived as boolean | undefined
    });

    if (action === 'list') {
      let pps = await client.getPullPayments(storeId, {
        includeArchived: ctx.input.includeArchived
      });
      let mapped = pps.map(mapPP);
      return {
        output: { pullPayments: mapped },
        message: `Found **${mapped.length}** pull payment(s).`
      };
    }

    if (action === 'create') {
      let pp = await client.createPullPayment(storeId, {
        name: ctx.input.name!,
        amount: ctx.input.amount!,
        currency: ctx.input.currency!,
        paymentMethods: ctx.input.paymentMethods,
        period: ctx.input.period,
        startsAt: ctx.input.startsAt,
        expiresAt: ctx.input.expiresAt,
        autoApproveClaims: ctx.input.autoApproveClaims,
        payoutMethods: ctx.input.payoutMethods,
        description: ctx.input.description
      });
      return {
        output: { pullPayment: mapPP(pp) },
        message: `Created pull payment **${pp.name}** for ${pp.amount} ${pp.currency}.`
      };
    }

    // archive
    await client.archivePullPayment(storeId, ctx.input.pullPaymentId!);
    return {
      output: { archived: true },
      message: `Archived pull payment **${ctx.input.pullPaymentId}**.`
    };
  })
  .build();
