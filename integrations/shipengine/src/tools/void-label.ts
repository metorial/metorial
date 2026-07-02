import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      message: z.string().describe('Message from the carrier about the void request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.voidLabel(ctx.input.labelId);

    return {
      output: {
        approved: result.approved,
        message: result.message
      },
      message: result.approved
        ? `Label **${ctx.input.labelId}** voided successfully.`
        : `Void request for label **${ctx.input.labelId}** was not approved: ${result.message}`
    };
  })
  .build();
