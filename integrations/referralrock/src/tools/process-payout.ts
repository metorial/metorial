import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let processPayout = SlateTool.create(spec, {
  name: 'Process Payout',
  key: 'process_payout',
  description: `Process a payout transaction to transfer pending reward funds to a recipient. This initiates the actual payment transfer for accumulated rewards.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      payoutId: z.string().describe('Payout type ID to process'),
      recipientId: z.string().optional().describe('Recipient ID to pay out'),
      memberId: z
        .string()
        .optional()
        .describe('Member ID to pay out (deprecated, prefer recipientId)'),
      note: z.string().optional().describe('Message to the recipient'),
      overrideIneligible: z.boolean().optional().describe('Override eligibility date rules')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the payout was processed successfully'),
      message: z.string().optional().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let result = await client.processPayoutTransaction(
      {
        payoutId: ctx.input.payoutId,
        recipientId: ctx.input.recipientId,
        memberId: ctx.input.memberId,
        note: ctx.input.note
      },
      ctx.input.overrideIneligible
    );

    return {
      output: {
        success: true,
        message: (result as Record<string, unknown>).message as string | undefined
      },
      message: `Payout processed for payout type **${ctx.input.payoutId}**.`
    };
  })
  .build();
