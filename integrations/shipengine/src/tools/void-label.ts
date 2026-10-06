import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let voidLabel = SlateTool.create(spec, {
  name: 'Void Label',
  key: 'void_label',
  description: `Void a previously created shipping label. This cancels the label and requests a refund for the shipping charges. Not all carriers support voiding — the response indicates whether the void was approved.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      labelId: z.string().describe('ID of the label to void')
    })
  )
  .output(
    z.object({
      approved: z.boolean().describe('Whether the void request was approved'),
      message: z.string().describe('Message from the carrier about the void request'),
      voided: z.boolean().optional().describe('Independently observed label void state'),
      refundStatus: z
        .string()
        .optional()
        .describe('Provider refund workflow status; approval is not a completed refund')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.voidLabel(ctx.input.labelId);
    let after = await client.getLabel(ctx.input.labelId);

    return {
      output: {
        approved: result.approved,
        message: result.message,
        voided: after.voided,
        refundStatus: after.refund_status
      },
      message: `Void request for **${ctx.input.labelId}** was ${result.approved ? 'approved' : 'not approved'}. Observed label voided: ${after.voided ?? 'unknown'}. Refund completion is not confirmed.`
    };
  })
  .build();
