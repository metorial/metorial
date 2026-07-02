import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let rewardRuleSchema = z.object({
  ruleId: z.string().optional().describe('Rule ID'),
  isEnabled: z.boolean().optional().describe('Whether the rule is active'),
  description: z.string().optional().describe('Rule description'),
  ruleStartDate: z.string().optional().describe('Rule start date'),
  ruleEndDate: z.string().optional().describe('Rule end date'),
  programId: z.string().optional().describe('Program ID'),
  payoutId: z.string().optional().describe('Payout type ID'),
  payoutType: z.string().optional().describe('Payout type'),
  payoutDescription: z.string().optional().describe('Payout description'),
  amountCalculationMethod: z.string().optional().describe('Amount calculation method'),
  fixedAmount: z.number().optional().describe('Fixed reward amount'),
  startingPercentAmount: z.number().optional().describe('Starting percentage amount'),
  triggerReferralStatus: z.string().optional().describe('Status that triggers the reward'),
  deliveryType: z.string().optional().describe('Delivery method'),
  deliveryDelay: z.number().optional().describe('Delivery delay')
});

export let getRewardRules = SlateTool.create(spec, {
  name: 'Get Reward Rules',
  key: 'get_reward_rules',
  description: `Retrieve the member reward rules configured for a specific program. Shows how rewards are calculated, triggered, and delivered.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().describe('Program ID to get reward rules for')
    })
  )
  .output(
    z.object({
      rules: z.array(rewardRuleSchema).describe('List of reward rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let result = await client.getRewardRules(ctx.input.programId);

    let rules = ((result as unknown as Record<string, unknown>[]) || []).map(r => {
      let reward = (r.reward || {}) as Record<string, unknown>;
      let trigger = (r.trigger || {}) as Record<string, unknown>;
      return {
        ruleId: r.ruleId as string | undefined,
        isEnabled: r.isEnabled as boolean | undefined,
        description: r.description as string | undefined,
        ruleStartDate: r.ruleStartDate as string | undefined,
        ruleEndDate: r.ruleEndDate as string | undefined,
        programId: r.programId as string | undefined,
        payoutId: r.payoutId as string | undefined,
        payoutType: r.payoutType as string | undefined,
        payoutDescription: r.payoutDescription as string | undefined,
        amountCalculationMethod: reward.amountCalculationMethod as string | undefined,
        fixedAmount: reward.fixedAmount as number | undefined,
        startingPercentAmount: reward.startingPercentAmount as number | undefined,
        triggerReferralStatus: trigger.referralStatus as string | undefined,
        deliveryType: r.deliveryType as string | undefined,
        deliveryDelay: r.deliveryDelay as number | undefined
      };
    });

    return {
      output: { rules },
      message: `Retrieved **${rules.length}** reward rule(s) for program **${ctx.input.programId}**.`
    };
  })
  .build();
