import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Identify the authenticated Zeplin account and retrieve its profile details.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Current user identifier'),
      username: z.string().describe('Zeplin username'),
      email: z
        .string()
        .optional()
        .describe('Email address or Zeplin-only alias, depending on account permissions'),
      avatar: z.string().optional().describe('Profile image URL'),
      emotar: z.string().optional().describe('Profile emoji'),
      lastSeen: z.number().optional().describe('Last seen Unix timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);
    let user = await client.getCurrentUser();
    return {
      output: {
        userId: user.id,
        username: user.username,
        email: user.email ?? undefined,
        avatar: user.avatar ?? undefined,
        emotar: user.emotar ?? undefined,
        lastSeen: user.last_seen ?? undefined
      },
      message: `Authenticated as **${user.username}**.`
    };
  })
  .build();
