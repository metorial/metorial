import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let createReferralAction = SlateTool.create(spec, {
  name: 'Create Referral Action',
  key: 'create_referral_action',
  description: `Create a referral action to trigger recurring reward processing for a referral. Actions represent repeat purchases or events that generate additional rewards based on configured reward rules.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      amount: z.number().describe('Amount for calculating percentage-based recurring rewards'),
      referralQuery: z
        .string()
        .describe('Referral ID, email, or external ID to associate the action with'),
      programQuery: z.string().optional().describe('Program ID, name, or title'),
      name: z.string().optional().describe('Action name'),
      externalIdentifier: z
        .string()
        .optional()
        .describe('External ID to prevent duplicate actions')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was created successfully'),
      message: z.string().optional().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    await client.createReferralAction({
      amount: ctx.input.amount,
      referralQuery: ctx.input.referralQuery,
      programQuery: ctx.input.programQuery,
      name: ctx.input.name,
      externalIdentifier: ctx.input.externalIdentifier
    });

    return {
      output: {
        success: true,
        message: 'Referral action created successfully.'
      },
      message: `Created referral action for **${ctx.input.referralQuery}** with amount **${ctx.input.amount}**.`
    };
  })
  .build();
