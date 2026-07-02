import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let pendingPayoutSchema = z.object({
  payoutId: z.string().optional().describe('Payout type ID'),
  description: z.string().optional().describe('Payout description'),
  rewardCount: z.number().optional().describe('Number of pending rewards'),
  amount: z.number().optional().describe('Total pending amount'),
  programId: z.string().optional().describe('Program ID'),
  programName: z.string().optional().describe('Program name'),
  memberId: z.string().optional().describe('Member ID'),
  memberName: z.string().optional().describe('Member name'),
  recipientId: z.string().optional().describe('Recipient ID'),
  recipientName: z.string().optional().describe('Recipient name'),
  recipientType: z.string().optional().describe('Recipient type')
});

export let getPayouts = SlateTool.create(spec, {
  name: 'Get Payouts',
  key: 'get_payouts',
  description: `Retrieve payout information including payout types, pending payouts, and transaction history. Use to view what rewards are awaiting payout or to look up completed transactions.`,
  instructions: [
    'Set view to "types" to list payout configurations, "pending" to see pending payouts, or "transactions" for transaction history.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      view: z
        .enum(['types', 'pending', 'transactions'])
        .describe('Which payout data to retrieve'),
      payoutId: z.string().optional().describe('Specific payout type ID (for types view)'),
      recipientId: z
        .string()
        .optional()
        .describe('Filter by recipient ID (for pending/transactions view)'),
      memberId: z.string().optional().describe('Filter by member ID (for pending view)'),
      transactionId: z
        .string()
        .optional()
        .describe('Specific transaction ID (for transactions view)'),
      includeIneligible: z
        .boolean()
        .optional()
        .describe('Include rewards not yet eligible (for pending view)')
    })
  )
  .output(
    z.object({
      payoutTypes: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Available payout types'),
      pendingPayouts: z.array(pendingPayoutSchema).optional().describe('Pending payouts'),
      transactions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Payout transactions'),
      total: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    if (ctx.input.view === 'types') {
      let result = await client.listPayouts(ctx.input.payoutId);
      let payouts = (result.payouts as Record<string, unknown>[]) || [];
      return {
        output: {
          payoutTypes: payouts,
          total: result.total as number | undefined
        },
        message: `Retrieved **${payouts.length}** payout type(s).`
      };
    }

    if (ctx.input.view === 'pending') {
      let result = await client.getPendingPayouts({
        memberId: ctx.input.memberId,
        recipientId: ctx.input.recipientId,
        includeIneligible: ctx.input.includeIneligible
      });
      let pending = ((result.payoutsPending as Record<string, unknown>[]) || []).map(p => ({
        payoutId: p.payoutId as string | undefined,
        description: p.Description as string | undefined,
        rewardCount: p.rewardCount as number | undefined,
        amount: p.amount as number | undefined,
        programId: p.programId as string | undefined,
        programName: p.programName as string | undefined,
        memberId: p.memberId as string | undefined,
        memberName: p.memberName as string | undefined,
        recipientId: p.recipientId as string | undefined,
        recipientName: p.RecipientName as string | undefined,
        recipientType: p.RecipientType as string | undefined
      }));
      return {
        output: {
          pendingPayouts: pending,
          total: result.total as number | undefined
        },
        message: `Retrieved **${pending.length}** pending payout(s).`
      };
    }

    // transactions
    let result = await client.getPayoutTransactions({
      recipientId: ctx.input.recipientId,
      transactionId: ctx.input.transactionId
    });
    let transactions = (result.payoutTransactions as Record<string, unknown>[]) || [];
    return {
      output: {
        transactions,
        total: result.total as number | undefined
      },
      message: `Retrieved **${transactions.length}** transaction(s).`
    };
  })
  .build();
