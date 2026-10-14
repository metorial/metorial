import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

export let getCreditBalance = SlateTool.create(spec, {
  name: 'Get Credit Balance',
  key: 'get_credit_balance',
  description:
    'Check remaining account credits and the recurring credit grant before running data requests. This request does not consume credits.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      account: z
        .object({
          credits: z.number().describe('Remaining account credits; may be fractional.'),
          recurring_credits: z.number().describe('Credits granted each billing cycle.'),
          recurring_credits_frequency: z
            .string()
            .nullable()
            .describe('Grant cadence, or null if there is no recurring grant.'),
          recurring_credits_refresh_date: z
            .string()
            .nullable()
            .describe('Next grant refresh timestamp, or null if there is no recurring grant.'),
          wallets: z
            .array(z.record(z.string(), z.unknown()))
            .optional()
            .describe('Per-wallet balance details, when enabled.'),
          credit_topups: z
            .array(z.record(z.string(), z.unknown()))
            .optional()
            .describe('Remaining top-ups and their expiry details, when present.')
        })
        .passthrough()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new CrustdataClient(ctx.auth.token).getCreditBalance();
    return {
      output: { account: result.account },
      message: `Remaining account balance: **${result.account.credits}** credits.`
    };
  })
  .build();
