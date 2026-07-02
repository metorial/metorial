import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let rewardSchema = z
  .object({
    rewardUuid: z.string().describe('UUID of the reward'),
    title: z.string().optional().describe('Reward title'),
    description: z.string().optional().describe('Reward description'),
    requiredCredits: z.number().optional().describe('Credits required to claim the reward'),
    active: z.boolean().optional().describe('Whether the reward is active'),
    rewardType: z
      .string()
      .optional()
      .describe('Type of reward (standard, digital, collectable)')
  })
  .passthrough();

export let listRewards = SlateTool.create(spec, {
  name: 'List Rewards',
  key: 'list_rewards',
  description: `List available rewards in the loyalty program. Optionally filter by shop or contact to see which rewards are claimable by a specific contact.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      shopUuid: z.string().optional().describe('Filter rewards available at a specific shop'),
      contactUuid: z
        .string()
        .optional()
        .describe('Filter rewards claimable by a specific contact')
    })
  )
  .output(
    z.object({
      rewards: z.array(rewardSchema).describe('List of rewards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listRewards({
      shopUuid: ctx.input.shopUuid,
      contactUuid: ctx.input.contactUuid
    });

    let rewards = (result.data || []).map((r: any) => ({
      rewardUuid: r.uuid,
      title: r.title,
      description: r.description,
      requiredCredits: r.required_credits,
      active: r.active,
      rewardType: r.reward_type,
      ...r
    }));

    return {
      output: { rewards },
      message: `Retrieved **${rewards.length}** reward(s).`
    };
  })
  .build();
