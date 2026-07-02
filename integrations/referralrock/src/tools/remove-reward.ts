import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let removeReward = SlateTool.create(spec, {
  name: 'Remove Reward',
  key: 'remove_reward',
  description: `Delete one or more rewards by their IDs.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      rewardIds: z.array(z.string()).describe('Array of reward IDs to remove')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            rewardId: z.string().describe('Reward ID'),
            status: z.string().optional().describe('Result status'),
            statusMessage: z.string().optional().describe('Result message')
          })
        )
        .describe('Removal results for each reward')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let result = await client.removeRewards(ctx.input.rewardIds);

    let results = ((result as unknown as Record<string, unknown>[]) || []).map(r => {
      let info = (r.resultInfo || {}) as Record<string, unknown>;
      return {
        rewardId: (r.rewardId || '') as string,
        status: info.Status as string | undefined,
        statusMessage: info.Message as string | undefined
      };
    });

    return {
      output: { results },
      message: `Removed **${ctx.input.rewardIds.length}** reward(s).`
    };
  })
  .build();
