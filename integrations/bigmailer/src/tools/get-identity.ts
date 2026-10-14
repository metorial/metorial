import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIdentity = SlateTool.create(spec, {
  name: 'Get Account Identity',
  key: 'get_identity',
  description:
    'Retrieve the identity information associated with the connected BigMailer API key and confirm the connection can access the account.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      identity: z
        .record(z.string(), z.unknown())
        .describe('Identity information returned by BigMailer for this API key')
    })
  )
  .handleInvocation(async ctx => ({
    output: { identity: await new Client(ctx.auth.token).getIdentity() },
    message: 'Retrieved BigMailer account identity.'
  }))
  .build();
