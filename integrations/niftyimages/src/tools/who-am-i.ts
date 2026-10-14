import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Get Current Account',
  key: 'who_am_i',
  description:
    'Identify the NiftyImages account and API key associated with this connection. Requires access to the v2 developer API.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      profile: z.object({
        email: z
          .string()
          .nullable()
          .describe('Email address of the account that owns the API key.'),
        apiKeyID: z
          .string()
          .nullable()
          .describe('Identifier of the API key used for this request.'),
        name: z.string().nullable().describe('Friendly name of the API key.')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let profile = await client.getCurrentUser();
    return {
      output: { profile },
      message: 'Retrieved the connected account and API key identity.'
    };
  })
  .build();
