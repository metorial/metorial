import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve the authenticated user's profile information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().optional().describe('User ID'),
      name: z.string().optional().describe('User display name'),
      email: z.string().optional().describe('User email'),
      profile: z.any().optional().describe('Full profile data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let user = await client.getUser();

    return {
      output: {
        userId: user.id,
        name: user.name || user.full,
        email: user.email,
        profile: user
      },
      message: `Retrieved profile for user **${user.name || user.full || user.id}**.`
    };
  })
  .build();
