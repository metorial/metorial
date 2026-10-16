import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredString } from '../lib/response';
import { spec } from '../spec';

export let claimReward = SlateTool.create(spec, {
  name: 'Claim Reward',
  key: 'claim_reward',
  description: `Claim a reward for a contact, deducting the required credits from their balance. Also supports reversing a previously claimed reward to restore credits.`,
  instructions: [
    'The contact must have sufficient credits to claim the reward.',
    'Use action "reverse" with the rewardReceptionUuid to undo a claim and restore credits.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['claim', 'reverse'])
        .default('claim')
        .describe('Action: "claim" to claim a reward, "reverse" to undo a claim'),
      contactUuid: z
        .string()
        .optional()
        .describe('UUID of the contact claiming the reward (required for claim)'),
      rewardUuid: z
        .string()
        .optional()
        .describe('UUID of the reward to claim (required for claim)'),
      shopUuid: z
        .string()
        .optional()
        .describe(
          'UUID of the shop (uses config default if not provided, required for claim)'
        ),
      rewardReceptionUuid: z
        .string()
        .optional()
        .describe('UUID of the reward reception to reverse (required for reverse)')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.any()).optional().describe('Original provider response'),
      rewardReceptionUuid: z.string().optional().describe('UUID of the reward reception'),
      creditReceptionUuid: z
        .string()
        .optional()
        .describe('UUID of the compensating credit reception when reversing a reward'),
      credits: z.number().optional().describe('Credits deducted or restored'),
      contactUuid: z.string().optional().describe('UUID of the contact'),
      rewardUuid: z.string().optional().describe('UUID of the reward')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'reverse') {
      if (!ctx.input.rewardReceptionUuid)
        throw createApiServiceError('rewardReceptionUuid is required for reverse');
      let result = await client.reverseRewardReception(ctx.input.rewardReceptionUuid);
      let data = result.data;
      return {
        output: {
          raw: data,
          rewardReceptionUuid: ctx.input.rewardReceptionUuid,
          creditReceptionUuid: requiredString(data.uuid, 'credit reception UUID'),
          credits: data.credits,
          contactUuid: data.contact?.uuid
        },
        message: `Reversed reward reception **${ctx.input.rewardReceptionUuid}**, credits restored.`
      };
    }

    if (!ctx.input.contactUuid)
      throw createApiServiceError('contactUuid is required for claim');
    if (!ctx.input.rewardUuid) throw createApiServiceError('rewardUuid is required for claim');
    let shopUuid = ctx.input.shopUuid || ctx.config.shopUuid;
    if (!shopUuid)
      throw createApiServiceError('shopUuid is required either in input or config');

    let result = await client.createRewardReception({
      contactUuid: ctx.input.contactUuid,
      rewardUuid: ctx.input.rewardUuid,
      shopUuid
    });

    let reception = result.data;

    return {
      output: {
        raw: reception,
        rewardReceptionUuid: requiredString(reception.uuid, 'reward reception UUID'),
        credits: reception.credits,
        contactUuid: ctx.input.contactUuid,
        rewardUuid: ctx.input.rewardUuid
      },
      message: `Contact ${ctx.input.contactUuid} claimed reward ${ctx.input.rewardUuid}${reception.credits ? `, ${reception.credits} credits deducted` : ''}.`
    };
  })
  .build();
