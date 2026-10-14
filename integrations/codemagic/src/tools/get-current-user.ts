import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated Codemagic user ID, avatar, and permissions by resource.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Authenticated user ID'),
      avatarUrl: z.string().nullable().describe('User avatar URL, when available'),
      permissions: z
        .record(z.string(), z.array(z.string()))
        .describe('Granted permissions keyed by resource ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });
    let user = await client.getCurrentUser();
    return {
      output: { userId: user.id, avatarUrl: user.avatar_url, permissions: user.permissions },
      message: `Authenticated as Codemagic user **${user.id}**.`
    };
  })
  .build();
