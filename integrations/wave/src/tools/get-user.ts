import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_user',
  description: `Retrieve the authenticated user's profile information including their name and default email address.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique identifier of the user'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      defaultEmail: z.string().optional().describe('Default email address'),
      createdAt: z.string().optional().describe('Account creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let user = await client.getUser();

    return {
      output: {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        defaultEmail: user.defaultEmail,
        createdAt: user.createdAt,
        modifiedAt: user.modifiedAt
      },
      message: `Authenticated as **${[user.firstName, user.lastName].filter(Boolean).join(' ')}** (${user.defaultEmail}).`
    };
  })
  .build();
