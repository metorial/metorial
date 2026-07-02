import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific user by their ID or email address.`,
  instructions: [
    'Provide either userId or email to look up the user. At least one is required.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().optional().describe('The ID of the user to retrieve'),
      email: z.string().optional().describe('The email address of the user to retrieve')
    })
  )
  .output(
    z.object({
      user: z.any().describe('Full user details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let user = await client.getUser({
      userId: ctx.input.userId,
      email: ctx.input.email
    });

    return {
      output: { user },
      message: `Retrieved user${ctx.input.userId ? ` **#${ctx.input.userId}**` : ''}${ctx.input.email ? ` (${ctx.input.email})` : ''}.`
    };
  })
  .build();
