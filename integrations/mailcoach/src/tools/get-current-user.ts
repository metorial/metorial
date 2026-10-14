import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Retrieve the user account that owns the connected Mailcoach API token.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('Identifier of the connected user'),
      email: z.string().describe('Email address of the connected user'),
      createdAt: z.string().nullable().describe('Account creation timestamp'),
      updatedAt: z.string().nullable().describe('Last account update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });
    let user = await client.getCurrentUser();

    return {
      output: {
        userId: user.id,
        email: user.email,
        createdAt: user.created_at ?? null,
        updatedAt: user.updated_at ?? null
      },
      message: `Connected to Mailcoach as **${user.email}**.`
    };
  });
