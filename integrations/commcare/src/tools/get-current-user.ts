import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the authenticated CommCare web user and retrieve their name and email address.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      username: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });
    let user = await client.getCurrentUser();
    return {
      output: {
        userId: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email
      },
      message: `Connected as **${user.username}**.`
    };
  })
  .build();
