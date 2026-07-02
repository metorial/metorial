import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve information about the currently authenticated Felt user, including their ID, name, and email.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      name: z.string().describe('User display name'),
      email: z.string().describe('User email address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getCurrentUser();

    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email
      },
      message: `Authenticated as **${user.name}** (${user.email}).`
    };
  })
  .build();
