import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let messageTidy = SlateTool.create(spec, {
  name: 'Send Request to Tidy',
  key: 'message_tidy',
  description:
    'Send a natural-language property management request to TIDY. Requests can schedule cleanings, report issues, or coordinate property services and may change your account.',
  instructions: [
    'State the property, requested service, and relevant dates clearly. Review the response and any reported actions to determine the outcome.'
  ]
})
  .input(
    z.object({
      message: z.string().min(1).describe('Property management request for TIDY')
    })
  )
  .output(
    z.object({
      response: z
        .unknown()
        .describe('Full TIDY response, including status and any actions taken')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.messageTidy(ctx.input.message);
    return {
      output: { response },
      message:
        'Sent the property management request to TIDY. Review the response for its outcome.'
    };
  })
  .build();
