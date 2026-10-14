import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description: 'Retrieve the user profile associated with the connected Woodpecker API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('Authenticated user ID'),
      email: z.string().optional().describe('Authenticated user email'),
      name: z.string().optional().describe('Authenticated user name'),
      profile: z.any().describe('User profile returned by Woodpecker')
    })
  )
  .handleInvocation(async ctx => {
    let profile = await new Client({ token: ctx.auth.token }).getMe();
    return {
      output: {
        userId: profile.id?.toString(),
        email: profile.email,
        name:
          profile.name ?? [profile.first_name, profile.last_name].filter(Boolean).join(' '),
        profile
      },
      message: 'Retrieved the connected Woodpecker user profile.'
    };
  })
  .build();
