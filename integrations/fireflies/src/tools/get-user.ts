import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';
import { mapUser, userSchema } from './shared';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve information about a specific user or the authenticated user. Returns profile data including role, integrations, transcript count, minutes consumed, calendar sync status, and user groups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('User ID to look up. If omitted, returns the authenticated user.')
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let user = await client.getUser(ctx.input.userId);
    let output = mapUser(user);

    return {
      output,
      message: `Retrieved user **${output.name ?? output.email ?? output.userId}**${output.isAdmin ? ' (admin)' : ''}.`
    };
  })
  .build();
