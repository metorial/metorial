import { SlateTool } from 'slates';
import { z } from 'zod';
import { getFirstResult, getResponseEntity, ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let updateReward = SlateTool.create(spec, {
  name: 'Update Reward',
  key: 'update_reward',
  description:
    'Update a reward amount, payout type, eligibility date, or description. Use list_rewards to find reward IDs and get_payouts with view types to find payout IDs.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      rewardId: z.string().min(1).describe('Reward ID from list_rewards'),
      payoutId: z
        .string()
        .min(1)
        .describe(
          'Payout type ID from get_payouts with view types; required by the provider even when updating other fields'
        ),
      amount: z.number().optional().describe('Updated reward amount'),
      eligibilityDate: z
        .string()
        .optional()
        .describe('Updated eligibility date in ISO 8601 format'),
      description: z.string().optional().describe('Updated reward description')
    })
  )
  .output(
    z.object({
      rewardId: z.string().describe('Updated reward ID'),
      payoutId: z.string().optional().describe('Payout type ID'),
      status: z.string().optional().describe('Reward status'),
      amount: z.number().optional().describe('Reward amount'),
      eligibilityDate: z.string().optional().describe('Eligibility date'),
      description: z.string().optional().describe('Reward description'),
      message: z.string().optional().describe('Provider confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });
    let result = getFirstResult(await client.updateRewards([ctx.input]));
    let reward = getResponseEntity(result, 'reward');
    return {
      output: {
        rewardId: reward.id as string,
        payoutId: reward.payoutId as string | undefined,
        status: reward.status as string | undefined,
        amount: reward.amount as number | undefined,
        eligibilityDate: reward.eligibilityDate as string | undefined,
        description: reward.description as string | undefined,
        message: result.message as string | undefined
      },
      message: `Updated reward **${reward.id}**${result.message ? `: ${result.message}` : '.'}`
    };
  })
  .build();
