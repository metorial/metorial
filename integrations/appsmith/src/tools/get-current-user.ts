import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve the profile of the currently authenticated user, including their name, email, and role information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('The user ID.'),
      name: z.string().optional().describe('The user display name.'),
      email: z.string().optional().describe('The user email address.'),
      role: z.string().optional().describe('The user role on the instance.'),
      isAnonymous: z
        .boolean()
        .optional()
        .describe('Whether the user is anonymous (not logged in).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let user = await client.getCurrentUser();

    return {
      output: {
        userId: user.id ?? '',
        name: user.name,
        email: user.email,
        role: user.role,
        isAnonymous: user.isAnonymous
      },
      message: `Current user: **${user.name ?? user.email ?? 'Unknown'}** (ID: ${user.id ?? 'unknown'}).`
    };
  })
  .build();
