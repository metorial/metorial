import { SlateTool } from 'slates';
import { z } from 'zod';
import { GristClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Get the identity and profile of the user who owns the connected API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('User ID'),
      name: z.string().describe('Display name'),
      email: z.string().optional().describe('Email address when returned by the server'),
      picture: z.string().nullable().optional().describe('Profile picture URL')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new GristClient(ctx.auth).getCurrentUser();
    return {
      output: { userId: user.id, name: user.name, email: user.email, picture: user.picture },
      message: 'Retrieved the current Grist user.'
    };
  })
  .build();
