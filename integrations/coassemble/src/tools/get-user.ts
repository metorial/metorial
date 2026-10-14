import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: 'Retrieve a learner or content creator by their user identifier.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      identifier: z.string().describe('User identifier. Call list_users to discover users.')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('The user profile and available metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let user = await client.getUser(ctx.input.identifier);

    return {
      output: { user },
      message: `Retrieved user \`${ctx.input.identifier}\`.`
    };
  })
  .build();
