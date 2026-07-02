import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendPass = SlateTool.create(spec, {
  name: 'Send Pass',
  key: 'send_pass',
  description: `Send an existing pass to a recipient via email. The pass template must have an email template configured in its sendout settings. The recipient will receive an email with a link to download the pass.`,
  instructions: ['An email template must be configured on the pass template before sending.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      passId: z.string().describe('Identifier of the pass to send'),
      email: z.string().describe('Email address of the recipient')
    })
  )
  .output(
    z.object({
      passId: z.string().describe('Identifier of the sent pass'),
      recipient: z.string().describe('Email address the pass was sent to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.sendPassByEmail(ctx.input.passId, ctx.input.email);

    return {
      output: {
        passId: ctx.input.passId,
        recipient: ctx.input.email
      },
      message: `Sent pass \`${ctx.input.passId}\` to **${ctx.input.email}**.`
    };
  })
  .build();
