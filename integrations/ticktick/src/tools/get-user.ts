import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user',
  description: `Retrieve the authenticated user's profile information from TickTick, including their user ID, name, and email.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('User identifier'),
      name: z.string().optional().describe('User display name'),
      username: z.string().optional().describe('Username'),
      email: z.string().optional().describe('User email address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = await client.getUserProfile();

    return {
      output: {
        userId: user.id,
        name: user.name,
        username: user.username,
        email: user.email
      },
      message: `Retrieved profile for **${user.name ?? user.username ?? user.id}**.`
    };
  })
  .build();
