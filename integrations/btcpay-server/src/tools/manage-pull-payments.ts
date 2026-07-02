import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

let pullPaymentSchema = z.object({
  pullPaymentId: z.string().describe('Pull payment ID'),
  name: z.string().describe('Pull payment name'),
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
  description: `Create, list, or archive pull payments. Pull payments are long-lived payment offers from which recipients can pull (claim) funds at their convenience. The merchant specifies the total amount and can approve partial or full claims. Useful for payroll, recurring payments, and refunds.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'archive']).describe('Action to perform'),
      storeId: z.string().describe('Store ID'),
      pullPaymentId: z.string().optional().describe('Pull payment ID (for archive)'),
      name: z.string().optional().describe('Pull payment name (for create)'),
      amount: z.string().optional().describe('Total amount (for create)'),
      currency: z.string().optional().describe('Currency code (for create)'),
      paymentMethods: z
        .array(z.string())
        .optional()
        .describe('Accepted payment methods (e.g., ["BTC", "BTC-LightningNetwork"])'),
      period: z.number().optional().describe('Period in seconds between claims'),
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

    let mapPP = (pp: Record<string, unknown>) => ({
      pullPaymentId: pp.id as string,
      name: pp.name as string,
      amount: pp.amount as string,
      currency: pp.currency as string,
      period: pp.period as number | undefined,
      startsAt: pp.startsAt !== undefined ? String(pp.startsAt) : undefined,
      expiresAt: pp.expiresAt !== undefined ? String(pp.expiresAt) : undefined,
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
        autoApproveClaims: ctx.input.autoApproveClaims
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
