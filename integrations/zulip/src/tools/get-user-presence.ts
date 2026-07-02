import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserPresence = SlateTool.create(spec, {
  name: 'Get User Presence',
  key: 'get_user_presence',
  description: `Check the online/offline/idle presence status of a specific user or all users in the organization.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .number()
        .optional()
        .describe('User ID to check presence for. Omit to get presence for all users')
    })
  )
  .output(
    z.object({
      presences: z
        .record(z.string(), z.any())
        .describe('Presence information keyed by user email or containing presence details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    if (ctx.input.userId !== undefined) {
      let result = await client.getUserPresence(ctx.input.userId);
      return {
        output: { presences: result.presence || {} },
        message: `Retrieved presence for user ${ctx.input.userId}`
      };
    } else {
      let result = await client.getPresenceAllUsers();
      return {
        output: { presences: result.presences || {} },
        message: `Retrieved presence for all users`
      };
    }
  })
  .build();
