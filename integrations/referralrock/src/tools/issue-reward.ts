import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let issueReward = SlateTool.create(spec, {
  name: 'Issue Reward',
  key: 'issue_reward',
  description: `Issue a pending reward to its recipient. This triggers the actual delivery/transfer of the reward. Can optionally override eligibility date restrictions and include a note to the recipient.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      rewardId: z.string().describe('ID of the reward to issue'),
      note: z.string().optional().describe('Message to the reward recipient'),
      overrideIneligible: z
        .boolean()
        .optional()
        .describe('Override eligibility date rules to force issue')
    })
  )
  .output(
    z.object({
      rewardId: z.string().describe('ID of the issued reward'),
      status: z.string().optional().describe('Reward status after issuing'),
      amount: z.number().optional().describe('Reward amount'),
      issueDate: z.string().optional().describe('Date the reward was issued'),
      recipientName: z.string().optional().describe('Recipient name'),
      resultStatus: z.string().optional().describe('Issue result status'),
      resultMessage: z.string().optional().describe('Issue result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let result = await client.issueReward(
      {
        rewardId: ctx.input.rewardId,
        note: ctx.input.note
      },
      ctx.input.overrideIneligible
    );

    let reward = (result.reward || {}) as Record<string, unknown>;
    let resultInfo = (result.resultInfo || {}) as Record<string, unknown>;

    return {
      output: {
        rewardId: (reward.id || ctx.input.rewardId) as string,
        status: reward.status as string | undefined,
        amount: reward.amount as number | undefined,
        issueDate: reward.issueDate as string | undefined,
        recipientName: reward.recipientName as string | undefined,
        resultStatus: resultInfo.Status as string | undefined,
        resultMessage: resultInfo.Message as string | undefined
      },
      message: `Issued reward **${ctx.input.rewardId}** — ${resultInfo.Message || 'Success'}.`
    };
  })
  .build();
