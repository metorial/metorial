import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { storeIdSchema } from '../lib/schemas';
import { requireFields } from '../lib/values';
import { spec } from '../spec';

let payoutSchema = z.object({
  payoutId: z.string().optional(),
  revision: z.number().optional(),
  state: z.string().optional(),
  payoutMethodId: z.string().optional(),
  originalCurrency: z.string().optional(),
  originalAmount: z.string().optional(),
  payoutCurrency: z.string().optional(),
  payoutAmount: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  pullPaymentId: z.string().optional().nullable(),
  raw: z.record(z.string(), z.unknown())
});

export let managePayoutClaims = SlateTool.create(spec, {
  name: 'Manage Payout Claims',
  key: 'manage_payout_claims',
  description:
    'List, retrieve, create, approve, cancel, or mark store payouts as paid. Call manage_stores to discover stores. Approval requires the actual current revision from list or get; cancellation and marking paid do not transfer funds. Create requires btcpay.store.cancreatenonapprovedpullpayments, plus btcpay.store.cancreatepullpayments when approved is true; list/get require btcpay.store.canviewpayouts; approve/cancel/mark_paid require btcpay.store.canmanagepayouts.',
  constraints: [
    'Only mark a payout as paid after verifying that the recipient has received the payment.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'approve', 'cancel', 'mark_paid']),
      storeId: storeIdSchema,
      payoutId: z
        .string()
        .optional()
        .describe('Required for get, approve, cancel, and mark_paid'),
      includeCancelled: z
        .boolean()
        .optional()
        .describe('Include cancelled payouts when listing'),
      revision: z
        .number()
        .optional()
        .describe('Actual current payout revision from list or get, required for approve'),
      rateRule: z.string().optional().describe('Optional exchange rate rule for approve'),
      destination: z
        .string()
        .optional()
        .describe(
          'Recipient address, BIP21 URL, or supported Lightning destination for create'
        ),
      amount: z
        .string()
        .optional()
        .describe('Exact decimal amount for create, in the pull payment currency'),
      payoutMethodId: z
        .string()
        .optional()
        .describe('Payout method such as BTC-CHAIN or BTC-LN, required for create'),
      pullPaymentId: z
        .string()
        .optional()
        .describe('Existing pull payment to claim from for create'),
      approved: z
        .boolean()
        .optional()
        .describe(
          'Automatically approve the created payout; requires permission to create approved pull payments'
        ),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Payout metadata for create')
    })
  )
  .output(
    z.object({
      payout: payoutSchema.optional(),
      payouts: z.array(payoutSchema).optional(),
      cancelled: z.boolean().optional(),
      markedPaid: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let { action, storeId, payoutId } = ctx.input;
    if (!['list', 'create'].includes(action)) requireFields(ctx.input, ['payoutId'], action);
    if (action === 'create')
      requireFields(ctx.input, ['destination', 'amount', 'payoutMethodId'], action);
    if (action === 'approve') {
      requireFields(ctx.input, ['revision'], action);
      if (!Number.isSafeInteger(ctx.input.revision) || ctx.input.revision! < 0) {
        throw createApiServiceError(
          'revision must be the non-negative integer returned by list or get.'
        );
      }
    }
    let body =
      action === 'approve'
        ? {
            revision: ctx.input.revision,
            ...(ctx.input.rateRule !== undefined ? { rateRule: ctx.input.rateRule } : {})
          }
        : action === 'create'
          ? {
              destination: ctx.input.destination,
              amount: ctx.input.amount,
              payoutMethodId: ctx.input.payoutMethodId,
              ...(ctx.input.pullPaymentId !== undefined
                ? { pullPaymentId: ctx.input.pullPaymentId }
                : {}),
              ...(ctx.input.approved !== undefined ? { approved: ctx.input.approved } : {}),
              ...(ctx.input.metadata !== undefined ? { metadata: ctx.input.metadata } : {})
            }
          : undefined;
    let result = await new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    }).payoutClaim(storeId, action, payoutId, body, ctx.input.includeCancelled);
    let map = (data: Record<string, unknown>) => ({
      payoutId: data.id as string | undefined,
      revision: data.revision as number | undefined,
      state: data.state as string | undefined,
      payoutMethodId: data.payoutMethodId as string | undefined,
      originalCurrency: data.originalCurrency as string | undefined,
      originalAmount: data.originalAmount as string | undefined,
      payoutCurrency: data.payoutCurrency as string | undefined,
      payoutAmount: data.payoutAmount as string | null | undefined,
      destination: data.destination as string | null | undefined,
      pullPaymentId: data.pullPaymentId as string | null | undefined,
      raw: data
    });
    return {
      output:
        action === 'list'
          ? { payouts: (result as Record<string, unknown>[]).map(map) }
          : action === 'cancel'
            ? { cancelled: true }
            : action === 'mark_paid'
              ? { markedPaid: true }
              : { payout: map(result as Record<string, unknown>) },
      message: `Completed payout ${action}.`
    };
  })
  .build();
