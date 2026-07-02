import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let createReward = SlateTool.create(spec, {
  name: 'Create Reward',
  key: 'create_reward',
  description: `Create a new reward for a member or referral. The reward can be associated with a specific member or referral and assigned a payout type.`,
  instructions: [
    'Provide either memberId or referralId to associate the reward. When using memberId, also include programId for identification.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      memberId: z.string().optional().describe('Member ID to reward'),
      referralId: z.string().optional().describe('Referral ID to reward'),
      programId: z
        .string()
        .optional()
        .describe('Program ID (used with member identification)'),
      amount: z.number().describe('Reward amount'),
      payoutId: z.string().optional().describe('Payout type ID'),
      eligibilityDate: z.string().optional().describe('Eligibility date for the reward'),
      description: z.string().optional().describe('Reward description')
    })
  )
  .output(
    z.object({
      rewardId: z.string().describe('ID of the created reward'),
      status: z.string().optional().describe('Reward status'),
      amount: z.number().optional().describe('Reward amount'),
      resultStatus: z.string().optional().describe('Creation result status'),
      resultMessage: z.string().optional().describe('Creation result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let rewardInfo: Record<string, unknown> = {
      newReward: {
        amount: ctx.input.amount,
        ...(ctx.input.payoutId && { payoutId: ctx.input.payoutId }),
        ...(ctx.input.eligibilityDate && { eligibilityDate: ctx.input.eligibilityDate }),
        ...(ctx.input.description && { description: ctx.input.description })
      }
    };

    if (ctx.input.memberId) {
      rewardInfo.memberQuery = {
        primaryInfo: { memberId: ctx.input.memberId }
      };
    }

    if (ctx.input.referralId) {
      rewardInfo.referralQuery = {
        primaryInfo: { referralId: ctx.input.referralId }
      };
    }

    let result = await client.createRewards([rewardInfo]);

    let results = result as unknown as Record<string, unknown>[];
    let first = Array.isArray(results) ? results[0] : result;
    let reward = (first?.reward || {}) as Record<string, unknown>;
    let resultInfo = (first?.resultInfo || {}) as Record<string, unknown>;

    return {
      output: {
        rewardId: (reward.id || '') as string,
        status: reward.status as string | undefined,
        amount: reward.amount as number | undefined,
        resultStatus: resultInfo.Status as string | undefined,
        resultMessage: resultInfo.Message as string | undefined
      },
      message: `Created reward of **${ctx.input.amount}**${ctx.input.description ? ` — ${ctx.input.description}` : ''}.`
    };
  })
  .build();
