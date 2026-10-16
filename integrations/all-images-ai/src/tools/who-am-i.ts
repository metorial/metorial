import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description: 'Check the current API key and retrieve the associated account email and name.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().describe('Email of the account associated with the API key'),
      name: z.string().optional().describe('Account name, when provided')
    })
  )
  .handleInvocation(async ctx => {
    let profile = await new Client(ctx.auth.token).checkApiKey();
    return {
      output: profile,
      message: `Connected as ${profile.email}.`
    };
  })
  .build();
