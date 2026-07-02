import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_user',
  description: `Retrieve information about the currently authenticated Tally user. Use this to verify authentication or get account details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique user identifier'),
      email: z.string().describe('User email address'),
      name: z.string().optional().describe('User display name'),
      username: z.string().optional().describe('Username')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = await client.getCurrentUser();

    return {
      output: {
        userId: user.id,
        email: user.email,
        name: user.name,
        username: user.username
      },
      message: `Authenticated as **${user.name ?? user.email}** (${user.id}).`
    };
  })
  .build();
